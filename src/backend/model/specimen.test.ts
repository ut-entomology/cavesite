import type { DB } from '../integrations/postgres';
import { toLocalDate } from '../integrations/postgres';
import { DatabaseMutex } from '../util/test_util';
import { type SpecimenSource, Specimen } from './specimen';
import {
  QueryColumnID,
  type QueryColumnSpec,
  type QueryDateFilter,
  type QueryLocationFilter,
  type QueryTaxonFilter
} from '../../shared/general_query';
import { Location } from './location';
import { Taxon } from './taxon';
import { Logs, LogType } from './logs';

const startDate = toLocalDate(new Date('2020-01-01'));
const endDate = toLocalDate(new Date('2020-01-04'));
const endDateStr = _toEndDate(2020, 1, 4);
const detDate = toLocalDate(new Date('2020-06-10'));

const startDate1 = toLocalDate(new Date('2021-01-01'));
const endDate1 = toLocalDate(new Date('2021-01-03'));
const startDate2 = toLocalDate(new Date('2021-01-04'));
const detDate2 = toLocalDate(new Date('2022-01-01'));

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

  eventDate: startDate.toISOString(),
  recordedBy: 'Some One | Another P. Someone, II | Foo | Baz, Jr.',
  dateIdentified: detDate.toISOString(),
  identifiedBy: 'Person A | Person B',
  eventRemarks: 'meadow; ' + endDateStr,
  occurrenceRemarks: 'occurrence remark',
  identificationRemarks: 'big one',
  typeStatus: '',
  organismQuantity: '1'
};

const mutex = new DatabaseMutex();
let db: DB;

beforeAll(async () => {
  db = await mutex.lock();
});

