import * as jstat from 'jstat';

const MAX_POWER_SPLITS = 15;
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

type XTransform = (x: number) => number[];
type YTransform = (y: number) => number;
type FittedY = (y: number) => number;
type FittedYTakingCoefs = (coefs: number[], y: number) => number;

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

  abstract getEquation(): string;

  getModelPoints(pointCount: number): Point[] {
    if (!this._modelPoints || this._modelPoints.length != pointCount) {
      this._modelPoints = [];
      const deltaX = (this.highestX - this.lowestX) / pointCount;
      let x = this.lowestX;
      while (x <= this.highestX) {
        this._modelPoints.push({ x, y: this.fittedY(x) });
        x += deltaX;
      }
    }
    return this._modelPoints;
  }
}

export class QuadraticModel extends PlottableModel {
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

  getEquation(): string {
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

export class PowerModel extends PlottableModel {
  power: number;

  constructor(hexColor: string, dataPoints: Point[], yTransform = identityY) {
    super('power fit', hexColor, dataPoints);

    const [model, power] = _findBestScalar(
      {
        lowerBoundScalar: 0.001,
        upperBoundScalar: 3,
        maxSearchDepth: MAX_POWER_SPLITS
      },
      dataPoints,
      (p, x) => [Math.pow(x, p), 1],
      yTransform,
      (p, coefs, x) => coefs[0] * Math.pow(x, p) + coefs[1]
    );
    Object.assign(this, model);
    this.power = power;
  }

  getEquation(): string {
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

export function shortenValue(value: number, precision: number) {
  if (value != 0 && Math.abs(value) < 0.0001) {
    return value.toExponential(precision - 1);
  }
  return value.toPrecision(precision);
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

function _findBestScalar(
  config: {
    lowerBoundScalar: number;
    upperBoundScalar: number;
    maxSearchDepth: number;
  },
  dataPoints: Point[],
  scalarXTransform: (s: number, x: number) => number[],
  yTransform: (y: number) => number,
  scalarFittedYTakingCoefs: (s: number, coefs: number[], y: number) => number
): [RegressionModel, number] {
  let lowModel: RegressionModel;
  let middleScalar: number;
  let middleModel: RegressionModel;
  let highModel: RegressionModel;

  lowModel = _createRegressionModel(
    scalarXTransform.bind(null, config.lowerBoundScalar),
    yTransform,
    scalarFittedYTakingCoefs.bind(null, config.lowerBoundScalar),
    dataPoints
  );
  highModel = _createRegressionModel(
    scalarXTransform.bind(null, config.upperBoundScalar),
    yTransform,
    scalarFittedYTakingCoefs.bind(null, config.upperBoundScalar),
    dataPoints
  );

  let lowScalar = config.lowerBoundScalar;
  let highScalar = config.upperBoundScalar;
  for (let i = 0; i < config.maxSearchDepth; ++i) {
    middleScalar = (lowScalar + highScalar) / 2;
    middleModel = _createRegressionModel(
      scalarXTransform.bind(null, middleScalar),
      yTransform,
      scalarFittedYTakingCoefs.bind(null, middleScalar),
      dataPoints
    );
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
