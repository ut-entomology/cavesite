import type { DB } from '../integrations/postgres';
import { KeyData } from '../model/key_data';
import { DataKey } from '../../shared/data_keys';
import { Permission } from '../../shared/user_auth';

export let siteTitle = 'Unspecified title';
export let siteSubtitle = 'Unspecified subtitle';
let welcomeHTML = 'Unspecified welcome';

export async function loadSiteInfo(db: DB): Promise<void> {
  let data = await KeyData.read(
    db,
    null,
    Permission.Admin,
    DataKey.SiteTitleAndSubtitle
  );
  if (data !== null) {
    setSiteTitles(data);
  }
  data = await KeyData.read(db, null, Permission.Admin, DataKey.WelcomePage);
  if (data !== null) {
    welcomeHTML = data;
  }
}

export function getWelcomeHTML(): string {
  return welcomeHTML
    .replace('{website-title}', siteTitle)
    .replace('{website-subtitle}', siteSubtitle);
}

export function setSiteTitles(text: string) {
  const lines = text.split('\n');
  siteTitle = lines[0].trim();
  siteSubtitle = lines[1].trim();
}

export function setWelcomeHTML(text: string) {
  welcomeHTML = text;
}
