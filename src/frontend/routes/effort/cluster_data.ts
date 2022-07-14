import type { Point } from '../../../shared/point';
import type { TaxonRank, ComparedTaxa } from '../../../shared/model';
import type { EffortData } from './effort_data';
import {
  type EffortGraphSpec,
  type EffortGraphSpecPerXUnit,
  createEffortGraphSpecPerXUnit
} from './effort_graphs';
import {
  type PlottableModelFactory,
  PlottableModel,
  LogYModel,
  LogYPlus1Model,
  SquareRootYModel
} from './plottable_model';
import type { ModelAverager } from './model_averager';

const MIN_POINTS_TO_REGRESS = 3; // strictly min. needed to produce any regression

export enum YAxisModel {
  none = 'y',
  logY = 'log(y)',
  logYPlus1 = 'log(y+1)',
  squareRootY = 'sqrt(y)'
}

export interface ClusteringConfig {
  maxClusters: number;
  comparedTaxa: ComparedTaxa;
  ignoreSubgenera: boolean;
  highestComparedRank: TaxonRank;
  minPointsToRegress: number;
  maxPointsToRegress: number;
}

export enum ClusterDataType {
  jumbled = 'jumbled',
  perLocation = 'per-location'
}

export interface ClusterData {
  type: ClusterDataType;
  locationCount: number;
  visitsByTaxonUnique: Record<string, number>;
}

export interface JumbledClusterData extends ClusterData {
  graphSpecPerXUnit: EffortGraphSpecPerXUnit;
}

export interface PerLocationClusterData extends ClusterData {
  perDayTotalsGraphs: SizedEffortGraphSpec;
  perVisitTotalsGraphs: SizedEffortGraphSpec;
  perPersonVisitTotalsGraphs: SizedEffortGraphSpec;
}

export interface SizedEffortGraphSpec {
  pointCount: number;
  graphSpecs: EffortGraphSpec[];
}

export function toJumbledClusterData(
  visitsByTaxonUnique: Record<string, number>,
  effortDataSet: EffortData[],
  lowerBoundX: number,
  minPointsToRegress: number,
  maxPointsToRegress: number
): JumbledClusterData {
  let effortGraphSpecPerUnitX: EffortGraphSpecPerXUnit | null = null;
  for (const effortData of effortDataSet) {
    const graphSpecPerXUnit = createEffortGraphSpecPerXUnit(
      effortData,
      lowerBoundX,
      minPointsToRegress,
      maxPointsToRegress
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
    type: ClusterDataType.jumbled,
    locationCount: effortDataSet.length,
    visitsByTaxonUnique,
    graphSpecPerXUnit: effortGraphSpecPerUnitX!
  };
}

export function toPerLocationClusterData(
  visitsByTaxonUnique: Record<string, number>,
  effortDataSet: EffortData[],
  lowerBoundX: number,
  minPointsToRegress: number,
  maxPointsToRegress: number
): PerLocationClusterData {
  let clusterData: PerLocationClusterData = {
    type: ClusterDataType.perLocation,
    locationCount: effortDataSet.length,
    visitsByTaxonUnique,
    perDayTotalsGraphs: { pointCount: 0, graphSpecs: [] },
    perVisitTotalsGraphs: { pointCount: 0, graphSpecs: [] },
    perPersonVisitTotalsGraphs: { pointCount: 0, graphSpecs: [] }
  };
  for (const effortData of effortDataSet) {
    const graphSpecPerXUnit = createEffortGraphSpecPerXUnit(
      effortData,
      lowerBoundX,
      minPointsToRegress,
      maxPointsToRegress
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

export function toJumbledModels(
  modelFactories: PlottableModelFactory[],
  yAxisModel: YAxisModel,
  graphSpec: EffortGraphSpec,
  minXAllowingRegression: number
): PlottableModel[] {
  const models: PlottableModel[] = [];
  const createModel = _makeModelFactory(yAxisModel);
  const points = graphSpec.points;
  for (const modelFactory of modelFactories) {
    const lastPoint = points[points.length - 1];
    if (
      points.length >= MIN_POINTS_TO_REGRESS &&
      lastPoint.x >= minXAllowingRegression
    ) {
      models.push(createModel(modelFactory, points));
    }
  }
  return models;
}

export function toPerLocationModels(
  modelFactories: PlottableModelFactory[],
  yAxisModel: YAxisModel,
  sizedGraphSpec: SizedEffortGraphSpec,
  minXAllowingRegression: number,
  modelWeightPower: number
): PlottableModel[] {
  const models: PlottableModel[] = [];
  const createModel = _makeModelFactory(yAxisModel);

  for (const modelFactory of modelFactories) {
    const allPoints: Point[] = [];
    let modelAverager: ModelAverager | null = null;
    let lowestX = Infinity;
    let highestX = 0;

    // Loop for each graph spec at one per location in the cluster.

    for (const graphSpec of sizedGraphSpec.graphSpecs) {
      const points = graphSpec.points;
      const lastPoint = points[points.length - 1];
      if (
        points.length >= MIN_POINTS_TO_REGRESS &&
        lastPoint.x >= minXAllowingRegression
      ) {
        const locationModel = createModel(modelFactory, points);
        if (modelAverager == null) {
          modelAverager = locationModel.getModelAverager();
        }
        modelAverager.addModel(graphSpec, locationModel, modelWeightPower);
      }
      if (points.length > 0) {
        allPoints.push(...points);
        if (points[0].x < lowestX) lowestX = points[0].x;
        if (lastPoint.x > highestX) highestX = lastPoint.x;
      }
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

function _makeModelFactory(
  yAxisModel: YAxisModel
): (factory: PlottableModelFactory, points: Point[]) => PlottableModel {
  switch (yAxisModel) {
    case YAxisModel.none:
      return (modelFactory, points) => modelFactory(points);
    case YAxisModel.logY:
      return (modelFactory, points) => new LogYModel(points, modelFactory);
    case YAxisModel.logYPlus1:
      return (modelFactory, points) => new LogYPlus1Model(points, modelFactory);
    case YAxisModel.squareRootY:
      return (modelFactory, points) => new SquareRootYModel(points, modelFactory);
  }
}
