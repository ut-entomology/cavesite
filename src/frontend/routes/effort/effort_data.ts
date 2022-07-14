import type { Point } from '../../../shared/point';
import type { RawLocationEffortData } from '../../../shared/model';

export interface LocationEffortData {
  locationID: number;
  startDate: Date;
  endDate: Date;
  perDayPoints: Point[];
  perVisitPoints: Point[];
  perPersonVisitPoints: Point[];
}

export function toEffortDataSetByCluster(
  rawEffortDataSetByCluster: RawLocationEffortData[][]
): LocationEffortData[][] {
  const effortDataSetByCluster: LocationEffortData[][] = [];
  for (const clusterResults of rawEffortDataSetByCluster) {
    const clusterEffortData: LocationEffortData[] = [];
    for (const rawEffortData of clusterResults) {
      clusterEffortData.push(_toLocationEffortData(rawEffortData));
    }
    effortDataSetByCluster.push(clusterEffortData);
  }
  return effortDataSetByCluster;
}

function _pairToPoint(pair: number[]) {
  return { x: pair[0], y: pair[1] };
}

function _toLocationEffortData(
  rawEffortData: RawLocationEffortData
): LocationEffortData {
  const perDayPointPairs: number[][] = JSON.parse(rawEffortData.perDayPoints);
  const perDayPoints: Point[] = [];
  for (const pair of perDayPointPairs) {
    perDayPoints.push(_pairToPoint(pair));
  }

  const perVisitPointPairs: number[][] = JSON.parse(rawEffortData.perVisitPoints);
  const perVisitPoints: Point[] = [];
  for (const pair of perVisitPointPairs) {
    perVisitPoints.push(_pairToPoint(pair));
  }

  const perPersonVisitPointPairs: number[][] = JSON.parse(
    rawEffortData.perPersonVisitPoints
  );
  const perPersonVisitPoints: Point[] = [];
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
