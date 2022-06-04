import * as jstat from 'jstat';

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
  points: Point[];
  errors: number[];
}

export function fitQuadraticModel(hexColor: string, points: Point[]): RegressionInfo {
  const independentValues: number[][] = []; // [species^2, species]
  const dependentValues: number[] = []; // effort
  let lowestSpeciesCount = 10000;
  let highestSpeciesCount = 0;
  for (const point of points) {
    independentValues.push([point.y * point.y, point.y]);
    dependentValues.push(point.x);
    if (point.y < lowestSpeciesCount) lowestSpeciesCount = point.y;
    if (point.y > highestSpeciesCount) highestSpeciesCount = point.y;
  }
  const jstatModel: JstatModel = jstat.models.ols(dependentValues, independentValues);

  const modelPoints: Point[] = [];
  const deltaSpecies =
    (highestSpeciesCount - lowestSpeciesCount) / POINTS_IN_MODEL_PLOT;
  let speciesCount = lowestSpeciesCount;
  const predict = (y: number) => jstatModel.coef[0] * y * y + jstatModel.coef[1] * y;
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
  )} x<sup>2</sup> + ${jstatModel.coef[1].toPrecision(MODEL_COEF_PRECISION)} x`;
  return {
    model: {
      name: 'quadratic fit',
      jstat: jstatModel,
      rmse,
      hexColor,
      html
    },
    points: modelPoints,
    errors
  };
}
