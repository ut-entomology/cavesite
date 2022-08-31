import type { DB } from '../integrations/postgres';
import { KeyData } from '../model/key_data';
import { DataKey, parseDataLines } from '../../shared/data_keys';
import { Permission } from '../../shared/user_auth';

export let defaultQueryFields: string[];

export async function loadDefaultQueryFields(db: DB): Promise<void> {
  let data = await KeyData.read(db, null, Permission.Admin, DataKey.DefaultQueryFields);
  if (data !== null) {
    setDefaultQueryFields(data);
  }
}

export function setDefaultQueryFields(text: string) {
  defaultQueryFields = parseDataLines(text).map((line) => line.trim().toLowerCase());
}
