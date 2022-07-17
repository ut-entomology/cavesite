import type { Point } from '../../../shared/point';
import type { TaxonRank, ComparedTaxa } from '../../../shared/model';
import type { LocationGraphData } from './location_graph_data';
import { PointSliceSpec, slicePointSet } from './effort_graph_spec';
import { PowerFitModel } from './power_fit_model';

const MAX_POINTS_TO_ELIDE = 3;
const MAX_PREDICTION_TIERS = 40;

export interface ClusteringConfig {
  maxClusters: number;
  comparedTaxa: ComparedTaxa;
  ignoreSubgenera: boolean;
  highestComparedRank: TaxonRank;
  maxPointsToRegress: number | null;
}

export interface ClusterData {
  visitsByTaxonUnique: Record<string, number>;
  locationGraphDataSet: LocationGraphData[];
  avgPerVisitTiers: PredictionTier[];
  avgPerPersonVisitTiers: PredictionTier[];
}

export interface PredictionTier {
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
  // MAX_POINTS_TO_ELIDE prediction tiers, after initially holding the
  // intermediate sums necessary for producing the average.

  const avgPerVisitTiers: PredictionTier[] = [];
  const avgPerPersonVisitTiers: PredictionTier[] = [];
  for (let i = 0; i < MAX_PREDICTION_TIERS; ++i) {
    avgPerVisitTiers.push({
      fractionCorrect: 0, // temporarily sum of fractions * contributingLocations
      contributingLocations: 0
    });
    avgPerPersonVisitTiers.push({
      fractionCorrect: 0, // temporarily sum of fractions * contributingLocations
      contributingLocations: 0
    });
  }

  // Test predictions for the most recent MAX_POINTS_TO_ELIDE prior to the
  // current last point, averaging the results at each prediction tier. The
  // number of points elided is the number of most recent actual points
  // assumed to not yet have been collected for the purpose of the test. Each
  // subsequent point thus serves as a test of the prior prediction.

  for (let pointsElided = MAX_POINTS_TO_ELIDE; pointsElided > 0; --pointsElided) {
    // Put the predictions directly into the locations structures.

    _putPredictionsInDataSet(config, locationGraphDataSet, pointsElided);

    // Compute the tiers for the current number of points elided.

    const perVisitTiers = _computePredictionTiers(
      locationGraphDataSet,
      pointsElided,
      (graphData) => graphData.predictedPerVisitDiff || null,
      (graphData) => graphData.perVisitPoints
    );
    const perPersonVisitTiers = _computePredictionTiers(
      locationGraphDataSet,
      pointsElided,
      (graphData) => graphData.predictedPerPersonVisitDiff || null,
      (graphData) => graphData.perPersonVisitPoints
    );

    // Add the points to the averaging structure, but weighting each tier
    // within the average according to its number of contributing locations.

    for (let i = 0; i < MAX_PREDICTION_TIERS; ++i) {
      if (perVisitTiers !== null) {
        _addToAverageTier(avgPerVisitTiers[i], perVisitTiers[i]);
      }
      if (perPersonVisitTiers !== null) {
        _addToAverageTier(avgPerPersonVisitTiers[i], perPersonVisitTiers[i]);
      }
    }
  }

  // Turn the intermediate sums into weighted averages for each tier.

  for (let i = 0; i < MAX_PREDICTION_TIERS; ++i) {
    let averageTier = avgPerVisitTiers[i];
    averageTier.fractionCorrect /= averageTier.contributingLocations;
    averageTier = avgPerPersonVisitTiers[i];
    averageTier.fractionCorrect /= averageTier.contributingLocations;
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
    avgPerVisitTiers,
    avgPerPersonVisitTiers
  };
}

function _addToAverageTier(averageTier: PredictionTier, predictedTier: PredictionTier) {
  let locationCount = predictedTier.contributingLocations;
  averageTier.fractionCorrect += predictedTier.fractionCorrect * locationCount;
  averageTier.contributingLocations += locationCount;
}

function _computePredictionTiers(
  locationGraphDataSet: LocationGraphData[],
  pointsElided: number,
  getPredictedDiff: (graphData: LocationGraphData) => number | null,
  getAllPoints: (graphData: LocationGraphData) => Point[]
): PredictionTier[] | null {
  // Sort the location data most-predicted species first.

  sortLocationGraphDataSet(locationGraphDataSet, getPredictedDiff);

  // Record the IDs of the top MAX_PREDICTION_TIERS locations, returning
  // with no prediction tiers if the data contains no predictions.

  const firstNonNullIndex = locationGraphDataSet.findIndex(
    (graphData) => getPredictedDiff(graphData) !== null
  );
  if (firstNonNullIndex < 0) return null;

  let predictedLocationIDs: number[] = [];
  predictedLocationIDs = locationGraphDataSet
    .slice(firstNonNullIndex, firstNonNullIndex + MAX_PREDICTION_TIERS)
    .map((graphData) => graphData.locationID);

  // Sort the datasets having predictions by actual species differences.

  let actualSortSet = locationGraphDataSet.slice(firstNonNullIndex);
  actualSortSet.sort((a, b) => {
    const deltaA = _toActualDelta(getAllPoints(a), pointsElided);
    const deltaB = _toActualDelta(getAllPoints(b), pointsElided);
    if (deltaA == deltaB) return 0;
    return deltaB - deltaA; // sort highest first
  });
  actualSortSet = actualSortSet.slice(0, MAX_PREDICTION_TIERS);

  // Tally the offsets of each expected ID in the actual sort set, setting
  // the offset to null if it's not in the top MAX_PREDICTION_TIERS.

  const actualOffsetByPredictedOffset: (number | null)[] = [];
  for (const predictedID of predictedLocationIDs) {
    const offset = actualSortSet.findIndex(
      (graphData) => graphData.locationID == predictedID
    );
    actualOffsetByPredictedOffset.push(offset >= 0 ? offset : null);
  }

  // For each tier, determine the number of predicted locations found in
  // the same tier of the actual sort set.

  const actualLocationsInPredictedTier: number[] = new Array(MAX_PREDICTION_TIERS).fill(
    0
  );
  for (let i = 0; i < MAX_PREDICTION_TIERS; ++i) {
    const actualOffset = actualOffsetByPredictedOffset[i];
    if (actualOffset !== null) {
      for (let j = actualOffset; j < MAX_PREDICTION_TIERS; ++j) {
        ++actualLocationsInPredictedTier[j];
      }
    }
  }

  // Generate the prediction tiers providing the fraction of locations
  // correctly predicted to occur in the tier and the total number of
  // predicted locations actually occurring in the tier.

  const predictionTiers: PredictionTier[] = [];
  let totalLocations = 0;
  for (let i = 0; i < MAX_PREDICTION_TIERS; ++i) {
    const actualCount = actualLocationsInPredictedTier[i];
    totalLocations += actualCount;
    predictionTiers.push({
      contributingLocations: totalLocations,
      fractionCorrect: actualCount / (i + 1)
    });
  }

  return predictionTiers;
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
