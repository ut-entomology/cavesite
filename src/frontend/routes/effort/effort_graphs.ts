import type { Point } from '../../../shared/point';
import type { ClientLocationEffort } from './client_location_effort';

export interface GraphedPoints {
  perDayTotalsPoints: Point[];
  perVisitTotalsPoints: Point[];
  perPersonVisitTotalsPoints: Point[];
}

export function createGraphedPoints(
  clientLocationEffort: ClientLocationEffort,
  lowerBoundX: number,
  minPointsToRegress: number,
  maxPointsToRegress: number
): GraphedPoints {
  return {
    perDayTotalsPoints: _toGraphedPoints(
      clientLocationEffort.perDayPoints,
      lowerBoundX,
      minPointsToRegress,
      maxPointsToRegress
    ),
    perVisitTotalsPoints: _toGraphedPoints(
      clientLocationEffort.perVisitPoints,
      lowerBoundX,
      minPointsToRegress,
      maxPointsToRegress
    ),
    perPersonVisitTotalsPoints: _toGraphedPoints(
      clientLocationEffort.perPersonVisitPoints,
      lowerBoundX,
      minPointsToRegress,
      maxPointsToRegress
    )
  };
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
