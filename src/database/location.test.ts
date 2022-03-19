import { test, expect } from '@playwright/test';

import type { DB } from '../util/pg_util';
import { initTestDatabase } from '../util/test_util';
import { Location, LocationType } from './location';

// TODO: test use of GUIDs

let db: DB;

test.beforeAll(async () => {
  db = await initTestDatabase();
});

test('series of sequentially dependent location tests', async () => {
  // Each of these tests depends on the prior tests, so run all as a unit.

  // test adding continent location

  {
    const locationName = 'North America';
    const sourceLocation = {
      locationType: LocationType.Continent,
      locationName,
      locationGuid: null,
      publicLatitude: null,
      publicLongitude: null,
      parentID: null
    };
    const expectedLocation = Object.assign(
      { locationID: 1, parentIDSeries: '', parentNameSeries: '' },
      sourceLocation
    );
    const createdLocation = await Location.create(db, '', '', sourceLocation);
    expect(createdLocation).toEqual(expectedLocation);
    const readLocation = await Location.getByID(db, createdLocation.locationID);
    expect(readLocation).toEqual(expectedLocation);
  }

  // test adding country of existing continent

  {
    const locationName = 'United States';
    const sourceLocation = {
      locationType: LocationType.Country,
      locationName,
      locationGuid: null,
      publicLatitude: null,
      publicLongitude: null,
      parentID: 1
    };
    const expectedLocation = Object.assign(
      { locationID: 2, parentIDSeries: '1', parentNameSeries: 'North America' },
      sourceLocation
    );
    const createdLocation = await Location.create(
      db,
      'North America',
      '1',
      sourceLocation
    );
    expect(createdLocation).toEqual(expectedLocation);
    const readLocation = await Location.getByID(db, createdLocation.locationID);
    expect(readLocation).toEqual(expectedLocation);
  }

  // test skipping unspecified intermediate locations

  {
    const createdLocation = await Location.getOrCreate(db, {
      continent: 'North America',
      country: 'United States',
      locality: 'Someplace in U.S.'
    });
    const readLocation = await Location.getByID(db, 3);
    expect(readLocation).toEqual({
      locationID: 3,
      locationType: LocationType.Locality,
      locationName: 'Someplace in U.S.',
      locationGuid: null,
      publicLatitude: null,
      publicLongitude: null,
      parentID: 2,
      parentIDSeries: '1,2,-,-',
      parentNameSeries: 'North America|United States|-|-'
    });
    expect(createdLocation).toEqual(readLocation);
  }

  // test getOrCreate() getting an existing location

  {
    const expectedLocation = await Location.getByID(db, 3);
    expect(expectedLocation?.locationName).toEqual('Someplace in U.S.');
    const readLocation = await Location.getOrCreate(db, {
      continent: 'North America',
      country: 'United States',
      locality: 'Someplace in U.S.'
    });
    expect(readLocation).toEqual(expectedLocation);
  }

  // test auto-creating new location having some but not all intermediates

  {
    const createdLocation = await Location.getOrCreate(db, {
      continent: 'North America',
      country: 'United States',
      stateProvince: 'Texas',
      locality: 'Someplace in Texas'
    });
    expect(await Location.getByID(db, 4)).toEqual({
      locationID: 4,
      locationType: LocationType.StateProvince,
      locationName: 'Texas',
      locationGuid: null,
      publicLatitude: null,
      publicLongitude: null,
      parentID: 2,
      parentIDSeries: '1,2',
      parentNameSeries: 'North America|United States'
    });
    const readLocation = await Location.getByID(db, 5);
    expect(readLocation).toEqual({
      locationID: 5,
      locationType: LocationType.Locality,
      locationName: 'Someplace in Texas',
      locationGuid: null,
      publicLatitude: null,
      publicLongitude: null,
      parentID: 4,
      parentIDSeries: '1,2,4,-',
      parentNameSeries: 'North America|United States|Texas|-'
    });
    expect(createdLocation).toEqual(readLocation);
  }

  // test auto-creating new locality and final intermediate taxon

  {
    const createdLocation = await Location.getOrCreate(db, {
      continent: 'North America',
      country: 'United States',
      stateProvince: 'Texas',
      county: 'Travis County',
      locality: 'Missing Cave',
      decimalLatitude: 28.12,
      decimalLongitude: -97.34
    });
    expect(await Location.getByID(db, 6)).toEqual({
      locationID: 6,
      locationType: LocationType.County,
      locationName: 'Travis County',
      locationGuid: null,
      publicLatitude: null,
      publicLongitude: null,
      parentID: 4,
      parentIDSeries: '1,2,4',
      parentNameSeries: 'North America|United States|Texas'
    });
    const readLocation = await Location.getByID(db, 7);
    expect(readLocation).toEqual({
      locationID: 7,
      locationType: LocationType.Locality,
      locationName: 'Missing Cave',
      locationGuid: null,
      publicLatitude: 28.12,
      publicLongitude: -97.34,
      parentID: 6,
      parentIDSeries: '1,2,4,6',
      parentNameSeries: 'North America|United States|Texas|Travis County'
    });
    expect(createdLocation).toEqual(readLocation);
  }

  // test creating multiple intermediate localities under continent

  {
    const createdLocation = await Location.getOrCreate(db, {
      continent: 'North America',
      country: 'Mexico',
      stateProvince: 'Chihuahua',
      county: 'Mun. Xyz',
      locality: 'Invisible Spring',
      decimalLatitude: 21.12,
      decimalLongitude: -96.34
    });
    expect(await Location.getByID(db, 8)).toEqual({
      locationID: 8,
      locationType: LocationType.Country,
      locationName: 'Mexico',
      locationGuid: null,
      publicLatitude: null,
      publicLongitude: null,
      parentID: 1,
      parentIDSeries: '1',
      parentNameSeries: 'North America'
    });
    expect(await Location.getByID(db, 9)).toEqual({
      locationID: 9,
      locationType: LocationType.StateProvince,
      locationName: 'Chihuahua',
      locationGuid: null,
      publicLatitude: null,
      publicLongitude: null,
      parentID: 8,
      parentIDSeries: '1,8',
      parentNameSeries: 'North America|Mexico'
    });
    expect(await Location.getByID(db, 10)).toEqual({
      locationID: 10,
      locationType: LocationType.County,
      locationName: 'Mun. Xyz',
      locationGuid: null,
      publicLatitude: null,
      publicLongitude: null,
      parentID: 9,
      parentIDSeries: '1,8,9',
      parentNameSeries: 'North America|Mexico|Chihuahua'
    });
    const readLocation = await Location.getByID(db, 11);
    expect(readLocation).toEqual({
      locationID: 11,
      locationType: LocationType.Locality,
      locationGuid: null,
      locationName: 'Invisible Spring',
      publicLatitude: 21.12,
      publicLongitude: -96.34,
      parentID: 10,
      parentIDSeries: '1,8,9,10',
      parentNameSeries: 'North America|Mexico|Chihuahua|Mun. Xyz'
    });
    expect(createdLocation).toEqual(readLocation);
  }

  // test providing the public coordinates name of an existing location

  {
    const expectedLocation = await Location.getByID(db, 4);
    expect(expectedLocation?.locationName).toEqual('Texas');
    expectedLocation!.publicLatitude = 23.5;
    expectedLocation!.publicLongitude = -97.5;
    await expectedLocation!.save(db);
    const readLocation = await Location.getByID(db, 4);
    expect(readLocation).toEqual(expectedLocation);
  }
});

test.afterAll(async () => {
  await db.close();
});
