import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import { getReasonPhrase } from 'http-status-codes';

import { loadAndCheckEnvVars } from '../backend/util/env_util';
import { DB, connectDB, disconnectDB, getDB } from '../backend/integrations/postgres';
import { Taxon } from '../backend/model/taxon';
import { Location } from '../backend/model/location';
import { type GbifRecord, Specimen } from '../backend/model/specimen';
import { LocationVisit } from '../backend/effort/location_visit';
import { LocationEffort } from '../backend/effort/location_effort';
import { comparedFauna } from '../shared/model';

const runningAsScript = require.main === module; // rather than imported by load-csv
const INSTITUTION_CODE = 'UTIC';
const COLLECTION_CODE = 'Biospeleology';
const LIMIT_PER_REQUEST = 300; // per https://www.gbif.org/developer/occurrence
const RECORDS_PER_TICK = 500;

interface GbifResponse {
  offset: number;
  limit: number;
  endOfRecords: boolean;
  count: number;
  results: GbifRecord[];
}

abstract class GbifImporter {
  client: AxiosInstance;
  recordCount = 0;
  errors: string[] = [];
  hasMoreRecords = true;
  batch: GbifRecord[] = [];

  constructor() {
    this.client = axios.create({
      baseURL: process.env.CAVESITE_BASE_URL,
      timeout: 8000, // 8 seconds
      withCredentials: false
    });
  }

  async load(): Promise<void> {
    this.errors = await loadDB(
      this._loadNextGbifRecord,
      this._calculatingEffort,
      this._committingData
    );
  }

  abstract _calculatingEffort(): void;

  abstract _committingData(): void;

  async _loadNextGbifRecord(): Promise<GbifRecord | null> {
    let nextRecord = this.batch.pop();
    if (!nextRecord) {
      if (!this.hasMoreRecords) return null;
      try {
        const res = await this.client.get(
          `https://api.gbif.org/v1/occurrence/search?institutionCode=${INSTITUTION_CODE}&collectionCode=${COLLECTION_CODE}&offset=${this.recordCount}&limit=${LIMIT_PER_REQUEST}`
        );
        const data = res.data as GbifResponse;
        this.batch = data.results;
        this.hasMoreRecords = !data.endOfRecords;
        nextRecord = this.batch.pop();
      } catch (err: any) {
        this.errors.push('FATAL ERROR: ' + _errorReason(err.response));
      }
    }
    if (nextRecord) {
      ++this.recordCount;
    }
    return nextRecord || null;
  }
}

class ForcedGbifImporter extends GbifImporter {
  async run(): Promise<void> {
    try {
      await this.load();
    } catch (err: any) {
      this.errors.push('FATAL ERROR: ' + err.message);
    }
    console.log();
    if (this.errors.length > 0) {
      for (const error of this.errors) {
        console.log('-', error);
      }
      console.log(this.errors.length, 'errors');
    }
    console.log('Imported', this.recordCount, 'records');
  }

  _calculatingEffort() {
    process.stdout.write('\nCalculating effort...');
  }

  _committingData() {
    process.stdout.write('\nCommitting data... (working)');
  }

  async _loadNextGbifRecord(): Promise<GbifRecord | null> {
    const record = await super._loadNextGbifRecord();
    if (record && this.recordCount % RECORDS_PER_TICK == 0) {
      process.stdout.write('.');
    }
    return record;
  }
}

export async function loadDB(
  getNextGbifRecord: () => Promise<GbifRecord | null>,
  calculatingEffort: () => void,
  committingData: () => void
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

  const failures = await _loadSpecimens(db, getNextGbifRecord);

  // Tally and commit location effort data.

  calculatingEffort();
  for (const compare of comparedFauna) {
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

  await disconnectDB();
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
      failures.push(`Cat# ${specimenSource.catalogNumber}: ${err.message}`);
    }
    specimenSource = await getNextGbifRecord();
  }
  return failures;
}

function _errorReason(res: AxiosResponse): string {
  return res.data?.message || getReasonPhrase(res.status);
}

if (runningAsScript) {
  let showHelp = true;

  if (process.argv.length == 3) {
    switch (process.argv[2]) {
      case '--force':
        showHelp = false;
        const importer = new ForcedGbifImporter();
        importer.run();
        break;
      case '--check':
        showHelp = false;
        //_checkImport();
        break;
    }
  }

  if (showHelp) {
    console.log(
      'Imports all biospeleology records from GBIF, replacing existing records.\n' +
        '* Use --check to import now if the import is schedule for this hour.\n' +
        '* Use --force to import now regardless of when imports are scheduled.\n' +
        'No action is taken unless you specify one of these parameters.\n'
    );
  }
}
