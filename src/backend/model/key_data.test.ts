import type { DB } from '../integrations/postgres';
import { DatabaseMutex } from '../util/test_util';
import { Permission } from '../../shared/user_auth';
import { KeyData } from './key_data';
import { User } from './user';

const PASSWORD = 'woahwhatchadoingwiththatkeyboard';

const mutex = new DatabaseMutex();
let db: DB;
let editUser: User;
let coordsUser: User;
let editCoordsUser: User;
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
  coordsUser = await User.create(
    db,
    'User2',
    'Two',
    'user2@x.yz',
    null,
    PASSWORD,
    Permission.Coords,
    null
  );
  editCoordsUser = await User.create(
    db,
    'User3',
    'Three',
    'user3@x.yz',
    null,
    PASSWORD,
    Permission.Edit | Permission.Coords,
    null
  );
  otherUser = await User.create(
    db,
    'User4',
    'Four',
    'user4@x.yz',
    null,
    PASSWORD,
    Permission.Coords,
    null
  );

  await KeyData.write(db, null, 'xyz1', 0, 'data0_xyz1');
  await KeyData.write(db, null, 'xyz2', 0, 'data0_xyz2');
  await KeyData.write(db, null, 'pdq', Permission.Coords, 'data0_pdq');
  await KeyData.write(db, editUser.userID, 'abc', 0, 'data1_abc');
  await KeyData.write(db, editUser.userID, 'def', 0, 'data1_def');
  await KeyData.write(db, coordsUser.userID, 'abc', 0, 'data2_abc');
  await KeyData.write(db, editCoordsUser.userID, 'def', 0, 'data3_def');
});

test('reading non-null user_id key data', async () => {
  let data = await KeyData.read(db, editUser.userID, editUser.permissions);
  expect(data).not.toBeNull();
  expect(data!['abc']).toEqual('data1_abc');
  expect(data!['def']).toEqual('data1_def');
  expect(Object.keys(data!).length).toEqual(2);

  data = await KeyData.read(db, coordsUser.userID, editUser.permissions);
  expect(data).not.toBeNull();
  expect(data!['abc']).toEqual('data2_abc');
  expect(Object.keys(data!).length).toEqual(1);

  data = await KeyData.read(db, editCoordsUser.userID, 0);
  expect(data).not.toBeNull();
  expect(data!['def']).toEqual('data3_def');
  expect(Object.keys(data!).length).toEqual(1);

  data = await KeyData.read(db, otherUser.userID, 0);
  expect(data).toBeNull();
});

test('reading null user_id key data, no permissin required', async () => {
  let data = await KeyData.read(db, null, 0);
  expect(data).not.toBeNull();
  expect(data!['xyz1']).toEqual('data0_xyz1');
  expect(data!['xyz2']).toEqual('data0_xyz2');
  expect(Object.keys(data!).length).toEqual(2);

  data = await KeyData.read(db, null, Permission.Edit);
  expect(data).not.toBeNull();
  expect(data!['xyz1']).toEqual('data0_xyz1');
  expect(data!['xyz2']).toEqual('data0_xyz2');
  expect(Object.keys(data!).length).toEqual(2);

  data = await KeyData.read(db, null, Permission.Coords);
  expect(data).not.toBeNull();
  expect(data!['xyz1']).toEqual('data0_xyz1');
  expect(data!['xyz2']).toEqual('data0_xyz2');
  expect(data!['pdq']).toEqual('data0_pdq');
  expect(Object.keys(data!).length).toEqual(3);
});

test('replacing a null user_id value', async () => {
  await KeyData.write(db, null, 'xyz1', Permission.Edit, 'data0_xyz1_B');
  let data = await KeyData.read(db, null, 0);
  expect(data).not.toBeNull();
  expect(data!['xyz2']).toEqual('data0_xyz2');
  expect(Object.keys(data!).length).toEqual(1);

  data = await KeyData.read(db, null, Permission.Edit);
  expect(data).not.toBeNull();
  expect(data!['xyz1']).toEqual('data0_xyz1_B');
  expect(data!['xyz2']).toEqual('data0_xyz2');
  expect(Object.keys(data!).length).toEqual(2);
});

test('replacing a non-null user_id value', async () => {
  await KeyData.write(db, editUser.userID, 'abc', Permission.Edit, 'data1_abc_B');
  let data = await KeyData.read(db, editUser.userID, 0);
  expect(data).not.toBeNull();
  expect(data!['abc']).toEqual('data1_abc_B');
  expect(data!['def']).toEqual('data1_def');
  expect(Object.keys(data!).length).toEqual(2);
});

afterAll(async () => {
  await mutex.unlock();
});
