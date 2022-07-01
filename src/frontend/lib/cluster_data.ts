import type { Point } from '../../shared/point';
import type { EffortData } from './effort_data';
import {
  type YAxisType,
  type EffortGraphSpec,
  type EffortGraphSpecPerXUnit,
  createEffortGraphSpecPerXUnit
} from '../lib/effort_graphs';
import { PlottableModel, LogYModel } from '../lib/plottable_model';

const MIN_POINTS_TO_REGRESS = 20;

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
  modelFactories: ModelFactory[],
  yAxisModel: YAxisModel,
  sizedGraphSpec: SizedEffortGraphSpec
): PlottableModel[] {
  const models: PlottableModel[] = [];

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
    const allPoints: Point[] = [];
    let baseModel: PlottableModel | null = null;
    let lowestX = Infinity;
    let highestX = 0;
    let totalWeight = 0;

    // Loop for each graph spec at one per location in the cluster.

    let firstGraphSpec = true;
    for (const graphSpec of sizedGraphSpec.graphSpecs) {
      if (graphSpec.points.length >= MIN_POINTS_TO_REGRESS) {
        const locationModel = createModel(modelFactory, graphSpec.points);

        // TODO: Does not work for Ax^B because A and B are inversely correlated.
        //  I think I have to average the plots of all the efforts in this case.
        const pointCount = graphSpec.points.length;
        const lastX = graphSpec.points[graphSpec.points.length - 1].x;
        const weight = lastX * pointCount * pointCount;
        const coefs = locationModel.regression.jstats.coef;
        for (let i = 0; i < coefs.length; ++i) {
          if (firstGraphSpec) {
            weightedCoefSums[i] = weight * coefs[i];
          } else {
            weightedCoefSums[i] += weight * coefs[i];
          }
        }
        totalWeight += weight;

        allPoints.push(...graphSpec.points);
        if (baseModel === null) baseModel = locationModel;
        if (locationModel.lowestX < lowestX) lowestX = locationModel.lowestX;
        if (locationModel.highestX > highestX) highestX = locationModel.highestX;

        firstGraphSpec = false; // must come last
      }
    }

    // Combine the models if we were able to generate at least one model.

    if (baseModel !== null) {
      for (let i = 0; i < weightedCoefSums.length; ++i) {
        baseModel.regression.jstats.coef[i] = weightedCoefSums[i] / totalWeight;
      }
      baseModel.lowestX = lowestX;
      baseModel.highestX = highestX;
      baseModel.regression.evaluate(allPoints);
      models.push(baseModel);
    }
  }
  return models;
}

function _addGraphSpec(sizedSpec: SizedEffortGraphSpec, spec: EffortGraphSpec): void {
  sizedSpec.pointCount += spec.points.length;
  sizedSpec.graphSpecs.push(spec);
}
