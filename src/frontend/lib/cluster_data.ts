import type { EffortData } from './effort_data';
import {
  type YAxisType,
  type EffortGraphSpec,
  type EffortGraphSpecPerXUnit,
  createEffortGraphSpecPerXUnit
} from '../lib/effort_graphs';
import { Point, PlottableModel, LogYModel } from '../lib/linear_regression';

const MIN_POINTS_TO_REGRESS = 3;

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

export function toPerLocationModelSet(
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
    const weightedCoefSums: number[] = [];
    let totalPoints = 0;
    let baseModel: PlottableModel | null = null;

    // Loop for each graph spec at one per location in the cluster.

    for (const graphSpec of sizedGraphSpec.graphSpecs) {
      if (graphSpec.points.length >= MIN_POINTS_TO_REGRESS) {
        const locationModel = createModel(modelFactory, graphSpec.points);
        const pointCount = graphSpec.points.length;
        const coefs = locationModel.jstats.coef;
        if (coefs.length == 0) {
          // TypeScript wierdly "can't find" coefs in a for loop here.
          coefs.forEach((coef) => weightedCoefSums.push(pointCount * coef));
        } else {
          // TypeScript wierdly "can't find" coefs in a for loop here.
          coefs.forEach((coef, i) => (weightedCoefSums[i] += pointCount * coef));
        }
        totalPoints += pointCount;
        if (baseModel === null) baseModel = locationModel;
      }
    }

    // Combine the models if we were able to generate at least one model.

    if (baseModel !== null) {
      for (let i = 0; i < weightedCoefSums.length; ++i) {
        baseModel.jstats.coef[i] = weightedCoefSums[i] / totalPoints;
      }
      perLocationModelSet.models.push(baseModel);
    }
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
