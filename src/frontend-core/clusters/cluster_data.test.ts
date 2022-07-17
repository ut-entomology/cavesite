import { pairsToPoints } from '../../shared/point';
import type { LocationGraphData } from './location_graph_data';
import {
  type ClusteringConfig,
  // type PredictionTierStat,
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
const getAllPints = (graphData: LocationGraphData) => graphData.perVisitPoints;

test('too few points to make predictions', () => {
  const dataset = [_makeGraphData(1, [[1, 1]])];
  const stats = _computePredictionTierStats(
    baseConfig,
    dataset,
    1,
    getPredictedDiff,
    getAllPints
  );
  expect(stats).toBeNull();
});

function _makeGraphData(locationID: number, pairs: number[][]): LocationGraphData {
  return {
    locationID,
    startDate: new Date(),
    endDate: new Date(),
    perDayPoints: [],
    perVisitPoints: pairsToPoints(pairs),
    perPersonVisitPoints: []
  };
}
