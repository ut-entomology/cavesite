import { type TaxonTallyMap, TaxaClusterer } from './taxa_clusterer';
import { LocationEffort } from './location_effort';
import { ClusterSpec } from '../../shared/model';

export class MinusCommonTaxaClusterer extends TaxaClusterer {
  constructor(clusterSpec: ClusterSpec) {
    super(clusterSpec);
  }

  greatestLowerDissimilarity(locationEffort: LocationEffort): number {
    return this._calculateDissimilarity({}, this._tallyTaxa(locationEffort));
  }

  protected _calculateDissimilarity(
    clusterTaxonMap: TaxonTallyMap,
    locationTaxonMap: TaxonTallyMap
  ): number {
    let similarityCount = 0;
    for (const taxonTally of Object.values(locationTaxonMap)) {
      if (clusterTaxonMap[taxonTally.taxonUnique] !== undefined) {
        similarityCount += this._weights[taxonTally.rankIndex];
      }
    }
    return -this._transform(similarityCount);
  }
}

export class DiffMinusCommonTaxaClusterer extends TaxaClusterer {
  constructor(clusterSpec: ClusterSpec) {
    super(clusterSpec);
  }

  protected _calculateDissimilarity(
    clusterTaxonMap: TaxonTallyMap,
    locationTaxonMap: TaxonTallyMap
  ): number {
    let dissimilarityCount = 0;
    for (const taxonTally of Object.values(locationTaxonMap)) {
      if (clusterTaxonMap[taxonTally.taxonUnique] === undefined) {
        dissimilarityCount += this._weights[taxonTally.rankIndex];
      } else {
        dissimilarityCount -= this._weights[taxonTally.rankIndex];
      }
    }
    return dissimilarityCount < 0
      ? -this._transform(-dissimilarityCount)
      : this._transform(dissimilarityCount);
  }
}

export class BothDiffsMinusCommonTaxaClusterer extends TaxaClusterer {
  constructor(clusterSpec: ClusterSpec) {
    super(clusterSpec);
  }

  protected _calculateDissimilarity(
    clusterTaxonMap: TaxonTallyMap,
    locationTaxonMap: TaxonTallyMap
  ): number {
    let dissimilarityCount = 0;
    for (const taxonTally of Object.values(locationTaxonMap)) {
      if (clusterTaxonMap[taxonTally.taxonUnique] === undefined) {
        dissimilarityCount += this._weights[taxonTally.rankIndex];
      } else {
        dissimilarityCount -= this._weights[taxonTally.rankIndex];
      }
    }
    for (const taxonTally of Object.values(clusterTaxonMap)) {
      if (locationTaxonMap[taxonTally.taxonUnique] === undefined) {
        dissimilarityCount += this._weights[taxonTally.rankIndex];
      }
    }
    return dissimilarityCount < 0
      ? -this._transform(-dissimilarityCount)
      : this._transform(dissimilarityCount);
  }
}

export class DiffTaxaClusterer extends TaxaClusterer {
  constructor(clusterSpec: ClusterSpec) {
    super(clusterSpec);
  }

  protected _calculateDissimilarity(
    clusterTaxonMap: TaxonTallyMap,
    locationTaxonMap: TaxonTallyMap
  ): number {
    let diffCount = 0;
    for (const taxonTally of Object.values(locationTaxonMap)) {
      if (clusterTaxonMap[taxonTally.taxonUnique] === undefined) {
        diffCount += this._weights[taxonTally.rankIndex];
      }
    }
    return this._transform(diffCount);
  }
}

export class BothDiffsTaxaClusterer extends TaxaClusterer {
  constructor(clusterSpec: ClusterSpec) {
    super(clusterSpec);
  }

  protected _calculateDissimilarity(
    clusterTaxonMap: TaxonTallyMap,
    locationTaxonMap: TaxonTallyMap
  ): number {
    let diffCount = 0;
    for (const taxonTally of Object.values(locationTaxonMap)) {
      if (clusterTaxonMap[taxonTally.taxonUnique] === undefined) {
        diffCount += this._weights[taxonTally.rankIndex];
      }
    }
    for (const taxonTally of Object.values(clusterTaxonMap)) {
      if (locationTaxonMap[taxonTally.taxonUnique] === undefined) {
        diffCount += this._weights[taxonTally.rankIndex];
      }
    }
    return this._transform(diffCount);
  }
}
