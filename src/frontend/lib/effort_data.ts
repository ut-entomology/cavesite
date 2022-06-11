import type { AxiosInstance } from 'axios';

import type { Point } from './linear_regression';
import {
  type EffortResult,
  type LocationSpec,
  TaxonWeight,
  SeedSpec,
  SimilarityBasis,
  SimilarityTransform
} from '../../shared/model';

export interface EffortData {
  locationID: number;
  startDate: Date;
  endDate: Date;
  perVisitPoints: Point[];
  perPersonVisitPoints: Point[];
}

export async function loadEffort(
  client: AxiosInstance,
  minPersonVisits: number,
  seedSpec: SeedSpec
) {
  let res = await client.post('api/cluster/get_seeds', { seedSpec });
  const seeds: LocationSpec[] = res.data.seeds;
  if (!seeds) throw Error('Failed to load seeds');

  res = await client.post('api/cluster/get_clusters', {
    similarityMetric: {
      basis: SimilarityBasis.commonMinusDiffTaxa,
      transform: SimilarityTransform.none,
      weight: TaxonWeight.weighted
    },
    seedIDs: seeds.map((location) => location.locationID),
    minSpecies: 0,
    maxSpecies: 10000
  });
  const clusters: number[][] = res.data.clusters;
  if (!clusters) throw Error('Failed to load clusters');

  const effortDataByCluster: EffortData[][] = [];
  for (const cluster of clusters) {
    if (cluster.length > 0) {
      res = await client.post('api/location/get_effort', {
        locationIDs: cluster
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
    perVisitPoints: perVisitPoints,
    perPersonVisitPoints: perPersonVisitPoints
  };
}
