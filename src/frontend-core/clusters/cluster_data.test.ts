import { pairsToPoints } from '../../shared/point';
import type { PointSliceSpec } from './effort_graph_spec';
import type { LocationGraphData } from './location_graph_data';
import type { PredictionTierStat } from './prediction_stats';
import type { ClusteringConfig } from './clustering_config';
import {
  sortLocationGraphDataSet,
  toClusterData,
  SpeciesCountStatsGenerator,
  PerVisitSpeciesCountStatsGenerator
} from './cluster_data';

const baseConfig: ClusteringConfig = {
  maxClusters: 2,
  // @ts-ignore unused param
  comparedFauna: null,
  // @ts-ignore unused param
  highestComparedRank: null,
  minRecentPredictionPoints: 2,
  maxRecentPredictionPoints: 3,
  predictionHistorySampleDepth: 1,
  maxPredictionTiers: 4
};

const getPredictedValue = (graphData: LocationGraphData) =>
  graphData.predictedPerVisitDiff;

test('sorting location graph data sets', () => {
  // prettier-ignore
  let dataset = [_makeGraphData(1, [], null)];
  sortLocationGraphDataSet(dataset, getPredictedValue);
  _checkSortOrder(dataset, [1]);

  // prettier-ignore
  dataset = [
    _makeGraphData(1, [], null),
    _makeGraphData(2, [], null),
  ];
  sortLocationGraphDataSet(dataset, getPredictedValue);
  _checkSortOrder(dataset, [1, 2]);

  // prettier-ignore
  dataset = [_makeGraphData(1, [], 1)];
  sortLocationGraphDataSet(dataset, getPredictedValue);
  _checkSortOrder(dataset, [1]);

  // prettier-ignore
  dataset = [
    _makeGraphData(1, [], null),
    _makeGraphData(2, [], 1),
  ];
  sortLocationGraphDataSet(dataset, getPredictedValue);
  _checkSortOrder(dataset, [1, 2]);

  // prettier-ignore
  dataset = [
    _makeGraphData(1, [], 1),
    _makeGraphData(2, [], null),
  ];
  sortLocationGraphDataSet(dataset, getPredictedValue);
  _checkSortOrder(dataset, [2, 1]);

  // prettier-ignore
  dataset = [
    _makeGraphData(1, [], 1),
    _makeGraphData(2, [], null),
    _makeGraphData(3, [], null),
  ];
  sortLocationGraphDataSet(dataset, getPredictedValue);
  _checkSortOrder(dataset, [2, 3, 1]);

  // prettier-ignore
  dataset = [
    _makeGraphData(1, [], 1),
    _makeGraphData(2, [], null),
    _makeGraphData(3, [], 2),
  ];
  sortLocationGraphDataSet(dataset, getPredictedValue);
  _checkSortOrder(dataset, [2, 3, 1]);

  // prettier-ignore
  dataset = [
    _makeGraphData(1, [], 1),
    _makeGraphData(2, [], 3),
    _makeGraphData(3, [], 2),
  ];
  sortLocationGraphDataSet(dataset, getPredictedValue);
  _checkSortOrder(dataset, [2, 3, 1]);

  // prettier-ignore
  dataset = [
    _makeGraphData(1, [], 1),
    _makeGraphData(2, [], 0),
    _makeGraphData(3, [], 2),
  ];
  sortLocationGraphDataSet(dataset, getPredictedValue);
  _checkSortOrder(dataset, [3, 1, 2]);
});

test('delta species predictions', () => {
  const sliceSpec: PointSliceSpec = {
    minPointCount: 0, // as hardcoded in cluster_data
    maxPointCount: 3,
    recentPointsToIgnore: 1
  };

  let points = pairsToPoints([[1, 1]]);
  let delta = SpeciesCountStatsGenerator._predictDeltaSpecies(points, sliceSpec);
  expect(delta).toBeNull();

  points = pairsToPoints(_makeLinearPairs(2, 1));
  delta = SpeciesCountStatsGenerator._predictDeltaSpecies(points, sliceSpec);
  expect(delta).toBeNull();

  points = pairsToPoints(_makeLinearPairs(3, 1));
  delta = SpeciesCountStatsGenerator._predictDeltaSpecies(points, sliceSpec);
  expect(Math.round(delta!)).toEqual(1);

  points = pairsToPoints(_makeLinearPairs(4, 1));
  delta = SpeciesCountStatsGenerator._predictDeltaSpecies(points, sliceSpec);
  expect(Math.round(delta!)).toEqual(1);

  points = pairsToPoints(_makeLinearPairs(4, 2));
  delta = SpeciesCountStatsGenerator._predictDeltaSpecies(points, sliceSpec);
  expect(Math.round(delta!)).toEqual(2);

  points = pairsToPoints(_makeLinearPairs(4, 0));
  delta = SpeciesCountStatsGenerator._predictDeltaSpecies(points, sliceSpec);
  expect(Math.round(delta!)).toEqual(0);
});

