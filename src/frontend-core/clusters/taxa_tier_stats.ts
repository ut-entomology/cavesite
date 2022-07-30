import {
  PredictionTierStat,
  PredictionStatsGenerator,
  computeAverageTierStats
} from './prediction_stats';
import { MAX_VISITS_DOCKED } from '../../shared/model';
import type { LocationGraphData } from './location_graph_data';
import type { ClusteringConfig } from './clustering_config';

export function generateAvgTaxaTierStats(
  config: ClusteringConfig,
  locationGraphDataSet: LocationGraphData[],
  clusterVisitsByTaxonUnique: Record<string, number>
): PredictionTierStat[] {
  // Create the stats into which we'll accumulate intermediate averages.

  let avgTaxaTierStats: PredictionTierStat[] = [];
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
  for (const taxon of Object.keys(clusterVisitsByTaxonUnique)) {
    const taxonVisitItem = {
      taxon,
      visits: 0
    };
    taxonVisitItems.push(taxonVisitItem);
    taxonVisitItemsMap[taxon] = taxonVisitItem;
  }

  // For each location, test historical predictions for that location assuming
  // all other locations remain unchanged, accumulating the statistics.

  let maxStatsLength = 0;
  for (const graphData of locationGraphDataSet) {
    // Determine the taxa found in other caves of the cluster.

    const otherCaveVisitsByTaxonUnique: Record<string, number> = {};
    for (const otherGraphData of locationGraphDataSet) {
      if (otherGraphData !== graphData) {
        for (const taxon of Object.keys(otherGraphData.visitsByTaxonUnique)) {
          if (taxonVisitItemsMap[taxon] !== undefined) {
            let visits = otherCaveVisitsByTaxonUnique[taxon] || 0;
            visits += otherGraphData.visitsByTaxonUnique[taxon];
            otherCaveVisitsByTaxonUnique[taxon] = visits;
          }
        }
      }
    }

    // Compute the average statistics over the docked visits of this location
    // and incorporate them into the running totals.

    const taxaStatsGen = new TaxaVisitsStatsGenerator(
      config,
      otherCaveVisitsByTaxonUnique,
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
    if (avgLocationStats.length > maxStatsLength) {
      maxStatsLength = avgLocationStats.length;
    }
  }

  // Average the running totals to produce the final statistics.

  avgTaxaTierStats = avgTaxaTierStats.splice(0, maxStatsLength);
  computeAverageTierStats(avgTaxaTierStats);
  return avgTaxaTierStats;
}

export class TaxaVisitsStatsGenerator extends PredictionStatsGenerator<TaxonVisitItem> {
  taxonVisitItemsMap: Record<string, TaxonVisitItem>;
  private _recentTaxa: string[][];
  private _visitsDocked = MAX_VISITS_DOCKED;
  private _taxaRemainingInCluster: Record<string, number>;
  private _itemsRemainingInLocation: TaxonVisitItem[] = [];

  constructor(
    config: ClusteringConfig,
    otherCaveVisitsByTaxonUnique: Record<string, number>,
    graphData: LocationGraphData,
    taxonVisitItems: TaxonVisitItem[],
    taxonVisitItemsMap: Record<string, TaxonVisitItem>
  ) {
    super(
      config.predictionHistorySampleDepth,
      config.maxPredictionTiers,
      taxonVisitItems
    );
    this._recentTaxa = graphData.recentTaxa;
    this.taxonVisitItemsMap = taxonVisitItemsMap;

    // Determine the taxa remaining to be added to this location following the
    // oldest recent visit to be tested for predictive ability. Sort oldest-
    // found first, and within each visit, they sort most-general first. These
    // are the actually found taxa to used for comparison with predictions.

    const taxaRemainingInLocation: string[] = [];
    for (let i = 0; i < this._recentTaxa.length; ++i) {
      for (let j = 0; j < this._recentTaxa[i].length; ++j) {
        const taxon = this._recentTaxa[i][j];
        const item = taxonVisitItemsMap[taxon];
        if (item !== undefined) {
          taxaRemainingInLocation.push(taxon);
          this._itemsRemainingInLocation.push(item);
        }
      }
    }

    // Remove from cluster all taxa found in the present location up to the
    // oldest recent visit to be tested for predictive ability. This leaves
    // _taxaRemainingInCluster with found in other clusters but not yet found
    // in the present location (before the remaining to-be-tested visits).

    this._taxaRemainingInCluster = Object.assign({}, otherCaveVisitsByTaxonUnique);
    for (const taxon of Object.keys(graphData.visitsByTaxonUnique)) {
      if (!taxaRemainingInLocation.includes(taxon)) {
        delete this._taxaRemainingInCluster[taxon];
      }
    }
  }

  getActualValueSort(_visitsDocked: number): TaxonVisitItem[] {
    // Requires caller to call with greatest number of visits docked first.

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

  putPredictionsInDataset(visitsDocked: number): void {
    // Requires caller to call with greatest number of visits docked first.

    const recentVisits = this._recentTaxa.length;
    if (recentVisits >= visitsDocked) {
      // Bring the remaining taxa up to date with current visits docked.
      while (this._visitsDocked > 0 && this._visitsDocked > visitsDocked) {
        for (const taxon of this._recentTaxa[recentVisits - visitsDocked]) {
          if (this._taxaRemainingInCluster[taxon] !== undefined) {
            delete this._taxaRemainingInCluster[taxon];
            this._itemsRemainingInLocation.shift();
          }
        }
        --this._visitsDocked;
      }
    }

    // Copy the visit counts for remaining taxa into the dataset, indicating
    // that predictions for the all other taxa are not possible.

    this.dataset.forEach((item) => (item.visits = 0));
    for (const [taxon, visits] of Object.entries(this._taxaRemainingInCluster)) {
      this.taxonVisitItemsMap[taxon].visits = visits;
    }
  }
}

interface TaxonVisitItem {
  taxon: string;
  visits: number;
}
