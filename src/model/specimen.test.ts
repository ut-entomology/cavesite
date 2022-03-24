import { test, expect, beforeAll, afterAll } from 'vitest';

import type { DB } from '../util/pg_util';
import { toLocalDate } from '../util/pg_util';
import { TestSession } from '../util/test_util';
import { Specimen } from './specimen';
import { Location } from './location';
import { Taxon } from './taxon';
import { Logs, LogType } from './logs';

const startDate = toLocalDate(new Date('2020-01-01'));
const endDate = toLocalDate(new Date('2020-01-04'));
const endDateISO = endDate.toISOString();
const detDate = toLocalDate(new Date('2020-06-10'));

const baseSource = {
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

  startDate: startDate.toISOString(),
  collectors: 'Person A | Person B',
  determinationDate: detDate.toISOString(),
  determiners: 'Person C | Person D',
  collectionRemarks:
    'meadow; *end date ' + endDateISO.substring(0, endDateISO.indexOf('T')),
  occurrenceRemarks: 'occurrence remark',
  determinationRemarks: 'big one',
  typeStatus: 'normal',
  organismQuantity: '1'
};

const session = new TestSession();
let db: DB;

beforeAll(async () => {
  db = await session.begin();
});

test('missing catalog number', async () => {
  {
    const source = Object.assign({}, baseSource);
    source.catalogNumber = '';
    expect(await Specimen.create(db, source)).toBeNull();
    let found = await containsLog(
      db,
      'NO CATALOG NUMBER',
      'Missing catalog number',
      true
    );
    expect(found).toBeTruthy();
  }
  {
    const source = Object.assign({}, baseSource);
    // @ts-ignore
    source.catalogNumber = undefined;
    expect(await Specimen.create(db, source)).toBeNull();
    let found = await containsLog(
      db,
      'NO CATALOG NUMBER',
      'Missing catalog number',
      true
    );
    expect(found).toBeTruthy();
  }
});

test('creating a fully-specified specimen', async () => {
  // test creating a fully-specified specimen

  {
    const specimen = await Specimen.create(db, baseSource);
    expect(specimen).toEqual({
      catalogNumber: baseSource.catalogNumber,
      occurrenceGuid: baseSource.occurrenceID,
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
      occurrenceRemarks: baseSource.occurrenceRemarks,
      determinationRemarks: baseSource.determinationRemarks,
      typeStatus: baseSource.typeStatus,
      specimenCount: 1,
      problems: null
    });
    expect((await Taxon.getByID(db, 1))?.taxonName).toEqual('Animalia');
    expect((await Taxon.getByID(db, 2))?.taxonName).toEqual('Arthropoda');
    expect((await Taxon.getByID(db, 5))?.taxonName).toEqual('Araneidae');
    expect((await Taxon.getByID(db, 7))?.taxonName).toEqual('aurantia');
    expect((await Location.getByID(db, 1))?.locationName).toEqual('North America');
    expect((await Location.getByID(db, 3))?.locationName).toEqual('Texas');
    expect((await Location.getByID(db, 5))?.locationName).toEqual('My backyard');

    const readSpecimen = await Specimen.getByCatNum(
      db,
      baseSource.catalogNumber,
      false
    );
    expect(readSpecimen).toEqual(specimen);
  }

  // test creating a partially-specified specimen in existing hierarchy

  {
    const source = {
      catalogNumber: 'C2',
      occurrenceID: 'X2',

      kingdom: 'Animalia',
      phylum: 'Arthropoda',
      class: 'Arachnida',
      order: 'Araneae',
      family: 'Thomisidae',
      scientificName: 'Thomisidae',

      continent: 'North America',
      country: 'United States',
      stateProvince: 'Texas',
      locality: 'Their backyard',

      startDate: startDate.toISOString(),
      collectors: 'Person A',
      determiners: 'Person C'
    };
    const specimen = await Specimen.create(db, source);
    expect(specimen).toEqual({
      catalogNumber: source.catalogNumber,
      occurrenceGuid: source.occurrenceID,
      kingdomID: 1,
      phylumID: 2,
      classID: 3,
      orderID: 4,
      familyID: 8,
      genusID: null,
      speciesID: null,
      subspeciesID: null,
      preciseTaxonID: 8,

      continentID: 1,
      countryID: 2,
      stateProvinceID: 3,
      countyID: null,
      localityID: 6,
      preciseLocationID: 6,

      collectionStartDate: startDate,
      collectionEndDate: null,
      collectors: 'Person A',
      determinationDate: null,
      determiners: 'Person C',
      collectionRemarks: null,
      occurrenceRemarks: null,
      determinationRemarks: null,
      typeStatus: null,
      specimenCount: null,
      problems: null
    });
    expect((await Taxon.getByID(db, 8))?.taxonName).toEqual('Thomisidae');
    expect((await Location.getByID(db, 6))?.locationName).toEqual('Their backyard');
  }

  // test committing specimens

  {
    let specimen = await Specimen.getByCatNum(db, 'C1', true);
    expect(specimen).toBeNull();

    await Specimen.commit(db);

    specimen = await Specimen.getByCatNum(db, 'C1', true);
    expect(specimen?.catalogNumber).toEqual('C1');
  }

  // test replacing existing records

  {
    let source = Object.assign({}, baseSource);
    source.organismQuantity = '50';
    await Specimen.create(db, source);
    let specimen = await Specimen.getByCatNum(db, 'C1', true);
    expect(specimen?.specimenCount).not.toEqual(50);

    source = Object.assign({}, baseSource);
    source.catalogNumber = 'C100';
    source.occurrenceID = 'X100';
    await Specimen.create(db, source);
    specimen = await Specimen.getByCatNum(db, 'C100', true);
    expect(specimen).toBeNull();

    await Specimen.commit(db);

    specimen = await Specimen.getByCatNum(db, 'C1', true);
    expect(specimen?.specimenCount).toEqual(50);
    specimen = await Specimen.getByCatNum(db, 'C100', true);
    expect(specimen?.occurrenceGuid).toEqual('X100');
    specimen = await Specimen.getByCatNum(db, 'C2', true);
    expect(specimen).toBeNull();
  }

  // Test specimen with invalid taxon

  {
    let source = Object.assign({}, baseSource);
    source.catalogNumber = 'C101';
    source.occurrenceID = 'X101';
    // @ts-ignore
    source.order = undefined;

    await clearLogs(db);
    const specimen = await Specimen.create(db, source);
    expect(specimen).toBeNull();

    let found = await containsLog(
      db,
      source.catalogNumber,
      'Family given without order',
      true
    );
    expect(found).toBeTruthy();
  }

  // Test specimen with invalid location

  {
    let source = Object.assign({}, baseSource);
    source.catalogNumber = 'C101';
    source.occurrenceID = 'X101';
    // @ts-ignore
    source.locality = undefined;

    await clearLogs(db);
    const specimen = await Specimen.create(db, source);
    expect(specimen).toBeNull();

    let found = await containsLog(
      db,
      source.catalogNumber,
      'Locality name not given',
      true
    );
    expect(found).toBeTruthy();
  }
});

