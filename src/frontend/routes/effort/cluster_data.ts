import type { TaxonRank, ComparedTaxa } from '../../../shared/model';
import type { LocationGraphData } from './location_graph_data';

export interface ClusteringConfig {
  maxClusters: number;
  comparedTaxa: ComparedTaxa;
  ignoreSubgenera: boolean;
  highestComparedRank: TaxonRank;
  maxPointsToRegress: number | null;
}

export interface ClusterData {
  visitsByTaxonUnique: Record<string, number>;
  locationGraphDataSet: LocationGraphData[];
}
