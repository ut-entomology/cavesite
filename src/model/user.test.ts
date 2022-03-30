import { test, expect, beforeAll, afterAll } from 'vitest';

import type { DB } from '../util/pg_util';
import { DatabaseMutex } from '../util/test_util';
import { User, Privilege, UserError } from './user';
import { MIN_PASSWORD_STRENGTH } from '../shared/constants';

const STRONG_PASSWORD1 = '8afj a aw3rajfla fdj8323214';
const STRONG_PASSWORD2 = 'woahwhatchadoingwiththatkeyboard';
const WEAK_PASSWORD = 'passwordpasswordpassword';
const WRONG_PASSWORD = 'foochoohoo838alfaljfZZDqy';

const mutex = new DatabaseMutex();
let db: DB;

beforeAll(async () => {
  db = await mutex.lock();
});

test('password strength', () => {
  expect(User.getPasswordStrength(STRONG_PASSWORD1)).toBeGreaterThan(
    MIN_PASSWORD_STRENGTH
  );
  expect(User.getPasswordStrength(WEAK_PASSWORD)).toBeLessThan(MIN_PASSWORD_STRENGTH);
  expect(User.getPasswordStrength(WRONG_PASSWORD)).toBeGreaterThan(
    MIN_PASSWORD_STRENGTH
  );
});

test('non-existant users', async () => {
  const users = await User.getUsers(db);
  expect(users).toEqual([]);

  let user = await User.authenticate(db, 'no@one.there', STRONG_PASSWORD1);
  expect(user).toBeNull();

  user = await User.getByEmail(db, 'no@one.there');
  expect(user).toBeNull();

  await expect(() => User.dropByEmail(db, 'no@one.there')).rejects.toThrow(
    new UserError('User not found')
  );
});

test('creating, using, and dropping a user', async () => {
  const email = 'curator@place.com';

  // Create a user.

  const createdUser = await User.create(
    db,
    ' Super Curator ',
    ' Curator@Place.com ',
    STRONG_PASSWORD1,
    Privilege.Admin
  );
  await verifyUser(
    createdUser,
    'Super Curator',
    email,
    STRONG_PASSWORD1,
    Privilege.Admin | Privilege.Edit | Privilege.Coords
  );
  expect(createdUser.lastLogin).toBeNull();

  // Failed authentication.

  let readUser = await User.authenticate(db, email, WRONG_PASSWORD);
  expect(readUser).toBeNull();
  readUser = await User.getByEmail(db, email);
  expect(readUser?.userID).toEqual(createdUser.userID);
  expect(readUser?.lastLogin).toBeNull();

  // Successful authentication.

  readUser = await User.authenticate(db, email, STRONG_PASSWORD1);
  expect(readUser?.userID).toEqual(createdUser.userID);
  expectRecentDate(readUser!.lastLogin);

  // Change the user's password.

  await readUser!.setPassword(STRONG_PASSWORD2);
  await readUser!.save(db);
  readUser = await User.authenticate(db, email, STRONG_PASSWORD1);
  expect(readUser).toBeNull();
  readUser = await User.authenticate(db, email, STRONG_PASSWORD2);
  expect(readUser?.userID).toEqual(createdUser.userID);

  // Modify the user profile.

  readUser!.name = 'Demoted Curator';
  readUser!.email = 'bad-curator@place.com';
  readUser!.privileges = 0;
  await readUser!.save(db);
  readUser = await User.getByEmail(db, email);
  expect(readUser).toBeNull();
  readUser = await User.getByEmail(db, 'bad-curator@place.com');
  expect(readUser?.userID).toEqual(createdUser.userID);
  await verifyUser(
    readUser!,
    'Demoted Curator',
    'bad-curator@place.com',
    STRONG_PASSWORD2,
    0
  );

  // Add a second user with edit privileges

  const secondUser = await User.create(
    db,
    'Fred Editor',
    'fred@foo.foo.com',
    STRONG_PASSWORD1,
    Privilege.Edit
  );
  await verifyUser(
    secondUser,
    'Fred Editor',
    'fred@foo.foo.com',
    STRONG_PASSWORD1,
    Privilege.Edit | Privilege.Coords
  );

  // Add a third user with only coordinate privileges.

  const thirdUser = await User.create(
    db,
    'Carry Coords',
    'carry@xyz.co',
    STRONG_PASSWORD1,
    Privilege.Coords
  );
  await verifyUser(
    thirdUser,
    'Carry Coords',
    'carry@xyz.co',
    STRONG_PASSWORD1,
    Privilege.Coords
  );

  // Add a fourth user with no privileges.

  const fourthUser = await User.create(
    db,
    'No Body',
    'no.body@no.where',
    STRONG_PASSWORD1,
    0
  );
  await verifyUser(fourthUser, 'No Body', 'no.body@no.where', STRONG_PASSWORD1, 0);

  // Retrieve all users.

  const users = await User.getUsers(db);
  const usersByID: Record<number, User> = {};
  users.forEach((user) => (usersByID[user.userID] = user));
  expect(usersByID[createdUser.userID].name).toEqual('Demoted Curator');
  expect(usersByID[secondUser.userID].name).toEqual('Fred Editor');
  expect(usersByID[thirdUser.userID].name).toEqual('Carry Coords');
  expect(usersByID[fourthUser.userID].name).toEqual('No Body');

  // Drop a user.

  readUser = await User.getByEmail(db, 'no.body@no.where');
  expect(readUser).not.toBeNull();
  await User.dropByEmail(db, fourthUser.email);
  readUser = await User.getByEmail(db, 'no.body@no.where');
  expect(readUser).toBeNull();
});

