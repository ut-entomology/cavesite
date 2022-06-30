import type { Point } from '../../shared/point';
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

export function toEffortDataByCluster(
  resultsByCluster: EffortResult[][],
  minPersonVisits: number
): EffortData[][] {
  const effortDataByCluster: EffortData[][] = [];
  for (const clusterResults of resultsByCluster) {
    const clusterEffortData: EffortData[] = [];
    for (const effortResult of clusterResults) {
      if (effortResult.perVisitPoints.length >= minPersonVisits) {
        clusterEffortData.push(toEffortData(effortResult));
      }
    }
    if (clusterEffortData.length > 0) {
      effortDataByCluster.push(clusterEffortData);
    }
  }
  return effortDataByCluster;
}

function _pairToPoint(pair: number[]) {
  return { x: pair[0], y: pair[1] };
}
