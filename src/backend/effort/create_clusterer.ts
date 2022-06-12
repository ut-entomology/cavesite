import { Clusterer } from './clusterer';
import { ClusterSpec, DissimilarityBasis } from '../../shared/model';

import * as clusterers from './taxa_clusterers';

export function createClusterer(clusterSpec: ClusterSpec): Clusterer {
  switch (clusterSpec.metric.basis) {
    case DissimilarityBasis.minusCommonTaxa:
      return new clusterers.MinusCommonTaxaClusterer(clusterSpec);
    case DissimilarityBasis.diffMinusCommonTaxa:
      return new clusterers.DiffMinusCommonTaxaClusterer(clusterSpec);
    case DissimilarityBasis.bothDiffsMinusCommonTaxa:
      return new clusterers.BothDiffsMinusCommonTaxaClusterer(clusterSpec);
    case DissimilarityBasis.diffTaxa:
      return new clusterers.DiffTaxaClusterer(clusterSpec);
    case DissimilarityBasis.bothDiffTaxa:
      return new clusterers.BothDiffsTaxaClusterer(clusterSpec);
    default:
      throw Error(clusterSpec.metric.basis + ' not yet supported');
  }
}
