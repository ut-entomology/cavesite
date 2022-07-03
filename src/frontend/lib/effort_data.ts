import type { Point } from '../../shared/point';
import type { RawEffortData } from '../../shared/model';

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
  rawEffortDataSetByCluster: RawEffortData[][],
  minPersonVisits: number,
  includeOrigin: boolean
): EffortData[][] {
  const effortDataSetByCluster: EffortData[][] = [];
  for (const clusterResults of rawEffortDataSetByCluster) {
    const clusterEffortData: EffortData[] = [];
    for (const rawEffortData of clusterResults) {
      if (rawEffortData.perVisitPoints.length >= minPersonVisits) {
        clusterEffortData.push(_toEffortData(rawEffortData, includeOrigin));
      }
    }
    if (clusterEffortData.length > 0) {
      effortDataSetByCluster.push(clusterEffortData);
    }
  }
  return effortDataSetByCluster;
}

function _pairToPoint(pair: number[]) {
  return { x: pair[0], y: pair[1] };
}

function _toEffortData(
  rawEffortData: RawEffortData,
  includeOrigin: boolean
): EffortData {
  const perDayPointPairs: number[][] = JSON.parse(rawEffortData.perDayPoints);
  const perDayPoints: Point[] = [];
  if (includeOrigin) perDayPoints.push({ x: 0, y: 0 });
  for (const pair of perDayPointPairs) {
    perDayPoints.push(_pairToPoint(pair));
  }

  const perVisitPointPairs: number[][] = JSON.parse(rawEffortData.perVisitPoints);
  const perVisitPoints: Point[] = [];
  if (includeOrigin) perVisitPoints.push({ x: 0, y: 0 });
  for (const pair of perVisitPointPairs) {
    perVisitPoints.push(_pairToPoint(pair));
  }

  const perPersonVisitPointPairs: number[][] = JSON.parse(
    rawEffortData.perPersonVisitPoints
  );
  const perPersonVisitPoints: Point[] = [];
  if (includeOrigin) perPersonVisitPoints.push({ x: 0, y: 0 });
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
