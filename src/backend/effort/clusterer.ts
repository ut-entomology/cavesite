import { type DB } from '../integrations/postgres';
import { type SeedSpec } from '../../shared/model';

export abstract class Clusterer {
  abstract getSeedLocationIDs(db: DB, seedSpec: SeedSpec): Promise<number[]>;

  abstract getClusteredLocationIDs(
    db: DB,
    seedLocationIDs: number[],
    minSpecies: number,
    maxSpecies: number
  ): Promise<number[][]>;
}
