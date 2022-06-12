import { Clusterer } from './clusterer';
import { DissimilarityMetric, DissimilarityBasis } from '../../shared/model';

import * as clusterers from './taxa_clusterers';

export function createClusterer(metric: DissimilarityMetric): Clusterer {
  switch (metric.basis) {
    case DissimilarityBasis.minusCommonTaxa:
      return new clusterers.MinusCommonTaxaClusterer(metric);
    case DissimilarityBasis.diffMinusCommonTaxa:
      return new clusterers.DiffMinusCommonTaxaClusterer(metric);
    case DissimilarityBasis.bothDiffsMinusCommonTaxa:
      return new clusterers.BothDiffsMinusCommonTaxaClusterer(metric);
    case DissimilarityBasis.diffTaxa:
      return new clusterers.DiffTaxaClusterer(metric);
    case DissimilarityBasis.bothDiffTaxa:
      return new clusterers.BothDiffsTaxaClusterer(metric);
    default:
      throw Error(metric + ' not yet supported');
  }
}
