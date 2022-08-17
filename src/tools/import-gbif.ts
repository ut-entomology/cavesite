/**
 * Command line tool for importing records from GBIF. Can be run to force
 * an immediate import or to only import if currently scheduled to do so.
 */

import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import { getReasonPhrase } from 'http-status-codes';

import { type GbifRecord } from '../backend/model/specimen';
import { type DB, disconnectDB } from '../backend/integrations/postgres';
import { connectDatabase, loadDatabase } from './lib/load_database';
import { Permission } from '../shared/user_auth';
import { KeyData } from '../backend/model/key_data';
import { IMPORT_SCHEDULE_KEY, type ImportSchedule } from '../shared/data_keys';
import { LogType } from '../shared/model';
import { Logs } from '../backend/model/logs';

const runningAsScript = require.main === module; // rather than imported by load-csv
const INSTITUTION_CODE = 'UTIC';
const COLLECTION_CODE = 'Biospeleology';
const LIMIT_PER_REQUEST = 300; // per https://www.gbif.org/developer/occurrence
const RECORDS_PER_TICK = 300;

interface GbifResponse {
  offset: number;
  limit: number;
  endOfRecords: boolean;
  count: number;
  results: GbifRecord[];
}

abstract class GbifImporter {
  description: string;
  client: AxiosInstance;
  db: DB | null = null;
  recordCount = 0;
  importFailures: string[] = [];
  hasMoreRecords = true;
  batch: GbifRecord[] = [];

  constructor(description: string) {
    this.description = description;
    this.client = axios.create({
      baseURL: process.env.CAVESITE_BASE_URL,
      timeout: 8000, // 8 seconds
      withCredentials: false
    });
  }

  async getDB(): Promise<DB> {
    if (!this.db) {
      this.db = await connectDatabase();
    }
    return this.db;
  }

  async load(): Promise<void> {
    await Logs.post(
      await this.getDB(),
      LogType.Import,
      'STARTED',
      'Began ' + this.description
    );
    this.importFailures = await loadDatabase(
      await this.getDB(),
      this._loadNextGbifRecord,
      this._calculatingEffort,
      this._committingData
    );
    await Logs.post(
      await this.getDB(),
      LogType.Import,
      'FINISHED',
      'Completed ' + this.description
    );
    await disconnectDB();
  }

  _calculatingEffort(): void {}

  _committingData(): void {}

  async _loadNextGbifRecord(): Promise<GbifRecord | null> {
    let nextRecord = this.batch.pop();
    while (nextRecord && nextRecord.stateProvince != 'Texas') {
      nextRecord = this.batch.pop();
    }
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
        this._handleError(_errorReason(err.response));
      }
    }
    if (nextRecord) {
      ++this.recordCount;
    }
    return nextRecord || null;
  }

  abstract _handleError(message: string): Promise<void>;
}

class ForcedGbifImporter extends GbifImporter {
  errors: string[] = [];

  constructor() {
    super('import from GBIF via command line');
  }

  async run(): Promise<void> {
    try {
      await this.load();
    } catch (err: any) {
      this.errors.push('Error: ' + err.message);
    }

    console.log();
    if (this.importFailures.length > 0) {
      for (const failure of this.importFailures) {
        console.log('-', failure);
      }
      console.log(this.importFailures.length, 'import failures');
    }
    if (this.errors.length > 0) {
      console.log();
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

  async _handleError(message: string): Promise<void> {
    this.errors.push('Error: ' + message);
  }
}

class CheckedGbifImporter extends GbifImporter {
  constructor() {
    super('scheduled import from GBIF');
  }

  async run(): Promise<void> {
    try {
      if (await this._isScheduled()) {
        await this.load();
      }
    } catch (err: any) {
      this._handleError(err.message);
    }
  }

  async _isScheduled(): Promise<boolean> {
    const keyData = await KeyData.read(
      await this.getDB(),
      null,
      Permission.Admin,
      IMPORT_SCHEDULE_KEY
    );
    if (!keyData) return false;
    const schedule: ImportSchedule = JSON.parse(keyData);
    const now = new Date();
    return (
      schedule.importDaysOfWeek.includes(now.getDay()) &&
      now.getHours() == schedule.importHourOfDay
    );
  }

  async _handleError(message: string): Promise<void> {
    await Logs.post(await this.getDB(), LogType.Import, null, 'Error: ' + message);
  }
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
        new ForcedGbifImporter().run();
        break;
      case '--check':
        showHelp = false;
        new CheckedGbifImporter().run();
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
