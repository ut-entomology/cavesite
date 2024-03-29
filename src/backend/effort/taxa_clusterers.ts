/**
 * This module provides a variety of implemenations of clustering
 * based on the similaity of taxa.
 */

import { type DB } from '../integrations/postgres';
import { type TaxonTallyMap, TaxaClusterer } from './taxa_clusterer';
import { ClusterSpec } from '../../shared/model';

export class MinusCommonTaxaClusterer extends TaxaClusterer {
  constructor(db: DB, clusterSpec: ClusterSpec) {
    super(db, clusterSpec);
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
  constructor(db: DB, clusterSpec: ClusterSpec) {
    super(db, clusterSpec);
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
  constructor(db: DB, clusterSpec: ClusterSpec) {
    super(db, clusterSpec);
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
  constructor(db: DB, clusterSpec: ClusterSpec) {
    super(db, clusterSpec);
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
  constructor(db: DB, clusterSpec: ClusterSpec) {
    super(db, clusterSpec);
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
