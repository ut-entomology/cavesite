import type { DB } from '../integrations/postgres';
import { DatabaseMutex } from '../util/unit_test_util';
import { LogType, LogLevel, type Log } from '../../shared/model';
import { MILLIS_PER_DAY } from '../../shared/date_tools';
import { Logs, MAX_LOG_LENGTH } from './logs';

const mutex = new DatabaseMutex();
let db: DB;

beforeAll(async () => {
  db = await mutex.lock();
});

test('creating, reading, and clearing logs', async () => {
  // Post the logs we'll be testing.

  const expectedLogs: Log[] = [];
  for (let i = 1; i <= 20; ++i) {
    const type = i % 2 ? LogType.UserLogin : LogType.ImportRecord;
    const tag = i % 2 ? 'Fred' : 'TMM12345';
    expectedLogs.push({
      id: 1,
      timestamp: new Date(), // ignored
      type,
      level: LogLevel.Normal,
      tag,
      line: `log line ${i}`
    });
  }
  for (const log of expectedLogs) {
    await Logs.postNormal(db, log.type, log.tag, log.line);
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  // Verify that we can get the most recent 10 logs.

  let logs = await Logs.getBeforeTime(db, getNowDate(), 10);
  verifyLogs(logs, expectedLogs, 10);

  // Verify that we can get the prior 10 logs.

  const log11 = logs[0];
  logs = await Logs.getBeforeID(db, log11.id, 10);
  verifyLogs(logs, expectedLogs, 0);

  // Verify that no logs clear when clearing through prior day.

  await Logs.clear(db, new Date(log11.timestamp.getTime() - MILLIS_PER_DAY));
  logs = await Logs.getBeforeTime(db, getNowDate(), 100);
  expect(logs.length).toEqual(20);
  verifyLogs(logs, expectedLogs, 0);

  // Verify that we can clear all logs.

  await Logs.clear(db, getNowDate());
  logs = await Logs.getBeforeTime(db, getNowDate(), 100);
  expect(logs.length).toEqual(0);

  // Verify that log lines get truncated to maximum length.

  const longLine = 'x'.repeat(MAX_LOG_LENGTH + 1);
  await Logs.postNormal(db, LogType.ServerNote, null, longLine);
  logs = await Logs.getBeforeID(db, 22, 0);
  verifyLogs(
    logs,
    [
      {
        id: 21,
        timestamp: new Date(), // ignored
        type: LogType.ServerNote,
        level: LogLevel.Normal,
        tag: null,
        line: 'x'.repeat(MAX_LOG_LENGTH - 3) + '...'
      }
    ],
    10
  );
});

afterAll(async () => {
  await mutex.unlock();
});

function verifyLogs(
  actualLogs: Log[],
  expectedLogs: Log[],
  firstExpectedIndex: number
) {
  let priorTime = 0;
  for (let i = 0; i < actualLogs.length; ++i) {
    const actualLog = actualLogs[i];
    const expectedLog = expectedLogs[i + firstExpectedIndex];
    expect(actualLog.type).toEqual(expectedLog.type);
    expect(actualLog.tag).toEqual(expectedLog.tag);
    expect(actualLog.line).toEqual(expectedLog.line);
    expect(actualLog.timestamp.getTime()).toBeGreaterThan(priorTime);
    priorTime = actualLog.timestamp.getTime();
  }
}

function getNowDate() {
  return new Date(new Date().getTime() + 100);
}
