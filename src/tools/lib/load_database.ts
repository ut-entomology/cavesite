/**
 * Support for loading the database from GBIF records.
 */

import { loadAndCheckEnvVars } from '../../backend/lib/env_vars';
import { DB, connectDB, getDB } from '../../backend/integrations/postgres';
import { ImportContext } from '../../backend/lib/import_context';
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
  cx: ImportContext,
  getNextGbifRecord: () => Promise<GbifRecord | null>,
  calculatingEffort: () => void,
  committingData: () => void
): Promise<string[]> {
  // Populate the database, including location visit data.

  const failures = await _loadSpecimens(db, cx, getNextGbifRecord);

  // Tally and commit location effort data.

  calculatingEffort();
  for (const compare of comparedFauna) {
    let locationIDs = await Specimen.getMissingAquaticKarstLocationIDs(db, false);
    await Specimen.assignAquaticKarstLocations(db, locationIDs);
    await LocationVisit.assignKarstLocations(db, locationIDs);

    locationIDs = await Specimen.getMissingTerrestrialKarstLocationIDs(db, false);
    await Specimen.assignTerrestrialKarstLocations(db, locationIDs);
    await LocationVisit.assignKarstLocations(db, locationIDs);

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
  cx: ImportContext,
  getNextGbifRecord: () => Promise<GbifRecord | null>
): Promise<string[]> {
  const importContext = new ImportContext();
  const failures: string[] = [];

  let specimenSource = await getNextGbifRecord();
  while (specimenSource !== null) {
    try {
      const specimen = await Specimen.create(db, importContext, specimenSource);
      if (specimen) {
        for (const compare of comparedFauna) {
          await LocationVisit.addSpecimen(db, cx, compare, specimen);
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
