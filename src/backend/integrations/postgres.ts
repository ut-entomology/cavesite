/**
 * Manages a connection to a PostgreSQL database, providing the connection
 * wrapped within a handle that exposes convenience methods.
 */

import { type ClientConfig, Pool } from 'pg';
import pgFormat from 'pg-format';

//// TYPES AND CLASSES ///////////////////////////////////////////////////////

/**
 * Type for a PostgresQL database handle.
 */
export type DB = DatabaseHandle;

/**
 * Class providing a handle to a database, with convenience methods.
 */
class DatabaseHandle {
  // Not exported, in order to limit instance creation to this module.

  private _pool: Pool;

  constructor(pool: Pool) {
    this._pool = pool;
  }

  /**
   * Executes a postgres query remapping errors to PostgresError.
   */
  async query(sql: string, params?: (string | number | null)[]) {
    try {
      return await this._pool.query(sql, params);
    } catch (err: any) {
      throw new PostgresError(err, sql);
    }
  }
}
let pool: Pool | null = null;

/**
 * Class representing a postgres error in the error message.
 */
export class PostgresError extends Error {
  code: string;

  constructor(err: any, sql: string) {
    super(
      `Code ${err.code}${
        err.position === undefined ? '' : ' (at ' + err.position + ')'
      }: ${err.message} [${sql}]`
    );
    this.code = err.code;
  }
}

//// EXPORTED FUNCTIONS //////////////////////////////////////////////////////

/**
 * Connect to the database using the provided configuration, returning
 * a handle to the database and making that handle available via getDB().
 */
export async function connectDB(config: ClientConfig): Promise<void> {
  if (pool) throw Error('Prior database connection was not closed');
  pool = new Pool(config);
}

/**
 * Indicates whether a database connection is active.
 */
export function connectedToDB(): boolean {
  return !!pool;
}

/**
 * Disconnects from the database, if connected.
 */
export async function disconnectDB(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Returns a handle to the active database.
 */
export function getDB(): DB {
  if (!pool) throw Error('Not connected to the database');
  return new DatabaseHandle(pool);
}

/**
 * Converts a query result row from snakecase column names to camelcase.
 */
export function toCamelRow<T>(snakeRow: Record<string, any>): T {
  const camelRow: Record<string, any> = {};
  for (const [snakeColumn, columnValue] of Object.entries(snakeRow)) {
    let camelColumn = snakeToCamelMap[snakeColumn];
    if (camelColumn === undefined) {
      const words = snakeColumn.split('_');
      camelColumn =
        words[0] +
        words
          .slice(1)
          .map((word) => {
            if (word == 'id') return 'ID';
            if (word == 'ids') return 'IDs';
            if (word == 'ip') return 'IP';
            return word[0].toUpperCase() + word.substring(1);
          })
          .join('');
      snakeToCamelMap[snakeColumn] = camelColumn;
    }
    camelRow[camelColumn] = columnValue;
  }
  return camelRow as T;
}
const snakeToCamelMap: Record<string, string> = {};

/**
 * Converts a date into the format Postgres expects.
 */
export function toPostgresDate(date: Date): string {
  // from https://stackoverflow.com/a/57712188
  const parts = date.toISOString().split('T')[0].split('-');
  return `'${parts[1]}-${parts[2]}-${parts[0]}'`;
}

/**
 * Returns conjunction of 'where' conditions with possible null values.
 */
export function wherePossiblyNull(nameValueMap: Record<string, any>): string {
  const conditions: string[] = [];
  for (const name of Object.keys(nameValueMap)) {
    const value = nameValueMap[name];
    if (value === null) {
      conditions.push(name + ' is null');
    } else {
      conditions.push(pgFormat('%I=%L', name, value));
    }
  }
  return conditions.join(' and ');
}
