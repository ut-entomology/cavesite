import type { DB } from '../integrations/postgres';
import { KeyData } from '../model/key_data';
import {
  DataKey,
  TexasSpeciesStatus,
  parseFederalSpeciesStatus,
  parseStateSpeciesStatus
} from '../../shared/data_keys';
import { Permission } from '../../shared/user_auth';

export class FederalSpeciesStatusData {
  private _listedSpecies: Record<string, boolean> | null = null;

  async isListed(db: DB, species: string): Promise<boolean> {
    if (this._listedSpecies === null) {
      this._listedSpecies = {};
      const data = await KeyData.read(db, null, Permission.None, DataKey.FederalSpeciesStatus);
      if (data !== null) {
        const speciesList = parseFederalSpeciesStatus(data);
        for (const species of speciesList) {
          this._listedSpecies[species] = true;
        }
      }
    }
    return this._listedSpecies[species];
  }
}

export class TexasSpeciesStatusData {
  private _statusBySpecies: Record<string, TexasSpeciesStatus> | null = null;

  async getStatus(db: DB, species: string): Promise<TexasSpeciesStatus> {
    if (this._statusBySpecies === null) {
      this._statusBySpecies = {};
      const data = await KeyData.read(db, null, Permission.None, DataKey.TexasSpeciesStatus);
      if (data !== null) {
        const speciesStatuses = parseStateSpeciesStatus(data);
        for (const speciesStatus of speciesStatuses) {
          this._statusBySpecies[speciesStatus.species] = speciesStatus;
        }
      }
    }
    return this._statusBySpecies[species];
  }
}
