import {
  taxonRanks,
  SimilarityMetric,
  SimilarityBasis,
  SimilarityTransform,
  TaxonWeight
} from '../../shared/model';
import { LocationEffort } from './location_effort';

export interface TaxonTally {
  taxonUnique: string;
  rankIndex: number;
  count: number;
}
export type TaxonTallyMap = Record<string, TaxonTally>;

export abstract class SimilarityCalculator {
  protected _weights: number[];
  protected _transform: (from: number) => number;

  leastUpperSimilarity(locationEffort: LocationEffort): number {
    const taxonTallies = tallyTaxa(locationEffort);
    return Object.keys(taxonTallies).length;
  }

  abstract calc(
    clusterTaxonMap: TaxonTallyMap,
    locationTaxonTallies: TaxonTally[],
    locationEffort: LocationEffort
  ): number;

  canShortcutSeeding(_minSimilarity: number, _locationEffort: LocationEffort): boolean {
    return false;
  }

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
        case TaxonWeight.halfAgainWeight:
          this._weights[i] = 1.5 * i;
          break;
        case TaxonWeight.doubleWeight:
          this._weights[i] = 2 * i;
          break;
        case TaxonWeight.onlySpecies:
          this._weights[i] = i >= taxonRanks.length - 2 ? 1 : 0;
          break;
        case TaxonWeight.onlyGenera:
          this._weights[i] = i == taxonRanks.length - 3 ? 1 : 0;
          break;
        case TaxonWeight.onlyGeneraAndSpecies:
          this._weights[i] = i >= taxonRanks.length - 3 ? 1 : 0;
          break;
      }
    }
  }

  static create(metric: SimilarityMetric): SimilarityCalculator {
    switch (metric.basis) {
      case SimilarityBasis.commonTaxa:
        return new CommonTaxaCalculator(metric);
      case SimilarityBasis.commonMinusDiffTaxa:
        return new CommonMinusDiffTaxaCalculator(metric);
      case SimilarityBasis.minusDiffTaxa:
        return new MinusDiffTaxaCalculator(metric);
      default:
        throw Error(metric + ' not yet supported');
    }
  }
}

class CommonTaxaCalculator extends SimilarityCalculator {
  constructor(metric: SimilarityMetric) {
    super(metric);
  }

  calc(
    clusterTaxonMap: TaxonTallyMap,
    locationTaxonTallies: TaxonTally[],
    _locationEffort: LocationEffort
  ): number {
    let similarityCount = 0;
    for (const taxonTally of locationTaxonTallies) {
      if (clusterTaxonMap[taxonTally.taxonUnique] !== undefined) {
        similarityCount += this._weights[taxonTally.rankIndex];
      }
    }
    return this._transform(similarityCount);
  }
}

class CommonMinusDiffTaxaCalculator extends SimilarityCalculator {
  constructor(metric: SimilarityMetric) {
    super(metric);
  }

  calc(
    clusterTaxonMap: TaxonTallyMap,
    locationTaxonTallies: TaxonTally[],
    _locationEffort: LocationEffort
  ): number {
    let similarityCount = 0;
    for (const taxonTally of locationTaxonTallies) {
      if (clusterTaxonMap[taxonTally.taxonUnique] === undefined) {
        similarityCount -= this._weights[taxonTally.rankIndex];
      } else {
        similarityCount += this._weights[taxonTally.rankIndex];
      }
    }
    return similarityCount >= 0
      ? this._transform(similarityCount)
      : -this._transform(-similarityCount);
  }
}

class MinusDiffTaxaCalculator extends SimilarityCalculator {
  constructor(metric: SimilarityMetric) {
    super(metric);
  }

  leastUpperSimilarity(_locationEffort: LocationEffort): number {
    return 0;
  }

  calc(
    clusterTaxonMap: TaxonTallyMap,
    locationTaxonTallies: TaxonTally[],
    _locationEffort: LocationEffort
  ): number {
    let diffCount = 0;
    for (const taxonTally of locationTaxonTallies) {
      if (clusterTaxonMap[taxonTally.taxonUnique] === undefined) {
        diffCount += this._weights[taxonTally.rankIndex];
      }
    }
    return -this._transform(diffCount);
  }

  canShortcutSeeding(minSimilarity: number, locationEffort: LocationEffort): boolean {
    // TODO: technically, this should be a test of total taxa
    return locationEffort.totalSpecies <= Math.abs(minSimilarity);
  }
}

export function tallyTaxa(effort: LocationEffort): TaxonTallyMap {
  const tallies: TaxonTallyMap = {};
  _tallyTaxonRank(tallies, 0, effort.kingdomNames);
  _tallyTaxonRank(tallies, 1, effort.phylumNames);
  _tallyTaxonRank(tallies, 2, effort.classNames);
  _tallyTaxonRank(tallies, 3, effort.orderNames);
  _tallyTaxonRank(tallies, 4, effort.familyNames);
  _tallyTaxonRank(tallies, 5, effort.genusNames);
  _tallyTaxonRank(tallies, 6, effort.speciesNames);
  _tallyTaxonRank(tallies, 7, effort.subspeciesNames);
  return tallies;
}

function _tallyTaxonRank(
  tallies: TaxonTallyMap,
  rankIndex: number,
  taxaString: string | null
): void {
  if (taxaString === null) return;
  for (const taxonUnique of taxaString.split('|')) {
    if (tallies[taxonUnique] === undefined) {
      tallies[taxonUnique] = { taxonUnique, rankIndex, count: 1 };
    } else {
      tallies[taxonUnique].count += 1;
    }
  }
}
