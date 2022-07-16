import { PowerFitModel, type FittedModelFactory } from './power_fit_model';
import type { FittedY } from './regression';
import type { Point } from '../../../shared/point';
import { type EffortGraphSpec, slicePointSet } from './effort_graph_spec';
import type { LocationGraphData } from './location_graph_data';

const AVERAGED_MODEL_POINTS = 20; // shouldn't need very many

interface _ModelInfo {
  fittedY: FittedY;
  weight: number;
}

export class ModelAverager {
  private _modelFactory: FittedModelFactory;
  private _baseModel: PowerFitModel | null = null;
  private _modelInfos: _ModelInfo[] = [];
  private _totalWeight = 0;

  constructor(modelFactory: FittedModelFactory) {
    this._modelFactory = modelFactory;
  }

  addModel(points: Point[], model: PowerFitModel, weightPower: number): void {
    const weight = this._toWeight(points, weightPower);
    this._modelInfos.push({
      fittedY: model.regression.fittedY,
      weight
    });
    this._totalWeight += weight;
    if (!this._baseModel) this._baseModel = model;
  }

  getAverageModel(lowestX: number, highestX: number): PowerFitModel {
    // The average of the equations for y cannot be computed from the
    // average of the coefficients, because the power terms have varying
    // exponents. Instead, average the ys generated by the models, and
    // fit a new power model to these points.
    const points: Point[] = [];
    const deltaX = (highestX - lowestX) / AVERAGED_MODEL_POINTS;
    // Add 0.5 to accommodate deltaX imprecision exceeding highestX.
    for (let x = lowestX; x <= highestX + 0.5; x += deltaX) {
      let weightedYSum = 0;
      for (const modelInfo of this._modelInfos) {
        weightedYSum += modelInfo.weight * modelInfo.fittedY(x);
      }
      points.push({ x, y: weightedYSum / this._totalWeight });
    }
    return this._modelFactory(points);
  }

  protected _toWeight(points: Point[], weightPower: number): number {
    const lastX = points[points.length - 1].x;
    return lastX ** weightPower;
  }
}

export function createAverageModel(
  sourceDataSet: LocationGraphData[],
  graphSpec: EffortGraphSpec,
  minXAllowingRegression: number,
  modelWeightPower: number
): [PowerFitModel | null, LocationGraphData[]] {
  const fittedDataSet: LocationGraphData[] = [];
  const fittedPoints: Point[] = [];
  let modelAverager: ModelAverager | null = null;
  let lowestX = Infinity;
  let highestX = 0;
  let locationCount = 0;

  // Loop for each graph spec at one per location in the cluster.

  for (const locationGraphData of sourceDataSet) {
    const points = slicePointSet(
      graphSpec.pointExtractor(locationGraphData),
      graphSpec.pointSliceSpec
    );
    if (points !== null) {
      const lastPoint = points[points.length - 1];
      if (lastPoint.x >= minXAllowingRegression) {
        const locationModel = new PowerFitModel(points);
        if (modelAverager == null) {
          modelAverager = new ModelAverager((points) => new PowerFitModel(points));
        }
        modelAverager.addModel(points, locationModel, modelWeightPower);
        fittedPoints.push(...points);
        if (points[0].x < lowestX) lowestX = points[0].x;
        if (lastPoint.x > highestX) highestX = lastPoint.x;
        fittedDataSet.push(locationGraphData);
        ++locationCount;
      }
    }
  }

  // Combine the models if we were able to generate at least one model.

  if (modelAverager === null) return [null, sourceDataSet];
  const averageModel = modelAverager.getAverageModel(lowestX, highestX);
  averageModel.regression.evaluate(fittedPoints);
  averageModel.datasetCount = locationCount;
  return [averageModel, fittedDataSet];
}
