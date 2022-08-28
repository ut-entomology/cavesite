/**
 * Class representing a table of log entries, where the server can
 * log a variety of events that may be important to the admin.
 */

import { DB, toCamelRow } from '../integrations/postgres';
import { LogType, LogLevel, type Log } from '../../shared/model';
import { toZonelessDateString } from '../../shared/date_tools';

export const MAX_LOG_LENGTH = 2048; // VARCHAR (2048)

export class Logs {
  static async postNormal(
    db: DB,
    type: LogType,
    tag: string | null,
    line: string
  ): Promise<number> {
    return await Logs._post(db, type, LogLevel.Normal, tag, line);
  }

  static async postWarning(
    db: DB,
    type: LogType,
    tag: string | null,
    line: string
  ): Promise<number> {
    return await Logs._post(db, type, LogLevel.Warning, tag, line);
  }

  static async postError(
    db: DB,
    type: LogType,
    tag: string | null,
    line: string
  ): Promise<number> {
    return await Logs._post(db, type, LogLevel.Error, tag, line);
  }

  static async _post(
    db: DB,
    type: LogType,
    level: LogLevel,
    tag: string | null,
    line: string
  ): Promise<number> {
    if (line.length > MAX_LOG_LENGTH) {
      line = line.substring(0, MAX_LOG_LENGTH - 3) + '...';
    }
    const result = await db.query(
      `insert into logs(type, level, tag, line) values ($1, $2, $3, $4) returning id`,
      // @ts-ignore incorrect type def
      [type, level, tag, line]
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

  static async getLogs(db: DB, skip: number, limit: number): Promise<Log[]> {
    const result = await db.query(
      `select * from logs order by timestamp offset $1 limit $2`,
      [skip, limit]
    );
    return result.rows.map((row) => toCamelRow(row));
  }

  static async getTotalLogs(db: DB): Promise<number> {
    const result = await db.query(`select count(*) from logs`);
    return parseInt(result.rows[0].count);
  }

  static async clear(db: DB, throughDate: Date): Promise<void> {
    await db.query(`delete from logs where timestamp::date <= $1::date`, [
      toZonelessDateString(throughDate)
    ]);
  }
}
