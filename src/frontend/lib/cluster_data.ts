import type { Point } from '../../shared/point';
import type { EffortData } from './effort_data';
import {
  type YAxisType,
  type EffortGraphSpec,
  type EffortGraphSpecPerXUnit,
  createEffortGraphSpecPerXUnit
} from './effort_graphs';
import {
  type PlottableModelFactory,
  PlottableModel,
  LogYModel
} from './plottable_model';
import type { ModelAverager } from './model_averager';

const MIN_POINTS_TO_REGRESS = 10;

export enum YAxisModel {
  none = 'y',
  logY = 'log(y)'
}

export interface JumbledClusterData {
  locationCount: number;
  graphSpecPerXUnit: EffortGraphSpecPerXUnit;
}

export interface PerLocationClusterData {
  locationCount: number;
  perDayTotalsGraphs: SizedEffortGraphSpec;
  perVisitTotalsGraphs: SizedEffortGraphSpec;
  perPersonVisitTotalsGraphs: SizedEffortGraphSpec;
}

export interface SizedEffortGraphSpec {
  pointCount: number;
  graphSpecs: EffortGraphSpec[];
}

export function toJumbledClusterData(
  yAxisType: YAxisType,
  effortDataSet: EffortData[],
  lowerBoundX: number,
  upperBoundX: number,
  minUnchangedY: number,
  zeroYBaseline: boolean
): JumbledClusterData {
  let effortGraphSpecPerUnitX: EffortGraphSpecPerXUnit | null = null;
  for (const effortData of effortDataSet) {
    const graphSpecPerXUnit = createEffortGraphSpecPerXUnit(
      yAxisType,
      effortData,
      lowerBoundX,
      upperBoundX,
      minUnchangedY,
      zeroYBaseline
    );
    if (!effortGraphSpecPerUnitX) {
      effortGraphSpecPerUnitX = graphSpecPerXUnit;
    } else {
      effortGraphSpecPerUnitX.perDayTotalsGraph.points.push(
        ...graphSpecPerXUnit.perDayTotalsGraph.points
      );
      effortGraphSpecPerUnitX.perVisitTotalsGraph.points.push(
        ...graphSpecPerXUnit.perVisitTotalsGraph.points
      );
      effortGraphSpecPerUnitX.perPersonVisitTotalsGraph.points.push(
        ...graphSpecPerXUnit.perPersonVisitTotalsGraph.points
      );
    }
  }
  return {
    locationCount: effortDataSet.length,
    graphSpecPerXUnit: effortGraphSpecPerUnitX!
  };
}

export function toPerLocationClusterData(
  yAxisType: YAxisType,
  effortDataSet: EffortData[],
  lowerBoundX: number,
  upperBoundX: number,
  minUnchangedY: number,
  zeroYBaseline: boolean
): PerLocationClusterData {
  let clusterData: PerLocationClusterData = {
    locationCount: effortDataSet.length,
    perDayTotalsGraphs: { pointCount: 0, graphSpecs: [] },
    perVisitTotalsGraphs: { pointCount: 0, graphSpecs: [] },
    perPersonVisitTotalsGraphs: { pointCount: 0, graphSpecs: [] }
  };
  for (const effortData of effortDataSet) {
    const graphSpecPerXUnit = createEffortGraphSpecPerXUnit(
      yAxisType,
      effortData,
      lowerBoundX,
      upperBoundX,
      minUnchangedY,
      zeroYBaseline
    );
    _addGraphSpec(clusterData.perDayTotalsGraphs, graphSpecPerXUnit.perDayTotalsGraph);
    _addGraphSpec(
      clusterData.perVisitTotalsGraphs,
      graphSpecPerXUnit.perVisitTotalsGraph
    );
    _addGraphSpec(
      clusterData.perPersonVisitTotalsGraphs,
      graphSpecPerXUnit.perPersonVisitTotalsGraph
    );
  }
  return clusterData;
}

export function toPerLocationModels(
  modelFactories: PlottableModelFactory[],
  yAxisModel: YAxisModel,
  sizedGraphSpec: SizedEffortGraphSpec
): PlottableModel[] {
  const models: PlottableModel[] = [];

  let createModel: (factory: PlottableModelFactory, points: Point[]) => PlottableModel;
  switch (yAxisModel) {
    case YAxisModel.none:
      createModel = (modelFactory, points) => modelFactory(points);
      break;
    case YAxisModel.logY:
      createModel = (modelFactory, points) => new LogYModel(points, modelFactory);
      break;
  }

  for (const modelFactory of modelFactories) {
    const allPoints: Point[] = [];
    let modelAverager: ModelAverager | null = null;
    let lowestX = Infinity;
    let highestX = 0;

    // Loop for each graph spec at one per location in the cluster.

    for (const graphSpec of sizedGraphSpec.graphSpecs) {
      const points = graphSpec.points;
      if (points.length >= MIN_POINTS_TO_REGRESS) {
        const locationModel = createModel(modelFactory, points);
        if (modelAverager == null) {
          modelAverager = locationModel.getModelAverager();
        }
        modelAverager.addModel(graphSpec, locationModel);
      }
      allPoints.push(...points);
      if (points[0].x < lowestX) lowestX = points[0].x;
      const lastPoint = points[points.length - 1];
      if (lastPoint.x > highestX) highestX = lastPoint.x;
    }

    // Combine the models if we were able to generate at least one model.

    if (modelAverager !== null) {
      const averageModel = modelAverager.getAverageModel(lowestX, highestX);
      averageModel.regression.evaluate(allPoints);
      models.push(averageModel);
    }
  }
  return models;
}

function _addGraphSpec(sizedSpec: SizedEffortGraphSpec, spec: EffortGraphSpec): void {
  sizedSpec.pointCount += spec.points.length;
  sizedSpec.graphSpecs.push(spec);
}