describe('basic specimen methods', () => {
  test('missing catalog number', async () => {
    await Specimen.dropAll(db);
    await Taxon.dropAll(db);

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
      expect(found).toEqual(true);
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
      expect(found).toEqual(true);
    }
  });

  test('creating a fully-specified specimen', async () => {
    await Specimen.dropAll(db);
    await Taxon.dropAll(db);

    // test creating a fully-specified specimen

    {
      const specimen = await Specimen.create(db, baseSource);
      expect(specimen).toEqual({
        catalogNumber: baseSource.catalogNumber,
        occurrenceGuid: baseSource.occurrenceID,
        taxonID: 7,
        localityID: 5,
        collectionStartDate: startDate,
        collectionEndDate: endDate,
        partialStartDate: null,
        partialEndDate: null,
        collectors: 'Some One|Another P. Someone, II|Foo|Baz, Jr.',
        normalizedCollectors: 'baz, jr.|foo|one|someone, ii',
        determinationYear: detDate.getUTCFullYear(),
        determiners: 'Person A|Person B',
        collectionRemarks: 'meadow',
        occurrenceRemarks: baseSource.occurrenceRemarks,
        determinationRemarks: baseSource.identificationRemarks,
        typeStatus: null,
        specimenCount: 1,
        lifeStage: null,
        problems: null,
        kingdomName: 'Animalia',
        kingdomID: 1,
        phylumName: 'Arthropoda',
        phylumID: 2,
        className: 'Arachnida',
        classID: 3,
        orderName: 'Araneae',
        orderID: 4,
        familyName: 'Araneidae',
        familyID: 5,
        genusName: 'Argiope',
        genusID: 6,
        subgenus: null,
        speciesName: 'aurantia',
        speciesID: 7,
        subspeciesName: null,
        subspeciesID: null,
        taxonUnique: 'Argiope aurantia',
        taxonAuthor: 'Lucas, 1833',
        obligate: null,
        countyName: 'Travis County',
        countyID: 4,
        localityName: 'My backyard',
        latitude: 23.45,
        longitude: -93.21
      });
      expect((await Taxon.getByID(db, 1))?.taxonName).toEqual('Animalia');
      expect((await Taxon.getByID(db, 2))?.taxonName).toEqual('Arthropoda');
      expect((await Taxon.getByID(db, 5))?.taxonName).toEqual('Araneidae');
      expect((await Taxon.getByID(db, 7))?.taxonName).toEqual('aurantia');
      expect((await _getLocationByID(db, 1))?.locationName).toEqual('North America');
      expect((await _getLocationByID(db, 3))?.locationName).toEqual('Texas');
      expect((await _getLocationByID(db, 5))?.locationName).toEqual('My backyard');

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

        eventDate: startDate.toISOString(),
        recordedBy: 'Any Body',
        identifiedBy: 'Person C'
      };
      const specimen = await Specimen.create(db, source);
      expect(specimen).toEqual({
        catalogNumber: source.catalogNumber,
        occurrenceGuid: source.occurrenceID,
        taxonID: 8,
        localityID: 6,
        collectionStartDate: startDate,
        collectionEndDate: null,
        partialStartDate: null,
        partialEndDate: null,
        collectors: 'Any Body',
        normalizedCollectors: 'body',
        determinationYear: null,
        determiners: 'Person C',
        collectionRemarks: null,
        occurrenceRemarks: null,
        determinationRemarks: null,
        typeStatus: null,
        specimenCount: null,
        lifeStage: null,
        problems: null,
        kingdomName: 'Animalia',
        kingdomID: 1,
        phylumName: 'Arthropoda',
        phylumID: 2,
        className: 'Arachnida',
        classID: 3,
        orderName: 'Araneae',
        orderID: 4,
        familyName: 'Thomisidae',
        familyID: 8,
        genusName: null,
        genusID: null,
        subgenus: null,
        speciesName: null,
        speciesID: null,
        subspeciesName: null,
        subspeciesID: null,
        taxonUnique: 'Thomisidae',
        taxonAuthor: null,
        obligate: null,
        countyName: null,
        countyID: null,
        localityName: 'Their backyard',
        latitude: null,
        longitude: null
      });
      expect((await Taxon.getByID(db, 8))?.taxonName).toEqual('Thomisidae');
      expect((await _getLocationByID(db, 6))?.locationName).toEqual('Their backyard');
    }

    // test committing specimens

    {
      let specimen = await Specimen.getByCatNum(db, 'C1', true);
      expect(specimen).toBeNull();

      await Specimen.commit(db);

      specimen = await Specimen.getByCatNum(db, 'C1', true);
      expect(specimen?.catalogNumber).toEqual('C1');
    }

    // test replacing existing results

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
      expect(found).toEqual(true);
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
      expect(found).toEqual(true);
    }
  });

  test('specimen with subgenus encoded in det remarks', async () => {
    await Specimen.dropAll(db);
    await Taxon.dropAll(db);

    const specimen = await Specimen.create(
      db,
      Object.assign({}, baseSource, {
        identificationRemarks: 'blind; subgenus Subby; more notes'
      })
    );
    expect(specimen).toEqual({
      catalogNumber: baseSource.catalogNumber,
      occurrenceGuid: baseSource.occurrenceID,
      taxonID: 7,
      localityID: 5,
      collectionStartDate: startDate,
      collectionEndDate: endDate,
      partialStartDate: null,
      partialEndDate: null,
      collectors: 'Some One|Another P. Someone, II|Foo|Baz, Jr.',
      normalizedCollectors: 'baz, jr.|foo|one|someone, ii',
      determinationYear: detDate.getUTCFullYear(),
      determiners: 'Person A|Person B',
      collectionRemarks: 'meadow',
      occurrenceRemarks: baseSource.occurrenceRemarks,
      determinationRemarks: 'blind; subgenus Subby; more notes',
      typeStatus: null,
      specimenCount: 1,
      lifeStage: null,
      problems: null,
      kingdomName: 'Animalia',
      kingdomID: 1,
      phylumName: 'Arthropoda',
      phylumID: 2,
      className: 'Arachnida',
      classID: 3,
      orderName: 'Araneae',
      orderID: 4,
      familyName: 'Araneidae',
      familyID: 5,
      genusName: 'Argiope',
      genusID: 6,
      subgenus: 'Subby',
      speciesName: 'aurantia',
      speciesID: 7,
      subspeciesName: null,
      subspeciesID: null,
      taxonUnique: 'Argiope aurantia',
      taxonAuthor: 'Lucas, 1833',
      obligate: null,
      countyName: 'Travis County',
      countyID: 4,
      localityName: 'My backyard',
      latitude: 23.45,
      longitude: -93.21
    });
    expect((await Taxon.getByID(db, 1))?.taxonName).toEqual('Animalia');
    expect((await Taxon.getByID(db, 2))?.taxonName).toEqual('Arthropoda');
    expect((await Taxon.getByID(db, 5))?.taxonName).toEqual('Araneidae');
    expect((await Taxon.getByID(db, 6))?.taxonName).toEqual('Argiope');
    expect((await Taxon.getByID(db, 7))?.taxonName).toEqual('aurantia');
    expect((await _getLocationByID(db, 1))?.locationName).toEqual('North America');
    expect((await _getLocationByID(db, 3))?.locationName).toEqual('Texas');
    expect((await _getLocationByID(db, 5))?.locationName).toEqual('My backyard');

    const readSpecimen = await Specimen.getByCatNum(
      db,
      baseSource.catalogNumber,
      false
    );
    expect(readSpecimen).toEqual(specimen);
  });

  test('specimen with new species encoded in det remarks', async () => {
    await Specimen.dropAll(db);
    await Taxon.dropAll(db);

    const specimen = await Specimen.create(
      db,
      Object.assign({}, baseSource, {
        specificEpithet: '',
        scientificName: 'Argiope',
        identificationRemarks: 'big one; n. sp. A'
      })
    );
    expect(specimen).toEqual({
      catalogNumber: baseSource.catalogNumber,
      occurrenceGuid: baseSource.occurrenceID,
      taxonID: 6,
      localityID: 5,
      collectionStartDate: startDate,
      collectionEndDate: endDate,
      partialStartDate: null,
      partialEndDate: null,
      collectors: 'Some One|Another P. Someone, II|Foo|Baz, Jr.',
      normalizedCollectors: 'baz, jr.|foo|one|someone, ii',
      determinationYear: detDate.getUTCFullYear(),
      determiners: 'Person A|Person B',
      collectionRemarks: 'meadow',
      occurrenceRemarks: baseSource.occurrenceRemarks,
      determinationRemarks: 'big one; n. sp. A',
      typeStatus: 'undescribed',
      specimenCount: 1,
      lifeStage: null,
      problems: null,
      kingdomName: 'Animalia',
      kingdomID: 1,
      phylumName: 'Arthropoda',
      phylumID: 2,
      className: 'Arachnida',
      classID: 3,
      orderName: 'Araneae',
      orderID: 4,
      familyName: 'Araneidae',
      familyID: 5,
      genusName: 'Argiope',
      genusID: 6,
      subgenus: null,
      speciesName: null,
      speciesID: null,
      subspeciesName: null,
      subspeciesID: null,
      taxonUnique: 'Argiope',
      taxonAuthor: null,
      obligate: null,
      countyName: 'Travis County',
      countyID: 4,
      localityName: 'My backyard',
      latitude: 23.45,
      longitude: -93.21
    });
    expect((await Taxon.getByID(db, 1))?.taxonName).toEqual('Animalia');
    expect((await Taxon.getByID(db, 2))?.taxonName).toEqual('Arthropoda');
    expect((await Taxon.getByID(db, 5))?.taxonName).toEqual('Araneidae');
    expect((await Taxon.getByID(db, 6))?.taxonName).toEqual('Argiope');
    expect((await _getLocationByID(db, 1))?.locationName).toEqual('North America');
    expect((await _getLocationByID(db, 3))?.locationName).toEqual('Texas');
    expect((await _getLocationByID(db, 5))?.locationName).toEqual('My backyard');

    const readSpecimen = await Specimen.getByCatNum(
      db,
      baseSource.catalogNumber,
      false
    );
    expect(readSpecimen).toEqual(specimen);
  });

  test('creating a cave obligate specimen', async () => {
    await Specimen.dropAll(db);
    await Taxon.dropAll(db);

    const specimen = await _createSpecimen4(db);
    expect(specimen).toEqual({
      catalogNumber: 'Q4',
      occurrenceGuid: 'GQ4',
      taxonID: 7,
      localityID: 5,
      collectionStartDate: startDate,
      collectionEndDate: null,
      partialStartDate: null,
      partialEndDate: null,
      collectors: 'Some One',
      normalizedCollectors: 'one',
      determinationYear: null,
      determiners: null,
      collectionRemarks: null,
      occurrenceRemarks: null,
      determinationRemarks: null,
      typeStatus: null,
      specimenCount: null,
      lifeStage: null,
      problems: null,
      kingdomName: 'Animalia',
      kingdomID: 1,
      phylumName: 'Arthropoda',
      phylumID: 2,
      className: 'Insecta',
      classID: 3,
      orderName: 'Zygentoma',
      orderID: 4,
      familyName: 'Nicoletiidae',
      familyID: 5,
      genusName: 'Texoreddellia',
      genusID: 6,
      subgenus: null,
      speciesName: 'aquilonalis',
      speciesID: 7,
      subspeciesName: null,
      subspeciesID: null,
      taxonUnique: 'Texoreddellia aquilonalis',
      taxonAuthor: null,
      obligate: 'cave',
      countyName: 'Travis County',
      countyID: 4,
      localityName: 'My backyard',
      latitude: 23.45,
      longitude: -93.21
    });
    expect((await Taxon.getByID(db, 1))?.taxonName).toEqual('Animalia');
    expect((await Taxon.getByID(db, 2))?.taxonName).toEqual('Arthropoda');
    expect((await Taxon.getByID(db, 5))?.taxonName).toEqual('Nicoletiidae');
    expect((await Taxon.getByID(db, 6))?.taxonName).toEqual('Texoreddellia');
    expect((await Taxon.getByID(db, 7))?.taxonName).toEqual('aquilonalis');

    const readSpecimen = await Specimen.getByCatNum(db, specimen!.catalogNumber, false);
    expect(readSpecimen).toEqual(specimen);
  });

  test('end date but no start date', async () => {
    {
      const source = Object.assign({}, baseSource);
      source.catalogNumber = 'C4';
      source.occurrenceID = 'X4';
      source.eventDate = '';

      await clearLogs(db);
      const specimen = await Specimen.create(db, source);
      expect(specimen?.problems).toContain('no start date');
      let found = await containsLog(db, source.catalogNumber, 'no start date', false);
      expect(found).toEqual(true);
    }
    {
      const source = Object.assign({}, baseSource);
      source.catalogNumber = 'C5';
      source.occurrenceID = 'X5';
      // @ts-ignore
      source.eventDate = undefined;

      await clearLogs(db);
      const specimen = await Specimen.create(db, source);
      expect(specimen?.problems).toContain('no start date');
      let found = await containsLog(db, source.catalogNumber, 'no start date', false);
      expect(found).toEqual(true);
    }
  });

  test('start date follows end date', async () => {
    const startDateISO = startDate.toISOString();
    const source = Object.assign({}, baseSource);
    // @ts-ignore
    source.catalogNumber = 'C6';
    source.occurrenceID = 'X6';
    source.eventDate = endDateStr;
    source.eventRemarks =
      'ended ' + startDateISO.substring(0, startDateISO.indexOf('T'));

    await clearLogs(db);
    const specimen = await Specimen.create(db, source);
    expect(specimen?.problems).toContain('Start date follows end date');
    let found = await containsLog(
      db,
      source.catalogNumber,
      'Start date follows end date',
      false
    );
    expect(found).toEqual(true);
  });

  test('end date follows start date by too much time', async () => {
    const startDateISO = new Date('10/10/70').toISOString();
    const endDateISO = new Date('10/10/80').toISOString();
    const source = Object.assign({}, baseSource);
    // @ts-ignore
    source.catalogNumber = 'C99';
    source.occurrenceID = 'X99';
    source.eventDate = startDateISO;
    source.eventRemarks = 'ended ' + endDateISO.substring(0, startDateISO.indexOf('T'));

    await clearLogs(db);
    const specimen = await Specimen.create(db, source);
    expect(specimen?.problems).toContain('dropped end date');
    let found = await containsLog(
      db,
      source.catalogNumber,
      'End date Fri Oct 10 1980 follows start date Sat Oct 10 1970 by more than 124 days; dropped end date',
      false
    );
    expect(found).toEqual(true);
  });

  test('partial determination dates', async () => {
    let source = Object.assign({}, baseSource);
    source.catalogNumber = 'DET1';
    source.dateIdentified = '1985';
    await Specimen.create(db, source);

    source = Object.assign({}, baseSource);
    source.catalogNumber = 'DET2';
    source.dateIdentified = '00/00/1999';
    await Specimen.create(db, source);

    source = Object.assign({}, baseSource);
    source.catalogNumber = 'DET3';
    source.dateIdentified = '01-00-2001';
    await Specimen.create(db, source);

    await Specimen.commit(db);

    let specimen = await Specimen.getByCatNum(db, 'DET1', true);
    expect(specimen?.determinationYear).toEqual(1985);
    specimen = await Specimen.getByCatNum(db, 'DET2', true);
    expect(specimen?.determinationYear).toEqual(1999);
    specimen = await Specimen.getByCatNum(db, 'DET3', true);
    expect(specimen?.determinationYear).toEqual(2001);
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
    expect(found).toEqual(true);
  });

  test('multiple problems with specimen', async () => {
    const source = Object.assign({}, baseSource);
    // @ts-ignore
    source.catalogNumber = 'C10';
    source.occurrenceID = 'X10';
    source.eventRemarks = 'ended 1900-01-01';
    source.organismQuantity = 'foo';

    await clearLogs(db);
    const specimen = await Specimen.create(db, source);
    expect(specimen?.problems).toContain('Start date follows end date');
    expect(specimen?.problems).toContain('Invalid specimen count');
    let found = await containsLog(
      db,
      source.catalogNumber,
      'Start date follows end date',
      false
    );
    expect(found).toEqual(true);
    found = await containsLog(
      db,
      source.catalogNumber,
      'Invalid specimen count',
      false
    );
    expect(found).toEqual(true);

    // make sure problem was written to the database
    const readSpecimen = await Specimen.getByCatNum(db, source.catalogNumber, false);
    expect(readSpecimen).toEqual(specimen);
  });
});

