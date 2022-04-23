import type { DB } from '../integrations/postgres';
import { DatabaseMutex, expectRecentTime, sleep } from '../util/test_util';
import { User } from './user';
import { Permission } from '../../shared/user_auth';
import {
  SessionOptions,
  Session,
  checkExpirations,
  stopCheckingExpirations
} from './session';

const PASSWORD = 'woahwhatchadoingwiththatkeyboard';
const IP = '123.456.789.321';
const mutex = new DatabaseMutex();
const options: SessionOptions = {
  sessionTimeoutMillis: 5 * 60 * 1000, // 5 minutes
  expirationCheckMillis: 1 * 60 * 1000 // 1 minute
};

let db: DB;
let user1: User;
let user2: User;
let user3: User;

beforeAll(async () => {
  db = await mutex.lock();

  user1 = await User.create(
    db,
    'User1',
    'One',
    'user1@x.yz',
    null,
    PASSWORD,
    Permission.Coords,
    null
  );
  user2 = await User.create(
    db,
    'User2',
    'Two',
    'user2@x.yz',
    null,
    PASSWORD,
    Permission.Coords,
    null
  );
  user3 = await User.create(
    db,
    'User3',
    'Three',
    'user3@x.yz',
    null,
    PASSWORD,
    Permission.Coords,
    null
  );
});

test('creating, finding, and destroying sessions', async () => {
  await Session.init(db, options);

  // Create one session for user1.

  const session1a = await Session.create(db, user1.toUserInfo(), IP);
  expect(User.getPasswordStrength(session1a.sessionID)).toBeGreaterThan(20);
  expect(session1a.userID).toEqual(user1.userID);
  expectRecentTime(session1a.createdOn);
  expect(session1a.ipAddress).toEqual(IP);

  // Create another session for user1 and two for user2.

  const session1b = await Session.create(db, user1.toUserInfo(), IP);
  expect(User.getPasswordStrength(session1b.sessionID)).toBeGreaterThan(20);
  const session2a = await Session.create(db, user2.toUserInfo(), IP);
  expect(User.getPasswordStrength(session2a.sessionID)).toBeGreaterThan(20);
  const session2b = await Session.create(db, user2.toUserInfo(), IP);
  expect(User.getPasswordStrength(session2b.sessionID)).toBeGreaterThan(20);
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

  await Session.init(db, options);
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

  await Session.init(db, options);
  sessions = Session.getSessions();
  expect(sessions.length).toEqual(3);
  expect(sessions).toContainEqual(session1a);
  expect(sessions).toContainEqual(session2a);
  expect(sessions).toContainEqual(session2b);

  // Drop all sessions of a user.

  await Session.dropUser(db, user2.userID, null);
  sessions = Session.getSessions();
  expect(sessions.length).toEqual(1);
  expect(sessions).toContainEqual(session1a);

  await Session.init(db, options);
  sessions = Session.getSessions();
  expect(sessions.length).toEqual(1);
  expect(sessions).toContainEqual(session1a);

  // Drop all if a user's sessions but the indicated session.

  const session1x = await Session.create(db, user1.toUserInfo(), IP);
  const session1y = await Session.create(db, user1.toUserInfo(), IP);
  const session1z = await Session.create(db, user1.toUserInfo(), IP);
  const session2x = await Session.create(db, user2.toUserInfo(), IP);
  await Session.dropUser(db, user1.userID, session1y.sessionID);

  sessions = Session.getSessions();
  expect(sessions.length).toEqual(2);
  expect(sessions).not.toContainEqual(session1x);
  expect(sessions).toContainEqual(session1y);
  expect(sessions).not.toContainEqual(session1z);
  expect(sessions).toContainEqual(session2x);

  await Session.init(db, options);
  sessions = Session.getSessions();
  expect(sessions.length).toEqual(2);
  expect(sessions).not.toContainEqual(session1x);
  expect(sessions).toContainEqual(session1y);
  expect(sessions).not.toContainEqual(session1z);
  expect(sessions).toContainEqual(session2x);
});

test("updating user info refreshes the users's sessions", async () => {
  await Session.init(db, options);

  const session1a = await Session.create(db, user1.toUserInfo(), IP);
  const session2a = await Session.create(db, user2.toUserInfo(), IP);
  const session2b = await Session.create(db, user2.toUserInfo(), IP);

  let readSession = Session.getByID(session2a.sessionID);
  expect(readSession?.userInfo.firstName).toEqual('User2');

  user2.firstName = 'Renamed';
  await user2.save(db);
  Session.refreshUserInfo(user2);

  readSession = Session.getByID(session1a.sessionID);
  expect(readSession?.userInfo.firstName).toEqual('User1');
  readSession = Session.getByID(session2a.sessionID);
  expect(readSession?.userInfo.firstName).toEqual('Renamed');
  readSession = Session.getByID(session2b.sessionID);
  expect(readSession?.userInfo.firstName).toEqual('Renamed');

  await Session.init(db, options);
  readSession = Session.getByID(session1a.sessionID);
  expect(readSession?.userInfo.firstName).toEqual('User1');
  readSession = Session.getByID(session2a.sessionID);
  expect(readSession?.userInfo.firstName).toEqual('Renamed');
  readSession = Session.getByID(session2b.sessionID);
  expect(readSession?.userInfo.firstName).toEqual('Renamed');
});

test('session timeouts out if not refreshed', async () => {
  await Session.init(db, options);

  checkExpirations(db, 500);
  const session = await Session.create(db, user3.toUserInfo(), IP);
  expect(Session.getSessions()).toContain(session);

  await setExpiration(session, 400);
  // sleep longer than both timeout duration and expiration check period
  await sleep(600);
  expect(Session.getSessions().map((s) => s.sessionID)).not.toContain(
    session.sessionID
  );
  expect(Session.getByID(session.sessionID)).toBeNull();

  await Session.init(db, options);
  expect(Session.getSessions().map((s) => s.sessionID)).not.toContain(
    session.sessionID
  );
  expect(Session.getByID(session.sessionID)).toBeNull();
});

test('session refreshes prevent timeout/logout', async () => {
  await Session.init(db, options);

  checkExpirations(db, 500);
  const session = await Session.create(db, user3.toUserInfo(), IP);
  await setExpiration(session, 300);
  await sleep(200);
  await setExpiration(session, 300);
  await sleep(200);
  await setExpiration(session, 300);
  await sleep(200);

  // total sleep now longer than expiration check period
  expect(Session.getSessions().map((s) => s.sessionID)).toContain(session.sessionID);
  expect(Session.getByID(session.sessionID)).not.toBeNull();

  await Session.init(db, options);
  expect(Session.getSessions().map((s) => s.sessionID)).toContain(session.sessionID);
  expect(Session.getByID(session.sessionID)).not.toBeNull();
});

afterAll(async () => {
  stopCheckingExpirations();
  await mutex.unlock();
});

async function setExpiration(session: Session, millis: number) {
  Session.setTimeoutMillis(millis);
  Session.refreshSession(db, session.sessionID);
}
