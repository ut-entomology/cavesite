import type { TaxonRank, ComparedTaxa } from '../../shared/model';

export interface ClusteringConfig {
  maxClusters: number;
  comparedTaxa: ComparedTaxa;
  ignoreSubgenera: boolean;
  highestComparedRank: TaxonRank;
  minPointsToRegress: number | null;
  maxPointsToRegress: number | null;
  predictionHistorySampleDepth: number;
  maxPredictionTiers: number;
}