describe('partial start and end dates', () => {
  test('start date missing month', async () => {
    await Specimen.dropAll(db);

    const source = Object.assign({}, baseSource);
    source.catalogNumber = 'C1';
    source.occurrenceID = 'X1';
    source.eventRemarks = _toStartDate(2022);
    const specimen = await Specimen.create(db, source);

    expect(specimen?.collectionStartDate).toEqual(new Date(2022, 0, 1));
    expect(specimen?.partialStartDate).toEqual('2022');
    expect(specimen?.collectionEndDate).toEqual(new Date(2022, 11, 31));
    expect(specimen?.partialEndDate).toBe(null);
    const readSpecimen = await Specimen.getByCatNum(db, 'C1', false);
    expect(readSpecimen?.collectionStartDate).toEqual(new Date(2022, 0, 1));
    expect(readSpecimen?.partialStartDate).toEqual('2022');
    expect(readSpecimen?.collectionEndDate).toEqual(new Date(2022, 11, 31));
    expect(readSpecimen?.partialEndDate).toBe(null);
  });

  test('start date missing day of month', async () => {
    await Specimen.dropAll(db);

    const source = Object.assign({}, baseSource);
    source.catalogNumber = 'C1';
    source.occurrenceID = 'X1';
    source.eventRemarks = _toStartDate(2022, 6);
    const specimen = await Specimen.create(db, source);

    expect(specimen?.collectionStartDate).toEqual(new Date(2022, 5, 1));
    expect(specimen?.partialStartDate).toEqual('2022-6');
    expect(specimen?.collectionEndDate).toEqual(new Date(2022, 5, 30));
    expect(specimen?.partialEndDate).toBe(null);
    const readSpecimen = await Specimen.getByCatNum(db, 'C1', false);
    expect(readSpecimen?.collectionStartDate).toEqual(new Date(2022, 5, 1));
    expect(readSpecimen?.partialStartDate).toEqual('2022-6');
    expect(readSpecimen?.collectionEndDate).toEqual(new Date(2022, 5, 30));
    expect(readSpecimen?.partialEndDate).toBe(null);
  });

  test('end date missing month', async () => {
    await Specimen.dropAll(db);

    const source = Object.assign({}, baseSource);
    source.catalogNumber = 'C1';
    source.occurrenceID = 'X1';
    source.eventDate = new Date(2022, 5, 12).toISOString();
    source.eventRemarks = _toEndDate(2022);
    const specimen = await Specimen.create(db, source);

    expect(specimen?.collectionStartDate).toEqual(new Date(2022, 5, 12));
    expect(specimen?.partialStartDate).toBe(null);
    expect(specimen?.collectionEndDate).toEqual(new Date(2022, 11, 31));
    expect(specimen?.partialEndDate).toBe('2022');
    const readSpecimen = await Specimen.getByCatNum(db, 'C1', false);
    expect(readSpecimen?.collectionStartDate).toEqual(new Date(2022, 5, 12));
    expect(readSpecimen?.partialStartDate).toBe(null);
    expect(readSpecimen?.collectionEndDate).toEqual(new Date(2022, 11, 31));
    expect(readSpecimen?.partialEndDate).toBe('2022');
  });

  test('end date missing day of month', async () => {
    await Specimen.dropAll(db);

    const source = Object.assign({}, baseSource);
    source.catalogNumber = 'C1';
    source.occurrenceID = 'X1';
    source.eventDate = new Date(2022, 5, 12).toISOString();
    source.eventRemarks = _toEndDate(2022, 6);
    const specimen = await Specimen.create(db, source);

    expect(specimen?.collectionStartDate).toEqual(new Date(2022, 5, 12));
    expect(specimen?.partialStartDate).toBe(null);
    expect(specimen?.collectionEndDate).toEqual(new Date(2022, 5, 30));
    expect(specimen?.partialEndDate).toBe('2022-6');
    const readSpecimen = await Specimen.getByCatNum(db, 'C1', false);
    expect(readSpecimen?.collectionStartDate).toEqual(new Date(2022, 5, 12));
    expect(readSpecimen?.partialStartDate).toBe(null);
    expect(readSpecimen?.collectionEndDate).toEqual(new Date(2022, 5, 30));
    expect(readSpecimen?.partialEndDate).toBe('2022-6');
  });

  test('start and end dates of differnt months missing day of month', async () => {
    await Specimen.dropAll(db);

    const source = Object.assign({}, baseSource);
    source.catalogNumber = 'C1';
    source.occurrenceID = 'X1';
    source.eventRemarks = _toStartDate(2022, 6) + '; ' + _toEndDate(2022, 8);
    const specimen = await Specimen.create(db, source);

    expect(specimen?.collectionStartDate).toEqual(new Date(2022, 5, 1));
    expect(specimen?.partialStartDate).toEqual('2022-6');
    expect(specimen?.collectionEndDate).toEqual(new Date(2022, 7, 31));
    expect(specimen?.partialEndDate).toBe('2022-8');
    const readSpecimen = await Specimen.getByCatNum(db, 'C1', false);
    expect(readSpecimen?.collectionStartDate).toEqual(new Date(2022, 5, 1));
    expect(readSpecimen?.partialStartDate).toEqual('2022-6');
    expect(readSpecimen?.collectionEndDate).toEqual(new Date(2022, 7, 31));
    expect(readSpecimen?.partialEndDate).toBe('2022-8');
  });
});

