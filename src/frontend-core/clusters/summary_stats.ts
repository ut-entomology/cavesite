import type { ClusterData } from './cluster_data';
import type { PredictionTierStat } from './prediction_stats';

export interface ClusterSummaryStats {
  avgTop10PerVisitCaves: number;
  avgTop20PerVisitCaves: number;
  avgTop10PerPersonVisitCaves: number;
  avgTop20PerPersonVisitCaves: number;
  avgTop3NextTaxa: number;
  avgTop6NextTaxa: number;
}

export class ClusterSummaryStatsGenerator {
  dataByCluster: ClusterData[];
  private _statSums: ClusterSummaryStats = {
    avgTop10PerVisitCaves: 0,
    avgTop20PerVisitCaves: 0,
    avgTop10PerPersonVisitCaves: 0,
    avgTop20PerPersonVisitCaves: 0,
    avgTop3NextTaxa: 0,
    avgTop6NextTaxa: 0
  };
  private _caveSums: ClusterSummaryStats = {
    avgTop10PerVisitCaves: 0,
    avgTop20PerVisitCaves: 0,
    avgTop10PerPersonVisitCaves: 0,
    avgTop20PerPersonVisitCaves: 0,
    avgTop3NextTaxa: 0,
    avgTop6NextTaxa: 0
  };

  constructor(dataByCluster: ClusterData[]) {
    this.dataByCluster = dataByCluster;
  }

  getSummaryStats(): ClusterSummaryStats {
    for (const clusterData of this.dataByCluster) {
      // prettier-ignore
      this._addStat(
        clusterData, clusterData.avgPerVisitTierStats,
        1, 10, 'avgTop10PerVisitCaves'
      );
      // prettier-ignore
      this._addStat(
        clusterData, clusterData.avgPerVisitTierStats,
        11, 20, 'avgTop20PerVisitCaves'
      );
      // prettier-ignore
      this._addStat(
        clusterData, clusterData.avgPerPersonVisitTierStats,
        1, 10, 'avgTop10PerPersonVisitCaves'
      );
      // prettier-ignore
      this._addStat(
        clusterData, clusterData.avgPerPersonVisitTierStats,
        11, 20, 'avgTop20PerPersonVisitCaves'
      );
      // prettier-ignore
      this._addStat(
        clusterData, clusterData.avgTaxaTierStats,
        1, 3, 'avgTop3NextTaxa'
      );
      // prettier-ignore
      this._addStat(
        clusterData, clusterData.avgTaxaTierStats,
        4, 6, 'avgTop6NextTaxa',
      );
    }

    this._averageStat('avgTop10PerVisitCaves');
    this._averageStat('avgTop20PerVisitCaves');
    this._averageStat('avgTop10PerPersonVisitCaves');
    this._averageStat('avgTop20PerPersonVisitCaves');
    this._averageStat('avgTop3NextTaxa');
    this._averageStat('avgTop6NextTaxa');

    return this._statSums;
  }

  private _addStat(
    clusterData: ClusterData,
    tierStats: PredictionTierStat[],
    fromTopN: number,
    thruTopN: number,
    topProperty: keyof ClusterSummaryStats
  ) {
    const stat = _getNearestStat(fromTopN, thruTopN, tierStats);
    if (stat !== null) {
      const caveCount = clusterData.locationGraphDataSet.length;
      this._statSums[topProperty] += stat * caveCount;
      this._caveSums[topProperty] += caveCount;
    }
  }

  private _averageStat(topProperty: keyof ClusterSummaryStats): void {
    const sum = this._statSums[topProperty];
    this._statSums[topProperty] = (100 * sum) / this._caveSums[topProperty];
  }
}

function _getNearestStat(
  fromTopN: number,
  thruTopN: number,
  tierStats: PredictionTierStat[]
): number | null {
  for (let n = thruTopN; n >= fromTopN; --n) {
    if (n <= tierStats.length) return tierStats[n - 1].fractionCorrect;
  }
  return null;
}
