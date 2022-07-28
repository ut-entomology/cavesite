import type { TaxonRank, ComparedTaxa } from '../../shared/model';

export interface ClusteringConfig {
  maxClusters: number;
  comparedTaxa: ComparedTaxa;
  highestComparedRank: TaxonRank;
  proximityResolution: boolean;
  minPointsToRegress: number | null;
  maxPointsToRegress: number | null;
  predictionHistorySampleDepth: number;
  maxPredictionTiers: number;
}
