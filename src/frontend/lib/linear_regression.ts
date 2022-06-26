import * as jstat from 'jstat';

const MODEL_COEF_PRECISION = 3;

export interface Point {
  x: number;
  y: number;
}

export interface JstatModel {
  coef: number[];
  R2: number;
  t: { p: number[] };
  f: { pvalue: number };
}
interface ModelSearchConfig {
  lowerBoundScalar: number;
  upperBoundScalar: number;
  maxSearchDepth: number;
}

type XTransform = (x: number) => number[];
type YTransform = (y: number) => number;
type FittedY = (y: number) => number;
type FittedYTakingCoefs = (coefs: number[], y: number) => number;
type PlottableModelFactory = (
  dataPoints: Point[],
  yTransform: YTransform
) => PlottableModel;
type RegressionModelFactory = (dataPoints: Point[], scalar: number) => RegressionModel;

const identityY: YTransform = (y) => y;

interface RegressionModel {
  jstats: JstatModel;
  fittedY: FittedY;
  rmse: number;
  residuals: Point[];
}

export abstract class PlottableModel implements RegressionModel {
  name: string;
  hexColor: string;
  equation!: string;
  lowestX = Infinity;
  highestX = 0;

  jstats!: JstatModel;
  fittedY!: FittedY;
  rmse!: number;
  residuals!: Point[];

  private _modelPoints: Point[] | null = null;

  constructor(name: string, hexColor: string, dataPoints: Point[]) {
    this.name = name;
    this.hexColor = hexColor;
    for (const point of dataPoints) {
      if (point.x < this.lowestX) this.lowestX = point.x;
      if (point.x > this.highestX) this.highestX = point.x;
    }
  }

  abstract getXFormula(): string;

  getYFormula(): string {
    return 'y';
  }

  convertDataPoints(dataPoints: Point[]): Point[] {
    return dataPoints;
  }

  getModelPoints(pointCount: number): Point[] {
    if (!this._modelPoints || this._modelPoints.length != pointCount) {
      this._modelPoints = [];
      const deltaX = (this.highestX - this.lowestX) / pointCount;
      let x = this.lowestX;
      while (x <= this.highestX) {
        const y = this.fittedY(x);
        // Don't plot model points for y < 0.
        if (y >= 0) this._modelPoints.push({ x, y });
        x += deltaX;
      }
    }
    return this._modelPoints;
  }
}

export class PowerXModel extends PlottableModel {
  power: number;

  constructor(hexColor: string, dataPoints: Point[], yTransform = identityY) {
    super('power fit', hexColor, dataPoints);

    const [model, power] = _findBestRMSEScalar_nAry(
      {
        lowerBoundScalar: 0.001,
        upperBoundScalar: 3,
        initialPartitions: 8,
        maxSearchDepth: 8
      },
      dataPoints,
      (dataPoints, scalar) => {
        return _createRegressionModel(
          (x) => [Math.pow(x, scalar), 1],
          yTransform,
          (coefs, x) => coefs[0] * Math.pow(x, scalar) + coefs[1],
          dataPoints
        );
      }
    );
    Object.assign(this, model);
    this.power = power;
  }

  getXFormula(): string {
    const coefs = this.jstats.coef;
    return [
      _coefHtml(coefs[0], true),
      ' x<sup>',
      // @ts-ignore
      shortenValue(this.power, 4),
      '</sup> ',
      _coefHtml(coefs[1])
    ].join(' ');
  }
}

export class LinearXModel extends PlottableModel {
  constructor(hexColor: string, dataPoints: Point[], yTransform = identityY) {
    super('linear fit', hexColor, dataPoints);

    const xTransform: XTransform = (x) => [x, 1];
    const fittedYTakingCoefs: FittedYTakingCoefs = (coefs, x) =>
      coefs[0] * x + coefs[1];

    const model = _createRegressionModel(
      xTransform,
      yTransform,
      fittedYTakingCoefs,
      dataPoints
    );
    Object.assign(this, model);
  }

  getXFormula(): string {
    const coefs = this.jstats.coef;
    return [_coefHtml(coefs[0], true), ' x ', _coefHtml(coefs[1])].join(' ');
  }
}

export class QuadraticXModel extends PlottableModel {
  constructor(hexColor: string, dataPoints: Point[], yTransform = identityY) {
    super('quadratic fit', hexColor, dataPoints);

    const xTransform: XTransform = (x) => [x * x, x, 1];
    const fittedYTakingCoefs: FittedYTakingCoefs = (coefs, x) =>
      coefs[0] * x * x + coefs[1] * x + coefs[2];

    const model = _createRegressionModel(
      xTransform,
      yTransform,
      fittedYTakingCoefs,
      dataPoints
    );
    Object.assign(this, model);
  }

  getXFormula(): string {
    const coefs = this.jstats.coef;
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
    super('log fit', hexColor, dataPoints);

    const xTransform: XTransform = (x) => [Math.log(x), 1];
    const fittedYTakingCoefs: FittedYTakingCoefs = (coefs, x) =>
      coefs[0] * Math.log(x) + coefs[1];

    const model = _createRegressionModel(
      xTransform,
      yTransform,
      fittedYTakingCoefs,
      dataPoints
    );
    Object.assign(this, model);
  }

  getXFormula(): string {
    const coefs = this.jstats.coef;
    return [_coefHtml(coefs[0], true), ' ln(x) ', _coefHtml(coefs[1])].join(' ');
  }
}

