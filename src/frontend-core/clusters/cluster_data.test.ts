import { pairsToPoints } from '../../shared/point';
import type { PointSliceSpec } from './effort_graph_spec';
import type { LocationGraphData } from './location_graph_data';
import {
  type ClusteringConfig,
  type PredictionTierStat,
  sortLocationGraphDataSet,
  _computePredictionTierStats,
  _predictDeltaSpecies
} from './cluster_data';

const baseConfig: ClusteringConfig = {
  maxClusters: 2,
  // @ts-ignore unused param
  comparedTaxa: null,
  ignoreSubgenera: false,
  // @ts-ignore unused param
  highestComparedRank: null,
  maxPointsToRegress: 3,
  predictionHistorySampleDepth: 1,
  predictionTiers: 4
};

const getPredictedDiff = (graphData: LocationGraphData) =>
  graphData.predictedPerVisitDiff || null;
const getAllPoints = (graphData: LocationGraphData) => graphData.perVisitPoints;

test('sorting location graph data sets', () => {
  // prettier-ignore
  let dataset = [_makeGraphData(1, [], null)];
  sortLocationGraphDataSet(dataset, getPredictedDiff);
  _checkSortOrder(dataset, [1]);

  // prettier-ignore
  dataset = [
    _makeGraphData(1, [], null),
    _makeGraphData(2, [], null),
  ];
  sortLocationGraphDataSet(dataset, getPredictedDiff);
  _checkSortOrder(dataset, [1, 2]);

  // prettier-ignore
  dataset = [_makeGraphData(1, [], 1)];
  sortLocationGraphDataSet(dataset, getPredictedDiff);
  _checkSortOrder(dataset, [1]);

  // prettier-ignore
  dataset = [
    _makeGraphData(1, [], null),
    _makeGraphData(2, [], 1),
  ];
  sortLocationGraphDataSet(dataset, getPredictedDiff);
  _checkSortOrder(dataset, [1, 2]);

  // prettier-ignore
  dataset = [
    _makeGraphData(1, [], 1),
    _makeGraphData(2, [], null),
  ];
  sortLocationGraphDataSet(dataset, getPredictedDiff);
  _checkSortOrder(dataset, [2, 1]);

  // prettier-ignore
  dataset = [
    _makeGraphData(1, [], 1),
    _makeGraphData(2, [], null),
    _makeGraphData(3, [], null),
  ];
  sortLocationGraphDataSet(dataset, getPredictedDiff);
  _checkSortOrder(dataset, [2, 3, 1]);

  // prettier-ignore
  dataset = [
    _makeGraphData(1, [], 1),
    _makeGraphData(2, [], null),
    _makeGraphData(3, [], 2),
  ];
  sortLocationGraphDataSet(dataset, getPredictedDiff);
  _checkSortOrder(dataset, [2, 3, 1]);

  // prettier-ignore
  dataset = [
    _makeGraphData(1, [], 1),
    _makeGraphData(2, [], 3),
    _makeGraphData(3, [], 2),
  ];
  sortLocationGraphDataSet(dataset, getPredictedDiff);
  _checkSortOrder(dataset, [2, 3, 1]);
});

test('delta species predictions', () => {
  const sliceSpec: PointSliceSpec = {
    minPointCount: 3,
    maxPointCount: 3,
    recentPointsToIgnore: 1
  };
  let delta = _predictDeltaSpecies(pairsToPoints([[1, 1]]), sliceSpec);
  expect(delta).toBeNull();
});

test('too few points to make predictions', () => {
  // TODO: Reexamine whether I'm testing the right thing.

  // prettier-ignore
  let dataset = [_makeGraphData(1, [[1, 1]])];
  let stats = _computePredictionTierStats(
    baseConfig,
    dataset,
    1,
    getPredictedDiff,
    getAllPoints
  );
  expect(stats).toBeNull();

  // prettier-ignore
  dataset = [_makeGraphData(1, [[1, 1], [2, 2]])];
  stats = _computePredictionTierStats(
    baseConfig,
    dataset,
    1,
    getPredictedDiff,
    getAllPoints
  );
  expect(stats).toBeNull();

  // prettier-ignore
  dataset = [_makeGraphData(1, [[1, 1], [2, 2], [3,3]])];
  stats = _computePredictionTierStats(
    baseConfig,
    dataset,
    3,
    getPredictedDiff,
    getAllPoints
  );
  expect(stats).toBeNull();

  // prettier-ignore
  dataset = [
    _makeGraphData(1, [[1, 1]]),
    _makeGraphData(1, [[1, 1], [2, 2], [3,3]])
  ];
  stats = _computePredictionTierStats(
    baseConfig,
    dataset,
    3,
    getPredictedDiff,
    getAllPoints
  );
  expect(stats).toBeNull();
});

test('increasing prediction history depth', () => {
  // TODO: NOT WORKING

  // prettier-ignore
  let dataset = [
    _makeGraphData(1, _makeLinearPairs(4, 1))
  ];
  let actualStats = _computePredictionTierStats(
    baseConfig,
    dataset,
    1,
    getPredictedDiff,
    getAllPoints
  );
  let expectedStats = _makeTierStats([[1, 1]]);
  expect(actualStats).toEqual(expectedStats);
});

function _checkSortOrder(
  locationGraphDataSet: LocationGraphData[],
  expectedLocationIDs: number[]
): void {
  expect(locationGraphDataSet.length).toEqual(expectedLocationIDs.length);
  for (let i = 0; i < locationGraphDataSet.length; ++i) {
    const locationID = expectedLocationIDs[i];
    const graphData = locationGraphDataSet[i];
    expect(graphData.locationID).toEqual(locationID);
  }
}

function _makeGraphData(
  locationID: number,
  pairs: number[][],
  predictedPerVisitDiff?: number | null
): LocationGraphData {
  return {
    locationID,
    startDate: new Date(),
    endDate: new Date(),
    perDayPoints: [],
    perVisitPoints: pairsToPoints(pairs),
    perPersonVisitPoints: [],
    predictedPerVisitDiff
  };
}

function _makeLinearPairs(count: number, slope: number): number[][] {
  const pairs: number[][] = [];
  for (let x = 1; x <= count; ++x) {
    pairs.push([x, slope * (x - 1) + 1]);
  }
  return pairs;
}

function _makeTierStats(data: number[][]): PredictionTierStat[] {
  const stats: PredictionTierStat[] = [];
  for (const datum of data) {
    stats.push({
      fractionCorrect: datum[0],
      contributingLocations: datum[1]
    });
  }
  return stats;
}
