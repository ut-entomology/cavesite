import { pairsToPoints } from '../../shared/point';
import type { PointSliceSpec } from './effort_graph_spec';
import type { LocationGraphData } from './location_graph_data';
import {
  type ClusteringConfig,
  type PredictionTierStat,
  sortLocationGraphDataSet,
  toClusterData,
  _computePredictionTierStats,
  _putPredictionsInDataSet,
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
  maxPredictionTiers: 4
};
const DATE = new Date();

const getPredictedDiff = (graphData: LocationGraphData) =>
  graphData.predictedPerVisitDiff;
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

  // prettier-ignore
  dataset = [
    _makeGraphData(1, [], 1),
    _makeGraphData(2, [], 0),
    _makeGraphData(3, [], 2),
  ];
  sortLocationGraphDataSet(dataset, getPredictedDiff);
  _checkSortOrder(dataset, [3, 1, 2]);
});

test('delta species predictions', () => {
  const sliceSpec: PointSliceSpec = {
    minPointCount: 0, // as hardcoded in cluster_data
    maxPointCount: 3,
    recentPointsToIgnore: 1
  };

  let points = pairsToPoints([[1, 1]]);
  let delta = _predictDeltaSpecies(points, sliceSpec);
  expect(delta).toBeNull();

  points = pairsToPoints(_makeLinearPairs(2, 1));
  delta = _predictDeltaSpecies(points, sliceSpec);
  expect(delta).toBeNull();

  points = pairsToPoints(_makeLinearPairs(3, 1));
  delta = _predictDeltaSpecies(points, sliceSpec);
  expect(Math.round(delta!)).toEqual(1);

  points = pairsToPoints(_makeLinearPairs(4, 1));
  delta = _predictDeltaSpecies(points, sliceSpec);
  expect(Math.round(delta!)).toEqual(1);

  points = pairsToPoints(_makeLinearPairs(4, 2));
  delta = _predictDeltaSpecies(points, sliceSpec);
  expect(Math.round(delta!)).toEqual(2);

  points = pairsToPoints(_makeLinearPairs(4, 0));
  delta = _predictDeltaSpecies(points, sliceSpec);
  expect(Math.round(delta!)).toEqual(0);
});

test('too few points to make predictions', () => {
  let config = baseConfig;
  let pointsElided = 1;

  // prettier-ignore
  let dataset = [_makeGraphData(1, [[1, 1]])];
  _putPredictionsInDataSet(config, dataset, pointsElided);
  let stats = _computePredictionTierStats(
    baseConfig,
    dataset,
    pointsElided,
    getPredictedDiff,
    getAllPoints
  );
  expect(stats).toBeNull();

  // prettier-ignore
  dataset = [_makeGraphData(1, [[1, 1], [2, 2]])];
  _putPredictionsInDataSet(config, dataset, pointsElided);
  stats = _computePredictionTierStats(
    baseConfig,
    dataset,
    pointsElided,
    getPredictedDiff,
    getAllPoints
  );
  expect(stats).toBeNull();

  config = Object.assign({}, config, { predictionHistorySampleDepth: 3 });
  pointsElided = 3;

  // prettier-ignore
  dataset = [_makeGraphData(1, [[1, 1], [2, 2], [3,3]])];
  _putPredictionsInDataSet(config, dataset, pointsElided);
  stats = _computePredictionTierStats(
    config,
    dataset,
    pointsElided,
    getPredictedDiff,
    getAllPoints
  );
  expect(stats).toBeNull();

  // prettier-ignore
  dataset = [
    _makeGraphData(1, [[1, 1]]),
    _makeGraphData(1, [[1, 1], [2, 2], [3,3]])
  ];
  _putPredictionsInDataSet(config, dataset, pointsElided);
  stats = _computePredictionTierStats(
    config,
    dataset,
    pointsElided,
    getPredictedDiff,
    getAllPoints
  );
  expect(stats).toBeNull();
});

test('increasing prediction history depth', () => {
  let config = Object.assign({}, baseConfig);
  config.predictionHistorySampleDepth = 3;

  // prettier-ignore
  let pairs = [[1, 1], [2, 2], [3, 4], [4, 8], [5, 12]];
  // prettier-ignore
  let dataset = [
    _makeGraphData(1, pairs),
    _makeGraphData(2, _makeLinearPairs(5, 3))
  ];

  let pointsElided = 1;
  _putPredictionsInDataSet(config, dataset, pointsElided);
  let actualStats = _computePredictionTierStats(
    baseConfig,
    dataset,
    pointsElided,
    getPredictedDiff,
    getAllPoints
  );
  _checkSortOrder(dataset, [1, 2]);
  // prettier-ignore
  let expectedStats = _makeTierStats([[1, 1], [1, 2]]);
  expect(actualStats).toEqual(expectedStats);

  pointsElided = 2;
  _putPredictionsInDataSet(config, dataset, pointsElided);
  actualStats = _computePredictionTierStats(
    baseConfig,
    dataset,
    pointsElided,
    getPredictedDiff,
    getAllPoints
  );
  _checkSortOrder(dataset, [2, 1]);
  // prettier-ignore
  expectedStats = _makeTierStats([[0, 0], [1, 2]]);
  expect(actualStats).toEqual(expectedStats);

  pointsElided = 3;
  _putPredictionsInDataSet(config, dataset, pointsElided);
  actualStats = _computePredictionTierStats(
    baseConfig,
    dataset,
    pointsElided,
    getPredictedDiff,
    getAllPoints
  );
  _checkSortOrder(dataset, [2, 1]);
  // prettier-ignore
  expectedStats = _makeTierStats([[1, 1], [1, 2]]);
  expect(actualStats).toEqual(expectedStats);
});

