import { type DB } from '../integrations/postgres';
import {
  type ClusterSpec,
  type TaxaCluster,
  ComparedTaxa,
  DissimilarityMetric
} from '../../shared/model';

export abstract class Clusterer {
  protected _db: DB;
  protected _metric: DissimilarityMetric;
  protected _comparedTaxa: ComparedTaxa;
  protected _ignoreSubgenera: boolean;
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
    this._comparedTaxa =
      clusterSpec.comparedTaxa === undefined
        ? ComparedTaxa.all
        : clusterSpec.comparedTaxa;
    this._ignoreSubgenera =
      clusterSpec.ignoreSubgenera === undefined ? false : clusterSpec.ignoreSubgenera;
    this._minSpecies = clusterSpec.minSpecies || 0;
    this._maxSpecies = clusterSpec.maxSpecies || 1000000; // impossible number
  }
}
