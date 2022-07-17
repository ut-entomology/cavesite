import type { Point } from '../../shared/point';
import type { TaxonRank, ComparedTaxa } from '../../shared/model';
import type { LocationGraphData } from './location_graph_data';
import { PointSliceSpec, slicePointSet } from './effort_graph_spec';
import { PowerFitModel } from './power_fit_model';

export interface ClusteringConfig {
  maxClusters: number;
  comparedTaxa: ComparedTaxa;
  ignoreSubgenera: boolean;
  highestComparedRank: TaxonRank;
  maxPointsToRegress: number | null;
  predictionHistorySampleDepth: number;
  predictionTiers: number;
}

export interface ClusterData {
  visitsByTaxonUnique: Record<string, number>;
  locationGraphDataSet: LocationGraphData[];
  avgPerVisitTierStats: PredictionTierStat[];
  avgPerPersonVisitTierStats: PredictionTierStat[];
}

export interface PredictionTierStat {
  fractionCorrect: number;
  contributingLocations: number;
}

export function sortLocationGraphDataSet(
  locationGraphDataSet: LocationGraphData[],
  getPredictedDiff: (graphData: LocationGraphData) => number | null
): void {
  locationGraphDataSet.sort((a, b) => {
    const deltaA = getPredictedDiff(a);
    const deltaB = getPredictedDiff(b);
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
  // Establish the structures that ultimately provide the average of all
  // predictionHistorySampleDepth prediction tiers, after initially holding
  // the intermediate sums necessary for producing the average.

  const avgPerVisitTierStats: PredictionTierStat[] = [];
  const avgPerPersonVisitTierStats: PredictionTierStat[] = [];
  for (let i = 0; i < config.predictionTiers; ++i) {
    avgPerVisitTierStats.push({
      fractionCorrect: 0, // temporarily sum of fractions * contributingLocations
      contributingLocations: 0
    });
    avgPerPersonVisitTierStats.push({
      fractionCorrect: 0, // temporarily sum of fractions * contributingLocations
      contributingLocations: 0
    });
  }

  // Test predictions for the most recent predictionHistorySampleDepth prior to
  // the current last point, averaging the results at each prediction tier. The
  // number of points elided is the number of most recent actual points
  // assumed to not yet have been collected for the purpose of the test. Each
  // subsequent point thus serves as a test of the prior prediction.

  for (
    let pointsElided = config.predictionHistorySampleDepth;
    pointsElided > 0;
    --pointsElided
  ) {
    // Put the predictions directly into the locations structures.

    _putPredictionsInDataSet(config, locationGraphDataSet, pointsElided);

    // Compute the tiers for the current number of points elided.

    const perVisitTierStats = _computePredictionTierStats(
      config,
      locationGraphDataSet,
      pointsElided,
      (graphData) => graphData.predictedPerVisitDiff || null,
      (graphData) => graphData.perVisitPoints
    );
    const perPersonVisitTierStats = _computePredictionTierStats(
      config,
      locationGraphDataSet,
      pointsElided,
      (graphData) => graphData.predictedPerPersonVisitDiff || null,
      (graphData) => graphData.perPersonVisitPoints
    );

    // Add the points to the averaging structure, but weighting each tier
    // within the average according to its number of contributing locations.

    for (let i = 0; i < config.predictionTiers; ++i) {
      if (perVisitTierStats !== null) {
        _addToAverageTierStat(avgPerVisitTierStats[i], perVisitTierStats[i]);
      }
      if (perPersonVisitTierStats !== null) {
        _addToAverageTierStat(
          avgPerPersonVisitTierStats[i],
          perPersonVisitTierStats[i]
        );
      }
    }
  }

  // Turn the intermediate sums into weighted averages for each tier.

  for (let i = 0; i < config.predictionTiers; ++i) {
    let averageTierStat = avgPerVisitTierStats[i];
    averageTierStat.fractionCorrect /= averageTierStat.contributingLocations;
    averageTierStat = avgPerPersonVisitTierStats[i];
    averageTierStat.fractionCorrect /= averageTierStat.contributingLocations;
  }

  // Put the future predictions directly into the location structures. The
  // locations will be sorted later when it's known which of visits and
  // person-visits the user is examining.

  _putPredictionsInDataSet(config, locationGraphDataSet, 0);

  // Return the cluster data complete with its prediction tiers providing
  // a measure of prediction accuracy for each tier.

  return {
    visitsByTaxonUnique,
    locationGraphDataSet,
    avgPerVisitTierStats,
    avgPerPersonVisitTierStats
  };
}

function _addToAverageTierStat(
  averageTierStat: PredictionTierStat,
  predictedTierStat: PredictionTierStat
) {
  let locationCount = predictedTierStat.contributingLocations;
  averageTierStat.fractionCorrect += predictedTierStat.fractionCorrect * locationCount;
  averageTierStat.contributingLocations += locationCount;
}

// exported for testing purposes
export function _computePredictionTierStats(
  config: ClusteringConfig,
  locationGraphDataSet: LocationGraphData[],
  pointsElided: number,
  getPredictedDiff: (graphData: LocationGraphData) => number | null,
  getAllPoints: (graphData: LocationGraphData) => Point[]
): PredictionTierStat[] | null {
  // Sort the location data most-predicted species first.

  sortLocationGraphDataSet(locationGraphDataSet, getPredictedDiff);

  // Record the IDs of the top config.predictionTiers locations, returning
  // with no prediction tiers if the data contains no predictions.

  const firstNonNullIndex = locationGraphDataSet.findIndex(
    (graphData) => getPredictedDiff(graphData) !== null
  );
  if (firstNonNullIndex < 0) return null;

  let predictedLocationIDs: number[] = [];
  predictedLocationIDs = locationGraphDataSet
    .slice(firstNonNullIndex, firstNonNullIndex + config.predictionTiers)
    .map((graphData) => graphData.locationID);

  // Sort the datasets having predictions by actual species differences.

  let actualSortSet = locationGraphDataSet.slice(firstNonNullIndex);
  actualSortSet.sort((a, b) => {
    const deltaA = _toActualDelta(getAllPoints(a), pointsElided);
    const deltaB = _toActualDelta(getAllPoints(b), pointsElided);
    if (deltaA == deltaB) return 0;
    return deltaB - deltaA; // sort highest first
  });
  actualSortSet = actualSortSet.slice(0, config.predictionTiers);

  // Tally the offsets of each expected ID in the actual sort set, setting
  // the offset to null if it's not in the top config.predictionTiers.

  const actualOffsetByPredictedOffset: (number | null)[] = [];
  for (const predictedID of predictedLocationIDs) {
    const offset = actualSortSet.findIndex(
      (graphData) => graphData.locationID == predictedID
    );
    actualOffsetByPredictedOffset.push(offset >= 0 ? offset : null);
  }

  // For each tier, determine the number of predicted locations found in
  // the same tier of the actual sort set.

  const actualLocationsInPredictedTierStat: number[] = new Array(
    config.predictionTiers
  ).fill(0);
  for (let i = 0; i < config.predictionTiers; ++i) {
    const actualOffset = actualOffsetByPredictedOffset[i];
    if (actualOffset !== null) {
      for (let j = actualOffset; j < config.predictionTiers; ++j) {
        ++actualLocationsInPredictedTierStat[j];
      }
    }
  }

  // Generate the prediction tiers providing the fraction of locations
  // correctly predicted to occur in the tier and the total number of
  // predicted locations actually occurring in the tier.

  const predictionTierStats: PredictionTierStat[] = [];
  let totalLocations = 0;
  for (let i = 0; i < config.predictionTiers; ++i) {
    const actualCount = actualLocationsInPredictedTierStat[i];
    totalLocations += actualCount;
    predictionTierStats.push({
      contributingLocations: totalLocations,
      fractionCorrect: actualCount / (i + 1)
    });
  }

  return predictionTierStats;
}

function _putPredictionsInDataSet(
  config: ClusteringConfig,
  locationGraphDataSet: LocationGraphData[],
  pointsElided: number
): void {
  const sliceSpec = {
    minPointCount: 0, // we need to see actual number of points available
    maxPointCount: config.maxPointsToRegress || Infinity,
    recentPointsToIgnore: pointsElided
  };
  for (const graphData of locationGraphDataSet) {
    graphData.predictedPerVisitDiff = _predictDeltaSpecies(
      graphData.perVisitPoints,
      sliceSpec
    );
    graphData.predictedPerPersonVisitDiff = _predictDeltaSpecies(
      graphData.perPersonVisitPoints,
      sliceSpec
    );
  }
}

function _predictDeltaSpecies(
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

function _toActualDelta(points: Point[], pointsElided: number) {
  const nextIndex = points.length - pointsElided;
  const [prior, next] = [points[nextIndex - 1], points[nextIndex]];
  return (next.y - prior.y) / (next.x - prior.x);
}
