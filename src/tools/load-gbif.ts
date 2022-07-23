import { loadAndCheckEnvVars } from '../backend/util/env_util';
import { DB, connectDB, disconnectDB, getDB } from '../backend/integrations/postgres';
import { Taxon } from '../backend/model/taxon';
import { Location } from '../backend/model/location';
import { type SpecimenSource, Specimen } from '../backend/model/specimen';
import { LocationVisit } from '../backend/effort/location_visit';
import { LocationEffort } from '../backend/effort/location_effort';
import { comparedTaxa } from '../shared/model';

export async function loadDB(
  getNextSpecimenSource: () => Promise<SpecimenSource | null>
) {
  // Connect to the database.

  loadAndCheckEnvVars(false);
  await connectDB({
    host: process.env.CAVESITE_DB_HOST,
    database: process.env.CAVESITE_DB_NAME,
    port: parseInt(process.env.CAVESITE_DB_PORT!),
    user: process.env.CAVESITE_DB_USER,
    password: process.env.CAVESITE_DB_PASSWORD
  });
  const db = getDB();

  // Populate the database, including location visit data.

  await _loadSpecimens(db, getNextSpecimenSource);

  // Tally and commit location effort data.

  for (const compare of comparedTaxa) {
    await LocationEffort.tallyEffort(db, compare);
    // Commit data as the process proceeds.
    await LocationVisit.commit(db, compare);
    await LocationEffort.commit(db, compare);
  }

  // Commit the new specimen records.

  await Specimen.commit(db);
  await Location.commit(db);
  await Taxon.commit(db);

  await disconnectDB();
}

async function _loadSpecimens(
  db: DB,
  getNextSpecimenSource: () => Promise<SpecimenSource | null>
) {
  let importFailureCount = 0;
  let specimenSource = await getNextSpecimenSource();
  while (specimenSource !== null) {
    try {
      const specimen = await Specimen.create(db, specimenSource);
      if (specimen) {
        for (const compare of comparedTaxa) {
          await LocationVisit.addSpecimen(db, compare, specimen);
        }
      } else {
        ++importFailureCount;
        console.log(
          `Cat# ${specimenSource.catalogNumber || 'UNSPECIFIED'}: logged import failure`
        );
      }
    } catch (err: any) {
      ++importFailureCount;
      console.log(`Cat# ${specimenSource.catalogNumber}:`, err.message);
    }
    specimenSource = await getNextSpecimenSource();
  }
  console.log(`\n${importFailureCount} import failures\n`);
}
