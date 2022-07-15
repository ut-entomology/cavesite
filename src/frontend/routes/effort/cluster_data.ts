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
  locationCount: number;
  visitsByTaxonUnique: Record<string, number>;
  sourceDataSet: LocationGraphData[];
  modelledDataSet: LocationGraphData[];
}

export function toClusterData(
  visitsByTaxonUnique: Record<string, number>,
  sourceDataSet: LocationGraphData[],
  lowerBoundX: number,
  minPointsToRegress: number,
  maxPointsToRegress: number
): ClusterData {
  let clusterData: ClusterData = {
    locationCount: sourceDataSet.length,
    visitsByTaxonUnique,
    sourceDataSet,
    modelledDataSet: []
  };
  for (const sourceLocationGraphData of sourceDataSet) {
    const modelledLocationGraphData = Object.assign({}, sourceLocationGraphData);
    modelledLocationGraphData.perDayPoints = []; // not modelled, so remove
    _toGraphedPointSet(
      sourceLocationGraphData.perVisitPoints,
      lowerBoundX,
      minPointsToRegress,
      maxPointsToRegress,
      (points) => (modelledLocationGraphData.perVisitPoints = points)
    );
    _toGraphedPointSet(
      sourceLocationGraphData.perPersonVisitPoints,
      lowerBoundX,
      minPointsToRegress,
      maxPointsToRegress,
      (points) => (modelledLocationGraphData.perPersonVisitPoints = points)
    );
    clusterData.modelledDataSet.push(modelledLocationGraphData);
  }
  return clusterData;
}

function _toGraphedPointSet(
  dataPoints: Point[],
  lowerBoundX: number,
  minPointsToRegress: number,
  maxPointsToRegress: number,
  assignPoints: (points: Point[]) => void
): void {
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
  assignPoints(graphedPoints);
}
