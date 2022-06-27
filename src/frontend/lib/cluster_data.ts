import type { EffortData } from './effort_data';
import {
  type YAxisType,
  type EffortGraphSpec,
  type MultiEffortGraphSpec,
  createMultiEffortGraphSpec
} from '../lib/effort_graphs';
import { Point, PlottableModel, LogYModel } from '../lib/linear_regression';

export enum YAxisModel {
  none = 'y',
  logY = 'log(y)'
}

export type ModelFactory = (
  dataPoints: Point[],
  yTransform?: (y: number) => number
) => PlottableModel;

export interface JumbledClusterData {
  locationCount: number;
  multiSpec: MultiEffortGraphSpec;
}

export interface SizedEffortGraphSpec {
  pointCount: number;
  graphSpecs: EffortGraphSpec[];
}

export interface PerLocationClusterData {
  perDayTotalsGraphs: SizedEffortGraphSpec;
  perVisitTotalsGraphs: SizedEffortGraphSpec;
  perPersonVisitTotalsGraphs: SizedEffortGraphSpec;
}

export interface PerLocationModelSet {
  models: PlottableModel[];
  pointSets: Point[][];
}

export function toJumbledClusterData(
  yAxisType: YAxisType,
  effortDataSet: EffortData[],
  lowerBoundX: number,
  upperBoundX: number,
  minUnchangedY: number,
  zeroYBaseline: boolean
): JumbledClusterData {
  let clusterMultiSpec: MultiEffortGraphSpec | null = null;
  for (const effortData of effortDataSet) {
    const multiSpec = createMultiEffortGraphSpec(
      yAxisType,
      effortData,
      lowerBoundX,
      upperBoundX,
      minUnchangedY,
      zeroYBaseline
    );
    if (!clusterMultiSpec) {
      clusterMultiSpec = multiSpec;
    } else {
      clusterMultiSpec.perDayTotalsGraph.points.push(
        ...multiSpec.perDayTotalsGraph.points
      );
      clusterMultiSpec.perVisitTotalsGraph.points.push(
        ...multiSpec.perVisitTotalsGraph.points
      );
      clusterMultiSpec.perPersonVisitTotalsGraph.points.push(
        ...multiSpec.perPersonVisitTotalsGraph.points
      );
    }
  }
  return {
    locationCount: effortDataSet.length,
    multiSpec: clusterMultiSpec!
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
    perDayTotalsGraphs: { pointCount: 0, graphSpecs: [] },
    perVisitTotalsGraphs: { pointCount: 0, graphSpecs: [] },
    perPersonVisitTotalsGraphs: { pointCount: 0, graphSpecs: [] }
  };
  for (const effortData of effortDataSet) {
    const multiSpec = createMultiEffortGraphSpec(
      yAxisType,
      effortData,
      lowerBoundX,
      upperBoundX,
      minUnchangedY,
      zeroYBaseline
    );
    _addGraphSpec(clusterData.perDayTotalsGraphs, multiSpec.perDayTotalsGraph);
    _addGraphSpec(clusterData.perVisitTotalsGraphs, multiSpec.perVisitTotalsGraph);
    _addGraphSpec(
      clusterData.perPersonVisitTotalsGraphs,
      multiSpec.perPersonVisitTotalsGraph
    );
  }
  return clusterData;
}

export function toPerLocationModel(
  modelFactories: ModelFactory[],
  yAxisModel: YAxisModel,
  sizedGraphSpec: SizedEffortGraphSpec
): PerLocationModelSet {
  const perLocationModelSet: PerLocationModelSet = {
    models: [],
    pointSets: []
  };

  let createModel: (factory: ModelFactory, points: Point[]) => PlottableModel;
  switch (yAxisModel) {
    case YAxisModel.none:
      createModel = (modelFactory, points) => modelFactory(points);
      break;
    case YAxisModel.logY:
      createModel = (modelFactory, points) => new LogYModel(points, modelFactory);
      break;
  }

  for (const modelFactory of modelFactories) {
    const coefSums: number[] = [];
    let model: PlottableModel | null = null;

    for (const graphSpec of sizedGraphSpec.graphSpecs) {
      const tempModel = createModel(modelFactory, graphSpec.points);
      const coefs = tempModel.jstats.coef;
      if (coefSums.length == 0) {
        coefSums.forEach((coef) => coefs.push(coef));
      } else {
        coefSums.forEach((coef, i) => (coefs[i] += coef));
      }
      if (model === null) model = tempModel;
    }

    coefSums.forEach(
      (sum, i) => (model!.jstats.coef[i] = sum / sizedGraphSpec.graphSpecs.length)
    );
    perLocationModelSet.models.push(model!);
  }
  for (const graphSpec of sizedGraphSpec.graphSpecs) {
    perLocationModelSet.pointSets.push(graphSpec.points);
  }
  return perLocationModelSet;
}

function _addGraphSpec(sizedSpec: SizedEffortGraphSpec, spec: EffortGraphSpec): void {
  sizedSpec.pointCount += spec.points.length;
  sizedSpec.graphSpecs.push(spec);
}
