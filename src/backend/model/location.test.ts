import type { DB } from '../integrations/postgres';
import { DatabaseMutex } from '../util/test_util';
import { Location } from './location';
import { LocationRank } from '../../shared/model';
import { ImportFailure } from './import_failure';

describe('without location GUIDs', () => {
  const mutex = new DatabaseMutex();
  let db: DB;

  beforeAll(async () => {
    db = await mutex.lock();
  });

  test('sequentially dependent location tests (without GUIDs)', async () => {
    // Each of these tests depends on the prior tests, so run all as a unit.

    // test adding continent location

    {
      const sourceLocation = {
        locationRank: LocationRank.Continent,
        locationName: 'North America',
        locationGuid: null,
        publicLatitude: null,
        publicLongitude: null,
        parentID: null
      };
      const expectedLocation = Object.assign(
        { locationID: 1, parentIDPath: '', parentNamePath: '' },
        sourceLocation
      );
      const createdLocation = await Location.create(db, '', '', sourceLocation);
      expect(createdLocation).toEqual(expectedLocation);
      const readLocation = await Location.getByID(db, createdLocation.locationID);
      expect(readLocation).toEqual(expectedLocation);
    }

    // test adding country of existing continent

    {
      const sourceLocation = {
        locationRank: LocationRank.Country,
        locationName: 'United States',
        locationGuid: null,
        publicLatitude: null,
        publicLongitude: null,
        parentID: 1
      };
      const expectedLocation = Object.assign(
        { locationID: 2, parentIDPath: '1', parentNamePath: 'North America' },
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
        locationRank: LocationRank.Locality,
        locationName: 'Someplace in U.S.',
        locationGuid: null,
        publicLatitude: null,
        publicLongitude: null,
        parentID: 2,
        parentIDPath: '1,2,-,-',
        parentNamePath: 'North America|United States'
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
        locationRank: LocationRank.StateProvince,
        locationName: 'Texas',
        locationGuid: null,
        publicLatitude: null,
        publicLongitude: null,
        parentID: 2,
        parentIDPath: '1,2',
        parentNamePath: 'North America|United States'
      });
      const readLocation = await Location.getByID(db, 5);
      expect(readLocation).toEqual({
        locationID: 5,
        locationRank: LocationRank.Locality,
        locationName: 'Someplace in Texas',
        locationGuid: null,
        publicLatitude: null,
        publicLongitude: null,
        parentID: 4,
        parentIDPath: '1,2,4,-',
        parentNamePath: 'North America|United States|Texas'
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
        decimalLatitude: '28.12',
        decimalLongitude: '-97.34'
      });
      expect(await Location.getByID(db, 6)).toEqual({
        locationID: 6,
        locationRank: LocationRank.County,
        locationName: 'Travis County',
        locationGuid: null,
        publicLatitude: null,
        publicLongitude: null,
        parentID: 4,
        parentIDPath: '1,2,4',
        parentNamePath: 'North America|United States|Texas'
      });
      const readLocation = await Location.getByID(db, 7);
      expect(readLocation).toEqual({
        locationID: 7,
        locationRank: LocationRank.Locality,
        locationName: 'Missing Cave',
        locationGuid: null,
        publicLatitude: 28.12,
        publicLongitude: -97.34,
        parentID: 6,
        parentIDPath: '1,2,4,6',
        parentNamePath: 'North America|United States|Texas|Travis County'
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
        decimalLatitude: '21.12',
        decimalLongitude: '-96.34'
      });
      expect(await Location.getByID(db, 8)).toEqual({
        locationID: 8,
        locationRank: LocationRank.Country,
        locationName: 'Mexico',
        locationGuid: null,
        publicLatitude: null,
        publicLongitude: null,
        parentID: 1,
        parentIDPath: '1',
        parentNamePath: 'North America'
      });
      expect(await Location.getByID(db, 9)).toEqual({
        locationID: 9,
        locationRank: LocationRank.StateProvince,
        locationName: 'Chihuahua',
        locationGuid: null,
        publicLatitude: null,
        publicLongitude: null,
        parentID: 8,
        parentIDPath: '1,8',
        parentNamePath: 'North America|Mexico'
      });
      expect(await Location.getByID(db, 10)).toEqual({
        locationID: 10,
        locationRank: LocationRank.County,
        locationName: 'Mun. Xyz',
        locationGuid: null,
        publicLatitude: null,
        publicLongitude: null,
        parentID: 9,
        parentIDPath: '1,8,9',
        parentNamePath: 'North America|Mexico|Chihuahua'
      });
      const readLocation = await Location.getByID(db, 11);
      expect(readLocation).toEqual({
        locationID: 11,
        locationRank: LocationRank.Locality,
        locationGuid: null,
        locationName: 'Invisible Spring',
        publicLatitude: 21.12,
        publicLongitude: -96.34,
        parentID: 10,
        parentIDPath: '1,8,9,10',
        parentNamePath: 'North America|Mexico|Chihuahua|Mun. Xyz'
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

    // test committing taxa and matching names

    {
      // test committing followed by an exact match

      let matches = await Location.matchName(db, 'Mexico');
      expect(matches.length).toEqual(0);

      await Location.commit(db);

      matches = await Location.matchName(db, 'Mexico');
      expect(matches.length).toEqual(1);
      expect(matches[0].locationName).toEqual('Mexico');

      // test multiple internal subset matches

      matches = await Location.matchName(db, 'is');
      expect(matches.map((taxon) => taxon.locationName)).toEqual([
        'Invisible Spring',
        'Missing Cave',
        'Travis County'
      ]);

      // test replacing existing records

      await Location.getOrCreate(db, {
        continent: 'North America',
        country: 'United States',
        stateProvince: 'Texas',
        county: 'Travis County',
        locality: 'Missing Cave',
        decimalLatitude: '30',
        decimalLongitude: '-100'
      });
      matches = await Location.matchName(db, 'Missing Cave');
      expect(matches.length).toEqual(1);
      expect(matches[0].publicLatitude).not.toEqual(30);

      await Location.getOrCreate(db, {
        continent: 'North America',
        country: 'United States',
        stateProvince: 'Texas',
        county: 'Bastrop County',
        locality: 'Piney Cave'
      });
      matches = await Location.matchName(db, 'Piney Cave');
      expect(matches.length).toEqual(0);

      await Location.commit(db);

      matches = await Location.matchName(db, 'Missing Cave');
      expect(matches.length).toEqual(1);
      expect(matches[0].publicLatitude).toEqual(30);
      matches = await Location.matchName(db, 'Piney Cave');
      expect(matches.length).toEqual(1);
      matches = await Location.matchName(db, 'Mexico');
      expect(matches.length).toEqual(0);
    }
  });

  afterAll(async () => {
    await mutex.unlock();
  });
});

describe('with location GUIDs', () => {
  const mutex = new DatabaseMutex();
  let db: DB;

  beforeAll(async () => {
    db = await mutex.lock();
  });

  test('sequentially dependent location tests (with GUIDs)', async () => {
    // Each of these tests depends on the prior tests, so run all as a unit.

    // test adding continent location

    {
      const sourceLocation = {
        locationRank: LocationRank.Continent,
        locationName: 'North America',
        locationGuid: 'G1',
        publicLatitude: null,
        publicLongitude: null,
        parentID: null
      };
      const expectedLocation = Object.assign(
        { locationID: 1, parentIDPath: '', parentNamePath: '' },
        sourceLocation
      );
      const createdLocation = await Location.create(db, '', '', sourceLocation);
      expect(createdLocation).toEqual(expectedLocation);
      let readLocation = await Location.getByID(db, createdLocation.locationID);
      expect(readLocation).toEqual(expectedLocation);
      readLocation = await Location.getByGUID(db, sourceLocation.locationGuid!, false);
      expect(readLocation).toEqual(expectedLocation);
    }

    // test adding country of existing continent

    {
      const sourceLocation = {
        locationRank: LocationRank.Country,
        locationName: 'United States',
        locationGuid: 'G2',
        publicLatitude: null,
        publicLongitude: null,
        parentID: 1
      };
      const expectedLocation = Object.assign(
        { locationID: 2, parentIDPath: '1', parentNamePath: 'North America' },
        sourceLocation
      );
      const createdLocation = await Location.create(
        db,
        'North America',
        '1',
        sourceLocation
      );
      expect(createdLocation).toEqual(expectedLocation);
      let readLocation = await Location.getByID(db, createdLocation.locationID);
      expect(readLocation).toEqual(expectedLocation);
      readLocation = await Location.getByGUID(db, sourceLocation.locationGuid!, false);
      expect(readLocation).toEqual(expectedLocation);
    }

    // test skipping unspecified intermediate locations

    {
      const createdLocation = await Location.getOrCreate(db, {
        continent: 'North America',
        country: 'United States',
        locality: 'Someplace in U.S.',
        locationID: 'G3'
      });
      const readLocation = await Location.getByID(db, 3);
      expect(readLocation).toEqual({
        locationID: 3,
        locationRank: LocationRank.Locality,
        locationName: 'Someplace in U.S.',
        locationGuid: 'G3',
        publicLatitude: null,
        publicLongitude: null,
        parentID: 2,
        parentIDPath: '1,2,-,-',
        parentNamePath: 'North America|United States'
      });
      expect(createdLocation).toEqual(readLocation);
    }

    // test getOrCreate() getting an existing location

    {
      const expectedLocation = await Location.getByGUID(db, 'G3', false);
      expect(expectedLocation?.locationName).toEqual('Someplace in U.S.');
      const readLocation = await Location.getOrCreate(db, {
        continent: 'North America',
        country: 'United States',
        locality: 'Someplace in U.S.',
        locationID: 'G3'
      });
      expect(readLocation).toEqual(expectedLocation);
    }

    // test auto-creating new location having some but not all intermediates

    {
      const createdLocation = await Location.getOrCreate(db, {
        continent: 'North America',
        country: 'United States',
        stateProvince: 'Texas',
        locality: 'Someplace in Texas',
        locationID: 'G5'
      });
      expect(await Location.getByID(db, 4)).toEqual({
        locationID: 4,
        locationRank: LocationRank.StateProvince,
        locationName: 'Texas',
        locationGuid: null,
        publicLatitude: null,
        publicLongitude: null,
        parentID: 2,
        parentIDPath: '1,2',
        parentNamePath: 'North America|United States'
      });
      let readLocation = await Location.getByID(db, 5);
      expect(readLocation).toEqual({
        locationID: 5,
        locationRank: LocationRank.Locality,
        locationName: 'Someplace in Texas',
        locationGuid: 'G5',
        publicLatitude: null,
        publicLongitude: null,
        parentID: 4,
        parentIDPath: '1,2,4,-',
        parentNamePath: 'North America|United States|Texas'
      });
      expect(createdLocation).toEqual(readLocation);
      readLocation = await Location.getByGUID(db, 'G5', false);
      expect(readLocation).toEqual(createdLocation);
    }

    // test creating a second location under the prior new intermediate

    {
      const createdLocation = await Location.getOrCreate(db, {
        continent: 'North America',
        country: 'United States',
        stateProvince: 'Texas',
        locality: 'Another Place in Texas',
        locationID: 'G6'
      });
      let readLocation = await Location.getByID(db, 6);
      expect(readLocation).toEqual({
        locationID: 6,
        locationRank: LocationRank.Locality,
        locationName: 'Another Place in Texas',
        locationGuid: 'G6',
        publicLatitude: null,
        publicLongitude: null,
        parentID: 4,
        parentIDPath: '1,2,4,-',
        parentNamePath: 'North America|United States|Texas'
      });
      expect(createdLocation).toEqual(readLocation);
      readLocation = await Location.getByGUID(db, 'G6', false);
      expect(readLocation).toEqual(createdLocation);
    }

    // test two localities having the same name but different GUIDs

    {
      const createdLocation1 = await Location.getOrCreate(db, {
        continent: 'North America',
        country: 'United States',
        stateProvince: 'Texas',
        locality: 'Duplicate Cave',
        locationID: 'G7',
        decimalLatitude: '23.89',
        decimalLongitude: '-97.78'
      });
      const createdLocation2 = await Location.getOrCreate(db, {
        continent: 'North America',
        country: 'United States',
        stateProvince: 'Texas',
        locality: 'Duplicate Cave',
        locationID: 'G8',
        decimalLatitude: '23.0',
        decimalLongitude: '-97.0'
      });

      let readLocation = await Location.getByID(db, 7);
      expect(readLocation).toEqual({
        locationID: 7,
        locationRank: LocationRank.Locality,
        locationName: 'Duplicate Cave',
        locationGuid: 'G7',
        publicLatitude: 23.89,
        publicLongitude: -97.78,
        parentID: 4,
        parentIDPath: '1,2,4,-',
        parentNamePath: 'North America|United States|Texas'
      });
      expect(createdLocation1).toEqual(readLocation);
      readLocation = await Location.getByGUID(db, 'G7', false);
      expect(readLocation).toEqual(createdLocation1);

      readLocation = await Location.getByID(db, 8);
      expect(readLocation).toEqual({
        locationID: 8,
        locationRank: LocationRank.Locality,
        locationName: 'Duplicate Cave',
        locationGuid: 'G8',
        publicLatitude: 23.0,
        publicLongitude: -97.0,
        parentID: 4,
        parentIDPath: '1,2,4,-',
        parentNamePath: 'North America|United States|Texas'
      });
      expect(createdLocation2).toEqual(readLocation);
      readLocation = await Location.getByGUID(db, 'G8', false);
      expect(readLocation).toEqual(createdLocation2);
    }
  });

  afterAll(async () => {
    await mutex.unlock();
  });
});

describe('import failures', () => {
  const mutex = new DatabaseMutex();
  let db: DB;

  beforeAll(async () => {
    db = await mutex.lock();
  });

  test('poorly sourced locations', async () => {
    await expect(() =>
      Location.getOrCreate(db, {
        continent: 'North America',
        // no country specified
        stateProvince: 'Texas',
        locality: 'Good Place'
      })
    ).rejects.toThrow(new ImportFailure('State/province given without country'));

    await expect(() =>
      Location.getOrCreate(db, {
        continent: 'North America',
        country: 'United States',
        county: 'Travis County',
        locality: 'Good Place'
      })
    ).rejects.toThrow(new ImportFailure('County given without state/province'));

    await expect(() =>
      Location.getOrCreate(db, {
        continent: 'North America',
        country: 'United States'
        // no locality specified
      })
    ).rejects.toThrow(new ImportFailure('Locality name not given'));

    await expect(() =>
      Location.getOrCreate(db, {
        continent: 'North America',
        country: 'United States',
        locationID: 'G100'
        // no locality specified
      })
    ).rejects.toThrow(new ImportFailure('Locality name not given'));

    await expect(() =>
      Location.getOrCreate(db, {
        continent: 'North America',
        country: 'United States',
        locality: 'Good Place',
        decimalLatitude: '24.12'
      })
    ).rejects.toThrow(new ImportFailure('Latitude given without longitude'));

    await expect(() =>
      Location.getOrCreate(db, {
        continent: 'North America',
        country: 'United States',
        locality: 'Good Place',
        decimalLongitude: '-97.15'
      })
    ).rejects.toThrow(new ImportFailure('Longitude given without latitude'));

    await expect(() =>
      Location.getOrCreate(db, {
        continent: 'North America',
        country: 'United States',
        locality: 'Good Place',
        decimalLatitude: 'abc',
        decimalLongitude: '-97.15'
      })
    ).rejects.toThrow(new ImportFailure('Invalid latitude'));

    await expect(() =>
      Location.getOrCreate(db, {
        continent: 'North America',
        country: 'United States',
        locality: 'Good Place',
        decimalLatitude: '24.15',
        decimalLongitude: '#!3'
      })
    ).rejects.toThrow(new ImportFailure('Invalid longitude'));
  });

  afterAll(async () => {
    await mutex.unlock();
  });
});
