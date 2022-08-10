import { loadAndCheckEnvVars } from '../backend/util/env_util';
import { DB, connectDB, disconnectDB, getDB } from '../backend/integrations/postgres';
import { Taxon } from '../backend/model/taxon';
import { Location } from '../backend/model/location';
import { type SpecimenSource, Specimen } from '../backend/model/specimen';
import { LocationVisit } from '../backend/effort/location_visit';
import { LocationEffort } from '../backend/effort/location_effort';
import { comparedFauna } from '../shared/model';

export async function loadDB(
  getNextSpecimenSource: () => Promise<SpecimenSource | null>,
  addedVisit: (committing: boolean) => void
): Promise<string[]> {
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

  const failures = await _loadSpecimens(db, getNextSpecimenSource);

  // Tally and commit location effort data.

  for (const compare of comparedFauna) {
    await LocationEffort.tallyEffort(db, compare, addedVisit.bind(null, false));
    // Commit data as the process proceeds.
    addedVisit(true);
    await LocationVisit.commit(db, compare);
    await LocationEffort.commit(db, compare);
  }

  // Commit the new specimen records.

  await Specimen.commit(db);
  await Location.commit(db);
  await Taxon.commit(db);

  await disconnectDB();
  return failures;
}

async function _loadSpecimens(
  db: DB,
  getNextSpecimenSource: () => Promise<SpecimenSource | null>
): Promise<string[]> {
  const failures: string[] = [];
  let specimenSource = await getNextSpecimenSource();
  while (specimenSource !== null) {
    try {
      const specimen = await Specimen.create(db, specimenSource);
      if (specimen) {
        for (const compare of comparedFauna) {
          await LocationVisit.addSpecimen(db, compare, specimen);
        }
      } else {
        _logImportFailure(
          failures,
          `Cat# ${specimenSource.catalogNumber || 'UNSPECIFIED'}: logged import failure`
        );
      }
    } catch (err: any) {
      _logImportFailure(
        failures,
        `Cat# ${specimenSource.catalogNumber}: ${err.message}`
      );
    }
    specimenSource = await getNextSpecimenSource();
  }
  return failures;
}

function _logImportFailure(failures: string[], message: string): void {
  failures.push(message);
  process.stdout.write('F');
}
