import type { DB } from '../integrations/postgres';
import { DatabaseMutex, expectRecentTime } from '../util/test_util';
import { User } from './user';
import { Permission } from '../../shared/user_info';
import { Logs, LogType } from './logs';
import {
  MIN_PASSWORD_STRENGTH,
  UserError,
  ValidationError
} from '../../shared/validation';

const STRONG_PASSWORD1 = '8afj a aw3rajfla fdj8323214';
const STRONG_PASSWORD2 = 'VERYstrongPWevenWithOUTnumbers';
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

  let user = await User.authenticate(db, 'no@one.there', STRONG_PASSWORD1, '<ip>');
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

  const adminUser = await User.create(
    db,
    ' Super ',
    '  Curator ',
    ' Curator@Place.com ',
    ' Rat Collection ',
    STRONG_PASSWORD1,
    Permission.Admin,
    null
  );
  await verifyUser(
    adminUser,
    'Super',
    'Curator',
    email,
    'Rat Collection',
    STRONG_PASSWORD1,
    Permission.Admin | Permission.Edit | Permission.Coords,
    null
  );
  expect(adminUser.lastLoginDate).toBeNull();

  // Failed authentication.

  let readUser = await User.authenticate(db, email, WRONG_PASSWORD, '<ip>');
  expect(readUser).toBeNull();
  readUser = await User.getByEmail(db, email);
  expect(readUser?.userID).toEqual(adminUser.userID);
  expect(readUser?.lastLoginDate).toBeNull();
  expect(readUser?.lastLoginIP).toBeNull();
  let found = await containsLog(
    db,
    email,
    `${readUser!.firstName} ${readUser!.lastName} logged in from IP <ip>`
  );
  expect(found).toEqual(false);

  // Successful authentication.

  readUser = await User.authenticate(db, email, STRONG_PASSWORD1, '<ip>');
  expect(readUser?.userID).toEqual(adminUser.userID);
  expectRecentTime(readUser!.lastLoginDate);
  expect(readUser?.lastLoginIP).toEqual('<ip>');
  found = await containsLog(
    db,
    email,
    `${readUser!.firstName} ${readUser!.lastName} logged in from IP <ip>`
  );
  expect(found).toEqual(true);

  // Change the user's password.

  await readUser!.setPassword(STRONG_PASSWORD2);
  await readUser!.save(db);
  readUser = await User.authenticate(db, email, STRONG_PASSWORD1, '<ip>');
  expect(readUser).toBeNull();
  readUser = await User.authenticate(db, email, STRONG_PASSWORD2, '<ip>');
  expect(readUser?.userID).toEqual(adminUser.userID);

  // Modify the user profile.

  readUser!.firstName = 'Demoted';
  readUser!.email = 'bad-curator@place.com';
  readUser!.permissions = 0;
  await readUser!.save(db);
  readUser = await User.getByEmail(db, email);
  expect(readUser).toBeNull();
  readUser = await User.getByEmail(db, 'bad-curator@place.com');
  expect(readUser?.userID).toEqual(adminUser.userID);
  await verifyUser(
    readUser!,
    'Demoted',
    'Curator',
    'bad-curator@place.com',
    'Rat Collection',
    STRONG_PASSWORD2,
    0,
    null
  );

  // Add a second user with edit permissions

  const secondUser = await User.create(
    db,
    'Fred',
    'Editor',
    'fred@foo.foo.com',
    'Some Department',
    STRONG_PASSWORD1,
    Permission.Edit,
    adminUser
  );
  await verifyUser(
    secondUser,
    'Fred',
    'Editor',
    'fred@foo.foo.com',
    'Some Department',
    STRONG_PASSWORD1,
    Permission.Edit | Permission.Coords,
    adminUser
  );

  // Add a third user with only coordinate permissions.

  const thirdUser = await User.create(
    db,
    'Curly',
    'Coords',
    'curly@xyz.co',
    null,
    STRONG_PASSWORD1,
    Permission.Coords,
    adminUser
  );
  await verifyUser(
    thirdUser,
    'Curly',
    'Coords',
    'curly@xyz.co',
    null,
    STRONG_PASSWORD1,
    Permission.Coords,
    adminUser
  );

  // Add a fourth user with only coordinate permissions and same
  // last name as prior use but should precede prior user in sort.

  const fourthUser = await User.create(
    db,
    'Carry',
    'Coords',
    'carry@xyz.co',
    null,
    STRONG_PASSWORD1,
    Permission.Coords,
    adminUser
  );
  await verifyUser(
    fourthUser,
    'Carry',
    'Coords',
    'carry@xyz.co',
    null,
    STRONG_PASSWORD1,
    Permission.Coords,
    adminUser
  );

  // Add a fifth user with no permissions.

  const fifthUser = await User.create(
    db,
    'No',
    'Body',
    'no.body@no.where',
    '  ',
    STRONG_PASSWORD1,
    0,
    adminUser
  );
  await verifyUser(
    fifthUser,
    'No',
    'Body',
    'no.body@no.where',
    null,
    STRONG_PASSWORD1,
    0,
    adminUser
  );

  // Retrieve all users.

  const users = await User.getUsers(db);
  expect(users[0].lastName).toEqual('Body');
  expect(users[1].lastName).toEqual('Coords');
  expect(users[1].firstName).toEqual('Carry');
  expect(users[2].lastName).toEqual('Coords');
  expect(users[2].firstName).toEqual('Curly');
  expect(users[3].lastName).toEqual('Curator');
  expect(users[4].lastName).toEqual('Editor');
  expect(users.length).toEqual(5);

  // Drop a user.

  readUser = await User.getByEmail(db, 'no.body@no.where');
  expect(readUser).not.toBeNull();
  await User.dropByEmail(db, fifthUser.email);
  readUser = await User.getByEmail(db, 'no.body@no.where');
  expect(readUser).toBeNull();
});