test('too few points to make predictions', () => {
  let config = baseConfig;
  let visitsDocked = 1;

  // prettier-ignore
  let dataset = [_makeGraphData(1, [[1, 1]])];
  let statsGen = new PerVisitSpeciesCountStatsGenerator(config, dataset);
  statsGen.putPredictionsInDataset(visitsDocked);
  let stats = statsGen._computePredictionTierStats(visitsDocked);
  expect(stats).toBeNull();

  // prettier-ignore
  dataset = [_makeGraphData(1, [[1, 1], [2, 2]])];
  statsGen = new PerVisitSpeciesCountStatsGenerator(config, dataset);
  statsGen.putPredictionsInDataset(visitsDocked);
  stats = statsGen._computePredictionTierStats(visitsDocked);
  expect(stats).toBeNull();

  config = Object.assign({}, config, { predictionHistorySampleDepth: 3 });
  visitsDocked = 3;

  // prettier-ignore
  dataset = [_makeGraphData(1, [[1, 1], [2, 2], [3,3]])];
  statsGen = new PerVisitSpeciesCountStatsGenerator(config, dataset);
  statsGen.putPredictionsInDataset(visitsDocked);
  stats = statsGen._computePredictionTierStats(visitsDocked);
  expect(stats).toBeNull();

  // prettier-ignore
  dataset = [
    _makeGraphData(1, [[1, 1]]),
    _makeGraphData(1, [[1, 1], [2, 2], [3,3]])
  ];
  statsGen = new PerVisitSpeciesCountStatsGenerator(config, dataset);
  statsGen.putPredictionsInDataset(visitsDocked);
  stats = statsGen._computePredictionTierStats(visitsDocked);
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
  let statsGen = new PerVisitSpeciesCountStatsGenerator(config, dataset);

  let visitsDocked = 1;
  statsGen.putPredictionsInDataset(visitsDocked);
  let actualStats = statsGen._computePredictionTierStats(visitsDocked);
  _checkSortOrder(dataset, [1, 2]);
  // prettier-ignore
  let expectedStats = _makeTierStats([[1, 1], [1, 2]]);
  expect(actualStats).toEqual(expectedStats);

  visitsDocked = 2;
  statsGen.putPredictionsInDataset(visitsDocked);
  actualStats = statsGen._computePredictionTierStats(visitsDocked);
  _checkSortOrder(dataset, [2, 1]);
  // prettier-ignore
  expectedStats = _makeTierStats([[0, 1], [1, 2]]);
  expect(actualStats).toEqual(expectedStats);

  visitsDocked = 3;
  statsGen.putPredictionsInDataset(visitsDocked);
  actualStats = statsGen._computePredictionTierStats(visitsDocked);
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
  let statsGen = new PerVisitSpeciesCountStatsGenerator(config, dataset);

  let visitsDocked = 1;
  statsGen.putPredictionsInDataset(visitsDocked);
  let actualStats = statsGen._computePredictionTierStats(visitsDocked);
  _checkSortOrder(dataset, [3, 1, 2]);
  // prettier-ignore
  let expectedStats = _makeTierStats([[1, 1], [1, 2]]);
  expect(actualStats).toEqual(expectedStats);

  visitsDocked = 2;
  statsGen.putPredictionsInDataset(visitsDocked);
  actualStats = statsGen._computePredictionTierStats(visitsDocked);
  _checkSortOrder(dataset, [3, 2, 1]);
  // prettier-ignore
  expectedStats = _makeTierStats([[0, 1], [1, 2]]);
  expect(actualStats).toEqual(expectedStats);

  statsGen = new PerVisitSpeciesCountStatsGenerator(baseConfig, dataset);
  visitsDocked = 3;
  statsGen.putPredictionsInDataset(visitsDocked);
  actualStats = statsGen._computePredictionTierStats(visitsDocked);
  _checkSortOrder(dataset, [3, 2, 1]);
  // prettier-ignore
  expectedStats = _makeTierStats([[1, 1], [1, 2]]);
  expect(actualStats).toEqual(expectedStats);
});

