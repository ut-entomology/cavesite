import type { DB } from '../integrations/postgres';
import { KeyData } from '../model/key_data';
import {
  DataKey,
  parseGbifCorrections
} from '../../shared/data_keys';
import { Permission } from '../../shared/user_auth';

export class GbifCorrectionsData {
  private _ancestorsByDet: Record<string, string[]> | null = null;

  async getAncestorRemap(db: DB, species: string): Promise<string[] | null> {
    if (this._ancestorsByDet === null) {
      this._ancestorsByDet = {};
      const data = await KeyData.read(db, null, Permission.None, DataKey.GbifCorrections);
      if (data !== null) {
        this._ancestorsByDet = parseGbifCorrections(data, []);
      }
    }
    return this._ancestorsByDet[species] || null;
  }
}