test('invalid user profile', async () => {
  const badEmails = ['foo @bar.com', 'foo bar@baz.com', 'foo@bar..baz', 'foo@baz'];
  await expect(() =>
    User.create(db, '', 'dog.person@persons.org', STRONG_PASSWORD1, 0)
  ).rejects.toThrow(new UserError('No user name given'));

  for (const badEmail of badEmails) {
    await expect(() =>
      User.create(db, 'Good Name', badEmail, STRONG_PASSWORD1, 0)
    ).rejects.toThrow(new UserError('Invalid email address'));
  }

  await User.create(
    db,
    'Existing Name',
    'existing.email@people.edu',
    STRONG_PASSWORD1,
    Privilege.Edit
  );
  await expect(() =>
    User.create(db, 'Existing Name', 'new-email@persons.org', STRONG_PASSWORD1, 0)
  ).rejects.toThrow(new UserError('A user already exists with that name'));
  await expect(() =>
    User.create(db, 'New Name', 'existing.email@people.edu', STRONG_PASSWORD1, 0)
  ).rejects.toThrow(new UserError('A user already exists for that email'));
});

test('unacceptable password', async () => {
  await expect(() =>
    User.create(db, 'Person', 'x@y.zz', ` ${STRONG_PASSWORD1} `, Privilege.Coords)
  ).rejects.toThrow(new UserError(`Password can't begin or end with spaces`));

  await expect(() =>
    User.create(db, 'Person', 'x@y.zz', WEAK_PASSWORD, Privilege.Coords)
  ).rejects.toThrow(new UserError('Password not strong enough'));

  const user = await User.create(
    db,
    'Person',
    'x@y.zz',
    STRONG_PASSWORD1,
    Privilege.Admin
  );

  await expect(() => user.setPassword(` ${STRONG_PASSWORD2} `)).rejects.toThrow(
    new UserError(`Password can't begin or end with spaces`)
  );

  await expect(() => user.setPassword(WEAK_PASSWORD)).rejects.toThrow(
    new UserError('Password not strong enough')
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
  privileges: number
) {
  expect(user.userID).toBeGreaterThan(0);
  expect(user.name).toEqual(name);
  expect(user.email).toEqual(email);
  expect(await user.verifyPassword(password)).toEqual(true);
  expect(await user.verifyPassword(WRONG_PASSWORD)).toEqual(false);
  expect(user.privileges).toEqual(privileges);
  expectRecentDate(user.createdOn);
}

function expectRecentDate(date: Date | null) {
  expect(date?.getTime()).toBeGreaterThan(new Date().getTime() - 500);
}
