import { test, expect } from '@playwright/test';

import type { DB } from '../util/pg_util';
import { initTestDatabase } from '../util/test_util';
import { Location, LocationType } from './location';

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

  // test getOrCreate() gets an existing location

  {
    const locationName = 'United States';
    const expectedLocation = await Location.getByID(db, 2);
    expect(expectedLocation?.locationName).toEqual(locationName);
    const readLocation = await Location.getOrCreate(db, {
      continent: 'North America',
      country: 'United States'
    });
    expect(readLocation).toEqual(expectedLocation);
  }

  // test auto-creating new location having no intermediates

  {
    const locationName = 'Texas';
    const createdLocation = await Location.getOrCreate(db, {
      continent: 'North America',
      country: 'United States',
      stateProvince: 'Texas'
    });
    expect(createdLocation).toEqual({
      locationID: 3,
      locationType: LocationType.StateProvince,
      locationName,
      publicLatitude: null,
      publicLongitude: null,
      parentID: 2,
      parentIDSeries: '1,2',
      parentNameSeries: 'North America|United States'
    });
  }

  // test auto-creating new locality and new intermediate taxon

  {
    const locationName = 'Missing Cave';
    const createdLocation = await Location.getOrCreate(db, {
      continent: 'North America',
      country: 'United States',
      stateProvince: 'Texas',
      county: 'Travis County',
      locality: locationName,
      decimalLatitude: 28.12,
      decimalLongitude: -97.34
    });
    expect(await Location.getByID(db, 4)).toEqual({
      locationID: 4,
      locationType: LocationType.County,
      locationName: 'Travis County',
      publicLatitude: null,
      publicLongitude: null,
      parentID: 3,
      parentIDSeries: '1,2,3',
      parentNameSeries: 'North America|United States|Texas'
    });
    const readLocation = await Location.getByID(db, 5);
    expect(readLocation).toEqual({
      locationID: 5,
      locationType: LocationType.Locality,
      locationName,
      publicLatitude: 28.12,
      publicLongitude: -97.34,
      parentID: 4,
      parentIDSeries: '1,2,3,4',
      parentNameSeries: 'North America|United States|Texas|Travis County'
    });
    expect(createdLocation).toEqual(readLocation);
  }

  // test creating multiple intermediate localities

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
    expect(await Location.getByID(db, 6)).toEqual({
      locationID: 6,
      locationType: LocationType.Country,
      locationName: 'Mexico',
      publicLatitude: null,
      publicLongitude: null,
      parentID: 1,
      parentIDSeries: '1',
      parentNameSeries: 'North America'
    });
    expect(await Location.getByID(db, 7)).toEqual({
      locationID: 7,
      locationType: LocationType.StateProvince,
      locationName: 'Chihuahua',
      publicLatitude: null,
      publicLongitude: null,
      parentID: 6,
      parentIDSeries: '1,6',
      parentNameSeries: 'North America|Mexico'
    });
    expect(await Location.getByID(db, 8)).toEqual({
      locationID: 8,
      locationType: LocationType.County,
      locationName: 'Mun. Xyz',
      publicLatitude: null,
      publicLongitude: null,
      parentID: 7,
      parentIDSeries: '1,6,7',
      parentNameSeries: 'North America|Mexico|Chihuahua'
    });
    const readLocation = await Location.getByID(db, 9);
    expect(readLocation).toEqual({
      locationID: 9,
      locationType: LocationType.Locality,
      locationName: 'Invisible Spring',
      publicLatitude: 21.12,
      publicLongitude: -96.34,
      parentID: 8,
      parentIDSeries: '1,6,7,8',
      parentNameSeries: 'North America|Mexico|Chihuahua|Mun. Xyz'
    });
    expect(createdLocation).toEqual(readLocation);
  }

  // test providing the public coordinates name of an existing location

  {
    const expectedLocation = await Location.getByID(db, 4);
    expect(expectedLocation?.locationName).toEqual('Travis County');
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