describe('general specimen query', () => {
  test('querying for specified columns', async () => {
    await Specimen.dropAll(db);
    const specimen1 = await _createSpecimen1(db);
    const specimen2 = await _createSpecimen2(db);
    await Specimen.commit(db);

    let dateSpec = _toColumnSpec(QueryColumnID.CollectionStartDate, true);

    // prettier-ignore
    let results = await Specimen.generalQuery(
      db, [dateSpec, _toColumnSpec(QueryColumnID.CatalogNumber)],
      null, null, null, 0, 10);
    expect(results[0]).toEqual([
      {
        catalogNumber: 'Q1',
        occurrenceGuid: 'GQ1',
        collectionStartDate: startDate1,
        partialStartDate: null
      },
      {
        catalogNumber: 'Q2',
        occurrenceGuid: 'GQ2',
        collectionStartDate: startDate2,
        partialStartDate: null
      }
    ]);
    expect(results[1]).toEqual(2);

    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [dateSpec], null, null, null, 0, 10);
    expect(results[0]).toEqual([
      { collectionStartDate: startDate1, partialStartDate: null },
      { collectionStartDate: startDate2, partialStartDate: null }
    ]);
    expect(results[1]).toEqual(2);

    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [dateSpec, _toColumnSpec(QueryColumnID.CollectionEndDate)],
      null, null, null, 0, 10);
    expect(results[0]).toEqual([
      {
        collectionStartDate: startDate1,
        partialStartDate: null,
        collectionEndDate: endDate1,
        partialEndDate: null
      },
      {
        collectionStartDate: startDate2,
        partialStartDate: null,
        collectionEndDate: null,
        partialEndDate: null
      }
    ]);
    expect(results[1]).toEqual(2);

    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [dateSpec, _toColumnSpec(QueryColumnID.Collectors)],
      null, null, null, 0, 10);
    expect(results[0]).toEqual([
      {
        collectionStartDate: startDate1,
        partialStartDate: null,
        collectors: 'Some One|Another P. Someone, II|Foo|Baz, Jr.'
      },
      {
        collectionStartDate: startDate2,
        partialStartDate: null,
        collectors: 'Person X'
      }
    ]);
    expect(results[1]).toEqual(2);

    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [dateSpec, _toColumnSpec(QueryColumnID.Determiners)],
      null, null, null, 0, 10);
    expect(results[0]).toEqual([
      {
        collectionStartDate: startDate1,
        partialStartDate: null,
        determiners: 'Person A|Person B'
      },
      {
        collectionStartDate: startDate2,
        partialStartDate: null,
        determiners: 'Person Y'
      }
    ]);
    expect(results[1]).toEqual(2);

    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [dateSpec, _toColumnSpec(QueryColumnID.DeterminationYear)],
      null, null, null, 0, 10);
    expect(results[0]).toEqual([
      {
        collectionStartDate: startDate1,
        partialStartDate: null,
        determinationYear: detDate.getFullYear()
      },
      {
        collectionStartDate: startDate2,
        partialStartDate: null,
        determinationYear: detDate2.getFullYear()
      }
    ]);
    expect(results[1]).toEqual(2);

    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [dateSpec, _toColumnSpec(QueryColumnID.CollectionRemarks)],
      null, null, null, 0, 10);
    expect(results[0]).toEqual([
      {
        collectionStartDate: startDate1,
        partialStartDate: null,
        collectionRemarks: 'cave'
      },
      {
        collectionStartDate: startDate2,
        partialStartDate: null,
        collectionRemarks: null
      }
    ]);

    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [dateSpec, _toColumnSpec(QueryColumnID.OccurrenceRemarks)],
      null, null, null, 0, 10);
    expect(results[0]).toEqual([
      {
        collectionStartDate: startDate1,
        partialStartDate: null,
        occurrenceRemarks: baseSource.occurrenceRemarks
      },
      {
        collectionStartDate: startDate2,
        partialStartDate: null,
        occurrenceRemarks: null
      }
    ]);

    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [dateSpec, _toColumnSpec(QueryColumnID.DeterminationRemarks)],
      null, null, null, 0, 10);
    expect(results[0]).toEqual([
      {
        collectionStartDate: startDate1,
        partialStartDate: null,
        determinationRemarks: baseSource.identificationRemarks
      },
      {
        collectionStartDate: startDate2,
        partialStartDate: null,
        determinationRemarks: null
      }
    ]);

    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [dateSpec, _toColumnSpec(QueryColumnID.TypeStatus)],
      null, null, null, 0, 10);
    expect(results[0]).toEqual([
      {
        collectionStartDate: startDate1,
        partialStartDate: null,
        typeStatus: specimen1!.typeStatus
      },
      {
        collectionStartDate: startDate2,
        partialStartDate: null,
        typeStatus: specimen2!.typeStatus
      }
    ]);

    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [dateSpec, _toColumnSpec(QueryColumnID.SpecimenCount)],
      null, null, null, 0, 10);
    expect(results[0]).toEqual([
      { collectionStartDate: startDate1, partialStartDate: null, specimenCount: 1 },
      { collectionStartDate: startDate2, partialStartDate: null, specimenCount: 2 }
    ]);

    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [dateSpec, _toColumnSpec(QueryColumnID.Problems)],
      null, null, null, 0, 10);
    expect(results[0]).toEqual([
      { collectionStartDate: startDate1, partialStartDate: null, problems: null },
      {
        collectionStartDate: startDate2,
        partialStartDate: null,
        problems: 'Start date follows end date Mon Jan 01 1900; end date ignored'
      }
    ]);

    const checkColumns = async (
      columnID: QueryColumnID,
      nameColumn: keyof Specimen,
      idColumn: keyof Specimen
    ) => {
      // prettier-ignore
      let results = await Specimen.generalQuery(
        db, [dateSpec, _toColumnSpec(columnID)],
        null, null, null, 0, 10);
      expect(results[0]).toEqual([
        {
          collectionStartDate: startDate1,
          partialStartDate: null,
          [nameColumn]: specimen1![nameColumn],
          [idColumn]: specimen1![idColumn]
        },
        {
          collectionStartDate: startDate2,
          partialStartDate: null,
          [nameColumn]: specimen2![nameColumn],
          [idColumn]: specimen2![idColumn]
        }
      ]);
    };

    await checkColumns(QueryColumnID.Phylum, 'phylumName', 'phylumID');
    await checkColumns(QueryColumnID.Class, 'className', 'classID');
    await checkColumns(QueryColumnID.Order, 'orderName', 'orderID');
    await checkColumns(QueryColumnID.Family, 'familyName', 'familyID');
    await checkColumns(QueryColumnID.Genus, 'genusName', 'genusID');
    await checkColumns(QueryColumnID.Species, 'speciesName', 'speciesID');
    await checkColumns(QueryColumnID.Subspecies, 'subspeciesName', 'subspeciesID');

    await checkColumns(QueryColumnID.County, 'countyName', 'countyID');
    await checkColumns(QueryColumnID.Locality, 'localityName', 'localityID');

    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [dateSpec, _toColumnSpec(QueryColumnID.Latitude)],
      null, null, null, 0, 10);
    expect(results[0]).toEqual([
      {
        collectionStartDate: startDate1,
        partialStartDate: null,
        latitude: specimen1!.latitude
      },
      {
        collectionStartDate: startDate2,
        partialStartDate: null,
        latitude: specimen2!.latitude
      }
    ]);

    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [dateSpec, _toColumnSpec(QueryColumnID.Longitude)],
      null, null, null, 0, 10);
    expect(results[0]).toEqual([
      {
        collectionStartDate: startDate1,
        partialStartDate: null,
        longitude: specimen1!.longitude
      },
      {
        collectionStartDate: startDate2,
        partialStartDate: null,
        longitude: specimen2!.longitude
      }
    ]);
  });

  test('query result order', async () => {
    await Specimen.dropAll(db);
    const specimen1 = await _createSpecimen1(db);
    const specimen2 = await _createSpecimen2(db);
    await Specimen.commit(db);

    // prettier-ignore
    let results = await Specimen.generalQuery(
      db, [_toColumnSpec(QueryColumnID.CatalogNumber, false)],
      null, null, null, 0, 10);
    expect(results[0]).toEqual([
      { catalogNumber: 'Q2', occurrenceGuid: 'GQ2' },
      { catalogNumber: 'Q1', occurrenceGuid: 'GQ1' }
    ]);
    expect(results[1]).toEqual(2);

    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [_toColumnSpec(QueryColumnID.CollectionEndDate, false)], 
      null, null, null, 0, 10);
    expect(results[0]).toEqual([
      { collectionEndDate: null, partialEndDate: null },
      { collectionEndDate: endDate1, partialEndDate: null }
    ]);
    expect(results[1]).toEqual(2);

    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [_toColumnSpec(QueryColumnID.TypeStatus, true)],
      null, null, null, 0, 10);
    expect(results[0]).toEqual([{ typeStatus: 'paratype' }, { typeStatus: null }]);
    expect(results[1]).toEqual(2);

    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [_toColumnSpec(QueryColumnID.SpecimenCount, false)],
      null, null, null, 0, 10);
    expect(results[0]).toEqual([{ specimenCount: 2 }, { specimenCount: 1 }]);

    const checkColumns = async (
      columnID: QueryColumnID,
      ascending: boolean,
      nameColumn: keyof Specimen,
      idColumn: keyof Specimen
    ) => {
      // prettier-ignore
      let results = await Specimen.generalQuery(
        db, [_toColumnSpec(columnID, ascending)],
        null, null, null, 0, 10);
      const spec1Result = {
        [nameColumn]: specimen1![nameColumn],
        [idColumn]: specimen1![idColumn]
      };
      const spec2Result = {
        [nameColumn]: specimen2![nameColumn],
        [idColumn]: specimen2![idColumn]
      };
      expect(results[0]).toEqual([spec2Result, spec1Result]);
    };
    expect(results[1]).toEqual(2);

    await checkColumns(QueryColumnID.Phylum, false, 'phylumName', 'phylumID');
    await checkColumns(QueryColumnID.Class, true, 'className', 'classID');
    await checkColumns(QueryColumnID.Order, false, 'orderName', 'orderID');
    await checkColumns(QueryColumnID.Family, false, 'familyName', 'familyID');
    await checkColumns(QueryColumnID.Genus, false, 'genusName', 'genusID');
    await checkColumns(QueryColumnID.Species, false, 'speciesName', 'speciesID');
    await checkColumns(
      QueryColumnID.Subspecies,
      true,
      'subspeciesName',
      'subspeciesID'
    );
    // prettier-ignore
    results = await Specimen.generalQuery(
        db, [_toColumnSpec(QueryColumnID.TaxonUnique, false)],
        null, null, null, 0, 10);
    const spec1Result = {
      taxonUnique: specimen1!.taxonUnique,
      taxonAuthor: specimen1!.taxonAuthor,
      taxonID: specimen1!.taxonID,
      genusID: specimen1!.genusID
    };
    const spec2Result = {
      taxonUnique: specimen2!.taxonUnique,
      taxonAuthor: specimen2!.taxonAuthor,
      taxonID: specimen2!.taxonID,
      genusID: specimen2!.genusID
    };
    expect(results[0]).toEqual([spec2Result, spec1Result]);

    await checkColumns(QueryColumnID.County, true, 'countyName', 'countyID');
    await checkColumns(QueryColumnID.Locality, true, 'localityName', 'localityID');

    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [_toColumnSpec(QueryColumnID.Latitude, false)],
      null, null, null, 0, 10);
    expect(results[0]).toEqual([
      { latitude: specimen2!.latitude },
      { latitude: specimen1!.latitude }
    ]);

    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [_toColumnSpec(QueryColumnID.Longitude, true)],
      null, null, null, 0, 10);
    expect(results[0]).toEqual([
      { longitude: specimen1!.longitude },
      { longitude: specimen2!.longitude }
    ]);
  });

  test('query based on whether columns are blank', async () => {
    await Specimen.dropAll(db);
    await _createSpecimen1(db);
    await _createSpecimen2(db);
    await Specimen.commit(db);

    // prettier-ignore
    let results = await Specimen.generalQuery(
      db, [
        _toColumnSpec(QueryColumnID.CatalogNumber),
        _toColumnSpec(QueryColumnID.CollectionEndDate, true)
      ], null, null, null, 0, 10);
    expect(results[0]).toEqual([
      {
        catalogNumber: 'Q1',
        occurrenceGuid: 'GQ1',
        collectionEndDate: endDate1,
        partialEndDate: null
      },
      {
        catalogNumber: 'Q2',
        occurrenceGuid: 'GQ2',
        collectionEndDate: null,
        partialEndDate: null
      }
    ]);
    expect(results[1]).toEqual(2);

    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [
        _toColumnSpec(QueryColumnID.CatalogNumber),
        _toColumnSpec(QueryColumnID.CollectionEndDate, null, 'Blank')
      ], null, null, null, 0, 10);
    expect(results[0]).toEqual([
      {
        catalogNumber: 'Q2',
        occurrenceGuid: 'GQ2',
        collectionEndDate: null,
        partialEndDate: null
      }
    ]);
    expect(results[1]).toEqual(1);

    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [
        _toColumnSpec(QueryColumnID.CatalogNumber),
        _toColumnSpec(QueryColumnID.CollectionEndDate, null, 'Non-blank')
      ], null, null, null, 0, 10);
    expect(results[0]).toEqual([
      {
        catalogNumber: 'Q1',
        occurrenceGuid: 'GQ1',
        collectionEndDate: endDate1,
        partialEndDate: null
      }
    ]);
    expect(results[1]).toEqual(1);
  });

  test('query with location constraints', async () => {
    await Specimen.dropAll(db);
    const specimen1 = await _createSpecimen1(db);
    const specimen2 = await _createSpecimen2(db);
    const specimen3 = await _createSpecimen3(db);
    await Specimen.commit(db);

    let locationFilter: QueryLocationFilter = {
      countyIDs: [specimen2!.countyID!],
      localityIDs: null
    };
    // prettier-ignore
    let results = await Specimen.generalQuery(
      db, [_toColumnSpec(QueryColumnID.CatalogNumber, true)],
      null, locationFilter, null, 0, 10);
    expect(results[0]).toEqual([{ catalogNumber: 'Q2', occurrenceGuid: 'GQ2' }]);
    expect(results[1]).toEqual(1);

    locationFilter = {
      countyIDs: [specimen1!.countyID!],
      localityIDs: null
    };
    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [_toColumnSpec(QueryColumnID.CatalogNumber, true)],
      null, locationFilter, null, 0, 10);
    expect(results[0]).toEqual([
      { catalogNumber: 'Q1', occurrenceGuid: 'GQ1' },
      { catalogNumber: 'Q3', occurrenceGuid: 'GQ3' }
    ]);
    expect(results[1]).toEqual(2);

    locationFilter = {
      countyIDs: [specimen1!.countyID!, specimen2!.countyID!],
      localityIDs: null
    };
    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [_toColumnSpec(QueryColumnID.CatalogNumber, true)],
      null, locationFilter, null, 0, 10);
    expect(results[0]).toEqual([
      { catalogNumber: 'Q1', occurrenceGuid: 'GQ1' },
      { catalogNumber: 'Q2', occurrenceGuid: 'GQ2' },
      { catalogNumber: 'Q3', occurrenceGuid: 'GQ3' }
    ]);
    expect(results[1]).toEqual(3);

    locationFilter = {
      countyIDs: null,
      localityIDs: [specimen1!.localityID!]
    };
    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [_toColumnSpec(QueryColumnID.CatalogNumber, true)],
      null, locationFilter, null, 0, 10);
    expect(results[0]).toEqual([{ catalogNumber: 'Q1', occurrenceGuid: 'GQ1' }]);
    expect(results[1]).toEqual(1);

    locationFilter = {
      countyIDs: null,
      localityIDs: [specimen1!.localityID!, specimen3!.localityID!]
    };
    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [_toColumnSpec(QueryColumnID.CatalogNumber, true)],
      null, locationFilter, null, 0, 10);
    expect(results[0]).toEqual([
      { catalogNumber: 'Q1', occurrenceGuid: 'GQ1' },
      { catalogNumber: 'Q3', occurrenceGuid: 'GQ3' }
    ]);
    expect(results[1]).toEqual(2);

    locationFilter = {
      countyIDs: [specimen2!.countyID!],
      localityIDs: [specimen3!.localityID!]
    };
    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [_toColumnSpec(QueryColumnID.CatalogNumber, true)],
      null, locationFilter, null, 0, 10);
    expect(results[0]).toEqual([
      { catalogNumber: 'Q2', occurrenceGuid: 'GQ2' },
      { catalogNumber: 'Q3', occurrenceGuid: 'GQ3' }
    ]);
    expect(results[1]).toEqual(2);

    locationFilter = {
      countyIDs: [specimen1!.countyID!],
      localityIDs: [specimen2!.localityID!]
    };
    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [_toColumnSpec(QueryColumnID.CatalogNumber, true)],
      null, locationFilter, null, 0, 10);
    expect(results[0]).toEqual([
      { catalogNumber: 'Q1', occurrenceGuid: 'GQ1' },
      { catalogNumber: 'Q2', occurrenceGuid: 'GQ2' },
      { catalogNumber: 'Q3', occurrenceGuid: 'GQ3' }
    ]);
    expect(results[1]).toEqual(3);
  });

  test('query with date constraints', async () => {
    await Specimen.dropAll(db);

    // Test use of only fromDate.

    await _createSpecimen1(db); // 2021-01-01 - 2021-01-03
    await _createSpecimen2(db); // 2021-01-04
    await _createSpecimen3(db); // 2020-01-01
    await _createSpecimen4(db); // 2020-01-01
    await Specimen.commit(db);

    let dateFilter: QueryDateFilter = {
      fromDateMillis: new Date('2021-01-01').getTime(),
      throughDateMillis: null
    };
    // prettier-ignore
    let results = await Specimen.generalQuery(
      db, [_toColumnSpec(QueryColumnID.CatalogNumber, true)],
      dateFilter, null, null, 0, 10);
    expect(results[0]).toEqual([
      { catalogNumber: 'Q1', occurrenceGuid: 'GQ1' },
      { catalogNumber: 'Q2', occurrenceGuid: 'GQ2' }
    ]);
    expect(results[1]).toEqual(2);

    // Test use of only throughDate.

    dateFilter = {
      fromDateMillis: null,
      throughDateMillis: new Date('2021-01-01').getTime()
    };
    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [_toColumnSpec(QueryColumnID.CatalogNumber, true)],
      dateFilter, null, null, 0, 10);
    expect(results[0]).toEqual([
      { catalogNumber: 'Q1', occurrenceGuid: 'GQ1' },
      { catalogNumber: 'Q3', occurrenceGuid: 'GQ3' },
      { catalogNumber: 'Q4', occurrenceGuid: 'GQ4' }
    ]);
    expect(results[1]).toEqual(3);

    // Test bracketing start dates.

    dateFilter = {
      fromDateMillis: new Date('2020-01-02').getTime(),
      throughDateMillis: new Date('2021-01-02').getTime()
    };
    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [_toColumnSpec(QueryColumnID.CatalogNumber, true)],
      dateFilter, null, null, 0, 10);
    expect(results[0]).toEqual([{ catalogNumber: 'Q1', occurrenceGuid: 'GQ1' }]);
    expect(results[1]).toEqual(1);

    // Test filtering before end date.

    dateFilter = {
      fromDateMillis: new Date('2021-01-02').getTime(),
      throughDateMillis: null
    };
    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [_toColumnSpec(QueryColumnID.CatalogNumber, true)],
      dateFilter, null, null, 0, 10);
    expect(results[0]).toEqual([
      { catalogNumber: 'Q1', occurrenceGuid: 'GQ1' },
      { catalogNumber: 'Q2', occurrenceGuid: 'GQ2' }
    ]);
    expect(results[1]).toEqual(2);

    // Test bracketing between start and end dates.

    dateFilter = {
      fromDateMillis: new Date('2021-01-02').getTime(),
      throughDateMillis: new Date('2021-01-02').getTime()
    };
    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [_toColumnSpec(QueryColumnID.CatalogNumber, true)],
      dateFilter, null, null, 0, 10);
    expect(results[0]).toEqual([{ catalogNumber: 'Q1', occurrenceGuid: 'GQ1' }]);
    expect(results[1]).toEqual(1);
  });

  test('query with taxa constraints', async () => {
    await Specimen.dropAll(db);
    const specimen1 = await _createSpecimen1(db);
    const specimen2 = await _createSpecimen2(db);
    const specimen3 = await _createSpecimen3(db);
    await Specimen.commit(db);

    let taxonFilter: QueryTaxonFilter = {
      phylumIDs: [specimen2!.phylumID!],
      classIDs: null,
      orderIDs: null,
      familyIDs: null,
      genusIDs: null,
      speciesIDs: null,
      subspeciesIDs: null
    };
    // prettier-ignore
    let results = await Specimen.generalQuery(
      db, [_toColumnSpec(QueryColumnID.CatalogNumber, true)],
      null, null, taxonFilter, 0, 10);
    expect(results[0]).toEqual([{ catalogNumber: 'Q2', occurrenceGuid: 'GQ2' }]);
    expect(results[1]).toEqual(1);

    taxonFilter = {
      phylumIDs: null,
      classIDs: [specimen1!.classID!],
      orderIDs: null,
      familyIDs: null,
      genusIDs: null,
      speciesIDs: null,
      subspeciesIDs: null
    };
    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [_toColumnSpec(QueryColumnID.CatalogNumber, true)],
      null, null, taxonFilter, 0, 10);
    expect(results[0]).toEqual([
      { catalogNumber: 'Q1', occurrenceGuid: 'GQ1' },
      { catalogNumber: 'Q3', occurrenceGuid: 'GQ3' }
    ]);
    expect(results[1]).toEqual(2);

    taxonFilter = {
      phylumIDs: null,
      classIDs: null,
      orderIDs: [specimen1!.orderID!, specimen2!.orderID!],
      familyIDs: null,
      genusIDs: null,
      speciesIDs: null,
      subspeciesIDs: null
    };
    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [_toColumnSpec(QueryColumnID.CatalogNumber, true)],
      null, null, taxonFilter, 0, 10);
    expect(results[0]).toEqual([
      { catalogNumber: 'Q1', occurrenceGuid: 'GQ1' },
      { catalogNumber: 'Q2', occurrenceGuid: 'GQ2' },
      { catalogNumber: 'Q3', occurrenceGuid: 'GQ3' }
    ]);
    expect(results[1]).toEqual(3);

    taxonFilter = {
      phylumIDs: null,
      classIDs: null,
      orderIDs: null,
      familyIDs: [specimen1!.familyID!],
      genusIDs: null,
      speciesIDs: null,
      subspeciesIDs: null
    };
    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [_toColumnSpec(QueryColumnID.CatalogNumber, true)],
      null, null, taxonFilter, 0, 10);
    expect(results[0]).toEqual([
      { catalogNumber: 'Q1', occurrenceGuid: 'GQ1' },
      { catalogNumber: 'Q3', occurrenceGuid: 'GQ3' }
    ]);
    expect(results[1]).toEqual(2);

    taxonFilter = {
      phylumIDs: null,
      classIDs: null,
      orderIDs: null,
      familyIDs: null,
      genusIDs: [specimen1!.genusID!, specimen2!.genusID!],
      speciesIDs: null,
      subspeciesIDs: null
    };
    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [_toColumnSpec(QueryColumnID.CatalogNumber, true)],
      null, null, taxonFilter, 0, 10);
    expect(results[0]).toEqual([
      { catalogNumber: 'Q1', occurrenceGuid: 'GQ1' },
      { catalogNumber: 'Q2', occurrenceGuid: 'GQ2' }
    ]);
    expect(results[1]).toEqual(2);

    taxonFilter = {
      phylumIDs: null,
      classIDs: null,
      orderIDs: null,
      familyIDs: null,
      genusIDs: null,
      speciesIDs: [specimen2!.speciesID!, specimen3!.speciesID!],
      subspeciesIDs: null
    };
    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [_toColumnSpec(QueryColumnID.CatalogNumber, true)], null, null, taxonFilter, 0, 10);
    expect(results[0]).toEqual([
      { catalogNumber: 'Q2', occurrenceGuid: 'GQ2' },
      { catalogNumber: 'Q3', occurrenceGuid: 'GQ3' }
    ]);

    taxonFilter = {
      phylumIDs: null,
      classIDs: null,
      orderIDs: null,
      familyIDs: null,
      genusIDs: null,
      speciesIDs: null,
      subspeciesIDs: [specimen2!.subspeciesID!]
    };
    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [_toColumnSpec(QueryColumnID.CatalogNumber, true)],
      null, null, taxonFilter, 0, 10);
    expect(results[0]).toEqual([{ catalogNumber: 'Q2', occurrenceGuid: 'GQ2' }]);

    taxonFilter = {
      phylumIDs: null,
      classIDs: null,
      orderIDs: [specimen2!.orderID!],
      familyIDs: null,
      genusIDs: null,
      speciesIDs: [specimen3!.speciesID!],
      subspeciesIDs: null
    };
    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [_toColumnSpec(QueryColumnID.CatalogNumber, true)],
      null, null, taxonFilter, 0, 10);
    expect(results[0]).toEqual([
      { catalogNumber: 'Q2', occurrenceGuid: 'GQ2' },
      { catalogNumber: 'Q3', occurrenceGuid: 'GQ3' }
    ]);
  });

  test('query for group counts', async () => {
    await Specimen.dropAll(db);
    const specimen1 = await _createSpecimen1(db);
    const specimen2 = await _createSpecimen2(db);
    const specimen3 = await _createSpecimen3(db);
    await Specimen.commit(db);

    // prettier-ignore
    let results = await Specimen.generalQuery(
      db, [_toColumnSpec(QueryColumnID.Family, true)],
      null, null, null, 0, 10);
    expect(results[0]).toEqual([
      { familyName: 'Araneidae', familyID: specimen1!.familyID },
      { familyName: 'Plethodontidae', familyID: specimen2!.familyID }
    ]);

    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [
        _toColumnSpec(QueryColumnID.RecordCount, true),
        _toColumnSpec(QueryColumnID.Family, true)
      ], null, null, null, 0, 10);
    expect(results[0]).toEqual([
      { recordCount: 1, familyName: 'Plethodontidae', familyID: specimen2!.familyID },
      { recordCount: 2, familyName: 'Araneidae', familyID: specimen1!.familyID }
    ]);

    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [
        _toColumnSpec(QueryColumnID.RecordCount, true),
        _toColumnSpec(QueryColumnID.Genus, true)
      ], null, null, null, 0, 10);
    expect(results[0]).toEqual([
      { recordCount: 1, genusName: 'Argiope', genusID: specimen1!.genusID },
      { recordCount: 1, genusName: 'Eurycea', genusID: specimen2!.genusID },
      { recordCount: 1, genusName: 'Gea', genusID: specimen3!.genusID }
    ]);
  });

  test('batch queries of filtered results', async () => {
    await Specimen.dropAll(db);
    await _createSpecimen1(db);
    const specimen2 = await _createSpecimen2(db);
    const specimen3 = await _createSpecimen3(db);
    await Specimen.commit(db);

    let taxonFilter = {
      phylumIDs: null,
      classIDs: null,
      orderIDs: [specimen2!.orderID!],
      familyIDs: null,
      genusIDs: null,
      speciesIDs: [specimen3!.speciesID!],
      subspeciesIDs: null
    };
    // prettier-ignore
    let results = await Specimen.generalQuery(
      db, [_toColumnSpec(QueryColumnID.CatalogNumber, true)],
      null, null, taxonFilter, 0, 1);
    expect(results[0]).toEqual([{ catalogNumber: 'Q2', occurrenceGuid: 'GQ2' }]);
    expect(results[1]).toEqual(2);

    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [_toColumnSpec(QueryColumnID.CatalogNumber, true)], 
      null, null, taxonFilter, 1, 1);
    expect(results[0]).toEqual([{ catalogNumber: 'Q3', occurrenceGuid: 'GQ3' }]);
    expect(results[1]).toEqual(null);
  });

  test('combined criteria query', async () => {
    await Specimen.dropAll(db);
    await _createSpecimen1(db);
    await _createSpecimen1(db);
    const specimen2 = await _createSpecimen2(db);
    const specimen3 = await _createSpecimen3(db);
    await Specimen.commit(db);

    let taxonFilter = {
      phylumIDs: null,
      classIDs: null,
      orderIDs: [specimen2!.orderID!],
      familyIDs: null,
      genusIDs: null,
      speciesIDs: [specimen3!.speciesID!],
      subspeciesIDs: null
    };
    // prettier-ignore
    let results = await Specimen.generalQuery(
      db, [
        _toColumnSpec(QueryColumnID.CatalogNumber, true),
        _toColumnSpec(QueryColumnID.CollectionRemarks, null, 'Non-blank')
      ], null, null, taxonFilter, 0, 10);
    expect(results[0]).toEqual([
      {
        catalogNumber: 'Q3',
        occurrenceGuid: 'GQ3',
        collectionRemarks: specimen3?.collectionRemarks
      }
    ]);
    expect(results[1]).toEqual(1);
  });

  test('returning no results', async () => {
    await Specimen.dropAll(db);
    await _createSpecimen1(db);
    await Specimen.commit(db);

    // prettier-ignore
    let results = await Specimen.generalQuery(
      db, [_toColumnSpec(QueryColumnID.Phylum, null, 'Blank')],
      null, null, null, 0, 10);
    expect(results).toEqual([[], 0]);

    // prettier-ignore
    results = await Specimen.generalQuery(db, [], 
      null, null, null, 0, 10);
    expect(results).toEqual([[], 0]);

    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [_toColumnSpec(QueryColumnID.RecordCount, null, 'Blank')], 
      null, null, null, 0, 10);
    expect(results).toEqual([[], 0]);
  });
});

