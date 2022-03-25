import * as fs from 'fs';
import * as path from 'path';
import * as lockfile from 'proper-lockfile';

import { DB } from './pg_util';

const LOCK_RETRY_MILLIS = 100;
const LOCKFILE = path.join(__dirname, '../../db-test-mutex');
const SETUP_SQL_DIR = path.join(__dirname, '../../setup');

const TEST_DB_CONFIG = {
  user: 'test_user',
  host: 'localhost',
  database: 'test_caves',
  password: 'test_pass',
  port: 5432
};

export class DatabaseMutex {
  private _db: DB;
  private _lockRelease: Awaited<ReturnType<typeof lockfile.lock>> | null = null;

  constructor() {
    this._db = new DB(TEST_DB_CONFIG);
  }

  async lock(): Promise<DB> {
    await this._db.open();

    // Restrict access to all table for the duration of the test.

    this._lockRelease = await new Promise((resolve, reject) =>
      this._waitForLock(resolve, reject)
    );

    // Erase the contents of the tables. If the test user isn't the one
    // creating the tables, someone has to give the test user permission
    // to each table. (Notes: Truncation didn't work because it won't
    // truncate a table having foriegn key constraints.)

    const dropTablesSQL = fs
      .readFileSync(path.join(SETUP_SQL_DIR, 'drop_tables.sql'))
      .toString();
    const createTablesSQL = fs
      .readFileSync(path.join(SETUP_SQL_DIR, 'create_tables.sql'))
      .toString();
    try {
      await this._db.query(dropTablesSQL);
    } catch (err: any) {
      if (!err.message.includes('not exist')) throw err;
    }
    await this._db.query(createTablesSQL);

    return this._db;
  }

  async unlock(): Promise<void> {
    if (this._lockRelease) {
      // cleanup happens even if lock can't be obtained
      this._lockRelease();
      this._lockRelease = null;
    }
    await this._db.close();
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
