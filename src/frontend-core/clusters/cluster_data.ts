import {
  PredictionTierStat,
  PredictionStatsGenerator,
  computeAverageTierStats
} from './prediction_stats';
import type { Point } from '../../shared/point';
import {
  type TaxonRank,
  type ComparedTaxa,
  MAX_VISITS_ELIDED
} from '../../shared/model';
import type { LocationGraphData } from './location_graph_data';
import { type PointSliceSpec, slicePointSet } from './effort_graph_spec';
import { PowerFitModel } from './power_fit_model';

export interface ClusteringConfig {
  maxClusters: number;
  comparedTaxa: ComparedTaxa;
  ignoreSubgenera: boolean;
  highestComparedRank: TaxonRank;
  maxPointsToRegress: number | null;
  predictionHistorySampleDepth: number;
  maxPredictionTiers: number;
}

export interface ClusterData {
  visitsByTaxonUnique: Record<string, number>;
  locationGraphDataSet: LocationGraphData[];
  avgPerVisitTierStats: PredictionTierStat[];
  avgPerPersonVisitTierStats: PredictionTierStat[];
  avgTaxaTierStats: PredictionTierStat[];
}

type GetPredictedDiff = (graphData: LocationGraphData) => number | null;

export function sortLocationGraphDataSet(
  locationGraphDataSet: LocationGraphData[],
  getPredictedValue: GetPredictedDiff
): void {
  locationGraphDataSet.sort((a, b) => {
    const deltaA = getPredictedValue(a);
    const deltaB = getPredictedValue(b);
    if (deltaA === null) return deltaB === null ? 0 : -1;
    if (deltaB === null) return 1;
    if (deltaA == deltaB) return 0;
    return deltaB - deltaA; // sort highest first
  });
}

export function toClusterData(
  config: ClusteringConfig,
  visitsByTaxonUnique: Record<string, number>,
  locationGraphDataSet: LocationGraphData[]
): ClusterData {
  const perVisitStatsGen = new PerVisitSpeciesCountStatsGenerator(
    config,
    locationGraphDataSet
  );
  const perPersonVistStatsGen = new PerPersonVisitSpeciesCountStatsGenerator(
    config,
    locationGraphDataSet
  );

  return {
    visitsByTaxonUnique,
    locationGraphDataSet,
    avgPerVisitTierStats: perVisitStatsGen.computeAverageStats(),
    avgPerPersonVisitTierStats: perPersonVistStatsGen.computeAverageStats(),
    avgTaxaTierStats: _generateAvgTaxaTierStats(
      config,
      locationGraphDataSet,
      visitsByTaxonUnique
    )
  };
}

export abstract class SpeciesCountStatsGenerator extends PredictionStatsGenerator<LocationGraphData> {
  maxPointsToRegress: number | null;

  constructor(config: ClusteringConfig, locationGraphDataSet: LocationGraphData[]) {
    super(
      config.predictionHistorySampleDepth,
      config.maxPredictionTiers,
      locationGraphDataSet
    );
    this.maxPointsToRegress = config.maxPointsToRegress;
  }

  computeAverageStats(): PredictionTierStat[] {
    const avgStats = super.computeAverageStats();
    this.putPredictionsInDataset(0);
    return avgStats;
  }

  getItemUnique(graphData: LocationGraphData): string | number {
    return graphData.locationID;
  }

  abstract getAllPoints(graphData: LocationGraphData): Point[];

  getIndexOfFirstPrediction(): number {
    return this.dataset.findIndex(
      (graphData) => this.getPredictedValue(graphData) !== null
    );
  }

  abstract getPredictedValue(graphData: LocationGraphData): number | null;

  abstract setPredictedDiff(graphData: LocationGraphData, diff: number | null): void;

  sortDatasetByPredictions(): void {
    sortLocationGraphDataSet(this.dataset, this.getPredictedValue.bind(this));
  }

