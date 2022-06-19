import { type DB } from '../integrations/postgres';
import { Clusterer } from './clusterer';
import { ClusterSpec, DissimilarityBasis } from '../../shared/model';

import * as clusterers from './taxa_clusterers';

export function createClusterer(db: DB, clusterSpec: ClusterSpec): Clusterer {
  switch (clusterSpec.metric.basis) {
    case DissimilarityBasis.minusCommonTaxa:
      return new clusterers.MinusCommonTaxaClusterer(db, clusterSpec);
    case DissimilarityBasis.diffMinusCommonTaxa:
      return new clusterers.DiffMinusCommonTaxaClusterer(db, clusterSpec);
    case DissimilarityBasis.bothDiffsMinusCommonTaxa:
      return new clusterers.BothDiffsMinusCommonTaxaClusterer(db, clusterSpec);
    case DissimilarityBasis.diffTaxa:
      return new clusterers.DiffTaxaClusterer(db, clusterSpec);
    case DissimilarityBasis.bothDiffTaxa:
      return new clusterers.BothDiffsTaxaClusterer(db, clusterSpec);
    default:
      throw Error(clusterSpec.metric.basis + ' not yet supported');
  }
}
