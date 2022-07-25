import {
  PredictionTierStat,
  PredictionStatsGenerator,
  computeAverageTierStats
} from './prediction_stats';
import { MAX_VISITS_ELIDED } from '../../shared/model';
import type { LocationGraphData } from './location_graph_data';
import type { ClusteringConfig } from './clustering_config';

export function generateAvgTaxaTierStats(
  config: ClusteringConfig,
  locationGraphDataSet: LocationGraphData[],
  visitsByTaxonUnique: Record<string, number>
): PredictionTierStat[] {
  // Create the stats into which we'll accumulate intermediate averages.

  const avgTaxaTierStats: PredictionTierStat[] = [];
  for (let i = 0; i < config.maxPredictionTiers; ++i) {
    avgTaxaTierStats.push({
      fractionCorrect: 0, // temporarily sum of fractions * contributionCount
      contributionCount: 0
    });
  }

  // Create the items representing taxa that the stats generator uses,
  // creating them only once to reduce object churn. Also provide a map
  // for fast lookup.

  const taxonVisitItems: TaxonVisitItem[] = [];
  const taxonVisitItemsMap: Record<string, TaxonVisitItem> = {};
  for (const taxon of Object.keys(visitsByTaxonUnique)) {
    const taxonVisitItem = {
      taxon,
      visits: 0
    };
    taxonVisitItems.push(taxonVisitItem);
    taxonVisitItemsMap[taxon] = taxonVisitItem;
  }

  // Determine the taxa present in the cluster excluding all recent taxa
  // in all locations. Further limit the taxa to just those involved in
  // the query, as specified by visitsByTaxonUnique.

  const baseVisitsByTaxonUnique: Record<string, number> = {};
  for (const graphData of locationGraphDataSet) {
    const locationTaxa = Object.assign({}, graphData.visitsByTaxonUnique);
    for (const recentTaxa of graphData.recentTaxa) {
      for (const taxon of recentTaxa) {
        delete locationTaxa[taxon];
      }
    }
    for (const [taxon, visits] of Object.entries(locationTaxa)) {
      const oldVisits = baseVisitsByTaxonUnique[taxon];
      if (oldVisits === undefined) {
        baseVisitsByTaxonUnique[taxon] = visits;
      } else {
        baseVisitsByTaxonUnique[taxon] = oldVisits + visits;
      }
    }
  }
  for (const taxon of Object.keys(baseVisitsByTaxonUnique)) {
    if (visitsByTaxonUnique[taxon] === undefined) {
      delete baseVisitsByTaxonUnique[taxon];
    }
  }

  // For each location, test historical predictions for that location assuming
  // all other locations remain unchanged, accumulating the statistics.

  for (const graphData of locationGraphDataSet) {
    // Determine the taxa available in the cluster, ignoring additions
    // made the recent visits to the present location.

    const trialClusterVisitsByTaxonUnique = Object.assign({}, baseVisitsByTaxonUnique);
    for (const otherGraphData of locationGraphDataSet) {
      if (otherGraphData !== graphData) {
        for (const recentTaxa of otherGraphData.recentTaxa) {
          for (const taxon of recentTaxa) {
            const visits = visitsByTaxonUnique[taxon];
            if (visits !== undefined) {
              trialClusterVisitsByTaxonUnique[taxon] = visits;
            }
          }
        }
      }
    }

    // Compute the average statistics over the elided visits of this location
    // and incorporate them into the running totals.

    const taxaStatsGen = new TaxaVisitsStatsGenerator(
      config,
      trialClusterVisitsByTaxonUnique,
      baseVisitsByTaxonUnique,
      graphData,
      taxonVisitItems,
      taxonVisitItemsMap
    );
    const avgLocationStats = taxaStatsGen.computeAverageStats();
    for (let i = 0; i < avgLocationStats.length; ++i) {
      const avgTaxaTierStat = avgTaxaTierStats[i];
      const avgLocationTierStat = avgLocationStats[i];
      avgTaxaTierStat.fractionCorrect +=
        avgLocationTierStat.fractionCorrect * graphData.recentTaxa.length;
      avgTaxaTierStat.contributionCount += graphData.recentTaxa.length;
    }
  }

  // Average the running totals to produce the final statistics.

  computeAverageTierStats(avgTaxaTierStats);
  return avgTaxaTierStats;
}

