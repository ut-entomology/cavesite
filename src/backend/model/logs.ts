/**
 * Class representing a table of log entries, where the server can
 * log a variety of events that may be important to the admin.
 */

import type { DB } from '../integrations/postgres';

export const MAX_LOG_LENGTH = 2048; // VARCHAR (2048)

export enum LogType {
  User = 'user',
  Import = 'import',
  Server = 'server'
}

export interface Log {
  // identical to column names; no snakecase or camelcase
  id: number;
  timestamp: Date;
  type: LogType;
  tag: string | null;
  line: string;
}

export class Logs {
  static async post(
    db: DB,
    type: LogType,
    tag: string | null,
    line: string
  ): Promise<number> {
    if (line.length > MAX_LOG_LENGTH) {
      line = line.substring(0, MAX_LOG_LENGTH - 3) + '...';
    }
    const result = await db.query(
      `insert into logs(type, tag, line) values ($1, $2, $3) returning id`,
      [type, tag, line]
    );
    return result.rows[0].id;
  }

  static async getBeforeID(db: DB, beforeID: number, maxLogs: number): Promise<Log[]> {
    const result = await db.query(
      `select * from logs where id < $1
        order by id desc limit $2`,
      [beforeID, maxLogs]
    );
    return result.rows.reverse();
  }

  static async getBeforeTime(
    db: DB,
    beforeTime: Date,
    maxLogs: number
  ): Promise<Log[]> {
    const result = await db.query(
      `select * from logs where timestamp < $1
        order by timestamp desc limit $2`,
      [beforeTime.toISOString(), maxLogs]
    );
    return result.rows.reverse();
  }

  static async clear(db: DB, beforeTime: Date): Promise<void> {
    await db.query(`delete from logs where timestamp <= $1`, [
      beforeTime.toISOString()
    ]);
  }
}
