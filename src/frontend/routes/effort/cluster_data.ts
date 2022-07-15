import type { Point } from '../../../shared/point';
import type { TaxonRank, ComparedTaxa } from '../../../shared/model';
import type { LocationGraphData } from './location_graph_data';

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
  locationGraphDataSet: LocationGraphData[];
  perVisitTotalsPointSets: Point[][];
  perPersonVisitTotalsPointSets: Point[][];
}

export function toClusterData(
  visitsByTaxonUnique: Record<string, number>,
  locationGraphDataSet: LocationGraphData[],
  lowerBoundX: number,
  minPointsToRegress: number,
  maxPointsToRegress: number
): ClusterData {
  let clusterData: ClusterData = {
    locationCount: locationGraphDataSet.length,
    visitsByTaxonUnique,
    locationGraphDataSet,
    perVisitTotalsPointSets: [],
    perPersonVisitTotalsPointSets: []
  };
  for (const locationGraphData of locationGraphDataSet) {
    clusterData.perVisitTotalsPointSets.push(
      _toGraphedPointSet(
        locationGraphData.perVisitPoints,
        lowerBoundX,
        minPointsToRegress,
        maxPointsToRegress
      )
    );
    clusterData.perPersonVisitTotalsPointSets.push(
      _toGraphedPointSet(
        locationGraphData.perPersonVisitPoints,
        lowerBoundX,
        minPointsToRegress,
        maxPointsToRegress
      )
    );
  }
  return clusterData;
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