afterAll(async () => {
  await mutex.unlock();
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
      return !failed || log.line.includes('NOT IMPORTED');
    }
  }
  return false;
}

async function _createSpecimen1(db: DB): Promise<Specimen | null> {
  const endDate1ISO = endDate1.toISOString();
  const source: SpecimenSource = Object.assign({}, baseSource);
  source.catalogNumber = 'Q1';
  source.occurrenceID = 'GQ1';
  source.eventDate = startDate1.toISOString();
  source.eventRemarks =
    'cave; ended ' + endDate1ISO.substring(0, endDate1ISO.indexOf('T'));
  return await Specimen.create(db, source);
}

async function _createSpecimen2(db: DB): Promise<Specimen | null> {
  const source2 = {
    catalogNumber: 'Q2',
    occurrenceID: 'GQ2',

    kingdom: 'Animalia',
    phylum: 'Chordata',
    class: 'Amphibia',
    order: 'Urodela',
    family: 'Plethodontidae',
    genus: 'Eurycea',
    specificEpithet: 'rathbuni',
    infraspecificEpithet: 'madeup',
    scientificName: 'Eurycea rathbuni madeup, 2000',

    continent: 'North America',
    country: 'United States',
    stateProvince: 'Texas',
    county: 'Bastrop County',
    locality: 'Bastrop State Park',
    decimalLatitude: '24.00',
    decimalLongitude: '-92.00',

    eventDate: startDate2.toISOString(),
    recordedBy: 'Person X',
    eventRemarks: _toEndDate(1900, 1, 1),
    dateIdentified: detDate2.toISOString(),
    identifiedBy: 'Person Y',
    typeStatus: 'paratype',
    organismQuantity: '2'
  };
  return await Specimen.create(db, source2);
}

