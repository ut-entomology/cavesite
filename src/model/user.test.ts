import { test, expect, beforeAll, afterAll } from 'vitest';

import type { DB } from '../util/pg_util';
import { DatabaseMutex } from '../util/test_util';
import { User, Privilege } from './user';

//const WEAK_PASSWORD = 'passwordpasswordpassword';
const STRONG_PASSWORD = '8afj a aw3rajfla fdj8323214';
const WRONG_PASSWORD = 'foo';

const mutex = new DatabaseMutex();
let db: DB;

beforeAll(async () => {
  db = await mutex.lock();
});

test('creating a user', async () => {
  const user = await User.create(
    db,
    ' Super Curator ',
    ' Curator@Place.com ',
    STRONG_PASSWORD,
    Privilege.Admin
  );
  await verifyUser(
    user,
    'Super Curator',
    'curator@place.com',
    STRONG_PASSWORD,
    Privilege.Admin | Privilege.Edit | Privilege.Coords,
    false
  );
});

afterAll(async () => {
  await mutex.unlock();
});

async function verifyUser(
  user: User,
  name: string,
  email: string,
  password: string,
  privileges: number,
  loggedIn: boolean
) {
  const now = new Date().getTime();
  expect(user.userID).toBeGreaterThan(0);
  expect(user.name).toEqual(name);
  expect(user.email).toEqual(email);
  expect(await user.verifyPassword(password)).toEqual(true);
  expect(await user.verifyPassword(WRONG_PASSWORD)).toEqual(false);
  expect(user.privileges).toEqual(privileges);
  expect(user.createdOn.getTime()).toBeGreaterThan(now - 500);
  if (loggedIn) {
    expect(user.lastLogin!.getTime()).toBeGreaterThan(now - 500);
  } else {
    expect(user.lastLogin).toBeNull();
  }
}
