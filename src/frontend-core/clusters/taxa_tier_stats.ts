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

  // Determine the taxa present in the cluster excluding all recent taxa
  // in all locations. Further limit the taxa to just those involved in
  // the query, as specified by clusterVisitsByTaxonUnique.

  const baseVisitsByTaxonUnique: Record<string, number> = {};
  for (const graphData of locationGraphDataSet) {
    const locationTaxa = Object.assign({}, graphData.visitsByTaxonUnique);
    for (const recentTaxa of graphData.recentTaxa) {
      for (const taxon of recentTaxa) {
        delete locationTaxa[taxon];
      }
    }
    for (const [taxon, visits] of Object.entries(locationTaxa)) {
      if (clusterVisitsByTaxonUnique[taxon] !== undefined) {
        const oldVisits = baseVisitsByTaxonUnique[taxon];
        if (oldVisits === undefined) {
          baseVisitsByTaxonUnique[taxon] = visits;
        } else {
          baseVisitsByTaxonUnique[taxon] = oldVisits + visits;
        }
      }
    }
  }

  // For each location, test historical predictions for that location assuming
  // all other locations remain unchanged, accumulating the statistics.

  let maxStatsLength = 0;
  for (const graphData of locationGraphDataSet) {
    // Determine the taxa available in the cluster, ignoring additions
    // made the recent visits to the present location.

    const trialClusterVisitsByTaxonUnique = Object.assign({}, baseVisitsByTaxonUnique);
    for (const otherGraphData of locationGraphDataSet) {
      if (otherGraphData !== graphData) {
        for (const recentTaxa of otherGraphData.recentTaxa) {
          for (const taxon of recentTaxa) {
            const visits = clusterVisitsByTaxonUnique[taxon];
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
  private _visitsElided = MAX_VISITS_ELIDED;
  private _taxaRemainingInCluster: Record<string, number>;
  private _itemsRemainingInLocation: TaxonVisitItem[] = [];

  constructor(
    config: ClusteringConfig,
    clusterVisitsByTaxonUnique: Record<string, number>,
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

    this._taxaRemainingInCluster = Object.assign({}, clusterVisitsByTaxonUnique);
    for (const taxon of Object.keys(graphData.visitsByTaxonUnique)) {
      if (!taxaRemainingInLocation.includes(taxon)) {
        delete this._taxaRemainingInCluster[taxon];
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

    const recentVisits = this._recentTaxa.length;
    if (recentVisits >= visitsElided) {
      // Bring the remaining taxa up to date with current visits elided.
      while (this._visitsElided > 0 && this._visitsElided > visitsElided) {
        for (const taxon of this._recentTaxa[recentVisits - visitsElided]) {
          if (this._taxaRemainingInCluster[taxon] !== undefined) {
            delete this._taxaRemainingInCluster[taxon];
            this._itemsRemainingInLocation.shift();
          }
        }
        --this._visitsElided;
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
