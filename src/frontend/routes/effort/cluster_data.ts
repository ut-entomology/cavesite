import type { Point } from '../../../shared/point';
import type { TaxonRank, ComparedTaxa } from '../../../shared/model';
import type { ClientLocationEffort } from './client_location_effort';

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
    _addPointSet(
      clusterData.perDayTotalsPointSets,
      _toGraphedPointSet(
        clientLocationEffort.perDayPoints,
        lowerBoundX,
        minPointsToRegress,
        maxPointsToRegress
      )
    );
    _addPointSet(
      clusterData.perVisitTotalsPointSets,
      _toGraphedPointSet(
        clientLocationEffort.perVisitPoints,
        lowerBoundX,
        minPointsToRegress,
        maxPointsToRegress
      )
    );
    _addPointSet(
      clusterData.perPersonVisitTotalsPointSets,
      _toGraphedPointSet(
        clientLocationEffort.perPersonVisitPoints,
        lowerBoundX,
        minPointsToRegress,
        maxPointsToRegress
      )
    );
  }
  return clusterData;
}

function _addPointSet(clusterPoints: ClusterPoints, points: Point[]): void {
  clusterPoints.pointCount += points.length;
  clusterPoints.pointSets.push(points);
}

function _toGraphedPointSet(
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
