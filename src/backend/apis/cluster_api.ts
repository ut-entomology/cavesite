import { Router, type Request } from 'express';
import { StatusCodes } from 'http-status-codes';

import { getDB } from '../integrations/postgres';
import { Location } from '../model/location';
import { createClusterer } from '../effort/create_clusterer';
import { toLocationSpec } from './location_api';
import { checkBoolean, checkInteger, checkIntegerList } from '../util/http_util';
import {
  MAX_ALLOWED_CLUSTERS,
  ClusterSpec,
  checkComparedFauna,
  DissimilarityMetric,
  DissimilarityBasis,
  DissimilarityTransform,
  TaxonRank,
  TaxonWeight
} from '../../shared/model';

export const router = Router();

router.post('/pull_seeds', async (req: Request, res) => {
  const maxClusters: number = req.body.maxClusters;
  const clusterSpec: ClusterSpec = req.body.clusterSpec;
  const useCumulativeTaxa: boolean = req.body.useCumulativeTaxa;

  if (
    maxClusters > MAX_ALLOWED_CLUSTERS ||
    !_checkClusterSpec(clusterSpec) ||
    !checkBoolean(useCumulativeTaxa)
  ) {
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

router.post('/pull_clusters', async (req: Request, res) => {
  const clusterSpec: ClusterSpec = req.body.clusterSpec;
  const seedIDs: number[] = req.body.seedIDs;

  if (!_checkClusterSpec(clusterSpec) || !checkIntegerList(seedIDs)) {
    return res.status(StatusCodes.BAD_REQUEST).send();
  }

  const clusterer = createClusterer(getDB(), clusterSpec);
  const clusters = await clusterer.getTaxaClusters(seedIDs);
  return res.status(StatusCodes.OK).send({ clusters });
});

function _checkClusterSpec(clusterSpec: ClusterSpec): boolean {
  return (
    _checkMetric(clusterSpec.metric) &&
    checkComparedFauna(clusterSpec.comparedFauna) &&
    checkInteger(clusterSpec.minSpecies!) &&
    clusterSpec.minSpecies! >= 0 &&
    checkInteger(clusterSpec.maxSpecies!) &&
    clusterSpec.maxSpecies! >= clusterSpec.minSpecies!
  );
}

function _checkMetric(metric: DissimilarityMetric): boolean {
  return (
    Object.values(DissimilarityBasis).includes(metric.basis) &&
    Object.values(DissimilarityTransform).includes(metric.transform) &&
    Object.values(TaxonRank).includes(metric.highestComparedRank) &&
    Object.values(TaxonWeight).includes(metric.weight)
  );
}
