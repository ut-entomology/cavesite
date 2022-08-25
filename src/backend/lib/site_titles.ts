import type { DB } from '../integrations/postgres';
import { KeyData } from '../model/key_data';
import { DataKey } from '../../shared/data_keys';
import { Permission } from '../../shared/user_auth';

export let siteTitle = 'Unspecified title';
export let siteSubtitle = 'Unspecified subtitle';

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
