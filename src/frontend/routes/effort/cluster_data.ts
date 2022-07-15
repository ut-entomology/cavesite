import type { Point } from '../../../shared/point';
import type { TaxonRank, ComparedTaxa } from '../../../shared/model';
import type { ClientLocationEffort } from './client_location_effort';
import { type GraphedPoints, createGraphedPoints } from './effort_graphs';
import { FittedModel } from './fitted_model';
import type { ModelAverager } from './model_averager';

const MIN_POINTS_TO_REGRESS = 3; // strictly min. needed to produce any regression

export interface ClusteringConfig {
  maxClusters: number;
  comparedTaxa: ComparedTaxa;
  ignoreSubgenera: boolean;
  highestComparedRank: TaxonRank;
  minPointsToRegress: number;
  maxPointsToRegress: number;
}

export interface ClusterData {
  locationCount: number;
  visitsByTaxonUnique: Record<string, number>;
  perDayTotalsPointSets: MultiGraphPointSet;
  perVisitTotalsPointSets: MultiGraphPointSet;
  perPersonVisitTotalsPointSets: MultiGraphPointSet;
}

export interface MultiGraphPointSet {
  pointCount: number;
  pointSets: Point[][];
}

export function toClusterData(
  visitsByTaxonUnique: Record<string, number>,
  clientEffortSet: ClientLocationEffort[],
  lowerBoundX: number,
  minPointsToRegress: number,
  maxPointsToRegress: number
): ClusterData {
  let clusterData: ClusterData = {
    locationCount: clientEffortSet.length,
    visitsByTaxonUnique,
    perDayTotalsPointSets: { pointCount: 0, pointSets: [] },
    perVisitTotalsPointSets: { pointCount: 0, pointSets: [] },
    perPersonVisitTotalsPointSets: { pointCount: 0, pointSets: [] }
  };
  for (const clientEffort of clientEffortSet) {
    const graphedPoints = createGraphedPoints(
      clientEffort,
      lowerBoundX,
      minPointsToRegress,
      maxPointsToRegress
    );
    _addGraphSpec(clusterData.perDayTotalsPointSets, graphedPoints.perDayTotalsPoints);
    _addGraphSpec(
      clusterData.perVisitTotalsPointSets,
      graphedPoints.perVisitTotalsPoints
    );
    _addGraphSpec(
      clusterData.perPersonVisitTotalsPointSets,
      graphedPoints.perPersonVisitTotalsPoints
    );
  }
  return clusterData;
}

export function toFittedModel(
  multiGraphPointSet: MultiGraphPointSet,
  minXAllowingRegression: number,
  modelWeightPower: number
): FittedModel | null {
  const allPoints: Point[] = [];
  let modelAverager: ModelAverager | null = null;
  let lowestX = Infinity;
  let highestX = 0;

  // Loop for each graph spec at one per location in the cluster.

  for (const points of multiGraphPointSet.pointSets) {
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

function _addGraphSpec(multiGraphPointSet: MultiGraphPointSet, points: Point[]): void {
  multiGraphPointSet.pointCount += points.length;
  multiGraphPointSet.pointSets.push(points);
}
