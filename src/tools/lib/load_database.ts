/**
 * Support for loading the database from GBIF records.
 */

import { loadAndCheckEnvVars } from '../../backend/lib/env_vars';
import { DB, connectDB, getDB } from '../../backend/integrations/postgres';
import { Taxon } from '../../backend/model/taxon';
import { Location } from '../../backend/model/location';
import { type GbifRecord, Specimen } from '../../backend/model/specimen';
import { LocationVisit } from '../../backend/effort/location_visit';
import { LocationEffort } from '../../backend/effort/location_effort';
import { comparedFauna } from '../../shared/model';

export async function connectDatabase(): Promise<DB> {
  loadAndCheckEnvVars(false);
  await connectDB({
    host: process.env.CAVESITE_DB_HOST,
    database: process.env.CAVESITE_DB_NAME,
    port: parseInt(process.env.CAVESITE_DB_PORT!),
    user: process.env.CAVESITE_DB_USER,
    password: process.env.CAVESITE_DB_PASSWORD
  });
  return getDB();
}

export async function loadDatabase(
  db: DB,
  getNextGbifRecord: () => Promise<GbifRecord | null>,
  calculatingEffort: () => void,
  committingData: () => void
): Promise<string[]> {
  // Populate the database, including location visit data.

  const failures = await _loadSpecimens(db, getNextGbifRecord);

  // Tally and commit location effort data.

  calculatingEffort();
  for (const compare of comparedFauna) {
    const locationIDs = await Specimen.getMissingCaveObligateLocationIDs(db, false);
    await Specimen.assignCaveLocations(db, locationIDs);
    await LocationVisit.assignCaveLocations(db, locationIDs);

    await LocationEffort.tallyEffort(db, compare);
    // Commit data as the process proceeds.
    await LocationVisit.commit(db, compare);
    await LocationEffort.commit(db, compare);
  }

  // Commit the new specimen records.

  committingData();
  await Specimen.commit(db);
  await Location.commit(db);
  await Taxon.commit(db);

  return failures;
}

async function _loadSpecimens(
  db: DB,
  getNextGbifRecord: () => Promise<GbifRecord | null>
): Promise<string[]> {
  const failures: string[] = [];
  let specimenSource = await getNextGbifRecord();
  while (specimenSource !== null) {
    try {
      const specimen = await Specimen.create(db, specimenSource);
      if (specimen) {
        for (const compare of comparedFauna) {
          await LocationVisit.addSpecimen(db, compare, specimen);
        }
      } else {
        failures.push(
          `Cat# ${specimenSource.catalogNumber || 'UNSPECIFIED'}: logged import failure`
        );
      }
    } catch (err: any) {
      failures.push(`Error: Cat# ${specimenSource.catalogNumber}: ${err.message}`);
    }
    specimenSource = await getNextGbifRecord();
  }
  return failures;
}
