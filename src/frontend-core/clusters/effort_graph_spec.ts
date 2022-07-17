import type { Point } from '../../shared/point';
import type { LocationGraphData } from './location_graph_data';

export interface EffortGraphSpec {
  graphTitle: string;
  xAxisLabel: string;
  pointSliceSpec: PointSliceSpec;
  pointExtractor: (graphData: LocationGraphData) => Point[];
}

export interface PointSliceSpec {
  minPointCount: number;
  maxPointCount: number;
  recentPointsToIgnore: number;
}

export function slicePointSet(
  dataPoints: Point[],
  spec: PointSliceSpec
): Point[] | null {
  const lastPointIndexPlusOne = dataPoints.length - spec.recentPointsToIgnore;
  if (lastPointIndexPlusOne <= 0) return null;
  let firstPointIndex =
    spec.maxPointCount == Infinity ? 0 : lastPointIndexPlusOne - spec.maxPointCount;
  if (firstPointIndex < 0) firstPointIndex = 0;
  if (lastPointIndexPlusOne - firstPointIndex < spec.minPointCount) return null;
  return dataPoints.slice(firstPointIndex, lastPointIndexPlusOne);
}
