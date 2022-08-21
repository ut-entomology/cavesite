/**
 * LocationGraphData captures summary information about a particular location.
 */

import { type Point, pairsToPoints } from '../../shared/point';
import type { EffortFlags, RawLocationEffort } from '../../shared/model';

// const ORIGIN = { x: 0, y: 0 };

export interface LocationGraphData {
  locationID: number;
  countyName: string | null;
  localityName: string;
  latitude: number | null;
  longitude: number | null;
  flags: EffortFlags;
  perVisitPoints: Point[];
  perPersonVisitPoints: Point[];
  predictedPerVisitDiff: number | null;
  predictedPerPersonVisitDiff: number | null;
  visitsByTaxonUnique: Record<string, number>;
  recentTaxa: string[][];
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
  const perVisitPointPairs: number[][] = JSON.parse(rawLocationEffort.perVisitPoints);
  const perVisitPoints = pairsToPoints(perVisitPointPairs);

  const perPersonVisitPointPairs: number[][] = JSON.parse(
    rawLocationEffort.perPersonVisitPoints
  );
  const perPersonVisitPoints = pairsToPoints(perPersonVisitPointPairs);

  const recentTaxa: string[][] = [];
  if (rawLocationEffort.recentTaxa !== null) {
    for (const visitTaxa of rawLocationEffort.recentTaxa.split('#')) {
      if (visitTaxa == '') {
        recentTaxa.push([]);
      } else {
        recentTaxa.push(visitTaxa.split('|'));
      }
    }
  }

  return {
    locationID: rawLocationEffort.locationID,
    countyName: rawLocationEffort.countyName,
    localityName: rawLocationEffort.localityName,
    latitude: rawLocationEffort.latitude,
    longitude: rawLocationEffort.longitude,
    flags: rawLocationEffort.flags,
    perVisitPoints,
    perPersonVisitPoints,
    predictedPerVisitDiff: null,
    predictedPerPersonVisitDiff: null,
    visitsByTaxonUnique: rawLocationEffort.visitsByTaxonUnique,
    recentTaxa
  };
}
