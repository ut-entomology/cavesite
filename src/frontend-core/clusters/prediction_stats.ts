export interface PredictionTierStat {
  fractionCorrect: number;
  contributionCount: number;
}

export abstract class PredictionStatsGenerator<T> {
  dataset: T[];
  predictionHistorySampleDepth: number;
  maxPredictionTiers: number;

  constructor(
    predictionHistorySampleDepth: number,
    maxPredictionTiers: number,
    dataset: T[]
  ) {
    this.predictionHistorySampleDepth = predictionHistorySampleDepth;
    this.maxPredictionTiers = maxPredictionTiers;
    this.dataset = dataset;
  }

  abstract getIndexOfFirstPrediction(): number;
  abstract getItemUnique(dataItem: T): string | number;
  abstract putPredictionsInDataset(visitsElided: number): void;
  abstract sortDatasetByPredictions(): void;
  abstract toActualValue(T: T, visitsElided: number): number;

  computeAverageStats(): PredictionTierStat[] {
    // Establish the structures that ultimately provide the average of all
    // predictionHistorySampleDepth prediction tiers, after initially holding
    // the intermediate sums necessary for producing the average.

    let averageTierStats: PredictionTierStat[] = [];
    for (let i = 0; i < this.maxPredictionTiers; ++i) {
      averageTierStats.push({
        fractionCorrect: 0, // temporarily sum of fractions * contributionCount
        contributionCount: 0
      });
    }

    // Test predictions for the most recent predictionHistorySampleDepth prior to
    // the current last point, averaging the results at each prediction tier. The
    // number of visits elided is the number of most recent actual points
    // assumed to not yet have been collected for the purpose of the test. Each
    // subsequent point thus serves as a test of the prior prediction.

    let maxTierStats = 0;
    for (
      let visitsElided = this.predictionHistorySampleDepth;
      visitsElided > 0;
      --visitsElided
    ) {
      // Put the predictions directly into the data items.

      this.putPredictionsInDataset(visitsElided);

      // Compute the tier stats for the current number of visits elided.

      const tierStats = this._computePredictionTierStats(visitsElided);

      // Add the points to the averaging structure, but weighting each tier stat
      // within the average according to its number of contributing data items.

      if (tierStats !== null) {
        for (let i = 0; i < tierStats.length; ++i) {
          const averageTierStat = averageTierStats[i];
          const predictedTierStat = tierStats[i];
          let contributionCount = predictedTierStat.contributionCount;
          averageTierStat.fractionCorrect +=
            predictedTierStat.fractionCorrect * contributionCount;
          averageTierStat.contributionCount += contributionCount;
        }
      }
      if (tierStats && tierStats.length > maxTierStats) {
        maxTierStats = tierStats.length;
      }
    }

    // Turn the intermediate sums into weighted averages for each tier.

    averageTierStats = averageTierStats.slice(0, maxTierStats);
    computeAverageTierStats(averageTierStats);

    // Return the cluster data complete with its prediction tier stats
    // providing a measure of prediction accuracy for each tier.

    return averageTierStats;
  }

  _computePredictionTierStats(visitsElided: number): PredictionTierStat[] | null {
    // Sort the dataset most-predicted species first.

    this.sortDatasetByPredictions();

    // Record the uniques of the top config.maxPredictionTiers data items, returning
    // with no prediction tier stats if the data contains no predictions.

    const indexOfFirstPrediction = this.getIndexOfFirstPrediction();
    if (indexOfFirstPrediction < 0) return null;

    let predictedUniques: (string | number)[] = [];
    predictedUniques = this.dataset
      .slice(indexOfFirstPrediction, indexOfFirstPrediction + this.maxPredictionTiers)
      .map((dataItem) => this.getItemUnique(dataItem));

    // Sort the datasets having predictions by the actual species values.

    let actualSortSet = this.dataset.slice(indexOfFirstPrediction);
    actualSortSet.sort((a, b) => {
      const valueA = this.toActualValue(a, visitsElided);
      const valueB = this.toActualValue(b, visitsElided);
      if (valueA == valueB) return 0;
      return valueB - valueA; // sort highest first
    });
    actualSortSet = actualSortSet.slice(0, this.maxPredictionTiers);

    // Tally the offsets of each expected unique in the actual sort set, setting
    // the offset to null if it's not in the top config.maxPredictionTiers.

    const actualOffsetByPredictedOffset: (number | null)[] = [];
    for (const predictedUnique of predictedUniques) {
      const offset = actualSortSet.findIndex(
        (dataItem) => this.getItemUnique(dataItem) == predictedUnique
      );
      actualOffsetByPredictedOffset.push(offset >= 0 ? offset : null);
    }

    // For each tier, determine the number of predicted data items found in
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

    // Generate the prediction tier stats providing the fraction of data items
    // correctly predicted to occur in the tier and the total number of
    // predicted data items actually occurring in the tier.

    let predictionTierStats: PredictionTierStat[] = [];
    for (let i = 0; i < this.maxPredictionTiers; ++i) {
      const actualCount = actualLocationsInPredictedTierStat[i];
      const expectedCount = i + 1;
      predictionTierStats.push({
        contributionCount: expectedCount,
        fractionCorrect: actualCount / expectedCount
      });
    }

    // Return at most a number of prediction tier stats equal to the number of
    // data items having predictions; any extra stats are uninformative.

    if (actualSortSet.length < predictionTierStats.length) {
      predictionTierStats = predictionTierStats.slice(0, actualSortSet.length);
    }
    return predictionTierStats;
  }
}

export function computeAverageTierStats(averageTierStats: PredictionTierStat[]): void {
  for (const averageTierStat of averageTierStats) {
    if (averageTierStat.contributionCount > 0) {
      averageTierStat.fractionCorrect /= averageTierStat.contributionCount;
    }
  }
}
