import type { AxiosInstance } from 'axios';

import type { Point } from './linear_regression';
import type {
  EffortResult,
  LocationSpec,
  ClusterSpec,
  ComparedTaxa
} from '../../shared/model';

export interface EffortData {
  locationID: number;
  startDate: Date;
  endDate: Date;
  perDayPoints: Point[];
  perVisitPoints: Point[];
  perPersonVisitPoints: Point[];
}

export async function loadSeeds(
  client: AxiosInstance,
  clusterSpec: ClusterSpec,
  maxClusters: number,
  useCumulativeTaxa = false
): Promise<LocationSpec[]> {
  let res = await client.post('api/cluster/get_seeds', {
    clusterSpec,
    maxClusters,
    useCumulativeTaxa
  });
  const seeds: LocationSpec[] = res.data.seeds;
  if (!seeds) throw Error('Failed to load seeds');
  return seeds;
}

export async function loadEffort(
  client: AxiosInstance,
  clusterSpec: ClusterSpec,
  effortComparedTaxa: ComparedTaxa,
  seedLocations: LocationSpec[],
  minPersonVisits: number
) {
  let res = await client.post('api/cluster/get_clusters', {
    clusterSpec,
    seedIDs: seedLocations.map((location) => location.locationID)
  });
  const clusters: number[][] = res.data.clusters;
  if (!clusters) throw Error('Failed to load clusters');

  const effortDataByCluster: EffortData[][] = [];
  for (const cluster of clusters) {
    if (cluster.length > 0) {
      res = await client.post('api/location/get_effort', {
        locationIDs: cluster,
        comparedTaxa: effortComparedTaxa
      });
      const clusterEffortData: EffortData[] = [];
      const effortResults: EffortResult[] = res.data.efforts;
      for (const effortResult of effortResults) {
        if (effortResult.perVisitPoints.length >= minPersonVisits) {
          clusterEffortData.push(_toEffortData(effortResult));
        }
      }
      if (clusterEffortData.length > 0) {
        effortDataByCluster.push(clusterEffortData);
      }
    }
  }

  return effortDataByCluster;
}

function _pairToPoint(pair: number[]) {
  return { x: pair[0], y: pair[1] };
}

function _toEffortData(effortResult: EffortResult): EffortData {
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
