import type { AxiosInstance } from 'axios';

import type {
  EffortResult,
  LocationSpec,
  ClusterSpec,
  ComparedTaxa
} from '../../shared/model';

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

export async function sortIntoClusters(
  client: AxiosInstance,
  clusterSpec: ClusterSpec,
  seedLocations: LocationSpec[]
): Promise<number[][]> {
  let res = await client.post('api/cluster/get_clusters', {
    clusterSpec,
    seedIDs: seedLocations.map((location) => location.locationID)
  });
  const clusters: number[][] = res.data.clusters;
  if (!clusters) throw Error('Failed to load clusters');
  return clusters;
}

export async function loadPoints(
  client: AxiosInstance,
  effortComparedTaxa: ComparedTaxa,
  locationIDsByClusterIndex: number[][]
): Promise<EffortResult[][]> {
  const resultsByCluster: EffortResult[][] = [];
  for (const locationIDs of locationIDsByClusterIndex) {
    if (locationIDs.length > 0) {
      const res = await client.post('api/location/get_effort', {
        locationIDs: locationIDs,
        comparedTaxa: effortComparedTaxa
      });
      resultsByCluster.push(res.data.efforts);
    }
  }
  return resultsByCluster;
}