test('predictions tiers in presence of too few points', () => {
  let config = Object.assign({}, baseConfig);
  config.predictionHistorySampleDepth = 3;

  // prettier-ignore
  let pairs = [[1, 1], [2, 2], [3, 4], [4, 8], [5, 12]];
  // prettier-ignore
  let dataset = [
    _makeGraphData(1, pairs),
    _makeGraphData(2, _makeLinearPairs(5, 3)),
    _makeGraphData(3, [[1, 1]])
    ];

  let pointsElided = 1;
  _putPredictionsInDataSet(config, dataset, pointsElided);
  let actualStats = _computePredictionTierStats(
    baseConfig,
    dataset,
    pointsElided,
    getPredictedDiff,
    getAllPoints
  );
  _checkSortOrder(dataset, [3, 1, 2]);
  // prettier-ignore
  let expectedStats = _makeTierStats([[1, 1], [1, 2]]);
  expect(actualStats).toEqual(expectedStats);

  pointsElided = 2;
  _putPredictionsInDataSet(config, dataset, pointsElided);
  actualStats = _computePredictionTierStats(
    baseConfig,
    dataset,
    pointsElided,
    getPredictedDiff,
    getAllPoints
  );
  _checkSortOrder(dataset, [3, 2, 1]);
  // prettier-ignore
  expectedStats = _makeTierStats([[0, 0], [1, 2]]);
  expect(actualStats).toEqual(expectedStats);

  pointsElided = 3;
  _putPredictionsInDataSet(config, dataset, pointsElided);
  actualStats = _computePredictionTierStats(
    baseConfig,
    dataset,
    pointsElided,
    getPredictedDiff,
    getAllPoints
  );
  _checkSortOrder(dataset, [3, 2, 1]);
  // prettier-ignore
  expectedStats = _makeTierStats([[1, 1], [1, 2]]);
  expect(actualStats).toEqual(expectedStats);
});

test('predictions having zero delta species', () => {
  let config = Object.assign({}, baseConfig);
  config.predictionHistorySampleDepth = 3;

  // prettier-ignore
  let pairs = [[1, 1], [2, 2], [3, 4], [4, 8], [5, 12]];
  // prettier-ignore
  let dataset = [
    _makeGraphData(1, pairs),
    _makeGraphData(2, _makeLinearPairs(5, 3)),
    _makeGraphData(3, _makeLinearPairs(10, 0))
    ];

  let pointsElided = 1;
  _putPredictionsInDataSet(config, dataset, pointsElided);
  let actualStats = _computePredictionTierStats(
    baseConfig,
    dataset,
    pointsElided,
    getPredictedDiff,
    getAllPoints
  );
  _checkSortOrder(dataset, [1, 2, 3]);
  // prettier-ignore
  let expectedStats = _makeTierStats([[1, 1], [1, 2], [1, 3]]);
  expect(actualStats).toEqual(expectedStats);

  pointsElided = 2;
  _putPredictionsInDataSet(config, dataset, pointsElided);
  actualStats = _computePredictionTierStats(
    baseConfig,
    dataset,
    pointsElided,
    getPredictedDiff,
    getAllPoints
  );
  _checkSortOrder(dataset, [2, 1, 3]);
  // prettier-ignore
  expectedStats = _makeTierStats([[0, 0], [1, 2], [1, 3]]);
  expect(actualStats).toEqual(expectedStats);

  pointsElided = 3;
  _putPredictionsInDataSet(config, dataset, pointsElided);
  actualStats = _computePredictionTierStats(
    baseConfig,
    dataset,
    pointsElided,
    getPredictedDiff,
    getAllPoints
  );
  _checkSortOrder(dataset, [2, 1, 3]);
  // prettier-ignore
  expectedStats = _makeTierStats([[1, 1], [1, 2], [1, 3]]);
  expect(actualStats).toEqual(expectedStats);
});

test('averaging prediction stats when producing ClusterData', () => {
  let config = Object.assign({}, baseConfig);
  config.predictionHistorySampleDepth = 3;

  // prettier-ignore
  let pairs = [[1, 1], [2, 2], [3, 4], [4, 8], [5, 12]];
  // prettier-ignore
  let dataset = [
    _makeGraphData(1, _makeLinearPairs(10, 0)),
    _makeGraphData(2, _makeLinearPairs(5, 3)),
    _makeGraphData(3, pairs),
    ];
  let clusterData = toClusterData(config, {}, dataset);
  // prettier-ignore
  let expectedStats = _makeTierStats([[1, 1], [1, 2], [1, 3]]);
  console.log(clusterData.avgPerVisitTierStats);
  expect(clusterData.avgPerVisitTierStats).toEqual(expectedStats);
  expect(clusterData.avgPerPersonVisitTierStats).toEqual(expectedStats);
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
  if (predictedPerVisitDiff === undefined) predictedPerVisitDiff = null;
  return {
    locationID,
    startDate: DATE,
    endDate: DATE,
    perDayPoints: [],
    perVisitPoints: pairsToPoints(pairs),
    perPersonVisitPoints: pairsToPoints(pairs),
    predictedPerVisitDiff,
    predictedPerPersonVisitDiff: predictedPerVisitDiff
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
