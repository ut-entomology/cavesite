import type { AxiosInstance } from 'axios';

import type {
  RawLocationEffort,
  LocationSpec,
  ClusterSpec,
  ComparedFauna,
  TaxaCluster
} from '../../shared/model';

export async function loadSeeds(
  client: AxiosInstance,
  clusterSpec: ClusterSpec,
  maxClusters: number,
  useCumulativeTaxa = false
): Promise<LocationSpec[]> {
  let res = await client.post('api/cluster/pull_seeds', {
    clusterSpec,
    maxClusters,
    useCumulativeTaxa
  });
  const seeds: LocationSpec[] = res.data.seeds;
  if (!seeds) throw Error('Failed to load seeds');
  return seeds;
}

export async function sortIntoClusters(
  client: AxiosInstance,
  clusterSpec: ClusterSpec,
  seedLocations: LocationSpec[]
): Promise<TaxaCluster[]> {
  let res = await client.post('api/cluster/pull_clusters', {
    clusterSpec,
    seedIDs: seedLocations.map((location) => location.locationID)
  });
  const clusters: TaxaCluster[] = res.data.clusters;
  if (!clusters) throw Error('Failed to load clusters');
  return clusters;
}

export async function loadPoints(
  client: AxiosInstance,
  effortComparedFauna: ComparedFauna,
  taxaClusters: TaxaCluster[]
): Promise<RawLocationEffort[][]> {
  const resultsByCluster: RawLocationEffort[][] = [];
  for (const taxaCluster of taxaClusters) {
    if (taxaCluster.locationIDs.length > 0) {
      const res = await client.post('api/location/pull_effort', {
        locationIDs: taxaCluster.locationIDs,
        comparedFauna: effortComparedFauna
      });
      resultsByCluster.push(res.data.efforts);
    }
  }
  return resultsByCluster;
}
