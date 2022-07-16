import type { Point } from '../../../shared/point';
import type { LocationGraphData } from './location_graph_data';

export interface EffortGraphSpec {
  graphTitle: string;
  xAxisLabel: string;
  pointExtractor: (graphData: LocationGraphData) => Point[];
}

export function slicePointSet(
  dataPoints: Point[],
  minPointsToRegress: number,
  maxPointsToRegress: number,
  recentPointsToIgnore: number
): Point[] | null {
  const lastPointIndexPlusOne = dataPoints.length - recentPointsToIgnore;
  if (lastPointIndexPlusOne <= 0) return null;
  let firstPointIndex = lastPointIndexPlusOne - maxPointsToRegress;
  if (firstPointIndex < 0) firstPointIndex = 0;
  if (lastPointIndexPlusOne - firstPointIndex < minPointsToRegress) return null;
  return dataPoints.slice(firstPointIndex, lastPointIndexPlusOne);
}
