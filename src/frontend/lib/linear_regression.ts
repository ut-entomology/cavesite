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

export interface RegressionModel {
  name: string;
  jstat: JstatModel;
  rmse: number;
  hexColor: string;
  html: string;
}

export interface RegressionInfo {
  model: RegressionModel;
  predict: (y: number) => number;
  points: Point[];
  errors: number[];
}

export function fitQuadraticModel(hexColor: string, points: Point[]): RegressionInfo {
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
  const predict = (x: number) =>
    jstatModel.coef[0] * x * x + jstatModel.coef[1] * x + jstatModel.coef[2];
  while (x <= highestX) {
    modelPoints.push({ x, y: predict(x) });
    x += deltaX;
  }

  const errors = points.map((point) => point.y - predict(point.x));
  const rmse = Math.sqrt(jstat.sumsqrd(errors) / errors.length);
  const html = `y = ${jstatModel.coef[0].toPrecision(
    MODEL_COEF_PRECISION
  )} x<sup>2</sup> + ${jstatModel.coef[1].toPrecision(
    MODEL_COEF_PRECISION
  )} x + ${jstatModel.coef[2].toPrecision(MODEL_COEF_PRECISION)}`;
  return {
    model: {
      name: 'quadratic fit',
      jstat: jstatModel,
      rmse,
      hexColor,
      html
    },
    predict,
    points: modelPoints,
    errors
  };
}

export function fitPowerModel(hexColor: string, points: Point[]): RegressionInfo {
  let lowPower = 0.00001;
  let lowModelInfo: RegressionInfo;
  let middlePower;
  let middleModelInfo: RegressionInfo;
  let highPower = 3;
  let highModelInfo: RegressionInfo;

  lowModelInfo = _tryPowerRegression(hexColor, lowPower, points);
  highModelInfo = _tryPowerRegression(hexColor, highPower, points);
  for (let i = 0; i < MAX_POWER_SPLITS; ++i) {
    middlePower = (lowPower + highPower) / 2;
    middleModelInfo = _tryPowerRegression(hexColor, middlePower, points);
    if (lowModelInfo.model.rmse < highModelInfo.model.rmse) {
      highPower = middlePower;
      highModelInfo = middleModelInfo;
    } else {
      lowPower = middlePower;
      lowModelInfo = middleModelInfo;
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
    middleModelInfo.points.push({ x, y: middleModelInfo.predict(x) });
    x += deltaX;
  }
  // @ts-ignore
  return middleModelInfo;
}

function _tryPowerRegression(
  hexColor: string,
  power: number,
  points: Point[]
): RegressionInfo {
  const independentValues: number[][] = []; // [species^power]
  const dependentValues: number[] = []; // effort
  for (const point of points) {
    independentValues.push([Math.pow(point.x, power), 1]);
    dependentValues.push(point.y);
  }
  const jstatModel: JstatModel = jstat.models.ols(dependentValues, independentValues);
  const predict = (x: number) =>
    jstatModel.coef[0] * Math.pow(x, power) + jstatModel.coef[1];

  const errors = points.map((point) => point.y - predict(point.x));
  const rmse = Math.sqrt(jstat.sumsqrd(errors) / errors.length);
  const html = `y = ${jstatModel.coef[0].toPrecision(
    MODEL_COEF_PRECISION
  )} x<sup>${power.toPrecision(5)}</sup> + ${jstatModel.coef[1].toPrecision(
    MODEL_COEF_PRECISION
  )}`;

  return {
    model: {
      name: 'power fit',
      jstat: jstatModel,
      rmse,
      hexColor,
      html
    },
    predict,
    points: [],
    errors
  };
}
