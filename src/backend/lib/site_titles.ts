import type { DB } from '../integrations/postgres';
import { KeyData } from '../model/key_data';
import { DataKey } from '../../shared/data_keys';
import { Permission } from '../../shared/user_auth';

let siteTitle = 'Unspecified title';
let siteSubtitle = 'Unspecified subtitle';

export function getSiteTitle() {
  return siteTitle;
}

export function getSiteSubtitle() {
  return siteSubtitle;
}

export async function loadSiteTitles(db: DB): Promise<void> {
  const data = await KeyData.read(
    db,
    null,
    Permission.Admin,
    DataKey.SiteTitleAndSubtitle
  );
  if (data !== null) {
    setSiteTitles(data);
  }
}

export function setSiteTitles(data: string) {
  const lines = data.split('\n');
  siteTitle = lines[0].trim();
  siteSubtitle = lines[1].trim();
}
