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

export interface ClusterInfo {
  taxonTallyMap: TaxonTallyMap;
  initialScore: number;
}

export abstract class DissimilarityCalculator {
  protected _weights: number[];
  protected _transform: (from: number) => number;

  initialClusterScore(_locationEffort: LocationEffort): number {
    return 0;
  }

  greatestLowerDissimilarity(_locationEffort: LocationEffort): number {
    return 0;
  }

  abstract calc(
    clusterInfo: ClusterInfo,
    locationTaxonMap: TaxonTallyMap,
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
      case DissimilarityBasis.visitCountDiff:
        return new VisitCountDiffCalculator(metric);
      case DissimilarityBasis.personVisitCountDiff:
        return new PersonVisitCountDiffCalculator(metric);
      case DissimilarityBasis.taxonCountDiff:
        return new TaxonCountDiffCalculator(metric);
      case DissimilarityBasis.minusCommonTaxa:
        return new MinusCommonTaxaCalculator(metric);
      case DissimilarityBasis.diffMinusCommonTaxa:
        return new DiffMinusCommonTaxaCalculator(metric);
      case DissimilarityBasis.bothDiffsMinusCommonTaxa:
        return new BothDiffsMinusCommonTaxaCalculator(metric);
      case DissimilarityBasis.diffTaxa:
        return new DiffTaxaCalculator(metric);
      case DissimilarityBasis.bothDiffTaxa:
        return new BothDiffsTaxaCalculator(metric);
      default:
        throw Error(metric + ' not yet supported');
    }
  }
}

class VisitCountDiffCalculator extends DissimilarityCalculator {
  constructor(metric: DissimilarityMetric) {
    super(metric);
  }

  initialClusterScore(locationEffort: LocationEffort): number {
    return locationEffort.totalVisits;
  }

  calc(
    clusterInfo: ClusterInfo,
    _locationTaxonMap: TaxonTallyMap,
    locationEffort: LocationEffort
  ): number {
    return Math.abs(locationEffort.totalVisits - clusterInfo.initialScore);
  }
}

class PersonVisitCountDiffCalculator extends DissimilarityCalculator {
  constructor(metric: DissimilarityMetric) {
    super(metric);
  }

  initialClusterScore(locationEffort: LocationEffort): number {
    return locationEffort.totalPersonVisits;
  }

  calc(
    clusterInfo: ClusterInfo,
    _locationTaxonMap: TaxonTallyMap,
    locationEffort: LocationEffort
  ): number {
    return Math.abs(locationEffort.totalPersonVisits - clusterInfo.initialScore);
  }
}

class TaxonCountDiffCalculator extends DissimilarityCalculator {
  constructor(metric: DissimilarityMetric) {
    super(metric);
  }

  initialClusterScore(locationEffort: LocationEffort): number {
    return Object.keys(tallyTaxa(locationEffort)).length;
  }

  calc(
    clusterInfo: ClusterInfo,
    locationTaxonMap: TaxonTallyMap,
    _locationEffort: LocationEffort
  ): number {
    return Math.abs(Object.keys(locationTaxonMap).length - clusterInfo.initialScore);
  }
}

class MinusCommonTaxaCalculator extends DissimilarityCalculator {
  constructor(metric: DissimilarityMetric) {
    super(metric);
  }

  greatestLowerDissimilarity(locationEffort: LocationEffort): number {
    return this.calc(
      { taxonTallyMap: {}, initialScore: 0 },
      tallyTaxa(locationEffort),
      locationEffort
    );
  }

  calc(
    clusterInfo: ClusterInfo,
    locationTaxonMap: TaxonTallyMap,
    _locationEffort: LocationEffort
  ): number {
    let similarityCount = 0;
    for (const taxonTally of Object.values(locationTaxonMap)) {
      if (clusterInfo.taxonTallyMap[taxonTally.taxonUnique] !== undefined) {
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
    clusterInfo: ClusterInfo,
    locationTaxonMap: TaxonTallyMap,
    _locationEffort: LocationEffort
  ): number {
    let dissimilarityCount = 0;
    for (const taxonTally of Object.values(locationTaxonMap)) {
      if (clusterInfo.taxonTallyMap[taxonTally.taxonUnique] === undefined) {
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

class BothDiffsMinusCommonTaxaCalculator extends DissimilarityCalculator {
  constructor(metric: DissimilarityMetric) {
    super(metric);
  }

  calc(
    clusterInfo: ClusterInfo,
    locationTaxonMap: TaxonTallyMap,
    _locationEffort: LocationEffort
  ): number {
    let dissimilarityCount = 0;
    for (const taxonTally of Object.values(locationTaxonMap)) {
      if (clusterInfo.taxonTallyMap[taxonTally.taxonUnique] === undefined) {
        dissimilarityCount += this._weights[taxonTally.rankIndex];
      } else {
        dissimilarityCount -= this._weights[taxonTally.rankIndex];
      }
    }
    for (const taxonTally of Object.values(clusterInfo.taxonTallyMap)) {
      if (locationTaxonMap[taxonTally.taxonUnique] === undefined) {
        dissimilarityCount += this._weights[taxonTally.rankIndex];
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
    clusterInfo: ClusterInfo,
    locationTaxonMap: TaxonTallyMap,
    _locationEffort: LocationEffort
  ): number {
    let diffCount = 0;
    for (const taxonTally of Object.values(locationTaxonMap)) {
      if (clusterInfo.taxonTallyMap[taxonTally.taxonUnique] === undefined) {
        diffCount += this._weights[taxonTally.rankIndex];
      }
    }
    return this._transform(diffCount);
  }
}

class BothDiffsTaxaCalculator extends DissimilarityCalculator {
  constructor(metric: DissimilarityMetric) {
    super(metric);
  }

  calc(
    clusterInfo: ClusterInfo,
    locationTaxonMap: TaxonTallyMap,
    _locationEffort: LocationEffort
  ): number {
    let diffCount = 0;
    for (const taxonTally of Object.values(locationTaxonMap)) {
      if (clusterInfo.taxonTallyMap[taxonTally.taxonUnique] === undefined) {
        diffCount += this._weights[taxonTally.rankIndex];
      }
    }
    for (const taxonTally of Object.values(clusterInfo.taxonTallyMap)) {
      if (locationTaxonMap[taxonTally.taxonUnique] === undefined) {
        diffCount += this._weights[taxonTally.rankIndex];
      }
    }
    return this._transform(diffCount);
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
