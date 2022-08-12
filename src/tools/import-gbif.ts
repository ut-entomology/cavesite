import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import { getReasonPhrase } from 'http-status-codes';

import { type GbifRecord } from '../backend/model/specimen';
import type { DB } from '../backend/integrations/postgres';
import { connectDatabase, loadDatabase } from './lib/load_database';
import { Permission } from '../shared/user_auth';
import { KeyData } from '../backend/model/key_data';
import { ADMIN_CONFIG_KEY, type AdminConfig } from '../backend/lib/admin_config';

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
  client: AxiosInstance;
  db: DB | null = null;
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

  async getDB(): Promise<DB> {
    if (!this.db) {
      this.db = await connectDatabase();
    }
    return this.db;
  }

  async load(): Promise<void> {
    this.errors = await loadDatabase(
      await this.getDB(),
      this._loadNextGbifRecord,
      this._calculatingEffort,
      this._committingData
    );
  }

  _calculatingEffort(): void {}

  _committingData(): void {}

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

class CheckedGbifImporter extends GbifImporter {
  async run(): Promise<void> {
    try {
      if (await this._isScheduled()) {
        await this.load();
      }
    } catch (err: any) {
      // TODO: write fatal error to DB log
    }
    console.log();
    if (this.errors.length > 0) {
      // TODO: write errors to DB log
    }
  }

  async _isScheduled(): Promise<boolean> {
    const keyData = await KeyData.read(
      await this.getDB(),
      null,
      Permission.Admin,
      ADMIN_CONFIG_KEY
    );
    if (!keyData) return false;
    const config: AdminConfig = JSON.parse(keyData);
    const now = new Date();
    return (
      config.importDaysOfWeek.includes(now.getDay()) &&
      now.getHours() == config.importHour
    );
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
