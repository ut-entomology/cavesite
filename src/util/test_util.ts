import * as fs from 'fs';
import * as path from 'path';
import { DB } from './pg_util';

const TEST_DB_CONFIG = {
  user: 'test_user',
  host: 'localhost',
  database: 'test_caves',
  password: 'test_pass',
  port: 5432
};

const SETUP_SQL_DIR = path.join(__dirname, '../../setup');

export async function initTestDatabase(): Promise<DB> {
  const db = new DB(TEST_DB_CONFIG);
  await db.open();
  const dropTablesSQL = fs
    .readFileSync(path.join(SETUP_SQL_DIR, 'drop_tables.sql'))
    .toString();
  const createTablesSQL = fs
    .readFileSync(path.join(SETUP_SQL_DIR, 'create_tables.sql'))
    .toString();
  try {
    await db.query(dropTablesSQL);
  } catch (err: any) {
    if (!err.message.includes('not exist')) {
      throw err;
    }
  }
  await db.query(createTablesSQL);
  return db;
}
