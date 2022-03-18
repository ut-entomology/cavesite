import type { ClientConfig } from 'pg';
import { Client } from 'pg';

/**
 * Class representing the database client, hiding whether the client uses
 * postgres Client or Pool and providing conveniences.
 */

export class DB {
  private _client: Client;

  constructor(config: ClientConfig) {
    this._client = new Client(config);
  }

  /**
   * Opens a connection to the database.
   */
  async open() {
    await this._client.connect();
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

  /**
   * Closes the connection to the database.
   */
  async close() {
    await this._client.end();
  }
}

/**
 * Class representing a postgres error in the error message.
 */

export class PostgresError extends Error {
  constructor(err: any, sql: string) {
    super(
      `Code ${err.code}${
        err.position === undefined ? '' : ' (@' + err.position + ')'
      }: ${err.message} [${sql}]`
    );
  }
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
          .map((word) =>
            word == 'id' ? 'ID' : word[0].toUpperCase() + word.substring(1)
          )
          .join('');
      snakeToCamelMap[snakeColumn] = camelColumn;
    }
    camelRow[camelColumn] = columnValue;
  }
  return camelRow as T;
}
const snakeToCamelMap: Record<string, string> = {};
