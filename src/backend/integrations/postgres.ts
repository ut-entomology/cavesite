/**
 * Manages a connection to a PostgreSQL database, providing the connection
 * wrapped within a handle that exposes convenience methods.
 */

import { type ClientConfig, Client } from 'pg';
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

  private _client: Client;

  constructor(client: Client) {
    this._client = client;
  }

  /**
   * Executes a postgres query remapping errors to PostgresError.
   */
  async query(sql: string, params?: (string | number | null)[]) {
    try {
      return await this._client.query(sql, params);
    } catch (err: any) {
      throw new PostgresError(err, sql);
    }
  }
}
let client: Client | null = null;

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
  if (client) throw Error('Prior database connection was not closed');
  client = new Client(config);
  await client.connect();
}

/**
 * Indicates whether a database connection is active.
 */
export function connectedToDB(): boolean {
  return !!client;
}

/**
 * Disconnects from the database, if connected.
 */
export async function disconnectDB(): Promise<void> {
  if (client) {
    await client.end();
    client = null;
  }
}

/**
 * Returns a handle to the active database.
 */
export function getDB(): DB {
  if (!client) throw Error('Not connected to the database');
  return new DatabaseHandle(client);
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
 * Returns the given date in the local timezone.
 */
export function toLocalDate(date: Date): Date {
  return new Date(date.getTime() + date.getTimezoneOffset() * 60000);
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
