import { Router, type Request } from 'express';
import { StatusCodes } from 'http-status-codes';

import { getDB } from '../integrations/postgres';
import { Location } from '../model/location';
import * as cluster from '../sampling/cluster';
import { toLocationSpec } from './location_api';
import { SeedType, type SeedSpec } from '../../shared/model';

export const router = Router();

router.post('/get_seeds', async (req: Request, res) => {
  const seedSpec: SeedSpec = req.body.seedSpec;
  // TODO: validate seedSpec
  let seedIDs: number[];
  switch (seedSpec.seedType) {
    case SeedType.random:
      seedIDs = [];
      break;
    case SeedType.sized:
      seedIDs = [];
      break;
    case SeedType.diverse:
      seedIDs = await cluster.getDiverseSeeds(getDB(), seedSpec);
      break;
    default:
      return res.status(StatusCodes.BAD_REQUEST).send();
  }
  const locations = await Location.getByIDs(getDB(), seedIDs);
  return res
    .status(StatusCodes.OK)
    .send({ seeds: locations.map((location) => toLocationSpec(location)) });
});

router.post('/get_clusters', async (req: Request, res) => {
  const seedIDs = req.body.seedIDs;
  const distanceMeasure = req.body.distanceMeasure;
  const clusters = await cluster.getClusteredLocationIDs(
    getDB(),
    distanceMeasure,
    seedIDs
  );
  return res.status(StatusCodes.OK).send({ clusters });
});
