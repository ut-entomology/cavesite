import type { FittedModel, FittedModelFactory } from './fitted_model';
import type { FittedY } from './regression';
import type { Point } from '../../../shared/point';

const AVERAGED_MODEL_POINTS = 20; // shouldn't need very many

interface _ModelInfo {
  fittedY: FittedY;
  weight: number;
}

export class ModelAverager {
  private _modelFactory: FittedModelFactory;
  private _baseModel: FittedModel | null = null;
  private _modelInfos: _ModelInfo[] = [];
  private _totalWeight = 0;

  constructor(modelFactory: FittedModelFactory) {
    this._modelFactory = modelFactory;
  }

  addModel(points: Point[], model: FittedModel, weightPower: number): void {
    const weight = this._toWeight(points, weightPower);
    this._modelInfos.push({
      fittedY: model.regression.fittedY,
      weight
    });
    this._totalWeight += weight;
    if (!this._baseModel) this._baseModel = model;
  }

  getAverageModel(lowestX: number, highestX: number): FittedModel {
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