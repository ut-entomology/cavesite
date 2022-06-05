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

type FittedY = (y: number) => number;

interface TrialModel {
  jstats: JstatModel;
  fittedY: FittedY;
  rmse: number;
  residuals: Point[];
}

export interface FittedModel extends TrialModel {
  name: string;
  hexColor: string;
  equation: string;
  points: Point[];
}

export class QuadraticModel implements FittedModel {
  name: string;
  jstats: JstatModel;
  fittedY: FittedY;
  rmse: number;
  hexColor: string;
  equation: string;
  points: Point[];
  residuals: Point[];

  constructor(hexColor: string, dataPoints: Point[]) {
    this.name = 'quadratic fit';
    this.hexColor = hexColor;

    const independentValues: number[][] = []; // [effort^2, effort]
    const dependentValues: number[] = []; // species count
    for (const point of dataPoints) {
      independentValues.push([point.x * point.x, point.x, 1]);
      dependentValues.push(point.y);
    }
    this.jstats = jstat.models.ols(dependentValues, independentValues);
    const coefs = this.jstats.coef;
    this.fittedY = (x: number) => coefs[0] * x * x + coefs[1] * x + coefs[2];
    this.points = _getModelPoints(dataPoints, this.fittedY);
    this.residuals = _getResiduals(dataPoints, this.fittedY);
    this.rmse = _getRMSE(this.residuals);
    this.equation = [
      _coefHtml(coefs[0], true),
      ' x<sup>2</sup> ',
      _coefHtml(coefs[1]),
      ' x ',
      _coefHtml(coefs[2])
    ].join(' ');
  }
}

export class PowerModel implements FittedModel {
  name: string;
  jstats: JstatModel;
  fittedY: FittedY;
  rmse: number;
  hexColor: string;
  equation: string;
  points: Point[];
  residuals: Point[];

  constructor(hexColor: string, dataPoints: Point[]) {
    this.name = 'power fit';
    this.hexColor = hexColor;

    let lowPower = 0.001;
    let lowModel: TrialModel;
    let middlePower;
    let middleModel: TrialModel;
    let highPower = 3;
    let highModel: TrialModel;

    lowModel = this._tryPowerRegression(lowPower, dataPoints);
    highModel = this._tryPowerRegression(highPower, dataPoints);
    for (let i = 0; i < MAX_POWER_SPLITS; ++i) {
      middlePower = (lowPower + highPower) / 2;
      middleModel = this._tryPowerRegression(middlePower, dataPoints);
      if (lowModel.rmse < highModel.rmse) {
        highPower = middlePower;
        highModel = middleModel;
      } else {
        lowPower = middlePower;
        lowModel = middleModel;
      }
    }

    // @ts-ignore
    this.jstats = middleModel.jstats;
    // @ts-ignore
    this.rmse = middleModel.rmse;
    // @ts-ignore
    this.residuals = middleModel.residuals;
    // @ts-ignore
    this.fittedY = middleModel.fittedY;
    // @ts-ignore
    this.points = _getModelPoints(dataPoints, middleModel.fittedY);
    const coefs = this.jstats.coef;
    this.equation = [
      _coefHtml(coefs[0], true),
      ' x<sup>',
      // @ts-ignore
      shortenValue(middlePower, 4),
      '</sup> ',
      _coefHtml(coefs[1])
    ].join(' ');
  }

  private _tryPowerRegression(power: number, points: Point[]): TrialModel {
    const independentValues: number[][] = []; // [effort^power]
    const dependentValues: number[] = []; // species count
    for (const point of points) {
      independentValues.push([Math.pow(point.x, power), 1]);
      dependentValues.push(point.y);
    }
    const jstats: JstatModel = jstat.models.ols(dependentValues, independentValues);

    const coefs = jstats.coef;
    const fittedY = (x: number) => coefs[0] * Math.pow(x, power) + coefs[1];
    const residuals = _getResiduals(points, fittedY);
    const rmse = _getRMSE(residuals);

    return { jstats, fittedY, rmse, residuals };
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

function _getModelPoints(dataPoints: Point[], fittedY: FittedY) {
  let lowestX = 10000;
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
