import type { Point } from '../../shared/point';
import type { RawEffortData } from '../../shared/model';

const ORIGIN = { x: 0, y: 0 };

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

export function toEffortDataSetByCluster(
  rawEffortDataSetByCluster: RawEffortData[][]
): EffortData[][] {
  const effortDataSetByCluster: EffortData[][] = [];
  for (const clusterResults of rawEffortDataSetByCluster) {
    const clusterEffortData: EffortData[] = [];
    for (const rawEffortData of clusterResults) {
      clusterEffortData.push(_toEffortData(rawEffortData));
    }
    effortDataSetByCluster.push(clusterEffortData);
  }
  return effortDataSetByCluster;
}

function _pairToPoint(pair: number[]) {
  return { x: pair[0], y: pair[1] };
}

function _toEffortData(rawEffortData: RawEffortData): EffortData {
  const perDayPointPairs: number[][] = JSON.parse(rawEffortData.perDayPoints);
  const perDayPoints: Point[] = [ORIGIN];
  for (const pair of perDayPointPairs) {
    perDayPoints.push(_pairToPoint(pair));
  }

  const perVisitPointPairs: number[][] = JSON.parse(rawEffortData.perVisitPoints);
  const perVisitPoints: Point[] = [ORIGIN];
  for (const pair of perVisitPointPairs) {
    perVisitPoints.push(_pairToPoint(pair));
  }

  const perPersonVisitPointPairs: number[][] = JSON.parse(
    rawEffortData.perPersonVisitPoints
  );
  const perPersonVisitPoints: Point[] = [ORIGIN];
  for (const pair of perPersonVisitPointPairs) {
    perPersonVisitPoints.push(_pairToPoint(pair));
  }

  return {
    locationID: rawEffortData.locationID,
    startDate: rawEffortData.startDate,
    endDate: rawEffortData.endDate,
    perDayPoints,
    perVisitPoints,
    perPersonVisitPoints
  };
}
