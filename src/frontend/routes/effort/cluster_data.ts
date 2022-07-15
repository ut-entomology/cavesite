import type { Point } from '../../../shared/point';
import type { TaxonRank, ComparedTaxa } from '../../../shared/model';
import type { ClientLocationEffort } from './client_location_effort';
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
  perDayTotalsPointSets: ClusterPoints;
  perVisitTotalsPointSets: ClusterPoints;
  perPersonVisitTotalsPointSets: ClusterPoints;
}

export interface ClusterPoints {
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
  for (const clientLocationEffort of clientEffortSet) {
    _addGraphSpec(
      clusterData.perDayTotalsPointSets,
      _toGraphedPoints(
        clientLocationEffort.perDayPoints,
        lowerBoundX,
        minPointsToRegress,
        maxPointsToRegress
      )
    );
    _addGraphSpec(
      clusterData.perVisitTotalsPointSets,
      _toGraphedPoints(
        clientLocationEffort.perVisitPoints,
        lowerBoundX,
        minPointsToRegress,
        maxPointsToRegress
      )
    );
    _addGraphSpec(
      clusterData.perPersonVisitTotalsPointSets,
      _toGraphedPoints(
        clientLocationEffort.perPersonVisitPoints,
        lowerBoundX,
        minPointsToRegress,
        maxPointsToRegress
      )
    );
  }
  return clusterData;
}

export function toFittedModel(
  clusterPoints: ClusterPoints,
  minXAllowingRegression: number,
  modelWeightPower: number
): FittedModel | null {
  const allPoints: Point[] = [];
  let modelAverager: ModelAverager | null = null;
  let lowestX = Infinity;
  let highestX = 0;

  // Loop for each graph spec at one per location in the cluster.

  for (const points of clusterPoints.pointSets) {
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

function _addGraphSpec(clusterPoints: ClusterPoints, points: Point[]): void {
  clusterPoints.pointCount += points.length;
  clusterPoints.pointSets.push(points);
}

function _toGraphedPoints(
  dataPoints: Point[],
  lowerBoundX: number,
  minPointsToRegress: number,
  maxPointsToRegress: number
) {
  const graphedPoints: Point[] = [];

  for (let i = 0; i < dataPoints.length; ++i) {
    const point = dataPoints[i];
    if (point.x >= lowerBoundX) {
      if (graphedPoints.length == 0) {
        if (dataPoints.length - i < minPointsToRegress) break;
        if (dataPoints.length - i > maxPointsToRegress) continue;
      }
      graphedPoints.push(point);
    }
  }
  return graphedPoints;
}
