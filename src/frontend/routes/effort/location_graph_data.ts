import type { Point } from '../../../shared/point';
import type { RawLocationEffort } from '../../../shared/model';

export interface LocationGraphData {
  locationID: number;
  startDate: Date;
  endDate: Date;
  perDayPoints: Point[];
  perVisitPoints: Point[];
  perPersonVisitPoints: Point[];
}

export function toClientEffortSetByCluster(
  rawClientEffortSetByCluster: RawLocationEffort[][]
): LocationGraphData[][] {
  const locationGraphDataSetByCluster: LocationGraphData[][] = [];
  for (const clusterResults of rawClientEffortSetByCluster) {
    const locationGraphDataSet: LocationGraphData[] = [];
    for (const rawClientEffort of clusterResults) {
      locationGraphDataSet.push(_toLocationGraphData(rawClientEffort));
    }
    locationGraphDataSetByCluster.push(locationGraphDataSet);
  }
  return locationGraphDataSetByCluster;
}

function _pairToPoint(pair: number[]) {
  return { x: pair[0], y: pair[1] };
}

function _toLocationGraphData(rawClientEffort: RawLocationEffort): LocationGraphData {
  const perDayPointPairs: number[][] = JSON.parse(rawClientEffort.perDayPoints);
  const perDayPoints: Point[] = [];
  for (const pair of perDayPointPairs) {
    perDayPoints.push(_pairToPoint(pair));
  }

  const perVisitPointPairs: number[][] = JSON.parse(rawClientEffort.perVisitPoints);
  const perVisitPoints: Point[] = [];
  for (const pair of perVisitPointPairs) {
    perVisitPoints.push(_pairToPoint(pair));
  }

  const perPersonVisitPointPairs: number[][] = JSON.parse(
    rawClientEffort.perPersonVisitPoints
  );
  const perPersonVisitPoints: Point[] = [];
  for (const pair of perPersonVisitPointPairs) {
    perPersonVisitPoints.push(_pairToPoint(pair));
  }

  return {
    locationID: rawClientEffort.locationID,
    startDate: rawClientEffort.startDate,
    endDate: rawClientEffort.endDate,
    perDayPoints,
    perVisitPoints,
    perPersonVisitPoints
  };
}