async function _createSpecimen3(db: DB): Promise<Specimen | null> {
  const source3 = {
    catalogNumber: 'Q3',
    occurrenceID: 'GQ3',

    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Arachnida',
    order: 'Araneae',
    family: 'Araneidae',
    genus: 'Gea',
    specificEpithet: 'heptagon',
    // no infraspecificEpithet
    scientificName: 'Gea heptagon (Hentz 1850)',

    continent: 'North America',
    country: 'United States',
    stateProvince: 'Texas',
    county: 'Travis County',
    locality: 'Wildflower Center',
    decimalLatitude: '20.2',
    decimalLongitude: '-90.9',

    eventDate: startDate.toISOString(),
    recordedBy: 'Some One',
    eventRemarks: 'had fun!',
    dateIdentified: detDate.toISOString(),
    identifiedBy: 'Person A',
    typeStatus: '',
    organismQuantity: '3'
  };
  return await Specimen.create(db, source3);
}

async function _createSpecimen4(db: DB): Promise<Specimen | null> {
  const source4 = {
    catalogNumber: 'Q4',
    occurrenceID: 'GQ4',

    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Insecta',
    order: 'Zygentoma',
    family: 'Nicoletiidae',
    genus: 'Texoreddellia',
    specificEpithet: 'aquilonalis',
    // no infraspecificEpithet
    scientificName: 'Texoreddellia aquilonalis',

    continent: 'North America',
    country: 'United States',
    stateProvince: 'Texas',
    county: 'Travis County',
    locality: 'My backyard',
    decimalLatitude: '23.45',
    decimalLongitude: '-93.21',

    eventDate: startDate.toISOString(),
    recordedBy: 'Some One',
    typeStatus: ''
  };
  return await Specimen.create(db, source4);
}

async function _getLocationByID(db: DB, locationID: number): Promise<Location | null> {
  const locations = await Location.getByIDs(db, [locationID]);
  return locations.length > 0 ? locations[0] : null;
}

function _toColumnSpec(
  columnID: QueryColumnID,
  ascending: boolean | null = null,
  optionText: string = 'Any value'
): QueryColumnSpec {
  return { columnID, ascending, optionText };
}

function _toEndDate(year: number, month?: number, day?: number): string {
  return 'ended ' + _toEventDate(year, month, day);
}

function _toStartDate(year: number, month?: number, day?: number): string {
  return 'started ' + _toEventDate(year, month, day);
}

function _toEventDate(year: number, month?: number, day?: number): string {
  if (!month) return year.toString();
  if (!day) return `${year}-${month}`;
  return `${year}-${month}-${day}`;
}
