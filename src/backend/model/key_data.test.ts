import type { DB } from '../integrations/postgres';
import { DatabaseMutex } from '../util/unit_test_util';
import { Permission } from '../../shared/user_auth';
import { KeyData } from './key_data';
import { User } from './user';

const PASSWORD = 'woahwhatchadoingwiththatkeyboard';

const mutex = new DatabaseMutex();
let db: DB;
let editUser: User;
let adminUser: User;
let editAdminUser: User;
let otherUser: User;

beforeAll(async () => {
  db = await mutex.lock();

  editUser = await User.create(
    db,
    'User1',
    'One',
    'user1@x.yz',
    null,
    PASSWORD,
    Permission.Edit,
    null
  );
  adminUser = await User.create(
    db,
    'User2',
    'Two',
    'user2@x.yz',
    null,
    PASSWORD,
    Permission.Admin,
    null
  );
  editAdminUser = await User.create(
    db,
    'User3',
    'Three',
    'user3@x.yz',
    null,
    PASSWORD,
    Permission.Edit | Permission.Admin,
    null
  );
  otherUser = await User.create(
    db,
    'User4',
    'Four',
    'user4@x.yz',
    null,
    PASSWORD,
    Permission.Edit,
    null
  );

  await KeyData.write(db, null, 'xyz1', 0, 'data0_xyz1');
  await KeyData.write(db, null, 'xyz2', 0, 'data0_xyz2');
  await KeyData.write(db, null, 'pdq', Permission.Admin, 'data0_pdq');
  await KeyData.write(db, null, 'empty', 0, '');
  await KeyData.write(db, editUser.userID, 'empty', 0, '');
  await KeyData.write(db, editUser.userID, 'abc', 0, 'data1_abc');
  await KeyData.write(db, editUser.userID, 'def', 0, 'data1_def');
  await KeyData.write(db, adminUser.userID, 'abc', 0, 'data2_abc');
  await KeyData.write(db, editAdminUser.userID, 'def', 0, 'data3_def');
});

test('reading non-null user_id key data', async () => {
  let data = await KeyData.read(db, editUser.userID, editUser.permissions, 'abc');
  expect(data).toEqual('data1_abc');
  data = await KeyData.read(db, editUser.userID, editUser.permissions, 'def');
  expect(data).toEqual('data1_def');

  data = await KeyData.read(db, adminUser.userID, editUser.permissions, 'abc');
  expect(data).toEqual('data2_abc');

  data = await KeyData.read(db, editAdminUser.userID, 0, 'def');
  expect(data).toEqual('data3_def');

  data = await KeyData.read(db, otherUser.userID, 0, 'any');
  expect(data).toBeNull();

  data = await KeyData.read(db, editUser.userID, 0, 'empty');
  expect(data).toBeNull();
});

test('reading null user_id key data, no permission required', async () => {
  let data = await KeyData.read(db, null, 0, 'xyz1');
  expect(data).toEqual('data0_xyz1');
  data = await KeyData.read(db, null, 0, 'xyz2');
  expect(data).toEqual('data0_xyz2');

  data = await KeyData.read(db, null, Permission.Edit, 'xyz1');
  expect(data).toEqual('data0_xyz1');
  data = await KeyData.read(db, null, Permission.Edit, 'xyz2');
  expect(data).toEqual('data0_xyz2');

  data = await KeyData.read(db, null, 0, 'empty');
  expect(data).toBeNull();
});

test('reading null user_id key data, permission required', async () => {
  let data = await KeyData.read(db, null, editUser.permissions, 'pdq');
  expect(data).toBeNull();
  data = await KeyData.read(db, null, adminUser.permissions, 'pdq');
  expect(data).toEqual('data0_pdq');
});

test('replacing a null user_id value', async () => {
  await KeyData.write(db, null, 'xyz1', Permission.Edit, 'data0_xyz1_B');
  let data = await KeyData.read(db, null, 0, 'xyz2');
  expect(data).not.toBeNull();
  expect(data).toEqual('data0_xyz2');

  data = await KeyData.read(db, null, Permission.Edit, 'xyz1');
  expect(data).toEqual('data0_xyz1_B');
  data = await KeyData.read(db, null, Permission.Edit, 'xyz2');
  expect(data).toEqual('data0_xyz2');
});

test('replacing a non-null user_id value', async () => {
  await KeyData.write(db, editUser.userID, 'abc', Permission.Edit, 'data1_abc_B');
  let data = await KeyData.read(db, editUser.userID, 0, 'abc');
  expect(data).toEqual('data1_abc_B');
  data = await KeyData.read(db, editUser.userID, 0, 'def');
  expect(data).toEqual('data1_def');
});

afterAll(async () => {
  await mutex.unlock();
});
