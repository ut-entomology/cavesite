import type { Point } from '../../shared/point';
import {
  type XTransform,
  type YTransform,
  type FittedYTakingCoefs,
  Regression,
  shortenValue
} from './regression';
import { type ModelAverager, PolynomialAverager, PlotAverager } from './model_averager';
const MODEL_COEF_PRECISION = 3;

export type PlottableModelFactory = (
  dataPoints: Point[],
  yTransform?: YTransform
) => PlottableModel;
const identityY: YTransform = (y) => y;

interface RegressionSearchConfig {
  lowerBoundScalar: number;
  upperBoundScalar: number;
  maxSearchDepth: number;
}

type RegressionFactory = (dataPoints: Point[], scalar: number) => Regression;

export abstract class PlottableModel {
  name: string;
  hexColor: string;
  equation!: string;
  lowestX = Infinity;
  highestX = 0;
  yTransform?: YTransform;
  regression!: Regression;

  private _modelPoints: Point[] | null = null;

  constructor(
    name: string,
    hexColor: string,
    dataPoints: Point[],
    yTransform?: YTransform
  ) {
    this.name = name;
    this.hexColor = hexColor;
    for (const point of dataPoints) {
      if (point.x < this.lowestX) this.lowestX = point.x;
      if (point.x > this.highestX) this.highestX = point.x;
    }
    this.yTransform = yTransform;
  }

  abstract getXFormula(): string;

  getYFormula(): string {
    return 'y';
  }

  convertDataPoints(dataPoints: Point[]): Point[] {
    return dataPoints;
  }

  getModelAverager(): ModelAverager {
    return new PolynomialAverager();
  }

  getModelPoints(pointCount: number): Point[] {
    if (!this._modelPoints || this._modelPoints.length != pointCount) {
      this._modelPoints = [];
      const deltaX = (this.highestX - this.lowestX) / pointCount;
      let x = this.lowestX;
      while (x <= this.highestX) {
        const y = this.regression.fittedY(x);
        // Don't plot model points for y < 0.
        if (y >= 0) this._modelPoints.push({ x, y });
        x += deltaX;
      }
    }
    return this._modelPoints;
  }
}

export class PowerXModel extends PlottableModel {
  private power: number;

  private _finalModelFactory: PlottableModelFactory;

  constructor(
    hexColor: string,
    dataPoints: Point[],
    yTransform = identityY,
    modelFactory?: PlottableModelFactory
  ) {
    super('power fit', hexColor, dataPoints, yTransform);
    this._finalModelFactory = modelFactory
      ? modelFactory
      : (points: Point[], yTransform?: YTransform) => {
          return new PowerXModel(hexColor, points, yTransform);
        };

    const [regression, power] = _findBestRMSEScalar_nAry(
      {
        lowerBoundScalar: 0.001,
        upperBoundScalar: 3,
        initialPartitions: 8,
        maxSearchDepth: 8
      },
      dataPoints,
      (dataPoints, scalar) => {
        return new Regression(
          (x) => [Math.pow(x, scalar), 1],
          yTransform,
          (coefs, x) => coefs[0] * Math.pow(x, scalar) + coefs[1],
          dataPoints
        );
      }
    );
    this.power = power;
    this.regression = regression;
  }

  getFirstDerivative(): (x: number) => number {
    const coefs = this.regression.jstats.coef;
    return (x) => this.power * coefs[0] * Math.pow(x, this.power - 1);
  }

  getXFormula(): string {
    const coefs = this.regression.jstats.coef;
    return [
      _coefHtml(coefs[0], true),
      ' x<sup>',
      // @ts-ignore
      shortenValue(this.power, 4),
      '</sup> ',
      _coefHtml(coefs[1])
    ].join(' ');
  }

  getModelAverager(): ModelAverager {
    return new PlotAverager(this._finalModelFactory, this.yTransform);
  }
}

export class LinearXModel extends PlottableModel {
  constructor(hexColor: string, dataPoints: Point[], yTransform = identityY) {
    super('linear fit', hexColor, dataPoints, yTransform);

    const xTransform: XTransform = (x) => [x, 1];
    const fittedYTakingCoefs: FittedYTakingCoefs = (coefs, x) =>
      coefs[0] * x + coefs[1];

    this.regression = new Regression(
      xTransform,
      yTransform,
      fittedYTakingCoefs,
      dataPoints
    );
  }

  getXFormula(): string {
    const coefs = this.regression.jstats.coef;
    return [_coefHtml(coefs[0], true), ' x ', _coefHtml(coefs[1])].join(' ');
  }
}

