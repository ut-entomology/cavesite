import type { DB } from '../integrations/postgres';
import { Location } from '../model/location';

let rootLocationUnique: string | null = null;

export async function getRootLocationUnique(db: DB): Promise<string | null> {
  if (!rootLocationUnique) {
    const locations = await Location.matchName(db, 'Texas', 1);
    if (locations.length != 0) {
      rootLocationUnique = locations[0].parentNamePath
        .split('|')
        .slice(0, 3)
        .join('|')
        .toLowerCase();
      if (!rootLocationUnique.endsWith('Texas')) {
        // happens when we pull the entry for Texas itself
        rootLocationUnique += '|texas';
      }
    }
  }
  return rootLocationUnique;
}
