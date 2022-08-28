/**
 * This module provides a list of all currently known cave obligates. The
 * information needs to be moved to keyed data so the admin can maintain it.
 */
import * as path from 'path';
import * as fs from 'fs';

import { DataKey, keyDataInfoByKey, parseDataLines } from '../../shared/data_keys';
import type { DB } from '../integrations/postgres';
import { KeyData } from '../model/key_data';
import { Permission } from '../../shared/user_auth';

export type TaxonPathsByUniqueMap = Record<string, string[]>;

const DEFAULT_DATA_FILE = path.join(
  __dirname,
  `../../../setup/data_files/${DataKey.CaveObligates}.txt`
);
const cachedCaveObligateTaxa: string[] = [];

let caveObligatesMap: Record<string, boolean> | null = null;
let caveContainingGeneraMap: Record<string, boolean> | null = null;

export async function getCaveObligatesMap(db: DB): Promise<Record<string, boolean>> {
  if (caveObligatesMap) return caveObligatesMap;
  const caveObligateTaxa = await getCaveObligates(db);
  caveObligatesMap = {};
  for (const taxonName of caveObligateTaxa) {
    // Exclude new species because they don't correspond to those in the database.
    if (!taxonName.includes('n.')) {
      caveObligatesMap[taxonName] = true;
    }
  }
  return caveObligatesMap;
}

export async function getCaveContainingGeneraMap(
  db: DB
): Promise<Record<string, boolean>> {
  if (caveContainingGeneraMap) return caveContainingGeneraMap;
  const caveObligateTaxa = await getCaveObligates(db);
  caveContainingGeneraMap = {};
  for (const taxonName of caveObligateTaxa) {
    let genus = taxonName;
    const spaceOffset = genus.indexOf(' ');
    if (spaceOffset > 0) {
      genus = genus.substring(0, spaceOffset);
    }
    // Also includes subgenera.
    caveContainingGeneraMap[genus] = true;
  }
  return caveContainingGeneraMap;
}

export async function getCaveObligates(db: DB): Promise<string[]> {
  if (cachedCaveObligateTaxa.length > 0) return cachedCaveObligateTaxa;
  const data = await KeyData.read(db, null, Permission.None, DataKey.CaveObligates);
  return parseDataLines(data || '');
}

export async function loadDefaultCaveObligates(db: DB): Promise<void> {
  const text = fs.readFileSync(DEFAULT_DATA_FILE).toString();
  await KeyData.write(
    db,
    null,
    DataKey.CaveObligates,
    keyDataInfoByKey[DataKey.CaveObligates].readPermission,
    text
  );
}
