import type { Point } from './linear_regression';
import type { EffortResult } from '../../shared/model';

// I split this out from cluster_client.ts so that a server-side daemon
// can also parse the data.

export interface EffortData {
  locationID: number;
  startDate: Date;
  endDate: Date;
  perDayPoints: Point[];
  perVisitPoints: Point[];
  perPersonVisitPoints: Point[];
}

export function toEffortData(effortResult: EffortResult): EffortData {
  const perDayPointPairs: number[][] = JSON.parse(effortResult.perDayPoints);
  const perDayPoints: Point[] = [];
  for (const pair of perDayPointPairs) {
    perDayPoints.push(_pairToPoint(pair));
  }

  const perVisitPointPairs: number[][] = JSON.parse(effortResult.perVisitPoints);
  const perVisitPoints: Point[] = [];
  for (const pair of perVisitPointPairs) {
    perVisitPoints.push(_pairToPoint(pair));
  }

  const perPersonVisitPointPairs: number[][] = JSON.parse(
    effortResult.perPersonVisitPoints
  );
  const perPersonVisitPoints: Point[] = [];
  for (const pair of perPersonVisitPointPairs) {
    perPersonVisitPoints.push(_pairToPoint(pair));
  }

  return {
    locationID: effortResult.locationID,
    startDate: effortResult.startDate,
    endDate: effortResult.endDate,
    perDayPoints,
    perVisitPoints,
    perPersonVisitPoints
  };
}

function _pairToPoint(pair: number[]) {
  return { x: pair[0], y: pair[1] };
}
