import type { Point } from '../../../shared/point';
import type { RawLocationEffort } from '../../../shared/model';

// const ORIGIN = { x: 0, y: 0 };

export interface LocationGraphData {
  locationID: number;
  startDate: Date;
  endDate: Date;
  perDayPoints: Point[];
  perVisitPoints: Point[];
  perPersonVisitPoints: Point[];
}

export function toLocationGraphDataSetByCluster(
  rawLocationEffortSetByCluster: RawLocationEffort[][]
): LocationGraphData[][] {
  const locationGraphDataSetByCluster: LocationGraphData[][] = [];
  for (const rawLocationEffortSet of rawLocationEffortSetByCluster) {
    const locationGraphDataSet: LocationGraphData[] = [];
    for (const rawLocationEffort of rawLocationEffortSet) {
      locationGraphDataSet.push(_toLocationGraphData(rawLocationEffort));
    }
    locationGraphDataSetByCluster.push(locationGraphDataSet);
  }
  return locationGraphDataSetByCluster;
}

function _pairToPoint(pair: number[]) {
  return { x: pair[0], y: pair[1] };
}

function _toLocationGraphData(rawLocationEffort: RawLocationEffort): LocationGraphData {
  const perDayPointPairs: number[][] = JSON.parse(rawLocationEffort.perDayPoints);
  const perDayPoints: Point[] = [];
  for (const pair of perDayPointPairs) {
    perDayPoints.push(_pairToPoint(pair));
  }

  const perVisitPointPairs: number[][] = JSON.parse(rawLocationEffort.perVisitPoints);
  const perVisitPoints: Point[] = [];
  for (const pair of perVisitPointPairs) {
    perVisitPoints.push(_pairToPoint(pair));
  }

  const perPersonVisitPointPairs: number[][] = JSON.parse(
    rawLocationEffort.perPersonVisitPoints
  );
  const perPersonVisitPoints: Point[] = [];
  for (const pair of perPersonVisitPointPairs) {
    perPersonVisitPoints.push(_pairToPoint(pair));
  }

  return {
    locationID: rawLocationEffort.locationID,
    startDate: rawLocationEffort.startDate,
    endDate: rawLocationEffort.endDate,
    perDayPoints,
    perVisitPoints,
    perPersonVisitPoints
  };
}