export class QuadraticXModel extends PlottableModel {
  constructor(hexColor: string, dataPoints: Point[], yTransform = identityY) {
    super('quadratic fit', hexColor, dataPoints, yTransform);

    const xTransform: XTransform = (x) => [x * x, x, 1];
    const fittedYTakingCoefs: FittedYTakingCoefs = (coefs, x) =>
      coefs[0] * x * x + coefs[1] * x + coefs[2];

    this.regression = new Regression(
      xTransform,
      yTransform,
      fittedYTakingCoefs,
      dataPoints
    );
  }

  getXFormula(): string {
    const coefs = this.regression.jstats.coef;
    return [
      _coefHtml(coefs[0], true),
      ' x<sup>2</sup> ',
      _coefHtml(coefs[1]),
      ' x ',
      _coefHtml(coefs[2])
    ].join(' ');
  }
}

export class LogXModel extends PlottableModel {
  constructor(hexColor: string, dataPoints: Point[], yTransform = identityY) {
    super('log fit', hexColor, dataPoints, yTransform);

    const xTransform: XTransform = (x) => [Math.log(x), 1];
    const fittedYTakingCoefs: FittedYTakingCoefs = (coefs, x) =>
      coefs[0] * Math.log(x) + coefs[1];

    this.regression = new Regression(
      xTransform,
      yTransform,
      fittedYTakingCoefs,
      dataPoints
    );
  }

  getXFormula(): string {
    const coefs = this.regression.jstats.coef;
    return [_coefHtml(coefs[0], true), ' ln(x) ', _coefHtml(coefs[1])].join(' ');
  }
}

export class Order3XModel extends PlottableModel {
  constructor(hexColor: string, dataPoints: Point[], yTransform = identityY) {
    super('3rd order fit', hexColor, dataPoints, yTransform);

    const xTransform: XTransform = (x) => [x * x * x, x * x, x, 1];
    const fittedYTakingCoefs: FittedYTakingCoefs = (coefs, x) =>
      coefs[0] * x * x * x + coefs[1] * x * x + coefs[2] * x + coefs[3];

    this.regression = new Regression(
      xTransform,
      yTransform,
      fittedYTakingCoefs,
      dataPoints
    );
  }

  getXFormula(): string {
    const coefs = this.regression.jstats.coef;
    return [
      _coefHtml(coefs[0], true),
      ' x<sup>3</sup> ',
      _coefHtml(coefs[1]),
      ' x<sup>2</sup> ',
      _coefHtml(coefs[2]),
      ' x ',
      _coefHtml(coefs[3])
    ].join(' ');
  }
}

export class Order4XModel extends PlottableModel {
  constructor(hexColor: string, dataPoints: Point[], yTransform = identityY) {
    super('4th order fit', hexColor, dataPoints, yTransform);

    const xTransform: XTransform = (x) => [Math.pow(x, 4), Math.pow(x, 3), x * x, x, 1];
    const fittedYTakingCoefs: FittedYTakingCoefs = (coefs, x) =>
      coefs[0] * Math.pow(x, 4) +
      coefs[1] * Math.pow(x, 3) +
      coefs[2] * x * x +
      coefs[3] * x +
      coefs[4];

    this.regression = new Regression(
      xTransform,
      yTransform,
      fittedYTakingCoefs,
      dataPoints
    );
  }

  getXFormula(): string {
    const coefs = this.regression.jstats.coef;
    return [
      _coefHtml(coefs[0], true),
      ' x<sup>4</sup> ',
      _coefHtml(coefs[1]),
      ' x<sup>3</sup> ',
      _coefHtml(coefs[2]),
      ' x<sup>2</sup> ',
      _coefHtml(coefs[3]),
      ' x ',
      _coefHtml(coefs[4])
    ].join(' ');
  }
}

export abstract class YModel extends PlottableModel {
  yTransform!: (y: number) => number;
  protected _xFormula!: string;

  constructor(dataPoints: Point[]) {
    // Deferred properties get copied over within _findBestYScalar().
    super('' /* deferred */, '' /* deferred */, dataPoints);
  }

  convertDataPoints(dataPoints: Point[]): Point[] {
    return dataPoints.map((p) => {
      return { x: p.x, y: this.yTransform(p.y) };
    });
  }

  getXFormula(): string {
    return this._xFormula;
  }

  abstract getYFormula(): string;
}

export class LogYModel extends YModel {
  constructor(dataPoints: Point[], baseModelFactory: PlottableModelFactory) {
    super(dataPoints);

    this.yTransform = (y: number) => Math.log(y);

    const model = baseModelFactory(dataPoints, this.yTransform);
    Object.assign(this, model);

    this.name += ' vs. ln(y)';
    this._xFormula = (model as PlottableModel).getXFormula();
  }

