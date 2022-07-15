import type { Point } from '../../../shared/point';
import type { EffortGraphSpec } from './effort_graph_spec';
import type { LocationGraphData } from './location_graph_data';
import { Regression, shortenValue } from './regression';
import { ModelAverager } from './model_averager';

const MIN_POINTS_TO_REGRESS = 3; // strictly min. needed to produce any regression
const MODEL_COEF_PRECISION = 3;

export type FittedModelFactory = (dataPoints: Point[]) => FittedModel;

interface RegressionSearchConfig {
  lowerBoundScalar: number;
  upperBoundScalar: number;
  maxSearchDepth: number;
}

type RegressionFactory = (dataPoints: Point[], scalar: number) => Regression;

export class FittedModel {
  lowestX = Infinity;
  highestX = 0;
  regression: Regression;
  power: number;

  private constructor(dataPoints: Point[]) {
    for (const point of dataPoints) {
      if (point.x < this.lowestX) this.lowestX = point.x;
      if (point.x > this.highestX) this.highestX = point.x;
    }

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

  static create(
    graphDataSet: LocationGraphData[],
    graphSpec: EffortGraphSpec,
    minXAllowingRegression: number,
    modelWeightPower: number
  ): FittedModel | null {
    const allPoints: Point[] = [];
    let modelAverager: ModelAverager | null = null;
    let lowestX = Infinity;
    let highestX = 0;

    // Loop for each graph spec at one per location in the cluster.

    const pointSets = graphDataSet.map((graphData) =>
      graphSpec.pointExtractor(graphData)
    );
    for (const points of pointSets) {
      const lastPoint = points[points.length - 1];
      if (
        points.length >= MIN_POINTS_TO_REGRESS &&
        lastPoint.x >= minXAllowingRegression
      ) {
        const locationModel = new FittedModel(points);
        if (modelAverager == null) {
          modelAverager = locationModel.getModelAverager();
        }
        modelAverager.addModel(points, locationModel, modelWeightPower);
      }
      if (points.length > 0) {
        allPoints.push(...points);
        if (points[0].x < lowestX) lowestX = points[0].x;
        if (lastPoint.x > highestX) highestX = lastPoint.x;
      }
    }

    // Combine the models if we were able to generate at least one model.

    if (modelAverager === null) return null;
    const averageModel = modelAverager.getAverageModel(lowestX, highestX);
    averageModel.regression.evaluate(allPoints);
    return averageModel;
  }

  getFirstDerivative(): (x: number) => number {
    const coefs = this.regression.jstats.coef;
    return (x) => this.power * coefs[0] * Math.pow(x, this.power - 1);
  }

  getModelAverager(): ModelAverager {
    return new ModelAverager((points: Point[]) => {
      return new FittedModel(points);
    });
  }

  getModelPoints(pointCount: number): Point[] {
    const modelPoints: Point[] = [];
    const deltaX = (this.highestX - this.lowestX) / pointCount;
    let x = this.lowestX;
    while (x <= this.highestX) {
      const y = this.regression.fittedY(x);
      // Don't plot model points for y < 0.
      if (y >= 0) modelPoints.push({ x, y });
      x += deltaX;
    }
    return modelPoints;
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
