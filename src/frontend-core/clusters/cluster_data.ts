import type { Point } from '../../shared/point';
import { PredictionTierStat, PredictionStatsGenerator } from './prediction_stats';
import type { ClusteringConfig } from './clustering_config';
import type { LocationGraphData } from './location_graph_data';
import { type PointSliceSpec, slicePointSet } from './effort_graph_spec';
import { PowerFitModel } from './power_fit_model';
import { generateAvgTaxaTierStats } from './taxa_tier_stats';

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
    avgTaxaTierStats: generateAvgTaxaTierStats(
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

  getActualValueSort(visitsElided: number): LocationGraphData[] {
    let actualSortSet = this.dataset.slice(this.getIndexOfFirstPrediction());
    actualSortSet.sort((a, b) => {
      const valueA = this.toActualValue(a, visitsElided);
      const valueB = this.toActualValue(b, visitsElided);
      if (valueA == valueB) return 0;
      return valueB - valueA; // sort highest first
    });
    return actualSortSet;
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
