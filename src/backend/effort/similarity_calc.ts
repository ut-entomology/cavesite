import {
  taxonRanks,
  SimilarityMetric,
  SimilarityBasis,
  SimilarityTransform,
  TaxonWeight
} from '../../shared/model';

export interface TaxonTally {
  taxonUnique: string;
  rankIndex: number;
  count: number;
}
export type TaxonTallyMap = Record<string, TaxonTally>;

export abstract class SimilarityCalculator {
  protected _weights: number[];
  protected _transform: (from: number) => number;

  abstract calc(clusterTaxonMap: TaxonTallyMap, effortTallies: TaxonTally[]): number;

  protected constructor(metric: SimilarityMetric) {
    switch (metric.transform) {
      case SimilarityTransform.none:
        this._transform = (from: number) => from;
        break;
      case SimilarityTransform.ln:
        this._transform = (from: number) => (from <= 0 ? 0 : Math.log(from));
        break;
      case SimilarityTransform.sqrt:
        this._transform = (from: number) => (from <= 0 ? 0 : Math.sqrt(from));
        break;
      case SimilarityTransform.to1_5:
        this._transform = (from: number) => Math.pow(from, 1.5);
        break;
    }

    this._weights = [];
    for (let i = 0; i < taxonRanks.length; ++i) {
      switch (metric.weight) {
        case TaxonWeight.unweighted:
          this._weights[i] = 1;
          break;
        case TaxonWeight.weighted:
          this._weights[i] = i;
          break;
        case TaxonWeight.doubleWeight:
          this._weights[i] = 2 * i;
          break;
      }
    }
  }

  static create(metric: SimilarityMetric): SimilarityCalculator {
    switch (metric.basis) {
      case SimilarityBasis.commonTaxa:
        return new CommonSpeciesCalculator(metric);
      case SimilarityBasis.commonMinusDiffTaxa:
        return new CommonMinusDiffSpeciesCalculator(metric);
      default:
        throw Error(metric + ' not yet supported');
    }
  }
}

class CommonSpeciesCalculator extends SimilarityCalculator {
  constructor(metric: SimilarityMetric) {
    super(metric);
  }

  calc(clusterTaxonMap: TaxonTallyMap, effortTallies: TaxonTally[]): number {
    let similarityCount = 0;
    for (const tally of effortTallies) {
      if (clusterTaxonMap[tally.taxonUnique] !== undefined) {
        similarityCount += this._weights[tally.rankIndex];
      }
    }
    return this._transform(similarityCount);
  }
}

class CommonMinusDiffSpeciesCalculator extends SimilarityCalculator {
  constructor(metric: SimilarityMetric) {
    super(metric);
  }

  calc(clusterTaxonMap: TaxonTallyMap, effortTallies: TaxonTally[]): number {
    let similarityCount = 0;
    for (const tally of effortTallies) {
      if (clusterTaxonMap[tally.taxonUnique] === undefined) {
        similarityCount -= this._weights[tally.rankIndex];
      } else {
        similarityCount += this._weights[tally.rankIndex];
      }
    }
    return this._transform(similarityCount);
  }
}
