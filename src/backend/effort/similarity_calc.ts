import {
  taxonRanks,
  TaxonWeight,
  SimilarityMetric,
  SimilarityTransform
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

  protected constructor(transform: SimilarityTransform, weight: TaxonWeight | null) {
    switch (transform) {
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
      switch (weight) {
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

  static create(
    metric: SimilarityMetric,
    transform: SimilarityTransform,
    weight: TaxonWeight | null
  ): SimilarityCalculator {
    switch (metric) {
      case SimilarityMetric.commonSpecies:
        return new CommonSpeciesCalculator(transform, weight);
      case SimilarityMetric.commonMinusDiffSpecies:
        return new CommonMinusDiffSpeciesCalculator(transform, weight);
      default:
        throw Error(metric + ' not yet supported');
    }
  }
}

class CommonSpeciesCalculator extends SimilarityCalculator {
  constructor(transform: SimilarityTransform, weight: TaxonWeight | null) {
    super(transform, weight);
  }

  calc(clusterTaxonMap: TaxonTallyMap, effortTallies: TaxonTally[]): number {
    let similarityCount = 0;
    for (const tally of effortTallies) {
      if (clusterTaxonMap[tally.taxonUnique] !== undefined) {
        similarityCount += this._weights[tally.rankIndex];
      }
    }
    return similarityCount;
  }
}

class CommonMinusDiffSpeciesCalculator extends SimilarityCalculator {
  constructor(transform: SimilarityTransform, weight: TaxonWeight | null) {
    super(transform, weight);
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
    return similarityCount;
  }
}