  putPredictionsInDataset(visitsElided: number): void {
    const sliceSpec = {
      minPointCount: 0, // we need to see actual number of points available
      maxPointCount: this.maxPointsToRegress || Infinity,
      recentPointsToIgnore: visitsElided
    };
    for (const graphData of this.dataset) {
      this.setPredictedDiff(
        graphData,
        SpeciesCountStatsGenerator._predictDeltaSpecies(
          this.getAllPoints(graphData),
          sliceSpec
        )
      );
    }
  }

  toActualValue(locationGraphData: LocationGraphData, visitsElided: number): number {
    const points = this.getAllPoints(locationGraphData);
    const nextIndex = points.length - visitsElided;
    const [prior, next] = [points[nextIndex - 1], points[nextIndex]];
    return (next.y - prior.y) / (next.x - prior.x);
  }

  static _predictDeltaSpecies(
    dataPoints: Point[],
    sliceSpec: PointSliceSpec
  ): number | null {
    const points = slicePointSet(dataPoints, sliceSpec);

    // Make no predictions for caves having only one data point.

    if (points == null || points.length == 1) return null;

    // For caves having only two data points, predict based on the slope.

    if (points.length == 2) {
      const [first, last] = dataPoints;
      if (last.x == first.x) return 0;
      return (last.y - first.y) / (last.x - first.x);
    }

    // For 3 or more points, predict based on a power-fit model.

    const model = new PowerFitModel(points);
    const last = points[points.length - 1];
    const delta = model.regression.fittedY(last.x + 1) - last.y;
    // delta might be negative if curve is below the last point
    return delta >= 0 ? delta : 0;
  }
}

export class PerVisitSpeciesCountStatsGenerator extends SpeciesCountStatsGenerator {
  constructor(config: ClusteringConfig, locationGraphDataSet: LocationGraphData[]) {
    super(config, locationGraphDataSet);
  }

  getAllPoints(graphData: LocationGraphData): Point[] {
    return graphData.perVisitPoints;
  }
  getPredictedValue(graphData: LocationGraphData): number | null {
    return graphData.predictedPerVisitDiff;
  }
  setPredictedDiff(graphData: LocationGraphData, diff: number | null): void {
    graphData.predictedPerVisitDiff = diff;
  }
}

export class PerPersonVisitSpeciesCountStatsGenerator extends SpeciesCountStatsGenerator {
  constructor(config: ClusteringConfig, locationGraphDataSet: LocationGraphData[]) {
    super(config, locationGraphDataSet);
  }

  getAllPoints(graphData: LocationGraphData): Point[] {
    return graphData.perPersonVisitPoints;
  }
  getPredictedValue(graphData: LocationGraphData): number | null {
    return graphData.predictedPerPersonVisitDiff;
  }
  setPredictedDiff(graphData: LocationGraphData, diff: number | null): void {
    graphData.predictedPerPersonVisitDiff = diff;
  }
}

function _generateAvgTaxaTierStats(
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
  private _taxaRemainingInLocation: Record<string, number> = {};

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
        if (taxonVisitItemsMap[taxon] !== undefined) {
          this._taxaRemainingInLocation[taxon] = (MAX_VISITS_ELIDED - i) * 100000 - j;
        }
      }
    }
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
          delete this._taxaRemainingInLocation[taxon];
        }
        --this._visitsElided;
      }

      // Copy the visit counts for remaining taxa into the dataset.

      for (const [taxon, visits] of Object.entries(this._taxaRemainingInCluster)) {
        this.taxonVisitItemsMap[taxon].visits = visits;
      }
    }
  }

  toActualValue(item: TaxonVisitItem, _visitsElided: number): number {
    // Requires caller to call with greatest number of visits elided first.
    return this._taxaRemainingInLocation[item.taxon];
  }
}

interface TaxonVisitItem {
  taxon: string;
  visits: number;
}
