import type { Point } from '../../../shared/point';
import {
  type XTransform,
  type FittedYTakingCoefs,
  Regression,
  shortenValue
} from './regression';
import { type ModelAverager, PolynomialAverager, PlotAverager } from './model_averager';
const MODEL_COEF_PRECISION = 3;

export type PlottableModelFactory = (dataPoints: Point[]) => PlottableModel;

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
  regression!: Regression;

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
    modelFactory?: PlottableModelFactory
  ) {
    super('power fit', hexColor, dataPoints);
    this._finalModelFactory = modelFactory
      ? modelFactory
      : (points: Point[]) => {
          return new PowerXModel(hexColor, points);
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
    return new PlotAverager(this._finalModelFactory);
  }
}

export class LinearXModel extends PlottableModel {
  constructor(hexColor: string, dataPoints: Point[]) {
    super('linear fit', hexColor, dataPoints);

    const xTransform: XTransform = (x) => [x, 1];
    const fittedYTakingCoefs: FittedYTakingCoefs = (coefs, x) =>
      coefs[0] * x + coefs[1];

    this.regression = new Regression(xTransform, fittedYTakingCoefs, dataPoints);
  }

  getXFormula(): string {
    const coefs = this.regression.jstats.coef;
    return [_coefHtml(coefs[0], true), ' x ', _coefHtml(coefs[1])].join(' ');
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
