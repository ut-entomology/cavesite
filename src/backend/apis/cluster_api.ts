import { Router, type Request } from 'express';
import { StatusCodes } from 'http-status-codes';

import { getDB } from '../integrations/postgres';
import { Location } from '../model/location';
import { createClusterer } from '../effort/create_clusterer';
import { toLocationSpec } from './location_api';
import type { ClusterSpec } from '../../shared/model';

export const router = Router();

router.post('/get_seeds', async (req: Request, res) => {
  const clusterSpec: ClusterSpec = req.body.clusterSpec;
  const maxClusters: number = req.body.maxClusters;
  const useCumulativeTaxa: boolean = req.body.useCumulativeTaxa;

  // TODO: validate params

  let seedIDs: number[];
  const clusterer = createClusterer(clusterSpec);
  seedIDs = await clusterer.getSeedLocationIDs(getDB(), maxClusters, useCumulativeTaxa);
  const locations = await Location.getByIDs(getDB(), seedIDs);
  return res
    .status(StatusCodes.OK)
    .send({ seeds: locations.map((location) => toLocationSpec(location)) });
});

router.post('/get_clusters', async (req: Request, res) => {
  const clusterSpec: ClusterSpec = req.body.clusterSpec;
  const seedIDs: number[] = req.body.seedIDs;

  // TODO: validate params

  const clusterer = createClusterer(clusterSpec);
  const clusters = await clusterer.getClusteredLocationIDs(getDB(), seedIDs);
  return res.status(StatusCodes.OK).send({ clusters });
});
