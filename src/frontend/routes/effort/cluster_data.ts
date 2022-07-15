import type { Point } from '../../../shared/point';
import type { TaxonRank, ComparedTaxa } from '../../../shared/model';
import type { LocationGraphData } from './location_graph_data';

export interface ClusteringConfig {
  maxClusters: number;
  comparedTaxa: ComparedTaxa;
  ignoreSubgenera: boolean;
  highestComparedRank: TaxonRank;
  minPointsToRegress: number;
  maxPointsToRegress: number | null;
}

export interface ClusterData {
  visitsByTaxonUnique: Record<string, number>;
  locationGraphDataSet: LocationGraphData[];
}

export function toClusterData(
  visitsByTaxonUnique: Record<string, number>,
  locationGraphDataSet: LocationGraphData[],
  lowerBoundX: number,
  minPointsToRegress: number,
  maxPointsToRegress: number
): ClusterData {
  let clusterData: ClusterData = {
    visitsByTaxonUnique,
    locationGraphDataSet
  };
  for (const locationGraphData of locationGraphDataSet) {
    const sourceGroup = locationGraphData.sourceGroup;

    const perVisitPoints = _toGraphedPointSet(
      sourceGroup.perVisitPoints,
      lowerBoundX,
      minPointsToRegress,
      maxPointsToRegress
    );
    const perPersonVisitPoints = _toGraphedPointSet(
      sourceGroup.perPersonVisitPoints,
      lowerBoundX,
      minPointsToRegress,
      maxPointsToRegress
    );
    locationGraphData.modelledGroup = {
      perDayPoints: [],
      perVisitPoints,
      perPersonVisitPoints
    };
  }
  return clusterData;
}

function _toGraphedPointSet(
  dataPoints: Point[],
  lowerBoundX: number,
  minPointsToRegress: number,
  maxPointsToRegress: number
): Point[] {
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
