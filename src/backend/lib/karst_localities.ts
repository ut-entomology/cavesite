/**
 * This module provides access to data characterizing aquatic
 * and terrestrial karst localities.
 */

import { DataKey, parseDataLines, parseLocalities } from '../../shared/data_keys';
import type { DB } from '../integrations/postgres';
import { KeyData } from '../model/key_data';
import { Permission } from '../../shared/user_auth';
import type { LocationSpec } from '../../shared/model';

abstract class KarstLocalityData {
  private _termsDataKey: DataKey;
  private _localityDataKey: DataKey;
  private _termLexemesList: string[][] | null = null;
  private _isKarstByLocalityCounty: Record<string, boolean> | null = null;

  constructor(termsDataKey: DataKey, localityDataKey: DataKey) {
    this._termsDataKey = termsDataKey;
    this._localityDataKey = localityDataKey;
  }

  async indicatesLocation(db: DB, spec: LocationSpec): Promise<boolean> {
    if (this._termLexemesList === null) {
      const text = await KeyData.read(db, null, Permission.Admin, this._termsDataKey);
      this._termLexemesList = parseDataLines(text || '').map((term) =>
        _toLexemes(term)
      );
    }

    if (this._isKarstByLocalityCounty == null) {
      const text = await KeyData.read(db, null, Permission.None, this._localityDataKey);
      const localityCounties = parseLocalities(text || '');
      this._isKarstByLocalityCounty = {};
      for (const localityCounty of localityCounties) {
        this._isKarstByLocalityCounty[
          _toNameKey(localityCounty[0], localityCounty[1])
        ] = true;
      }
    }

    const localityName = spec.name.toLowerCase();
    const parentName = spec.parentNamePath.split('|').pop()!;
    const nameKey = _toNameKey(localityName, parentName.toLowerCase());
    if (this._isKarstByLocalityCounty[nameKey]) return true;

    const localityLexemes = _toLexemes(localityName);
    for (const termLexemes of this._termLexemesList) {
      let localityOffset = localityLexemes.indexOf(termLexemes[0]);
      if (localityOffset >= 0) {
        let matched = true;
        for (let i = 1; matched && i < termLexemes.length; ++i) {
          matched =
            localityOffset + i < localityLexemes.length &&
            termLexemes[i] == localityLexemes[localityOffset + i];
        }
        if (matched) return true;
      }
    }
    return false;
  }
}

export class AquaticKarstData extends KarstLocalityData {
  constructor() {
    super(DataKey.AquaticKarstTerms, DataKey.AquaticKarstLocalities);
  }
}

export class TerrestrialKarstData extends KarstLocalityData {
  constructor() {
    super(DataKey.TerrestrialKarstTerms, DataKey.TerrestrialKarstLocalities);
  }
}

function _toNameKey(locality: string, county: string) {
  return `${locality} (${county})`;
}

const TERM_REGEX = /[a-z0-9]+|[^a-z0-9]/g;
function _toLexemes(locality: string): string[] {
  const matches = locality.toLowerCase().matchAll(TERM_REGEX);
  return Array.from(matches).map((match) => match[0]);
}
