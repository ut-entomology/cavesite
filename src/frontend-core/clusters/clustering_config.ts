import { type TaxonRank, type ComparedTaxa } from '../../shared/model';

export interface ClusteringConfig {
  maxClusters: number;
  comparedTaxa: ComparedTaxa;
  ignoreSubgenera: boolean;
  highestComparedRank: TaxonRank;
  maxPointsToRegress: number | null;
  predictionHistorySampleDepth: number;
  maxPredictionTiers: number;
}
