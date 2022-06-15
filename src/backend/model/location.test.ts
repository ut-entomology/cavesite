import type { DB } from '../integrations/postgres';
import { DatabaseMutex } from '../util/test_util';
import { Location } from './location';
import { LocationRank } from '../../shared/model';
import { ImportFailure } from './import_failure';

describe('without location location uniques', () => {
  const mutex = new DatabaseMutex();
  let db: DB;

  beforeAll(async () => {
    db = await mutex.lock();
  });

  test('sequentially dependent location tests (without location uniques)', async () => {
    // Each of these tests depends on the prior tests, so run all as a unit.

    // test adding continent location

    {
      const sourceLocation = {
        locationRank: LocationRank.Continent,
        locationName: 'North America',
        publicLatitude: null,
        publicLongitude: null,
        parentID: null,
        hasChildren: null
      };
      const expectedLocation = Object.assign(
        {
          locationID: 1,
          parentIDPath: '',
          parentNamePath: '',
          locationUnique: 'north america'
        },
        sourceLocation
      );
      const createdLocation = await Location.create(db, '', '', sourceLocation);
      expect(createdLocation).toEqual(expectedLocation);
      const readLocation = await _getByID(db, createdLocation.locationID);
      expect(readLocation).toEqual(expectedLocation);
    }

    // test adding country of existing continent

    {
      const sourceLocation = {
        locationRank: LocationRank.Country,
        locationName: 'United States',
        publicLatitude: null,
        publicLongitude: null,
        parentID: 1,
        hasChildren: null
      };
      const expectedLocation = Object.assign(
        {
          locationID: 2,
          parentIDPath: '1',
          parentNamePath: 'North America',
          locationUnique: 'north america|united states'
        },
        sourceLocation
      );
      const createdLocation = await Location.create(
        db,
        'North America',
        '1',
        sourceLocation
      );
      expect(createdLocation).toEqual(expectedLocation);
      const readLocation = await _getByID(db, createdLocation.locationID);
      expect(readLocation).toEqual(expectedLocation);
    }

    // test skipping unspecified intermediate locations

    {
      const createdLocation = await Location.getOrCreate(db, {
        continent: 'North America',
        country: 'United States',
        locality: 'Someplace in U.S.'
      });
      const readLocation = await _getByID(db, 3);
      expect(readLocation).toEqual({
        locationID: 3,
        locationRank: LocationRank.Locality,
        locationName: 'Someplace in U.S.',
        locationUnique: 'north america|united states|someplace in us',
        publicLatitude: null,
        publicLongitude: null,
        parentID: 2,
        parentIDPath: '1,2',
        parentNamePath: 'North America|United States',
        hasChildren: null
      });
      expect(createdLocation).toEqual(readLocation);
    }

    // test getOrCreate() getting an existing location

    {
      const expectedLocation = await _getByID(db, 3);
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
      expect(await _getByID(db, 4)).toEqual({
        locationID: 4,
        locationRank: LocationRank.StateProvince,
        locationName: 'Texas',
        locationUnique: 'north america|united states|texas',
        publicLatitude: null,
        publicLongitude: null,
        parentID: 2,
        parentIDPath: '1,2',
        parentNamePath: 'North America|United States',
        hasChildren: null
      });
      const readLocation = await _getByID(db, 5);
      expect(readLocation).toEqual({
        locationID: 5,
        locationRank: LocationRank.Locality,
        locationName: 'Someplace in Texas',
        locationUnique: 'united states|texas|someplace in texas',
        publicLatitude: null,
        publicLongitude: null,
        parentID: 4,
        parentIDPath: '1,2,4',
        parentNamePath: 'North America|United States|Texas',
        hasChildren: null
      });
      expect(createdLocation).toEqual(readLocation);
    }

    // test auto-creating new locality and final intermediate location

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
      expect(await _getByID(db, 6)).toEqual({
        locationID: 6,
        locationRank: LocationRank.County,
        locationName: 'Travis County',
        locationUnique: 'united states|texas|travis county',
        publicLatitude: null,
        publicLongitude: null,
        parentID: 4,
        parentIDPath: '1,2,4',
        parentNamePath: 'North America|United States|Texas',
        hasChildren: null
      });
      const readLocation = await _getByID(db, 7);
      expect(readLocation).toEqual({
        locationID: 7,
        locationRank: LocationRank.Locality,
        locationName: 'Missing Cave',
        locationUnique: 'texas|travis county|missing cave',
        publicLatitude: 28.12,
        publicLongitude: -97.34,
        parentID: 6,
        parentIDPath: '1,2,4,6',
        parentNamePath: 'North America|United States|Texas|Travis County',
        hasChildren: null
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
      expect(await _getByID(db, 8)).toEqual({
        locationID: 8,
        locationRank: LocationRank.Country,
        locationName: 'Mexico',
        locationUnique: 'north america|mexico',
        publicLatitude: null,
        publicLongitude: null,
        parentID: 1,
        parentIDPath: '1',
        parentNamePath: 'North America',
        hasChildren: null
      });
      expect(await _getByID(db, 9)).toEqual({
        locationID: 9,
        locationRank: LocationRank.StateProvince,
        locationName: 'Chihuahua',
        locationUnique: 'north america|mexico|chihuahua',
        publicLatitude: null,
        publicLongitude: null,
        parentID: 8,
        parentIDPath: '1,8',
        parentNamePath: 'North America|Mexico',
        hasChildren: null
      });
      expect(await _getByID(db, 10)).toEqual({
        locationID: 10,
        locationRank: LocationRank.County,
        locationName: 'Mun. Xyz',
        locationUnique: 'mexico|chihuahua|mun xyz',
        publicLatitude: null,
        publicLongitude: null,
        parentID: 9,
        parentIDPath: '1,8,9',
        parentNamePath: 'North America|Mexico|Chihuahua',
        hasChildren: null
      });
      const readLocation = await _getByID(db, 11);
      expect(readLocation).toEqual({
        locationID: 11,
        locationRank: LocationRank.Locality,
        locationName: 'Invisible Spring',
        locationUnique: 'chihuahua|mun xyz|invisible spring',
        publicLatitude: 21.12,
        publicLongitude: -96.34,
        parentID: 10,
        parentIDPath: '1,8,9,10',
        parentNamePath: 'North America|Mexico|Chihuahua|Mun. Xyz',
        hasChildren: null
      });
      expect(createdLocation).toEqual(readLocation);

      const locations = await Location.getByIDs(db, [9, 10, 11]);
      expect(locations[0].locationName).toEqual('Chihuahua');
      expect(locations[1].locationName).toEqual('Mun. Xyz');
      expect(locations[2].locationName).toEqual('Invisible Spring');
    }

    // test adding a second county

    {
      const createdLocation = await Location.getOrCreate(db, {
        continent: 'North America',
        country: 'United States',
        stateProvince: 'Texas',
        county: 'Bastrop County',
        locality: 'Fire Cave',
        decimalLatitude: '28.50',
        decimalLongitude: '-97.50'
      });

      let readLocation = await _getByID(db, 12);
      expect(readLocation).toEqual({
        locationID: 12,
        locationRank: LocationRank.County,
        locationName: 'Bastrop County',
        locationUnique: 'united states|texas|bastrop county',
        publicLatitude: null,
        publicLongitude: null,
        parentID: 4,
        parentIDPath: '1,2,4',
        parentNamePath: 'North America|United States|Texas',
        hasChildren: null
      });
      readLocation = await _getByID(db, 13);
      expect(readLocation).toEqual({
        locationID: 13,
        locationRank: LocationRank.Locality,
        locationName: 'Fire Cave',
        locationUnique: 'texas|bastrop county|fire cave',
        publicLatitude: 28.5,
        publicLongitude: -97.5,
        parentID: 12,
        parentIDPath: '1,2,4,12',
        parentNamePath: 'North America|United States|Texas|Bastrop County',
        hasChildren: null
      });
      expect(createdLocation).toEqual(readLocation);
    }

    // test providing the public coordinates name of an existing location

    {
      const expectedLocation = await _getByID(db, 4);
      expect(expectedLocation?.locationName).toEqual('Texas');
      expectedLocation!.publicLatitude = 23.5;
      expectedLocation!.publicLongitude = -97.5;
      await expectedLocation!.save(db);
      const readLocation = await _getByID(db, 4);
      expect(readLocation).toEqual(expectedLocation);
    }

    // test committing followed by an exact match

    {
      let matches = await Location.matchName(db, 'Mexico', 10);
      expect(matches.length).toEqual(0);

      await Location.commit(db);

      matches = await Location.matchName(db, 'Mexico', 10);
      expect(matches.length).toEqual(1);
      expect(matches[0].locationName).toEqual('Mexico');
      expect(matches[0].hasChildren).toBeNull();

      matches = await Location.matchName(db, 'mexico', 10);
      expect(matches.length).toEqual(1);
      expect(matches[0].locationName).toEqual('Mexico');
      expect(matches[0].hasChildren).toBeNull();
    }

    // test reading locations by location unique

    {
      const locationUniques = [
        'north america',
        'united states|texas|travis county',
        'texas|travis county|missing cave'
      ];
      let readLocation = await Location.getByUniques(db, locationUniques);
      _findLocationUniques(readLocation, locationUniques);
      expect(
        readLocation.find((loc) => loc.locationUnique == 'north america')?.hasChildren
      ).toBe(true);
      expect(
        readLocation.find(
          (loc) => loc.locationUnique == 'united states|texas|travis county'
        )?.hasChildren
      ).toBe(true);
      expect(
        readLocation.find(
          (loc) => loc.locationUnique == 'texas|travis county|missing cave'
        )?.hasChildren
      ).toBe(false);

      readLocation = await Location.getByUniques(db, ['foo', 'bar']);
      expect(readLocation.length).toEqual(0);
    }

    // test multiple internal subset matches

    {
      let matches = await Location.matchName(db, 'is', 10);
      expect(matches.map((loc) => loc.locationName)).toEqual([
        'Invisible Spring',
        'Missing Cave',
        'Travis County'
      ]);

      matches = await Location.matchName(db, 'is', 2);
      expect(matches.map((loc) => loc.locationName)).toEqual([
        'Invisible Spring',
        'Missing Cave'
      ]);
    }

    // test getting children of parent by parent name

    {
      let readLocations = await Location.getChildrenOf(db, ['north america']);
      expect(readLocations.length).toEqual(1);
      _findLocationNames(readLocations[0], ['United States', 'Mexico']);
      readLocations[0].forEach((loc) => expect(loc.hasChildren).toBe(true));

      readLocations = await Location.getChildrenOf(db, ['north america|united states']);
      expect(readLocations.length).toEqual(1);
      _findLocationNames(readLocations[0], ['Texas', 'Someplace in U.S.']);
      let [texasChild, someplaceChild] = [readLocations[0][0], readLocations[0][1]];
      if (texasChild.locationName != 'Texas') {
        [texasChild, someplaceChild] = [someplaceChild, texasChild];
      }
      expect(texasChild.hasChildren).toBe(true);
      expect(someplaceChild.hasChildren).toBe(false);

      readLocations = await Location.getChildrenOf(db, [
        'north america|united states|texas'
      ]);
      expect(readLocations.length).toEqual(1);
      _findLocationNames(readLocations[0], [
        'Travis County',
        'Bastrop County',
        'Someplace in Texas'
      ]);
      readLocations[0].forEach((loc) =>
        expect(loc.hasChildren).toBe(loc.locationRank == LocationRank.County)
      );

      readLocations = await Location.getChildrenOf(db, [
        'united states|texas|travis county',
        'united states|texas|bastrop county'
      ]);
      expect(readLocations.length).toEqual(2);
      _findLocationNames(readLocations[0], ['Missing Cave']);
      expect(readLocations[0][0].hasChildren).toBe(false);
      _findLocationNames(readLocations[1], ['Fire Cave']);
      expect(readLocations[1][0].hasChildren).toBe(false);

      readLocations = await Location.getChildrenOf(db, [
        'texas|travis county|missing cave'
      ]);
      expect(readLocations.length).toEqual(1);
      expect(readLocations[0].length).toEqual(0);

      readLocations = await Location.getChildrenOf(db, [
        'texas|bastrop county|piney cave'
      ]);
      expect(readLocations.length).toEqual(1);
      expect(readLocations[0].length).toEqual(0);
    }

    // test replacing existing records

    {
      await Location.getOrCreate(db, {
        continent: 'North America',
        country: 'United States',
        stateProvince: 'Texas',
        county: 'Travis County',
        locality: 'Missing Cave',
        decimalLatitude: '30',
        decimalLongitude: '-100'
      });
      let matches = await Location.matchName(db, 'Missing Cave', 10);
      expect(matches.length).toEqual(1);
      expect(matches[0].publicLatitude).not.toEqual(30);

      await Location.getOrCreate(db, {
        continent: 'North America',
        country: 'United States',
        stateProvince: 'Texas',
        county: 'Bastrop County',
        locality: 'Piney Cave'
      });
      matches = await Location.matchName(db, 'Piney Cave', 10);
      expect(matches.length).toEqual(0);

      await Location.commit(db);

      matches = await Location.matchName(db, 'Missing Cave', 10);
      expect(matches.length).toEqual(1);
      expect(matches[0].publicLatitude).toEqual(30);
      matches = await Location.matchName(db, 'Piney Cave', 10);
      expect(matches.length).toEqual(1);
      matches = await Location.matchName(db, 'Mexico', 10);
      expect(matches.length).toEqual(0);
    }
  });

  afterAll(async () => {
    await mutex.unlock();
  });
});

describe('with location location uniques', () => {
  const mutex = new DatabaseMutex();
  let db: DB;

  beforeAll(async () => {
    db = await mutex.lock();
  });

  test('sequentially dependent location tests (with location uniques)', async () => {
    // Each of these tests depends on the prior tests, so run all as a unit.

    // test adding continent location

    {
      const sourceLocation = {
        locationRank: LocationRank.Continent,
        locationName: 'North America',
        locationUnique: 'north america',
        publicLatitude: null,
        publicLongitude: null,
        parentID: null,
        hasChildren: null
      };
      const expectedLocation = Object.assign(
        { locationID: 1, parentIDPath: '', parentNamePath: '' },
        sourceLocation
      );
      const createdLocation = await Location.create(db, '', '', sourceLocation);
      expect(createdLocation).toEqual(expectedLocation);
      let readLocation = await _getByID(db, createdLocation.locationID);
      expect(readLocation).toEqual(expectedLocation);
      readLocation = await Location.getByUnique(
        db,
        sourceLocation.locationUnique!,
        false
      );
      expect(readLocation).toEqual(expectedLocation);
    }

    // test adding country of existing continent

    {
      const sourceLocation = {
        locationRank: LocationRank.Country,
        locationName: 'United States',
        locationUnique: 'north america|united states',
        publicLatitude: null,
        publicLongitude: null,
        parentID: 1,
        hasChildren: null
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
      let readLocation = await _getByID(db, createdLocation.locationID);
      expect(readLocation).toEqual(expectedLocation);
      readLocation = await Location.getByUnique(
        db,
        sourceLocation.locationUnique!,
        false
      );
      expect(readLocation).toEqual(expectedLocation);
    }

    // test skipping unspecified intermediate locations

    {
      const createdLocation = await Location.getOrCreate(db, {
        continent: 'North America',
        country: 'United States',
        locality: 'Someplace in U.S.'
      });
      const readLocation = await _getByID(db, 3);
      expect(readLocation).toEqual({
        locationID: 3,
        locationRank: LocationRank.Locality,
        locationName: 'Someplace in U.S.',
        locationUnique: 'north america|united states|someplace in us',
        publicLatitude: null,
        publicLongitude: null,
        parentID: 2,
        parentIDPath: '1,2',
        parentNamePath: 'North America|United States',
        hasChildren: null
      });
      expect(createdLocation).toEqual(readLocation);
    }

    // test getOrCreate() getting an existing location

    {
      const expectedLocation = await Location.getByUnique(
        db,
        'north america|united states|someplace in us',
        false
      );
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
      expect(await _getByID(db, 4)).toEqual({
        locationID: 4,
        locationRank: LocationRank.StateProvince,
        locationName: 'Texas',
        locationUnique: 'north america|united states|texas',
        publicLatitude: null,
        publicLongitude: null,
        parentID: 2,
        parentIDPath: '1,2',
        parentNamePath: 'North America|United States',
        hasChildren: null
      });
      let readLocation = await _getByID(db, 5);
      expect(readLocation).toEqual({
        locationID: 5,
        locationRank: LocationRank.Locality,
        locationName: 'Someplace in Texas',
        locationUnique: 'united states|texas|someplace in texas',
        publicLatitude: null,
        publicLongitude: null,
        parentID: 4,
        parentIDPath: '1,2,4',
        parentNamePath: 'North America|United States|Texas',
        hasChildren: null
      });
      expect(createdLocation).toEqual(readLocation);
      readLocation = await Location.getByUnique(
        db,
        'united states|texas|someplace in texas',
        false
      );
      expect(readLocation).toEqual(createdLocation);
    }

    // test creating a second location under the prior new intermediate

    {
      const createdLocation = await Location.getOrCreate(db, {
        continent: 'North America',
        country: 'United States',
        stateProvince: 'Texas',
        locality: 'Another Place in Texas'
      });
      let readLocation = await _getByID(db, 6);
      expect(readLocation).toEqual({
        locationID: 6,
        locationRank: LocationRank.Locality,
        locationName: 'Another Place in Texas',
        locationUnique: 'united states|texas|another place in texas',
        publicLatitude: null,
        publicLongitude: null,
        parentID: 4,
        parentIDPath: '1,2,4',
        parentNamePath: 'North America|United States|Texas',
        hasChildren: null
      });
      expect(createdLocation).toEqual(readLocation);
      readLocation = await Location.getByUnique(
        db,
        'united states|texas|another place in texas',
        false
      );
      expect(readLocation).toEqual(createdLocation);
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

async function _getByID(db: DB, locationID: number): Promise<Location | null> {
  const locations = await Location.getByIDs(db, [locationID]);
  return locations.length == 1 ? locations[0] : null;
}

function _findLocationNames(locations: Location[], lookForNames: string[]) {
  for (const name of lookForNames) {
    const location = locations.find((loc) => loc.locationName == name);
    expect(location).not.toBeUndefined();
  }
  expect(locations.length).toEqual(lookForNames.length);
}

function _findLocationUniques(locations: Location[], lookForUniques: string[]) {
  for (const unique of lookForUniques) {
    const location = locations.find((loc) => loc.locationUnique == unique);
    expect(location).not.toBeUndefined();
  }
  expect(locations.length).toEqual(lookForUniques.length);
}