test('bad end date', async () => {
  const source = Object.assign({}, baseSource);
  // @ts-ignore
  source.catalogNumber = 'C3';
  source.occurrenceID = 'X3';
  source.collectionRemarks = '*end date foo';

  await clearLogs(db);
  const specimen = await Specimen.create(db, source);
  expect(specimen?.problems).toContain('end date syntax');
  let found = await containsLog(db, source.catalogNumber, 'end date syntax', false);
  expect(found).toBeTruthy();

  // make sure problem was written to the database
  const readSpecimen = await Specimen.getByCatNum(db, source.catalogNumber, false);
  expect(readSpecimen).toEqual(specimen);
});

test('end date but no start date', async () => {
  {
    const source = Object.assign({}, baseSource);
    source.catalogNumber = 'C4';
    source.occurrenceID = 'X4';
    source.startDate = '';

    await clearLogs(db);
    const specimen = await Specimen.create(db, source);
    expect(specimen?.problems).toContain('no start date');
    let found = await containsLog(db, source.catalogNumber, 'no start date', false);
    expect(found).toBeTruthy();
  }
  {
    const source = Object.assign({}, baseSource);
    source.catalogNumber = 'C5';
    source.occurrenceID = 'X5';
    // @ts-ignore
    source.startDate = undefined;

    await clearLogs(db);
    const specimen = await Specimen.create(db, source);
    expect(specimen?.problems).toContain('no start date');
    let found = await containsLog(db, source.catalogNumber, 'no start date', false);
    expect(found).toBeTruthy();
  }
});

test('start date follows end date', async () => {
  const startDateISO = startDate.toISOString();
  const source = Object.assign({}, baseSource);
  // @ts-ignore
  source.catalogNumber = 'C6';
  source.occurrenceID = 'X6';
  source.startDate = endDate.toISOString();
  source.collectionRemarks =
    '*end date ' + startDateISO.substring(0, startDateISO.indexOf('T'));

  await clearLogs(db);
  const specimen = await Specimen.create(db, source);
  expect(specimen?.problems).toContain('Start date follows end date');
  let found = await containsLog(
    db,
    source.catalogNumber,
    'Start date follows end date',
    false
  );
  expect(found).toBeTruthy();
});

test('bad specimen count', async () => {
  const source = Object.assign({}, baseSource);
  source.catalogNumber = 'C7';
  source.occurrenceID = 'X7';
  source.organismQuantity = 'foo';

  await clearLogs(db);
  const specimen = await Specimen.create(db, source);
  expect(specimen?.problems).toContain('Invalid specimen count');
  let found = await containsLog(
    db,
    source.catalogNumber,
    'Invalid specimen count',
    false
  );
  expect(found).toBeTruthy();
});

test('multiple problems with specimen', async () => {
  const source = Object.assign({}, baseSource);
  // @ts-ignore
  source.catalogNumber = 'C10';
  source.occurrenceID = 'X10';
  source.collectionRemarks = '*end date foo';
  source.organismQuantity = 'foo';

  await clearLogs(db);
  const specimen = await Specimen.create(db, source);
  expect(specimen?.problems).toContain('end date syntax');
  expect(specimen?.problems).toContain('Invalid specimen count');
  let found = await containsLog(db, source.catalogNumber, 'end date syntax', false);
  expect(found).toBeTruthy();
  found = await containsLog(db, source.catalogNumber, 'Invalid specimen count', false);
  expect(found).toBeTruthy();

  // make sure problem was written to the database
  const readSpecimen = await Specimen.getByCatNum(db, source.catalogNumber, false);
  expect(readSpecimen).toEqual(specimen);
});

afterAll(async () => {
  await session.end();
});

async function clearLogs(db: DB) {
  const nowDate = new Date(new Date().getTime() + 100);
  await Logs.clear(db, nowDate);
}

async function containsLog(
  db: DB,
  catalogNumber: string,
  portion: string,
  failed: boolean
): Promise<boolean> {
  const logs = await Logs.getBeforeID(db, 100, 100);
  for (const log of logs) {
    if (
      log.type == LogType.Import &&
      log.tag == catalogNumber &&
      log.line.includes(portion)
    ) {
      return !failed || log.line.includes('IMPORT FAILED');
    }
  }
  return false;
}
