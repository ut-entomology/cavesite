import { Router, type Request } from 'express';
import { StatusCodes } from 'http-status-codes';

import { getDB } from '../integrations/postgres';
import { Location } from '../model/location';
import * as cluster from '../effort/cluster';
import { toLocationSpec } from './location_api';
import {
  type SeedSpec,
  SimilarityMetric,
  SimilarityTransform
} from '../../shared/model';

export const router = Router();

router.post('/get_seeds', async (req: Request, res) => {
  const seedSpec: SeedSpec = req.body.seedSpec;
  // TODO: validate seedSpec
  let seedIDs: number[];
  seedIDs = await cluster.getDiverseSeeds(getDB(), seedSpec);
  const locations = await Location.getByIDs(getDB(), seedIDs);
  return res
    .status(StatusCodes.OK)
    .send({ seeds: locations.map((location) => toLocationSpec(location)) });
});

router.post('/get_clusters', async (req: Request, res) => {
  const seedIDs = req.body.seedIDs;
  const taxonWeight = req.body.taxonWeight;
  const minSpecies = req.body.minSpecies;
  const maxSpecies = req.body.maxSpecies;
  const clusters = await cluster.getClusteredLocationIDs(
    getDB(),
    SimilarityMetric.commonMinusDiffSpecies,
    SimilarityTransform.none,
    taxonWeight,
    seedIDs,
    minSpecies,
    maxSpecies
  );
  return res.status(StatusCodes.OK).send({ clusters });
});