export class Order3XModel extends PlottableModel {
  constructor(hexColor: string, dataPoints: Point[], yTransform = identityY) {
    super('3rd order fit', hexColor, dataPoints);

    const xTransform: XTransform = (x) => [x * x * x, x * x, x, 1];
    const fittedYTakingCoefs: FittedYTakingCoefs = (coefs, x) =>
      coefs[0] * x * x * x + coefs[1] * x * x + coefs[2] * x + coefs[3];

    const model = _createRegressionModel(
      xTransform,
      yTransform,
      fittedYTakingCoefs,
      dataPoints
    );
    Object.assign(this, model);
  }

  getXFormula(): string {
    const coefs = this.jstats.coef;
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

export function shortenValue(value: number, precision: number): string {
  if (value != 0 && Math.abs(value) < 0.001) {
    return value.toExponential(precision - 1);
  }
  return value.toPrecision(precision);
}

export function shortenPValue(pValue: number): string {
  return pValue < 0.001 ? '0.0' : shortenValue(pValue, 2);
}

export function shortenRMSE(rmse: number): string {
  return shortenValue(rmse, 3);
}

export function shortenR2(r2: number): string {
  return shortenValue(r2, 2);
}

function _coefHtml(coef: number, firstCoef = false) {
  if (firstCoef) {
    return shortenValue(coef, MODEL_COEF_PRECISION);
  }
  return (coef >= 0 ? '+ ' : '- ') + shortenValue(Math.abs(coef), MODEL_COEF_PRECISION);
}

function _createRegressionModel(
  xTransform: XTransform,
  yTransform: YTransform,
  fittedYTakingCoefs: FittedYTakingCoefs,
  dataPoints: Point[]
): RegressionModel {
  const independentValues: number[][] = [];
  const dependentValues: number[] = [];
  for (const point of dataPoints) {
    independentValues.push(xTransform(point.x));
    dependentValues.push(yTransform(point.y));
  }

  const jstats: JstatModel = jstat.models.ols(dependentValues, independentValues);
  const coefs = jstats.coef;
  const fittedY = fittedYTakingCoefs.bind(null, coefs);
  const residuals = _getResiduals(dataPoints, fittedY);
  const rmse = _getRMSE(residuals);

  return { jstats, fittedY, rmse, residuals };
}

function _getResiduals(points: Point[], fittedY: FittedY) {
  return points.map((point) => {
    return { x: point.x, y: point.y - fittedY(point.x) };
  });
}

function _getRMSE(residuals: Point[]) {
  let sumOfSquares = 0;
  residuals.forEach((residual) => (sumOfSquares += residual.y * residual.y));
  return Math.sqrt(sumOfSquares / residuals.length);
}

function _findBestRMSEScalar_binary(
  config: ModelSearchConfig,
  dataPoints: Point[],
  modelFactory: RegressionModelFactory
): [RegressionModel, number] {
  let lowModel: RegressionModel;
  let middleScalar: number;
  let middleModel: RegressionModel;
  let highModel: RegressionModel;

  lowModel = modelFactory(dataPoints, config.lowerBoundScalar);
  highModel = modelFactory(dataPoints, config.upperBoundScalar);

  let lowScalar = config.lowerBoundScalar;
  let highScalar = config.upperBoundScalar;
  for (let i = 0; i < config.maxSearchDepth; ++i) {
    middleScalar = (lowScalar + highScalar) / 2;
    middleModel = modelFactory(dataPoints, middleScalar);
    if (lowModel.rmse < highModel.rmse) {
      highScalar = middleScalar;
      highModel = middleModel;
    } else {
      lowScalar = middleScalar;
      lowModel = middleModel;
    }
  }

  // @ts-ignore
  return [middleModel, middleScalar];
}

function _findBestRMSEScalar_nAry(
  config: ModelSearchConfig & {
    initialPartitions: number;
  },
  dataPoints: Point[],
  modelFactory: RegressionModelFactory
): [RegressionModel, number] {
  let models: RegressionModel[] = [];
  const scalars: number[] = [];
  const scalarIncrement =
    (config.upperBoundScalar - config.lowerBoundScalar) / config.initialPartitions;

  for (
    let scalar = config.lowerBoundScalar;
    scalar <= config.upperBoundScalar;
    scalar += scalarIncrement
  ) {
    models.push(modelFactory(dataPoints, scalar));
    scalars.push(scalar);
  }

  let lowestRMSE = Infinity;
  let lowestRMSEIndex = 0;
  for (let i = 0; i < models.length; ++i) {
    if (models[i].rmse < lowestRMSE) {
      lowestRMSEIndex = i;
      lowestRMSE = models[i].rmse;
    }
  }

  const nestedConfig = Object.assign({}, config);
  if (lowestRMSEIndex == 0) {
    nestedConfig.upperBoundScalar = scalars[1];
  } else if (lowestRMSEIndex == models.length - 1) {
    nestedConfig.lowerBoundScalar = scalars[models.length - 2];
  } else if (models[lowestRMSEIndex - 1] < models[lowestRMSEIndex + 1]) {
    nestedConfig.lowerBoundScalar = scalars[lowestRMSEIndex - 1];
    nestedConfig.upperBoundScalar = scalars[lowestRMSEIndex];
  } else {
    nestedConfig.lowerBoundScalar = scalars[lowestRMSEIndex];
    nestedConfig.upperBoundScalar = scalars[lowestRMSEIndex + 1];
  }
  models = []; // clear memory
  // TODO: improve performance by passing in boundary models
  return _findBestRMSEScalar_binary(nestedConfig, dataPoints, modelFactory);
}
