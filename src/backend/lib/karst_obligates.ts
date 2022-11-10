/**
 * This module provides lists of all currently known karst obligates.
 */

import { DataKey, parseDataLines } from '../../shared/data_keys';
import type { DB } from '../integrations/postgres';
import { KeyData } from '../model/key_data';
import { Permission } from '../../shared/user_auth';

export type TaxonPathsByUniqueMap = Record<string, string[]>;

abstract class KarstObligateData {
  private _dataKey: DataKey;
  private _cachedCaveObligateTaxa: string[] = [];
  private _caveObligatesMap: Record<string, boolean> | null = null;
  private _caveContainingGeneraMap: Record<string, boolean> | null = null;

  constructor(dataKey: DataKey) {
    this._dataKey = dataKey;
  }

  async getMap(db: DB): Promise<Record<string, boolean>> {
    if (this._caveObligatesMap) return this._caveObligatesMap;
    const caveObligateTaxa = await this.getTaxa(db);
    this._caveObligatesMap = {};
    for (const taxonName of caveObligateTaxa) {
      // Exclude new species because they don't correspond to those in the database.
      if (!taxonName.includes('n.')) {
        this._caveObligatesMap[taxonName] = true;
      }
    }
    return this._caveObligatesMap;
  }

  async getContainingGeneraMap(db: DB): Promise<Record<string, boolean>> {
    if (this._caveContainingGeneraMap) return this._caveContainingGeneraMap;
    const caveObligateTaxa = await this.getTaxa(db);
    this._caveContainingGeneraMap = {};
    for (const taxonName of caveObligateTaxa) {
      let genus = taxonName;
      const spaceOffset = genus.indexOf(' ');
      if (spaceOffset > 0) {
        genus = genus.substring(0, spaceOffset);
      }
      this._caveContainingGeneraMap[genus] = true;
    }
    return this._caveContainingGeneraMap;
  }

  async getTaxa(db: DB): Promise<string[]> {
    if (this._cachedCaveObligateTaxa.length == 0) {
      const data = await KeyData.read(db, null, Permission.None, this._dataKey);
      this._cachedCaveObligateTaxa = parseDataLines(data || '');
    }
    return this._cachedCaveObligateTaxa;
  }
}

export class StygobiteData extends KarstObligateData {
  constructor() {
    super(DataKey.Stygobites);
  }
}

export class TroglobiteData extends KarstObligateData {
  constructor() {
    super(DataKey.Troglobites);
  }
}
