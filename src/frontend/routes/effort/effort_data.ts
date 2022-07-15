import type { Point } from '../../../shared/point';
import type { RawClientLocationEffort } from '../../../shared/model';

export interface ClientLocationEffort {
  locationID: number;
  startDate: Date;
  endDate: Date;
  perDayPoints: Point[];
  perVisitPoints: Point[];
  perPersonVisitPoints: Point[];
}

export function toClientEffortSetByCluster(
  rawClientEffortSetByCluster: RawClientLocationEffort[][]
): ClientLocationEffort[][] {
  const clientEffortSetByCluster: ClientLocationEffort[][] = [];
  for (const clusterResults of rawClientEffortSetByCluster) {
    const clientEffortSet: ClientLocationEffort[] = [];
    for (const rawClientEffort of clusterResults) {
      clientEffortSet.push(_toClientLocationEffort(rawClientEffort));
    }
    clientEffortSetByCluster.push(clientEffortSet);
  }
  return clientEffortSetByCluster;
}

function _pairToPoint(pair: number[]) {
  return { x: pair[0], y: pair[1] };
}

function _toClientLocationEffort(
  rawClientEffort: RawClientLocationEffort
): ClientLocationEffort {
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
