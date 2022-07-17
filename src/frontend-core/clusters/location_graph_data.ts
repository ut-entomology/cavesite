import { type Point, pairsToPoints } from '../../shared/point';
import type { RawLocationEffort } from '../../shared/model';

// const ORIGIN = { x: 0, y: 0 };

export interface LocationGraphData {
  locationID: number;
  startDate: Date;
  endDate: Date;
  perDayPoints: Point[];
  perVisitPoints: Point[];
  perPersonVisitPoints: Point[];
  predictedPerVisitDiff?: number | null;
  predictedPerPersonVisitDiff?: number | null;
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

function _toLocationGraphData(rawLocationEffort: RawLocationEffort): LocationGraphData {
  const perDayPointPairs: number[][] = JSON.parse(rawLocationEffort.perDayPoints);
  const perDayPoints = pairsToPoints(perDayPointPairs);

  const perVisitPointPairs: number[][] = JSON.parse(rawLocationEffort.perVisitPoints);
  const perVisitPoints = pairsToPoints(perVisitPointPairs);

  const perPersonVisitPointPairs: number[][] = JSON.parse(
    rawLocationEffort.perPersonVisitPoints
  );
  const perPersonVisitPoints = pairsToPoints(perPersonVisitPointPairs);

  return {
    locationID: rawLocationEffort.locationID,
    startDate: rawLocationEffort.startDate,
    endDate: rawLocationEffort.endDate,
    perDayPoints,
    perVisitPoints,
    perPersonVisitPoints
  };
}
