import type { LocationGraphData } from './location_graph_data';

export interface PredictionTierStat {
  fractionCorrect: number;
  contributingLocations: number;
}

export abstract class PredictionStatsGenerator {
  locationGraphDataSet: LocationGraphData[];
  predictionHistorySampleDepth: number;
  maxPredictionTiers: number;

  constructor(
    predictionHistorySampleDepth: number,
    maxPredictionTiers: number,
    locationGraphDataSet: LocationGraphData[]
  ) {
    this.predictionHistorySampleDepth = predictionHistorySampleDepth;
    this.maxPredictionTiers = maxPredictionTiers;
    this.locationGraphDataSet = locationGraphDataSet;
  }

  abstract getPredictedDiff(graphData: LocationGraphData): number | null;
  abstract setPredictedDiff(graphData: LocationGraphData, diff: number | null): void;
  abstract putPredictionsInDataSet(pointsElided: number): void;
  abstract sortLocationGraphDataSet(): void;
  abstract toActualDelta(
    LocationGraphData: LocationGraphData,
    pointsElided: number
  ): number;

  computeAverageStats(): PredictionTierStat[] {
    // Establish the structures that ultimately provide the average of all
    // predictionHistorySampleDepth prediction tiers, after initially holding
    // the intermediate sums necessary for producing the average.

    const averageTierStats: PredictionTierStat[] = [];
    for (let i = 0; i < this.maxPredictionTiers; ++i) {
      averageTierStats.push({
        fractionCorrect: 0, // temporarily sum of fractions * contributingLocations
        contributingLocations: 0
      });
    }

    // Test predictions for the most recent predictionHistorySampleDepth prior to
    // the current last point, averaging the results at each prediction tier. The
    // number of points elided is the number of most recent actual points
    // assumed to not yet have been collected for the purpose of the test. Each
    // subsequent point thus serves as a test of the prior prediction.

    let maxTierStats = 0;
    for (
      let pointsElided = this.predictionHistorySampleDepth;
      pointsElided > 0;
      --pointsElided
    ) {
      // Put the predictions directly into the locations structures.

      this.putPredictionsInDataSet(pointsElided);

      // Compute the tier stats for the current number of points elided.

      const tierStats = this._computePredictionTierStats(pointsElided);

      // Add the points to the averaging structure, but weighting each tier stat
      // within the average according to its number of contributing locations.

      if (tierStats !== null) {
        for (let i = 0; i < tierStats.length; ++i) {
          this._addToAverageTierStat(averageTierStats[i], tierStats[i]);
        }
      }
      if (tierStats && tierStats.length > maxTierStats) {
        maxTierStats = tierStats.length;
      }
    }

    // Turn the intermediate sums into weighted averages for each tier.

    for (let i = 0; i < this.maxPredictionTiers; ++i) {
      let averageTierStat = averageTierStats[i];
      if (averageTierStat.contributingLocations > 0) {
        averageTierStat.fractionCorrect /= averageTierStat.contributingLocations;
      }
    }

    // Put the future predictions directly into the location structures. The
    // locations will be sorted later when it's known which of visits and
    // person-visits the user is examining.

    this.putPredictionsInDataSet(0);

    // Return the cluster data complete with its prediction tier stats
    // providing a measure of prediction accuracy for each tier.

    return averageTierStats.slice(0, maxTierStats);
  }

  _addToAverageTierStat(
    averageTierStat: PredictionTierStat,
    predictedTierStat: PredictionTierStat
  ) {
    let locationCount = predictedTierStat.contributingLocations;
    averageTierStat.fractionCorrect +=
      predictedTierStat.fractionCorrect * locationCount;
    averageTierStat.contributingLocations += locationCount;
  }

  _computePredictionTierStats(pointsElided: number): PredictionTierStat[] | null {
    // Sort the location data most-predicted species first.

    this.sortLocationGraphDataSet();

    // Record the IDs of the top config.maxPredictionTiers locations, returning
    // with no prediction tier stats if the data contains no predictions.

    const firstNonNullIndex = this.locationGraphDataSet.findIndex(
      (graphData) => this.getPredictedDiff(graphData) !== null
    );
    if (firstNonNullIndex < 0) return null;

    let predictedLocationIDs: number[] = [];
    predictedLocationIDs = this.locationGraphDataSet
      .slice(firstNonNullIndex, firstNonNullIndex + this.maxPredictionTiers)
      .map((graphData) => graphData.locationID);

    // Sort the datasets having predictions by actual species differences.

    let actualSortSet = this.locationGraphDataSet.slice(firstNonNullIndex);
    actualSortSet.sort((a, b) => {
      const deltaA = this.toActualDelta(a, pointsElided);
      const deltaB = this.toActualDelta(b, pointsElided);
      if (deltaA == deltaB) return 0;
      return deltaB - deltaA; // sort highest first
    });
    actualSortSet = actualSortSet.slice(0, this.maxPredictionTiers);

    // Tally the offsets of each expected ID in the actual sort set, setting
    // the offset to null if it's not in the top config.maxPredictionTiers.

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
      this.maxPredictionTiers
    ).fill(0);
    for (let i = 0; i < this.maxPredictionTiers; ++i) {
      const actualOffset = actualOffsetByPredictedOffset[i];
      if (actualOffset !== null) {
        for (let j = Math.max(i, actualOffset); j < this.maxPredictionTiers; ++j) {
          ++actualLocationsInPredictedTierStat[j];
        }
      }
    }

    // Generate the prediction tier stats providing the fraction of locations
    // correctly predicted to occur in the tier and the total number of
    // predicted locations actually occurring in the tier.

    let predictionTierStats: PredictionTierStat[] = [];
    for (let i = 0; i < this.maxPredictionTiers; ++i) {
      const actualCount = actualLocationsInPredictedTierStat[i];
      const expectedCount = i + 1;
      predictionTierStats.push({
        contributingLocations: expectedCount,
        fractionCorrect: actualCount / expectedCount
      });
    }

    // Return at most a number of prediction tier stats equal to the number of
    // locations having predictions; any extra stats are uninformative.

    if (actualSortSet.length < predictionTierStats.length) {
      predictionTierStats = predictionTierStats.slice(0, actualSortSet.length);
    }
    return predictionTierStats;
  }
}