test('predictions having zero delta species', () => {
  // prettier-ignore
  let pairs = [[1, 1], [2, 2], [3, 4], [4, 8], [5, 12]];
  // prettier-ignore
  let dataset = [
    _makeGraphData(1, pairs),
    _makeGraphData(2, _makeLinearPairs(5, 3)),
    _makeGraphData(3, _makeLinearPairs(10, 0))
    ];
  let statsGen = new PerVisitSpeciesCountStatsGenerator(baseConfig, dataset);

  let visitsDocked = 1;
  statsGen.putPredictionsInDataset(visitsDocked);
  let actualStats = statsGen._computePredictionTierStats(visitsDocked);
  _checkSortOrder(dataset, [1, 2, 3]);
  // prettier-ignore
  let expectedStats = _makeTierStats([[1, 1], [1, 2], [1, 3]]);
  expect(actualStats).toEqual(expectedStats);

  visitsDocked = 2;
  statsGen.putPredictionsInDataset(visitsDocked);
  actualStats = statsGen._computePredictionTierStats(visitsDocked);
  _checkSortOrder(dataset, [2, 1, 3]);
  // prettier-ignore
  expectedStats = _makeTierStats([[0, 1], [1, 2], [1, 3]]);
  expect(actualStats).toEqual(expectedStats);

  visitsDocked = 3;
  statsGen.putPredictionsInDataset(visitsDocked);
  actualStats = statsGen._computePredictionTierStats(visitsDocked);
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
  let expectedStats = _makeTierStats([[2/3, 3], [1, 6], [1, 9]]);
  expect(clusterData.avgPerVisitTierStats).toEqual(expectedStats);
  expect(clusterData.avgPerPersonVisitTierStats).toEqual(expectedStats);

  // prettier-ignore
  dataset = [
    _makeGraphData(1, _makeLinearPairs(3, 0)),
    _makeGraphData(2, _makeLinearPairs(5, 3)),
    _makeGraphData(3, pairs),
    ];
  clusterData = toClusterData(config, {}, dataset);
  // prettier-ignore
  expectedStats = _makeTierStats([[2/3, 3], [1, 6], [1, 3]]);
  expect(clusterData.avgPerVisitTierStats).toEqual(expectedStats);
  expect(clusterData.avgPerPersonVisitTierStats).toEqual(expectedStats);
});

test('truncating prediction stats when producing ClusterData', () => {
  let config = Object.assign({}, baseConfig);
  config.predictionHistorySampleDepth = 3;

  // prettier-ignore
  let pairs = [[1, 1], [2, 2], [3, 4], [4, 8], [5, 12]];
  // prettier-ignore
  let dataset = [
    _makeGraphData(1, _makeLinearPairs(3, 0)),
    _makeGraphData(2, _makeLinearPairs(5, 2)),
    _makeGraphData(3, _makeLinearPairs(5, 1)),
    _makeGraphData(4, _makeLinearPairs(5, 3)),
    _makeGraphData(5, pairs),
    ];
  let clusterData = toClusterData(config, {}, dataset);
  // prettier-ignore
  expect(clusterData.avgPerVisitTierStats).toEqual(
    _makeTierStats([[2/3, 3], [1, 6], [8/9, 9], [1, 12]])
  );
  // Differs from prior run because equal predictions are interchangeable,
  // resulting in different sort orders depending on initial sorts.
  // prettier-ignore
  expect(clusterData.avgPerPersonVisitTierStats).toEqual(
    _makeTierStats([[2/3, 3], [1, 6], [1, 9], [1, 12]])
  );
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
    countyName: 'Dummy County',
    localityName: 'Dummy Locality',
    flags: 0,
    perVisitPoints: pairsToPoints(pairs),
    perPersonVisitPoints: pairsToPoints(pairs),
    predictedPerVisitDiff,
    predictedPerPersonVisitDiff: predictedPerVisitDiff,
    visitsByTaxonUnique: {},
    recentTaxa: []
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
      contributionCount: datum[1]
    });
  }
  return stats;
}
