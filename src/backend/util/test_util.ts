/**
 * Generally useful utilities for managing database-based unit tests.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as lockfile from 'proper-lockfile';

import { type DB, connectDB, disconnectDB, getDB } from '../integrations/postgres';
import { DataKey, keyDataInfoByKey } from '../../shared/data_keys';
import { KeyData } from '../model/key_data';

const LOCK_RETRY_MILLIS = 100;
const LOCKFILE = path.join(__dirname, '../../../db-test-mutex');
const SETUP_SQL_DIR = path.join(__dirname, '../../../setup/sql');

const TEST_DB_CONFIG = {
  host: 'localhost',
  database: 'test_caves',
  port: 5432,
  user: 'test_user',
  password: 'test_pass'
};

export class DatabaseMutex {
  private _db: DB | null = null;
  private _lockRelease: Awaited<ReturnType<typeof lockfile.lock>> | null = null;

  async lock(): Promise<DB> {
    if (this._db) throw Error('Database mutex was already locked');
    await connectDB(TEST_DB_CONFIG);
    this._db = getDB();

    // Restrict access to all table for the duration of the test.

    this._lockRelease = await new Promise((resolve, reject) =>
      this._waitForLock(resolve, reject)
    );

    // Erase the contents of the tables. If the test user isn't the one
    // creating the tables, someone has to give the test user permission
    // to each table. (Notes: Truncation didn't work because it won't
    // truncate a table having foriegn key constraints.)

    const dropTablesSQL = fs
      .readFileSync(path.join(SETUP_SQL_DIR, 'drop_all_tables.sql'))
      .toString();
    const createTablesSQL = fs
      .readFileSync(path.join(SETUP_SQL_DIR, 'create_tables.sql'))
      .toString();
    await this._db.query(dropTablesSQL);
    await this._db.query(createTablesSQL);
    await _loadDefaultData(this._db, DataKey.Stygobites);
    await _loadDefaultData(this._db, DataKey.AquaticKarstTerms);
    await _loadDefaultData(this._db, DataKey.Troglobites);
    await _loadDefaultData(this._db, DataKey.TerrestrialKarstTerms);

    return this._db;
  }

  async unlock(): Promise<void> {
    if (this._lockRelease) {
      // cleanup happens even if lock can't be obtained
      this._lockRelease();
      this._lockRelease = null;
    }
    await disconnectDB();
    this._db = null;
  }

  private async _waitForLock(
    resolve: (value: any) => void,
    reject: (value: any) => void
  ) {
    const waitForLock = this._waitForLock.bind(this);
    try {
      resolve(await lockfile.lock(LOCKFILE));
    } catch (err: any) {
      if (err.code == 'ELOCKED') {
        setTimeout(() => waitForLock(resolve, reject), LOCK_RETRY_MILLIS);
      } else {
        reject(err);
      }
    }
  }
}

export function expectRecentTime(date: Date | null) {
  expect(date?.getTime()).toBeGreaterThan(new Date().getTime() - 500);
}

export async function sleep(millis: number) {
  return new Promise((resolve) => setTimeout(resolve, millis));
}

async function _loadDefaultData(db: DB, dataKey: DataKey): Promise<void> {
  const filePath = path.join(__dirname, `../../../setup/data_files/${dataKey}.txt`);

  const text = fs.readFileSync(filePath).toString();
  await KeyData.write(
    db,
    null,
    dataKey,
    keyDataInfoByKey[dataKey].readPermission,
    text
  );
}
