import * as jstat from 'jstat';

const MAX_POWER_SPLITS = 15;
const POINTS_IN_MODEL_PLOT = 200;
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
type FittedY = (y: number) => number;
type FittedYTakingCoefs = (coefs: number[], y: number) => number;

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
  modelPoints!: Point[];

  jstats!: JstatModel;
  fittedY!: FittedY;
  rmse!: number;
  residuals!: Point[];

  constructor(name: string, hexColor: string) {
    this.name = name;
    this.hexColor = hexColor;
  }

  protected _assignModel(
    model: RegressionModel,
    dataPoints: Point[],
    toTerms: (coefs: number[]) => string[]
  ): void {
    Object.assign(this, model);
    // @ts-ignore
    this.modelPoints = _getModelPoints(dataPoints, model.fittedY);
    this.equation = toTerms(this.jstats.coef).join(' ');
  }
}

export class QuadraticModel extends PlottableModel {
  constructor(hexColor: string, dataPoints: Point[]) {
    super('quadratic fit', hexColor);

    const xTransform: XTransform = (x) => [x * x, x, 1];
    const fittedYTakingCoefs: FittedYTakingCoefs = (coefs, x) =>
      coefs[0] * x * x + coefs[1] * x + coefs[2];

    const model = _createRegressionModel(xTransform, fittedYTakingCoefs, dataPoints);
    this._assignModel(model, dataPoints, (coefs) => [
      _coefHtml(coefs[0], true),
      ' x<sup>2</sup> ',
      _coefHtml(coefs[1]),
      ' x ',
      _coefHtml(coefs[2])
    ]);
  }
}

export class PowerModel extends PlottableModel {
  constructor(hexColor: string, dataPoints: Point[]) {
    super('power fit', hexColor);

    const [model, power] = _findBestScalar(
      dataPoints,
      0.001,
      3,
      MAX_POWER_SPLITS,
      (p, x) => [Math.pow(x, p), 1],
      (p, coefs, x) => coefs[0] * Math.pow(x, p) + coefs[1]
    );

    // @ts-ignore
    this._assignModel(model, dataPoints, (coefs) => [
      _coefHtml(coefs[0], true),
      ' x<sup>',
      // @ts-ignore
      shortenValue(power, 4),
      '</sup> ',
      _coefHtml(coefs[1])
    ]);
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
  fittedYTakingCoefs: FittedYTakingCoefs,
  dataPoints: Point[]
): RegressionModel {
  const independentValues: number[][] = [];
  const dependentValues: number[] = [];
  for (const point of dataPoints) {
    independentValues.push(xTransform(point.x));
    dependentValues.push(point.y);
  }

  const jstats: JstatModel = jstat.models.ols(dependentValues, independentValues);
  const coefs = jstats.coef;
  const fittedY = fittedYTakingCoefs.bind(null, coefs);
  const residuals = _getResiduals(dataPoints, fittedY);
  const rmse = _getRMSE(residuals);

  return { jstats, fittedY, rmse, residuals };
}

function _getModelPoints(dataPoints: Point[], fittedY: FittedY) {
  let lowestX = Infinity;
  let highestX = 0;
  for (const point of dataPoints) {
    if (point.x < lowestX) lowestX = point.x;
    if (point.x > highestX) highestX = point.x;
  }

  const points: Point[] = [];
  const deltaX = (highestX - lowestX) / POINTS_IN_MODEL_PLOT;
  let x = lowestX;
  while (x <= highestX) {
    points.push({ x, y: fittedY(x) });
    x += deltaX;
  }
  return points;
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
  dataPoints: Point[],
  lowerBoundScalar: number,
  upperBoundScalar: number,
  maxSearchSplits: number,
  powerXTransform: (p: number, x: number) => number[],
  fittedYTakingPAndCoefs: (p: number, coefs: number[], y: number) => number
): [RegressionModel, number] {
  let lowModel: RegressionModel;
  let middlePower: number;
  let middleModel: RegressionModel;
  let highModel: RegressionModel;

  lowModel = _createRegressionModel(
    powerXTransform.bind(null, lowerBoundScalar),
    fittedYTakingPAndCoefs.bind(null, lowerBoundScalar),
    dataPoints
  );
  highModel = _createRegressionModel(
    powerXTransform.bind(null, upperBoundScalar),
    fittedYTakingPAndCoefs.bind(null, upperBoundScalar),
    dataPoints
  );

  let lowPower = lowerBoundScalar;
  let highPower = upperBoundScalar;
  for (let i = 0; i < maxSearchSplits; ++i) {
    middlePower = (lowPower + highPower) / 2;
    middleModel = _createRegressionModel(
      powerXTransform.bind(null, middlePower),
      fittedYTakingPAndCoefs.bind(null, middlePower),
      dataPoints
    );
    if (lowModel.rmse < highModel.rmse) {
      highPower = middlePower;
      highModel = middleModel;
    } else {
      lowPower = middlePower;
      lowModel = middleModel;
    }
  }

  // @ts-ignore
  return [middleModel, middlePower];
}
