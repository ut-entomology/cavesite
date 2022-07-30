import { type DB } from '../integrations/postgres';
import {
  type ClusterSpec,
  type TaxaCluster,
  ComparedFauna,
  DissimilarityMetric
} from '../../shared/model';

export abstract class Clusterer {
  protected _db: DB;
  protected _metric: DissimilarityMetric;
  protected _comparedFauna: ComparedFauna;
  protected _minSpecies: number;
  protected _maxSpecies: number;

  abstract getSeedLocationIDs(
    maxClusters: number,
    useCumulativeTaxa: boolean
  ): Promise<number[]>;

  abstract getTaxaClusters(seedLocationIDs: number[]): Promise<TaxaCluster[]>;

  constructor(db: DB, clusterSpec: ClusterSpec) {
    this._db = db;
    this._metric = clusterSpec.metric;
    this._comparedFauna =
      clusterSpec.comparedFauna === undefined
        ? ComparedFauna.all
        : clusterSpec.comparedFauna;
    this._minSpecies = clusterSpec.minSpecies || 0;
    this._maxSpecies = clusterSpec.maxSpecies || 1000000; // impossible number
  }
}
