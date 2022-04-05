import { test, expect, beforeAll, afterAll } from 'vitest';

import type { DB } from '../integrations/postgres';
import { DatabaseMutex, expectRecentTime, sleep } from '../util/test_util';
import { User } from './user';
import { Permission } from '../shared/user_info';
import { UserError } from '../shared/validation';
import {
  Session,
  checkExpirations,
  stopCheckingExpirations,
  MAX_SESSIONS_PER_USER
} from './session';

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

  const session1a = await Session.create(user1, IP);
  expect(User.getPasswordStrength(session1a.sessionID)).toBeGreaterThan(15);
  expect(session1a.user.userID).toEqual(user1.userID);
  expectRecentTime(session1a.createdAt);
  expect(session1a.ipAddress).toEqual(IP);
  expect(User.getPasswordStrength(session1a.csrfToken)).toBeGreaterThan(10);

  // Create another session for user1 and two for user2.

  const session1b = await Session.create(user1, IP);
  const session2a = await Session.create(user2, IP);
  const session2b = await Session.create(user2, IP);
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

  // Drop a single session.

  Session.dropID(session1b.sessionID);
  sessions = Session.getSessions();
  expect(sessions.length).toEqual(3);
  expect(sessions).toContain(session1a);
  expect(sessions).toContain(session2a);
  expect(sessions).toContain(session2b);

  // Drop all sessions of a user.

  Session.dropUser(user2.userID);
  sessions = Session.getSessions();
  expect(sessions.length).toEqual(1);
  expect(sessions).toContain(session1a);

  // Reset a session.

  await Session.create(user1, IP);
  const session1c = await Session.create(user1, IP);
  await Session.create(user1, IP);
  const session2c = await Session.create(user2, IP);
  const session2d = await Session.create(user2, IP);
  session1c.reset();
  sessions = Session.getSessions();
  expect(sessions.length).toEqual(3);
  expect(sessions).toContain(session1c);
  expect(sessions).toContain(session2c);
  expect(sessions).toContain(session2d);
});

test('exceeding max sessions per user', async () => {
  Session.dropUser(user1.userID);

  for (let i = 0; i < MAX_SESSIONS_PER_USER; ++i) {
    await Session.create(user1, IP);
  }
  await expect(() => Session.create(user1, IP)).rejects.toThrow(
    new UserError(`Exceeded max ${MAX_SESSIONS_PER_USER} open sessions per user`)
  );

  Session.dropUser(user1.userID);
});

test('session timeouts out if not refreshed', async () => {
  checkExpirations(500);
  const session = await Session.create(user3, IP);
  expect(Session.getSessions()).toContain(session);
  session.refresh(400);
  // sleep longer than both timeout duration and expiration check period
  await sleep(600);
  expect(Session.getSessions().map((s) => s.sessionID)).not.toContain(
    session.sessionID
  );
});

test('session refreshes prevent timeout', async () => {
  checkExpirations(500);
  const session = await Session.create(user3, IP);
  session.refresh(300);
  await sleep(200);
  session.refresh(300);
  await sleep(200);
  session.refresh(300);
  await sleep(200);
  // total sleep now longer than expiration check period
  expect(Session.getSessions().map((s) => s.sessionID)).toContain(session.sessionID);
});

afterAll(async () => {
  stopCheckingExpirations();
  await mutex.unlock();
});
