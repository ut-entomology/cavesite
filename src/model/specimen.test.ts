import { test, expect } from '@playwright/test';

import type { DB } from '../util/pg_util';
import { initTestDatabase } from '../util/test_util';
import { Specimen } from './specimen';
// import { Location, LocationType } from './location';
// import { Taxon, TaxonRank } from './taxon';

const TZ_SUFFIX = 'T06:00:00.000Z';

let db: DB;

test.describe('creating specimens', () => {
  test.beforeAll(async () => {
    db = await initTestDatabase();
  });

  test('creating a fully-specified specimen', async () => {
    const startDate = new Date('2020-01-01' + TZ_SUFFIX);
    const endDate = new Date('2020-01-04' + TZ_SUFFIX);
    const endDateISO = endDate.toISOString();
    const detDate = new Date('2020-06-10' + TZ_SUFFIX);
    const source = {
      catalogNumber: 'C1',
      occurrenceID: 'X1',

      kingdom: 'Animalia',
      phylum: 'Arthropoda',
      class: 'Arachnida',
      order: 'Araneae',
      family: 'Araneidae',
      genus: 'Argiope',
      specificEpithet: 'aurantia',
      // no infraspecificEpithet
      scientificName: 'Argiope aurantia Lucas, 1833',

      continent: 'North America',
      country: 'United States',
      stateProvince: 'Texas',
      county: 'Travis County',
      locality: 'My backyard',
      decimalLatitude: '23.45',
      decimalLongitude: '-93.21',

      startDate: startDate.toString(),
      collectors: 'Person A | Person B',
      determinationDate: detDate.toString(),
      determiners: 'Person C | Person D',
      collectionRemarks:
        'meadow; *end date ' + endDateISO.substring(0, endDateISO.indexOf('T')),
      occurrenceRemarks: 'occurrence remark',
      determinationRemarks: 'big sucker',
      typeStatus: 'normal',
      organismQuantity: '1'
    };
    const specimen = await Specimen.create(db, source);
    expect(specimen).toEqual({
      catalogNumber: source.catalogNumber,
      occurrenceGuid: source.occurrenceID,
      kingdomID: 1,
      phylumID: 2,
      classID: 3,
      orderID: 4,
      familyID: 5,
      genusID: 6,
      speciesID: 7,
      subspeciesID: null,
      preciseTaxonID: 7,

      continentID: 1,
      countryID: 2,
      stateProvinceID: 3,
      countyID: 4,
      localityID: 5,
      preciseLocationID: 5,

      collectionStartDate: startDate,
      collectionEndDate: endDate,
      collectors: 'Person A|Person B',
      determinationDate: detDate,
      determiners: 'Person C|Person D',
      collectionRemarks: 'meadow',
      occurrenceRemarks: source.occurrenceRemarks,
      determinationRemarks: source.determinationRemarks,
      typeStatus: source.typeStatus,
      specimenCount: 1
    });
  });

  test.afterAll(async () => {
    await db.close();
  });
});
