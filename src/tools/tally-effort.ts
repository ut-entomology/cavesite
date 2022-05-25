import { loadAndCheckEnvVars } from '../backend/util/env_util';
import { connectDB, disconnectDB, getDB } from '../backend/integrations/postgres';
import { Specimen } from '../backend/model/specimen';
import { LocationVisit } from '../backend/sampling/location_visit';
import { LocationEffort } from '../backend/sampling/location_effort';

const SPECIMEN_BATCH_SIZE = 500;

async function tallyVisits() {
  const db = getDB();
  let skipCount = 0;
  let specimens = await Specimen.getNextBatch(db, skipCount, SPECIMEN_BATCH_SIZE);
  while (specimens.length > 0) {
    for (const specimen of specimens) {
      if (
        specimen.collectionStartDate !== null &&
        specimen.collectors !== null &&
        specimen.collectionEndDate === null
      ) {
        await LocationVisit.addSpecimen(db, specimen);
      }
    }
    skipCount += specimens.length;
    specimens = await Specimen.getNextBatch(db, skipCount, SPECIMEN_BATCH_SIZE);
  }
}

(async () => {
  loadAndCheckEnvVars(false);
  await connectDB({
    host: process.env.CAVESITE_DB_HOST,
    database: process.env.CAVESITE_DB_NAME,
    port: parseInt(process.env.CAVESITE_DB_PORT!),
    user: process.env.CAVESITE_DB_USER,
    password: process.env.CAVESITE_DB_PASSWORD
  });
  await LocationEffort.dropAll(getDB());
  await LocationVisit.dropAll(getDB());
  await tallyVisits();
  await LocationEffort.tallyEffort(getDB());
  await disconnectDB();
})();
