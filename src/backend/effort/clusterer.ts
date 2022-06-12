import { type DB } from '../integrations/postgres';
import { type ClusterSpec } from '../../shared/model';

export abstract class Clusterer {
  protected _minSpecies: number;
  protected _maxSpecies: number;

  abstract getSeedLocationIDs(
    db: DB,
    maxClusters: number,
    useCumulativeTaxa: boolean
  ): Promise<number[]>;

  abstract getClusteredLocationIDs(
    db: DB,
    seedLocationIDs: number[]
  ): Promise<number[][]>;

  constructor(clusterSpec: ClusterSpec) {
    this._minSpecies = clusterSpec.minSpecies || 0;
    this._maxSpecies = clusterSpec.maxSpecies || 1000000; // impossible number
  }
}