  getYFormula(): string {
    return `log(y)`;
  }
}

export class LogYPlus1Model extends YModel {
  constructor(dataPoints: Point[], baseModelFactory: PlottableModelFactory) {
    super(dataPoints);

    this.yTransform = (y: number) => Math.log(y + 1);

    const model = baseModelFactory(dataPoints, this.yTransform);
    Object.assign(this, model);

    this.name += ' vs. ln(y+1)';
    this._xFormula = (model as PlottableModel).getXFormula();
  }

  getYFormula(): string {
    return `log(y+1)`;
  }
}

export class SquareRootYModel extends YModel {
  constructor(dataPoints: Point[], baseModelFactory: PlottableModelFactory) {
    super(dataPoints);

    this.yTransform = (y: number) => Math.sqrt(y);

    const model = baseModelFactory(dataPoints, this.yTransform);
    Object.assign(this, model);

    this.name += ' vs. sqrt(y)';
    this._xFormula = (model as PlottableModel).getXFormula();
  }

  getYFormula(): string {
    return `sqrt(y)`;
  }
}

function _coefHtml(coef: number, firstCoef = false) {
  if (firstCoef) {
    return shortenValue(coef, MODEL_COEF_PRECISION);
  }
  return (coef >= 0 ? '+ ' : '- ') + shortenValue(Math.abs(coef), MODEL_COEF_PRECISION);
}

function _findBestRMSEScalar_binary(
  config: RegressionSearchConfig,
  dataPoints: Point[],
  regressionFactory: RegressionFactory
): [Regression, number] {
  let lowRegression: Regression;
  let middleScalar: number;
  let middleRegression: Regression;
  let highRegression: Regression;

  lowRegression = regressionFactory(dataPoints, config.lowerBoundScalar);
  highRegression = regressionFactory(dataPoints, config.upperBoundScalar);

  let lowScalar = config.lowerBoundScalar;
  let highScalar = config.upperBoundScalar;
  for (let i = 0; i < config.maxSearchDepth; ++i) {
    middleScalar = (lowScalar + highScalar) / 2;
    middleRegression = regressionFactory(dataPoints, middleScalar);
    if (lowRegression.rmse < highRegression.rmse) {
      highScalar = middleScalar;
      highRegression = middleRegression;
    } else {
      lowScalar = middleScalar;
      lowRegression = middleRegression;
    }
  }

  // @ts-ignore
  return [middleRegression, middleScalar];
}

function _findBestRMSEScalar_nAry(
  config: RegressionSearchConfig & {
    initialPartitions: number;
  },
  dataPoints: Point[],
  regressionFactory: RegressionFactory
): [Regression, number] {
  let regressions: Regression[] = [];
  const scalars: number[] = [];
  const scalarIncrement =
    (config.upperBoundScalar - config.lowerBoundScalar) / config.initialPartitions;

  for (
    let scalar = config.lowerBoundScalar;
    scalar <= config.upperBoundScalar;
    scalar += scalarIncrement
  ) {
    regressions.push(regressionFactory(dataPoints, scalar));
    scalars.push(scalar);
  }

  let lowestRMSE = Infinity;
  let lowestRMSEIndex = 0;
  for (let i = 0; i < regressions.length; ++i) {
    if (regressions[i].rmse < lowestRMSE) {
      lowestRMSEIndex = i;
      lowestRMSE = regressions[i].rmse;
    }
  }

  const nestedConfig = Object.assign({}, config);
  if (lowestRMSEIndex == 0) {
    nestedConfig.upperBoundScalar = scalars[1];
  } else if (lowestRMSEIndex == regressions.length - 1) {
    nestedConfig.lowerBoundScalar = scalars[regressions.length - 2];
  } else if (regressions[lowestRMSEIndex - 1] < regressions[lowestRMSEIndex + 1]) {
    nestedConfig.lowerBoundScalar = scalars[lowestRMSEIndex - 1];
    nestedConfig.upperBoundScalar = scalars[lowestRMSEIndex];
  } else {
    nestedConfig.lowerBoundScalar = scalars[lowestRMSEIndex];
    nestedConfig.upperBoundScalar = scalars[lowestRMSEIndex + 1];
  }
  regressions = []; // clear memory
  // TODO: improve performance by passing in boundary regressions
  return _findBestRMSEScalar_binary(nestedConfig, dataPoints, regressionFactory);
}
