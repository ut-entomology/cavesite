import { Router, type Request } from 'express';
import { StatusCodes } from 'http-status-codes';

import { getDB } from '../integrations/postgres';
import { Location } from '../model/location';
import { createClusterer } from '../effort/create_clusterer';
import { toLocationSpec } from './location_api';
import { ClusterSpec, checkComparedTaxa } from '../../shared/model';

export const router = Router();

router.post('/get_seeds', async (req: Request, res) => {
  const clusterSpec: ClusterSpec = req.body.clusterSpec;
  const maxClusters: number = req.body.maxClusters;
  const useCumulativeTaxa: boolean = req.body.useCumulativeTaxa;

  // TODO: validate params

  if (!checkComparedTaxa(clusterSpec.comparedTaxa)) {
    return res.status(StatusCodes.BAD_REQUEST).send();
  }

  let seedIDs: number[];
  const clusterer = createClusterer(getDB(), clusterSpec);
  seedIDs = await clusterer.getSeedLocationIDs(maxClusters, useCumulativeTaxa);
  const locations = await Location.getByIDs(getDB(), seedIDs);
  return res
    .status(StatusCodes.OK)
    .send({ seeds: locations.map((location) => toLocationSpec(location)) });
});

router.post('/get_clusters', async (req: Request, res) => {
  const clusterSpec: ClusterSpec = req.body.clusterSpec;
  const seedIDs: number[] = req.body.seedIDs;

  // TODO: validate params

  const clusterer = createClusterer(getDB(), clusterSpec);
  const clusters = await clusterer.getClusteredLocationIDs(seedIDs);
  return res.status(StatusCodes.OK).send({ clusters });
});
