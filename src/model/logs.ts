/**
 * Class representing a table of log entries.
 */

import type { DB } from '../util/pg_util';

export enum LogType {
  User = 'user',
  Import = 'import'
}

export interface Log {
  // identical to column names; no snakecase or camelcase
  id: number;
  timestamp: Date;
  type: LogType;
  tag: string;
  line: string;
}

export class Logs {
  static async post(db: DB, type: LogType, tag: string, line: string): Promise<number> {
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
