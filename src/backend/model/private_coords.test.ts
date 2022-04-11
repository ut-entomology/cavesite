import type { DB } from '../integrations/postgres';
import { DatabaseMutex, expectRecentTime } from '../util/test_util';
import { User } from './user';
import { Permission } from '../../shared/user_info';
import { PrivateCoords } from './private_coords';
import { UserError, ValidationError } from '../../shared/validation';

const mutex = new DatabaseMutex();
let db: DB;
let user: User;

beforeAll(async () => {
  db = await mutex.lock();

  user = await User.create(
    db,
    'User',
    'Name',
    'user.name@x.yz',
    null,
    '238jfafj9838rcab23rbhefbhh83',
    Permission.Coords,
    null
  );
});

test('creating, modifying, and dropping private coordinates', async () => {
  const createdCoords1 = await PrivateCoords.create(db, 'G1', user, 1, 2, null);
  verifyCoords(createdCoords1, 'G1', user, 1, 2, null);

  const createdCoords2 = await PrivateCoords.create(db, 'G2', user, 1, 2, 0.5);
  verifyCoords(createdCoords2, 'G2', user, 1, 2, 0.5);

  let readCoords = await PrivateCoords.getByGUID(db, 'G1');
  verifyCoords(readCoords, 'G1', user, 1, 2, null);

  createdCoords1.latitude = 100;
  createdCoords1.uncertaintyMeters = 2.5;
  await createdCoords1.save(db);

  readCoords = await PrivateCoords.getByGUID(db, 'G1');
  verifyCoords(readCoords, 'G1', user, 100, 2, 2.5);

  await PrivateCoords.dropGUID(db, 'G1');
  readCoords = await PrivateCoords.getByGUID(db, 'G1');
  expect(readCoords).toBeNull();
});

test('invalid private coordinates GUID', async () => {
  await expect(() => PrivateCoords.create(db, '', user, 1, 2, null)).rejects.toThrow(
    new ValidationError('Invalid location GUID')
  );
  await expect(() => PrivateCoords.create(db, '  ', user, 1, 2, null)).rejects.toThrow(
    new ValidationError('Invalid location GUID')
  );

  await PrivateCoords.create(db, 'X1', user, 1, 2, null);
  await expect(() => PrivateCoords.create(db, 'X1', user, 1, 2, null)).rejects.toThrow(
    new UserError(`Private coordinates already exist for GUID X1`)
  );
});

afterAll(async () => {
  await mutex.unlock();
});

function verifyCoords(
  coords: PrivateCoords | null,
  guid: string,
  user: User,
  latitude: number,
  longitude: number,
  uncertaintyMeters: number | null
) {
  expect(coords).not.toBeNull();
  expect(coords!.locationGuid).toEqual(guid);
  expect(coords!.modifiedBy).toEqual(user.userID);
  expectRecentTime(coords!.modifiedOn);
  expect(coords!.latitude).toEqual(latitude);
  expect(coords!.longitude).toEqual(longitude);
  expect(coords!.uncertaintyMeters).toEqual(uncertaintyMeters);
}
