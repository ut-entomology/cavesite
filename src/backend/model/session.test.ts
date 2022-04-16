import type { DB } from '../integrations/postgres';
import { DatabaseMutex, expectRecentTime, sleep } from '../util/test_util';
import { User } from './user';
import { Permission } from '../../shared/user_auth';
import { Session, checkExpirations, stopCheckingExpirations } from './session';

const PASSWORD = 'woahwhatchadoingwiththatkeyboard';
const IP = '123.456.789.321';
const mutex = new DatabaseMutex();
let db: DB;
let user1: User;
let user2: User;
let user3: User;

beforeAll(async () => {
  db = await mutex.lock();

  user1 = await User.create(
    db,
    'User',
    'One',
    'user1@x.yz',
    null,
    PASSWORD,
    Permission.Coords,
    null
  );
  user2 = await User.create(
    db,
    'User',
    'Two',
    'user2@x.yz',
    null,
    PASSWORD,
    Permission.Coords,
    null
  );
  user3 = await User.create(
    db,
    'User',
    'Three',
    'user3@x.yz',
    null,
    PASSWORD,
    Permission.Coords,
    null
  );
});

test('creating, finding, and destroying sessions', async () => {
  // Create one session for user1.

  const session1a = await Session.upsert(db, '1A', user1, IP, 'data1A');
  expect(session1a.userInfo.userID).toEqual(user1.userID);
  expectRecentTime(session1a.createdOn);
  expect(session1a.ipAddress).toEqual(IP);

  // Create another session for user1 and two for user2.

  const session1b = await Session.upsert(db, '1B', user1, IP, 'data1B');
  const session2a = await Session.upsert(db, '2A', user2, IP, 'data2A');
  const session2b = await Session.upsert(db, '2B', user2, IP, 'data2B');
  expect(session2a.sessionID).not.toEqual(session2b.sessionID);

  // Verify presence of all sessions.

  let sessions = Session.getSessions();
  expect(sessions.length).toEqual(4);
  expect(sessions).toContain(session1a);
  expect(sessions).toContain(session1b);
  expect(sessions).toContain(session2a);
  expect(sessions).toContain(session2b);

  // Verify retrieving sessions by ID.

  expect(Session.getByID(session1a.sessionID)).toBe(session1a);
  expect(Session.getByID(session1b.sessionID)).toBe(session1b);
  expect(Session.getByID(session2a.sessionID)).toBe(session2a);
  expect(Session.getByID(session2b.sessionID)).toBe(session2b);

  await Session.init(db);
  expect(Session.getByID(session1a.sessionID)).toEqual(session1a);
  expect(Session.getByID(session1b.sessionID)).toEqual(session1b);
  expect(Session.getByID(session2a.sessionID)).toEqual(session2a);
  expect(Session.getByID(session2b.sessionID)).toEqual(session2b);

  // Drop a single session.

  await Session.dropID(db, session1b.sessionID);
  sessions = Session.getSessions();
  expect(sessions.length).toEqual(3);
  expect(sessions).toContainEqual(session1a);
  expect(sessions).toContainEqual(session2a);
  expect(sessions).toContainEqual(session2b);

  await Session.init(db);
  sessions = Session.getSessions();
  expect(sessions.length).toEqual(3);
  expect(sessions).toContainEqual(session1a);
  expect(sessions).toContainEqual(session2a);
  expect(sessions).toContainEqual(session2b);

  // Drop all sessions of a user.

  await Session.dropUser(db, user2.userID);
  sessions = Session.getSessions();
  expect(sessions.length).toEqual(1);
  expect(sessions).toContainEqual(session1a);

  await Session.init(db);
  sessions = Session.getSessions();
  expect(sessions.length).toEqual(1);
  expect(sessions).toContainEqual(session1a);
});

test('session timeouts out if not refreshed', async () => {
  await Session.init(db);

  checkExpirations(db, 500);
  const session = await Session.upsert(db, 'Y3', user3, IP, 'dataY3');
  expect(Session.getSessions()).toContain(session);

  setExpiration(session, 400);
  // sleep longer than both timeout duration and expiration check period
  await sleep(600);
  expect(Session.getSessions().map((s) => s.sessionID)).not.toContain(
    session.sessionID
  );
  expect(Session.getByID(session.sessionID)).toBeNull();

  await Session.init(db);
  expect(Session.getSessions().map((s) => s.sessionID)).not.toContain(
    session.sessionID
  );
  expect(Session.getByID(session.sessionID)).toBeNull();
});

test('session refreshes prevent timeout/logout', async () => {
  await Session.init(db);

  checkExpirations(db, 500);
  const session = await Session.upsert(db, 'Z3', user3, IP, 'dataZ3');
  setExpiration(session, 300);
  await sleep(200);
  setExpiration(session, 300);
  await sleep(200);
  setExpiration(session, 300);
  await sleep(200);

  // total sleep now longer than expiration check period
  expect(Session.getSessions().map((s) => s.sessionID)).toContain(session.sessionID);
  expect(Session.getByID(session.sessionID)).not.toBeNull();

  await Session.init(db);
  expect(Session.getSessions().map((s) => s.sessionID)).toContain(session.sessionID);
  expect(Session.getByID(session.sessionID)).not.toBeNull();
});

afterAll(async () => {
  stopCheckingExpirations();
  await mutex.unlock();
});

function setExpiration(session: Session, millis: number) {
  Session.setTimeoutMillis(millis);
  Session.upsert(
    db,
    session.sessionID,
    session.userInfo,
    session.ipAddress,
    session.expressData
  );
}
