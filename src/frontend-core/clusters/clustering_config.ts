import type { TaxonRank, ComparedTaxa } from '../../shared/model';

export interface ClusteringConfig {
  maxClusters: number;
  comparedTaxa: ComparedTaxa;
  highestComparedRank: TaxonRank;
  proximityResolution: boolean;
  minRecentPredictionPoints: number | null;
  maxRecentPredictionPoints: number | null;
  predictionHistorySampleDepth: number;
  maxPredictionTiers: number;
}
