import {
  taxonRanks,
  DissimilarityMetric,
  DissimilarityBasis,
  DissimilarityTransform,
  TaxonWeight
} from '../../shared/model';
import { LocationEffort } from './location_effort';

export interface TaxonTally {
  taxonUnique: string;
  rankIndex: number;
  count: number;
}
export type TaxonTallyMap = Record<string, TaxonTally>;

export abstract class DissimilarityCalculator {
  protected _weights: number[];
  protected _transform: (from: number) => number;

  greatestLowerDissimilarity(_locationEffort: LocationEffort): number {
    return 0;
  }

  canShortcutSeeding(
    _maxDissimilaritySoFar: number,
    _locationEffort: LocationEffort
  ): boolean {
    return false;
  }

  abstract calc(
    clusterTaxonMap: TaxonTallyMap,
    locationTaxonTallies: TaxonTally[],
    locationEffort: LocationEffort
  ): number;

  protected constructor(metric: DissimilarityMetric) {
    switch (metric.transform) {
      case DissimilarityTransform.none:
        this._transform = (from: number) => from;
        break;
      case DissimilarityTransform.ln:
        this._transform = (from: number) => (from <= 0 ? 0 : Math.log(from));
        break;
      case DissimilarityTransform.sqrt:
        this._transform = (from: number) => (from <= 0 ? 0 : Math.sqrt(from));
        break;
      case DissimilarityTransform.to1_5:
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

  static create(metric: DissimilarityMetric): DissimilarityCalculator {
    switch (metric.basis) {
      case DissimilarityBasis.minusCommonTaxa:
        return new MinusCommonTaxaCalculator(metric);
      case DissimilarityBasis.diffMinusCommonTaxa:
        return new DiffMinusCommonTaxaCalculator(metric);
      case DissimilarityBasis.diffTaxa:
        return new DiffTaxaCalculator(metric);
      default:
        throw Error(metric + ' not yet supported');
    }
  }
}

class MinusCommonTaxaCalculator extends DissimilarityCalculator {
  constructor(metric: DissimilarityMetric) {
    super(metric);
  }

  greatestLowerDissimilarity(locationEffort: LocationEffort): number {
    const taxonTallies = tallyTaxa(locationEffort);
    return this.calc({}, Object.values(taxonTallies), locationEffort);
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
    return -this._transform(similarityCount);
  }
}

class DiffMinusCommonTaxaCalculator extends DissimilarityCalculator {
  constructor(metric: DissimilarityMetric) {
    super(metric);
  }

  calc(
    clusterTaxonMap: TaxonTallyMap,
    locationTaxonTallies: TaxonTally[],
    _locationEffort: LocationEffort
  ): number {
    let dissimilarityCount = 0;
    for (const taxonTally of locationTaxonTallies) {
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

class DiffTaxaCalculator extends DissimilarityCalculator {
  constructor(metric: DissimilarityMetric) {
    super(metric);
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
    return this._transform(diffCount);
  }

  canShortcutSeeding(
    maxDissimilaritySoFar: number,
    locationEffort: LocationEffort
  ): boolean {
    // TODO: technically, this should be a test of total taxa
    return locationEffort.totalSpecies <= maxDissimilaritySoFar;
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