export class TaxaVisitsStatsGenerator extends PredictionStatsGenerator<TaxonVisitItem> {
  clusterVisitsByTaxonUnique: Record<string, number>;
  baseVisitsByTaxonUnique: Record<string, number>;
  taxonVisitItemsMap: Record<string, TaxonVisitItem>;
  private _recentTaxa: string[][];
  private _visitsElided = MAX_VISITS_ELIDED;
  private _taxaRemainingInCluster: Record<string, number>;
  private _itemsRemainingInLocation: TaxonVisitItem[] = [];

  constructor(
    config: ClusteringConfig,
    clusterVisitsByTaxonUnique: Record<string, number>,
    baseVisitsByTaxonUnique: Record<string, number>,
    graphData: LocationGraphData,
    taxonVisitItems: TaxonVisitItem[],
    taxonVisitItemsMap: Record<string, TaxonVisitItem>
  ) {
    super(
      config.predictionHistorySampleDepth,
      config.maxPredictionTiers,
      taxonVisitItems
    );
    this.clusterVisitsByTaxonUnique = clusterVisitsByTaxonUnique;
    this.baseVisitsByTaxonUnique = baseVisitsByTaxonUnique;
    this._recentTaxa = graphData.recentTaxa;
    this.taxonVisitItemsMap = taxonVisitItemsMap;

    this._taxaRemainingInCluster = Object.assign({}, clusterVisitsByTaxonUnique);
    for (const taxon of Object.keys(graphData.visitsByTaxonUnique)) {
      delete this._taxaRemainingInCluster[taxon];
    }

    // The taxa remaining in this location sort oldest-found first, and within
    // each visit, they sort most-general first.

    for (let i = 0; i < this._recentTaxa.length; ++i) {
      for (let j = 0; j < this._recentTaxa[i].length; ++j) {
        const taxon = this._recentTaxa[i][j];
        const item = taxonVisitItemsMap[taxon];
        if (item !== undefined) {
          this._itemsRemainingInLocation.push(item);
        }
      }
    }
  }

  getActualValueSort(_visitsElided: number): TaxonVisitItem[] {
    // Requires caller to call with greatest number of visits elided first.

    return this._itemsRemainingInLocation;
  }

  getIndexOfFirstPrediction(): number {
    return this.dataset.findIndex((item) => item.visits != 0);
  }

  getItemUnique(item: TaxonVisitItem): string | number {
    return item.taxon;
  }

  sortDatasetByPredictions(): void {
    this.dataset.sort((a, b) => {
      if (a.visits == 0) return b.visits == 0 ? 0 : -1;
      if (b.visits == 0) return 1;
      if (a.visits == b.visits) return 0;
      return b.visits - a.visits; // highest visits first
    });
  }

  putPredictionsInDataset(visitsElided: number): void {
    // Requires caller to call with greatest number of visits elided first.

    // Assume no predictions are possible at this visitsElided.
    this.dataset.forEach((item) => (item.visits = 0));

    const recentVisits = this._recentTaxa.length;
    if (recentVisits >= visitsElided) {
      // Bring the remaining taxa up to date with current visits elided.
      while (this._visitsElided > 0 && this._visitsElided > visitsElided) {
        for (const taxon of this._recentTaxa[recentVisits - visitsElided]) {
          delete this._taxaRemainingInCluster[taxon];
          this._itemsRemainingInLocation.shift();
        }
        --this._visitsElided;
      }

      // Copy the visit counts for remaining taxa into the dataset.

      for (const [taxon, visits] of Object.entries(this._taxaRemainingInCluster)) {
        this.taxonVisitItemsMap[taxon].visits = visits;
      }
    }
  }
}

interface TaxonVisitItem {
  taxon: string;
  visits: number;
}