test('invalid user profile', async () => {
  const badEmails = ['foo @bar.com', 'foo bar@baz.com', 'foo@bar..baz', 'foo@baz'];
  await expect(() =>
    User.create(
      db,
      '',
      'Last',
      'dog.person@persons.org',
      null,
      STRONG_PASSWORD1,
      0,
      null
    )
  ).rejects.toThrow(new ValidationError('No first name given'));

  await expect(() =>
    User.create(
      db,
      'First',
      '',
      'dog.person@persons.org',
      null,
      STRONG_PASSWORD1,
      0,
      null
    )
  ).rejects.toThrow(new ValidationError('No last name given'));

  for (const badEmail of badEmails) {
    await expect(() =>
      User.create(db, 'Good', 'Name', badEmail, null, STRONG_PASSWORD1, 0, null)
    ).rejects.toThrow(new ValidationError('Invalid email address'));
  }

  await User.create(
    db,
    'Existing',
    'Name',
    'existing.email@people.edu',
    null,
    STRONG_PASSWORD1,
    Permission.Edit,
    null
  );
  await expect(() =>
    User.create(
      db,
      'New',
      'Name',
      'existing.email@people.edu',
      null,
      STRONG_PASSWORD1,
      0,
      null
    )
  ).rejects.toThrow(new UserError('A user already exists for that email'));
});

test('unacceptable password', async () => {
  await expect(() =>
    User.create(
      db,
      'Person',
      'Name',
      'x@y.zz',
      null,
      ` ${STRONG_PASSWORD1} `,
      Permission.Coords,
      null
    )
  ).rejects.toThrow(new ValidationError(`Password can't begin or end with spaces`));

  await expect(() =>
    User.create(
      db,
      'Person',
      'Name',
      'x@y.zz',
      null,
      WEAK_PASSWORD,
      Permission.Coords,
      null
    )
  ).rejects.toThrow(new ValidationError('Password not strong enough'));

  const user = await User.create(
    db,
    'Person',
    'Name',
    'x@y.zz',
    null,
    STRONG_PASSWORD1,
    Permission.Admin,
    null
  );

  await expect(() => user.setPassword(` ${STRONG_PASSWORD2} `)).rejects.toThrow(
    new ValidationError(`Password can't begin or end with spaces`)
  );

  await expect(() => user.setPassword(WEAK_PASSWORD)).rejects.toThrow(
    new ValidationError('Password not strong enough')
  );
});

afterAll(async () => {
  await mutex.unlock();
});

async function verifyUser(
  user: User,
  firstName: string,
  lastName: string,
  email: string,
  affiliation: string | null,
  password: string,
  permissions: number,
  createdBy: User | null
) {
  expect(user.userID).toBeGreaterThan(0);
  expect(user.firstName).toEqual(firstName);
  expect(user.lastName).toEqual(lastName);
  expect(user.affiliation).toEqual(affiliation);
  expect(user.email).toEqual(email);
  expect(await user.verifyPassword(password)).toEqual(true);
  expect(await user.verifyPassword(WRONG_PASSWORD)).toEqual(false);
  expect(user.permissions).toEqual(permissions);
  expectRecentTime(user.createdOn);
  expect(user.createdBy).toEqual(createdBy?.userID || null);
}

async function containsLog(db: DB, email: string, portion: string): Promise<boolean> {
  const logs = await Logs.getBeforeID(db, 100, 100);
  for (const log of logs) {
    if (log.type == LogType.User && log.tag == email) {
      return log.line.includes(portion);
    }
  }
  return false;
}
