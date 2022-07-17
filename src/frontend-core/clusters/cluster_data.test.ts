import { pairsToPoints } from '../../shared/point';
import type { LocationGraphData } from './location_graph_data';
import {
  type ClusteringConfig,
  // type PredictionTierStat,
  sortLocationGraphDataSet,
  _computePredictionTierStats
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

test('too few points to make predictions', () => {
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
    1,
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
    1,
    getPredictedDiff,
    getAllPoints
  );
  expect(stats).toBeNull();
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
