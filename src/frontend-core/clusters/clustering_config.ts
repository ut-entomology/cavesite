import type { TaxonRank, ComparedFauna } from '../../shared/model';

export interface ClusteringConfig {
  maxClusters: number;
  comparedFauna: ComparedFauna;
  highestComparedRank: TaxonRank;
  proximityResolution: boolean;
  minRecentPredictionPoints: number | null;
  maxRecentPredictionPoints: number | null;
  predictionHistorySampleDepth: number;
  maxPredictionTiers: number;
}
