import * as jstat from 'jstat';

const MAX_POWER_SPLITS = 10;
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
  const independentValues: number[][] = []; // [species^2, species]
  const dependentValues: number[] = []; // effort
  let lowestSpeciesCount = 10000;
  let highestSpeciesCount = 0;
  for (const point of points) {
    independentValues.push([point.y * point.y, point.y, 1]);
    dependentValues.push(point.x);
    if (point.y < lowestSpeciesCount) lowestSpeciesCount = point.y;
    if (point.y > highestSpeciesCount) highestSpeciesCount = point.y;
  }
  const jstatModel: JstatModel = jstat.models.ols(dependentValues, independentValues);

  const modelPoints: Point[] = [];
  const deltaSpecies =
    (highestSpeciesCount - lowestSpeciesCount) / POINTS_IN_MODEL_PLOT;
  let speciesCount = lowestSpeciesCount;
  const predict = (y: number) =>
    jstatModel.coef[0] * y * y + jstatModel.coef[1] * y + jstatModel.coef[2];
  while (speciesCount <= highestSpeciesCount) {
    modelPoints.push({
      x: predict(speciesCount),
      y: speciesCount
    });
    speciesCount += deltaSpecies;
  }

  const errors = points.map((point) => point.x - predict(point.y));
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
  let lowPower = 1;
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

  let lowestSpeciesCount = 10000;
  let highestSpeciesCount = 0;
  for (const point of points) {
    if (point.y < lowestSpeciesCount) lowestSpeciesCount = point.y;
    if (point.y > highestSpeciesCount) highestSpeciesCount = point.y;
  }

  const deltaSpecies =
    (highestSpeciesCount - lowestSpeciesCount) / POINTS_IN_MODEL_PLOT;
  let speciesCount = lowestSpeciesCount;
  while (speciesCount <= highestSpeciesCount) {
    // @ts-ignore
    middleModelInfo.points.push({
      // @ts-ignore
      x: middleModelInfo.predict(speciesCount),
      y: speciesCount
    });
    speciesCount += deltaSpecies;
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
    independentValues.push([Math.pow(point.y, power), 1]);
    dependentValues.push(point.x);
  }
  const jstatModel: JstatModel = jstat.models.ols(dependentValues, independentValues);
  const predict = (y: number) =>
    jstatModel.coef[0] * Math.pow(y, power) + jstatModel.coef[1];

  const errors = points.map((point) => point.x - predict(point.y));
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
