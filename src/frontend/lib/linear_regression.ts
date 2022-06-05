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

export interface FittedModel {
  name: string;
  jstat: JstatModel;
  rmse: number;
  hexColor: string;
  equation: string;
  fittedY: (y: number) => number;
  points: Point[];
  residuals: Point[];
}

export function fitQuadraticModel(hexColor: string, points: Point[]): FittedModel {
  const independentValues: number[][] = []; // [effort^2, effort]
  const dependentValues: number[] = []; // species count
  let lowestX = 10000;
  let highestX = 0;
  for (const point of points) {
    independentValues.push([point.x * point.x, point.x, 1]);
    dependentValues.push(point.y);
    if (point.x < lowestX) lowestX = point.x;
    if (point.x > highestX) highestX = point.x;
  }
  const jstatModel: JstatModel = jstat.models.ols(dependentValues, independentValues);

  const modelPoints: Point[] = [];
  const deltaX = (highestX - lowestX) / POINTS_IN_MODEL_PLOT;
  let x = lowestX;
  const fittedY = (x: number) =>
    jstatModel.coef[0] * x * x + jstatModel.coef[1] * x + jstatModel.coef[2];
  while (x <= highestX) {
    modelPoints.push({ x, y: fittedY(x) });
    x += deltaX;
  }

  const residuals = _getResiduals(points, fittedY);
  const rmse = _getRMSE(residuals);

  const equation = `y = ${_coefHtml(
    jstatModel.coef[0],
    true
  )} x<sup>2</sup> ${_coefHtml(jstatModel.coef[1])} x ${_coefHtml(jstatModel.coef[2])}`;

  return {
    name: 'quadratic fit',
    jstat: jstatModel,
    rmse,
    hexColor,
    equation,
    fittedY,
    points: modelPoints,
    residuals
  };
}

export function fitPowerModel(hexColor: string, points: Point[]): FittedModel {
  let lowPower = 0.00001;
  let lowModel: FittedModel;
  let middlePower;
  let middleModel: FittedModel;
  let highPower = 3;
  let highModel: FittedModel;

  lowModel = _tryPowerRegression(hexColor, lowPower, points);
  highModel = _tryPowerRegression(hexColor, highPower, points);
  for (let i = 0; i < MAX_POWER_SPLITS; ++i) {
    middlePower = (lowPower + highPower) / 2;
    middleModel = _tryPowerRegression(hexColor, middlePower, points);
    if (lowModel.rmse < highModel.rmse) {
      highPower = middlePower;
      highModel = middleModel;
    } else {
      lowPower = middlePower;
      lowModel = middleModel;
    }
  }

  let lowestX = 10000;
  let highestX = 0;
  for (const point of points) {
    if (point.x < lowestX) lowestX = point.x;
    if (point.x > highestX) highestX = point.x;
  }

  const deltaX = (highestX - lowestX) / POINTS_IN_MODEL_PLOT;
  let x = lowestX;
  while (x <= highestX) {
    // @ts-ignore
    middleModel.points.push({ x, y: middleModel.fittedY(x) });
    x += deltaX;
  }
  // @ts-ignore
  return middleModel;
}

export function shortenValue(value: number, precision: number) {
  if (value != 0 && Math.abs(value) < 0.0001) {
    return value.toExponential(precision - 1);
  }
  return value.toPrecision(precision);
}

function _tryPowerRegression(
  hexColor: string,
  power: number,
  points: Point[]
): FittedModel {
  const independentValues: number[][] = []; // [species^power]
  const dependentValues: number[] = []; // effort
  for (const point of points) {
    independentValues.push([Math.pow(point.x, power), 1]);
    dependentValues.push(point.y);
  }
  const jstatModel: JstatModel = jstat.models.ols(dependentValues, independentValues);
  const fittedY = (x: number) =>
    jstatModel.coef[0] * Math.pow(x, power) + jstatModel.coef[1];

  const residuals = _getResiduals(points, fittedY);
  const rmse = _getRMSE(residuals);

  const equation = `y = ${_coefHtml(jstatModel.coef[0], true)} x<sup>${shortenValue(
    power,
    4
  )}</sup> ${_coefHtml(jstatModel.coef[1])}`;

  return {
    name: 'power fit',
    jstat: jstatModel,
    rmse,
    hexColor,
    equation,
    fittedY,
    points: [],
    residuals
  };
}

function _coefHtml(coef: number, firstCoef = false) {
  if (firstCoef) {
    return shortenValue(coef, MODEL_COEF_PRECISION);
  }
  return (coef >= 0 ? '+ ' : '- ') + shortenValue(Math.abs(coef), MODEL_COEF_PRECISION);
}

function _getResiduals(points: Point[], fittedY: (y: number) => number) {
  return points.map((point) => {
    return { x: point.x, y: point.y - fittedY(point.x) };
  });
}

function _getRMSE(residuals: Point[]) {
  let sumOfSquares = 0;
  residuals.forEach((residual) => (sumOfSquares += residual.y * residual.y));
  return Math.sqrt(sumOfSquares / residuals.length);
}
