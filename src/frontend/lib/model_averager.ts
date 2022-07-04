import type { EffortGraphSpec } from './effort_graphs';
import type { PlottableModel, PlottableModelFactory } from './plottable_model';
import type { FittedY, YTransform } from './regression';
import type { Point } from '../../shared/point';

export abstract class ModelAverager {
  abstract addModel(
    graphSpec: EffortGraphSpec,
    model: PlottableModel,
    weightPower: number
  ): void;

  abstract getAverageModel(lowestX: number, highestX: number): PlottableModel;

  protected _toWeight(graphSpec: EffortGraphSpec, weightPower: number): number {
    const lastX = graphSpec.points[graphSpec.points.length - 1].x;
    return lastX ** weightPower;
  }
}

export class PolynomialAverager extends ModelAverager {
  private _baseModel: PlottableModel | null = null;
  private _weightedCoefSums: number[] = [];
  private _totalWeight = 0;

  addModel(
    graphSpec: EffortGraphSpec,
    model: PlottableModel,
    weightPower: number
  ): void {
    const coefs = model.regression.jstats.coef;
    const weight = this._toWeight(graphSpec, weightPower);

    for (let i = 0; i < coefs.length; ++i) {
      if (this._baseModel == null) {
        this._weightedCoefSums[i] = weight * coefs[i];
      } else {
        this._weightedCoefSums[i] += weight * coefs[i];
      }
    }
    this._totalWeight += weight;

    if (!this._baseModel) this._baseModel = model;
  }

  getAverageModel(lowestX: number, highestX: number): PlottableModel {
    // The average of the equations for y can be computed by averaging
    // the coefficients of the terms of the polynomial.
    const baseModel = this._baseModel!;
    for (let i = 0; i < this._weightedCoefSums.length; ++i) {
      baseModel.regression.jstats.coef[i] =
        this._weightedCoefSums[i] / this._totalWeight;
    }
    baseModel.lowestX = lowestX;
    baseModel.highestX = highestX;
    return baseModel;
  }
}

const AVERAGED_MODEL_POINTS = 20; // shouldn't need very many

interface _ModelInfo {
  fittedY: FittedY;
  weight: number;
}

export class PlotAverager extends ModelAverager {
  private _modelFactory: PlottableModelFactory;
  private _yTransform?: YTransform;
  private _baseModel: PlottableModel | null = null;
  private _modelInfos: _ModelInfo[] = [];
  private _totalWeight = 0;

  constructor(modelFactory: PlottableModelFactory, yTransform?: YTransform) {
    super();
    this._modelFactory = modelFactory;
    this._yTransform = yTransform;
  }

  addModel(
    graphSpec: EffortGraphSpec,
    model: PlottableModel,
    weightPower: number
  ): void {
    const weight = this._toWeight(graphSpec, weightPower);
    this._modelInfos.push({
      fittedY: model.regression.fittedY,
      weight
    });
    this._totalWeight += weight;
    if (!this._baseModel) this._baseModel = model;
  }

  getAverageModel(lowestX: number, highestX: number): PlottableModel {
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
    return this._modelFactory(points, this._yTransform);
  }
}
