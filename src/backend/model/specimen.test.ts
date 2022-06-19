import type { DB } from '../integrations/postgres';
import { toLocalDate } from '../integrations/postgres';
import { DatabaseMutex } from '../util/test_util';
import { type SpecimenSource, Specimen } from './specimen';
import {
  type QueryColumnSpec,
  QueryColumnID,
  QueryTaxonFilter
} from '../../shared/user_query';
import { Location } from './location';
import { Taxon } from './taxon';
import { Logs, LogType } from './logs';

const startDate = toLocalDate(new Date('2020-01-01'));
const endDate = toLocalDate(new Date('2020-01-04'));
const endDateISO = endDate.toISOString();
const detDate = toLocalDate(new Date('2020-06-10'));

const startDate1 = toLocalDate(new Date('2021-01-01'));
const endDate1 = toLocalDate(new Date('2021-01-02'));
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

  startDate: startDate.toISOString(),
  collectors: 'Some One | Another P. Someone, II | Foo | Baz, Jr.',
  determinationDate: detDate.toISOString(),
  determiners: 'Person A | Person B',
  collectionRemarks:
    'meadow; *end date ' + endDateISO.substring(0, endDateISO.indexOf('T')),
  occurrenceRemarks: 'occurrence remark',
  determinationRemarks: 'big one',
  typeStatus: 'normal',
  organismQuantity: '1'
};

const mutex = new DatabaseMutex();
let db: DB;

beforeAll(async () => {
  db = await mutex.lock();
});

describe('basic specimen methods', () => {
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
        collectors: 'Some One|Another P. Someone, II|Foo|Baz, Jr.',
        normalizedCollectors: 'baz, jr.|foo|one|someone, ii',
        determinationYear: detDate.getUTCFullYear(),
        determiners: 'Person A|Person B',
        collectionRemarks: 'meadow',
        occurrenceRemarks: baseSource.occurrenceRemarks,
        determinationRemarks: baseSource.determinationRemarks,
        typeStatus: baseSource.typeStatus,
        specimenCount: 1,
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
        speciesName: 'aurantia',
        speciesID: 7,
        subspeciesName: null,
        subspeciesID: null,
        taxonUnique: 'Argiope aurantia',
        taxonAuthor: 'Lucas, 1833',
        countyName: 'Travis County',
        countyID: 4,
        localityName: 'My backyard',
        publicLatitude: 23.45,
        publicLongitude: -93.21
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

        startDate: startDate.toISOString(),
        collectors: 'Any Body',
        determiners: 'Person C'
      };
      const specimen = await Specimen.create(db, source);
      expect(specimen).toEqual({
        catalogNumber: source.catalogNumber,
        occurrenceGuid: source.occurrenceID,
        taxonID: 8,
        localityID: 6,
        collectionStartDate: startDate,
        collectionEndDate: null,
        collectors: 'Any Body',
        normalizedCollectors: 'body',
        determinationYear: null,
        determiners: 'Person C',
        collectionRemarks: null,
        occurrenceRemarks: null,
        determinationRemarks: null,
        typeStatus: null,
        specimenCount: null,
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
        speciesName: null,
        speciesID: null,
        subspeciesName: null,
        subspeciesID: null,
        taxonUnique: 'Thomisidae',
        taxonAuthor: null,
        countyName: null,
        countyID: null,
        localityName: 'Their backyard',
        publicLatitude: null,
        publicLongitude: null
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
        determinationRemarks: 'CAVEDATA[subgenus Subby]'
      })
    );
    expect(specimen).toEqual({
      catalogNumber: baseSource.catalogNumber,
      occurrenceGuid: baseSource.occurrenceID,
      taxonID: 7,
      localityID: 5,
      collectionStartDate: startDate,
      collectionEndDate: endDate,
      collectors: 'Some One|Another P. Someone, II|Foo|Baz, Jr.',
      normalizedCollectors: 'baz, jr.|foo|one|someone, ii',
      determinationYear: detDate.getUTCFullYear(),
      determiners: 'Person A|Person B',
      collectionRemarks: 'meadow',
      occurrenceRemarks: baseSource.occurrenceRemarks,
      determinationRemarks: null,
      typeStatus: baseSource.typeStatus,
      specimenCount: 1,
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
      genusName: 'Argiope (Subby)',
      genusID: 6,
      speciesName: 'aurantia',
      speciesID: 7,
      subspeciesName: null,
      subspeciesID: null,
      taxonUnique: 'Argiope aurantia',
      taxonAuthor: 'Lucas, 1833',
      countyName: 'Travis County',
      countyID: 4,
      localityName: 'My backyard',
      publicLatitude: 23.45,
      publicLongitude: -93.21
    });
    expect((await Taxon.getByID(db, 1))?.taxonName).toEqual('Animalia');
    expect((await Taxon.getByID(db, 2))?.taxonName).toEqual('Arthropoda');
    expect((await Taxon.getByID(db, 5))?.taxonName).toEqual('Araneidae');
    expect((await Taxon.getByID(db, 6))?.taxonName).toEqual('Argiope (Subby)');
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
        determinationRemarks: 'big one; CAVEDATA[n. sp. A]'
      })
    );
    expect(specimen).toEqual({
      catalogNumber: baseSource.catalogNumber,
      occurrenceGuid: baseSource.occurrenceID,
      taxonID: 7,
      localityID: 5,
      collectionStartDate: startDate,
      collectionEndDate: endDate,
      collectors: 'Some One|Another P. Someone, II|Foo|Baz, Jr.',
      normalizedCollectors: 'baz, jr.|foo|one|someone, ii',
      determinationYear: detDate.getUTCFullYear(),
      determiners: 'Person A|Person B',
      collectionRemarks: 'meadow',
      occurrenceRemarks: baseSource.occurrenceRemarks,
      determinationRemarks: 'big one',
      typeStatus: baseSource.typeStatus,
      specimenCount: 1,
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
      speciesName: 'n. sp. A',
      speciesID: 7,
      subspeciesName: null,
      subspeciesID: null,
      taxonUnique: 'Argiope n. sp. A',
      taxonAuthor: null,
      countyName: 'Travis County',
      countyID: 4,
      localityName: 'My backyard',
      publicLatitude: 23.45,
      publicLongitude: -93.21
    });
    expect((await Taxon.getByID(db, 1))?.taxonName).toEqual('Animalia');
    expect((await Taxon.getByID(db, 2))?.taxonName).toEqual('Arthropoda');
    expect((await Taxon.getByID(db, 5))?.taxonName).toEqual('Araneidae');
    expect((await Taxon.getByID(db, 6))?.taxonName).toEqual('Argiope');
    expect((await Taxon.getByID(db, 7))?.taxonName).toEqual('n. sp. A');
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
    expect(found).toEqual(true);

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
      expect(found).toEqual(true);
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
      expect(found).toEqual(true);
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
    expect(found).toEqual(true);
  });

  test('end date follows start date by too much time', async () => {
    const startDateISO = new Date('10/10/70').toISOString();
    const endDateISO = new Date('10/10/80').toISOString();
    const source = Object.assign({}, baseSource);
    // @ts-ignore
    source.catalogNumber = 'C99';
    source.occurrenceID = 'X99';
    source.startDate = startDateISO;
    source.collectionRemarks =
      '*end date ' + endDateISO.substring(0, startDateISO.indexOf('T'));

    await clearLogs(db);
    const specimen = await Specimen.create(db, source);
    expect(specimen?.problems).toContain('dropping end date');
    let found = await containsLog(
      db,
      source.catalogNumber,
      'End date Fri Oct 10 1980 follows start date Sat Oct 10 1970 by more than 124 days; dropping end date',
      false
    );
    expect(found).toEqual(true);
  });

  test('partial determination dates', async () => {
    let source = Object.assign({}, baseSource);
    source.catalogNumber = 'DET1';
    source.determinationDate = '1985';
    await Specimen.create(db, source);

    source = Object.assign({}, baseSource);
    source.catalogNumber = 'DET2';
    source.determinationDate = '00/00/1999';
    await Specimen.create(db, source);

    source = Object.assign({}, baseSource);
    source.catalogNumber = 'DET3';
    source.determinationDate = '01-00-2001';
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
    source.collectionRemarks = '*end date foo';
    source.organismQuantity = 'foo';

    await clearLogs(db);
    const specimen = await Specimen.create(db, source);
    expect(specimen?.problems).toContain('end date syntax');
    expect(specimen?.problems).toContain('Invalid specimen count');
    let found = await containsLog(db, source.catalogNumber, 'end date syntax', false);
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

describe('general specimen query', () => {
  test('querying for specified columns', async () => {
    await Specimen.dropAll(db);
    const specimen1 = await _createSpecimen1(db);
    const specimen2 = await _createSpecimen2(db);

    let dateSpec = _toColumnSpec(QueryColumnID.CollectionStartDate, true);

    // prettier-ignore
    let results = await Specimen.generalQuery(
      db, [dateSpec, _toColumnSpec(QueryColumnID.CatalogNumber)], null, 0, 10);
    expect(results[0]).toEqual([
      { catalogNumber: 'Q1', occurrenceGuid: 'GQ1', collectionStartDate: startDate1 },
      { catalogNumber: 'Q2', occurrenceGuid: 'GQ2', collectionStartDate: startDate2 }
    ]);
    expect(results[1]).toEqual(2);

    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [dateSpec], null, 0, 10);
    expect(results[0]).toEqual([
      { collectionStartDate: startDate1 },
      { collectionStartDate: startDate2 }
    ]);
    expect(results[1]).toEqual(2);

    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [dateSpec, _toColumnSpec(QueryColumnID.CollectionEndDate)], null, 0, 10);
    expect(results[0]).toEqual([
      { collectionStartDate: startDate1, collectionEndDate: endDate1 },
      { collectionStartDate: startDate2, collectionEndDate: null }
    ]);
    expect(results[1]).toEqual(2);

    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [dateSpec, _toColumnSpec(QueryColumnID.Collectors)], null, 0, 10);
    expect(results[0]).toEqual([
      {
        collectionStartDate: startDate1,
        collectors: 'Some One|Another P. Someone, II|Foo|Baz, Jr.'
      },
      { collectionStartDate: startDate2, collectors: 'Person X' }
    ]);
    expect(results[1]).toEqual(2);

    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [dateSpec, _toColumnSpec(QueryColumnID.Determiners)], null, 0, 10);
    expect(results[0]).toEqual([
      { collectionStartDate: startDate1, determiners: 'Person A|Person B' },
      { collectionStartDate: startDate2, determiners: 'Person Y' }
    ]);
    expect(results[1]).toEqual(2);

    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [dateSpec, _toColumnSpec(QueryColumnID.DeterminationYear)], null, 0, 10);
    expect(results[0]).toEqual([
      { collectionStartDate: startDate1, determinationYear: detDate.getFullYear() },
      { collectionStartDate: startDate2, determinationYear: detDate2.getFullYear() }
    ]);
    expect(results[1]).toEqual(2);

    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [dateSpec, _toColumnSpec(QueryColumnID.CollectionRemarks)], null, 0, 10);
    expect(results[0]).toEqual([
      { collectionStartDate: startDate1, collectionRemarks: 'cave' },
      { collectionStartDate: startDate2, collectionRemarks: null }
    ]);

    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [dateSpec, _toColumnSpec(QueryColumnID.OccurrenceRemarks)], null, 0, 10);
    expect(results[0]).toEqual([
      {
        collectionStartDate: startDate1,
        occurrenceRemarks: baseSource.occurrenceRemarks
      },
      { collectionStartDate: startDate2, occurrenceRemarks: null }
    ]);

    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [dateSpec, _toColumnSpec(QueryColumnID.DeterminationRemarks)], null, 0, 10);
    expect(results[0]).toEqual([
      {
        collectionStartDate: startDate1,
        determinationRemarks: baseSource.determinationRemarks
      },
      { collectionStartDate: startDate2, determinationRemarks: null }
    ]);

    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [dateSpec, _toColumnSpec(QueryColumnID.TypeStatus)], null, 0, 10);
    expect(results[0]).toEqual([
      { collectionStartDate: startDate1, typeStatus: specimen1!.typeStatus },
      { collectionStartDate: startDate2, typeStatus: specimen2!.typeStatus }
    ]);

    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [dateSpec, _toColumnSpec(QueryColumnID.SpecimenCount)], null, 0, 10);
    expect(results[0]).toEqual([
      { collectionStartDate: startDate1, specimenCount: 1 },
      { collectionStartDate: startDate2, specimenCount: 2 }
    ]);

    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [dateSpec, _toColumnSpec(QueryColumnID.Problems)], null, 0, 10);
    expect(results[0]).toEqual([
      { collectionStartDate: startDate1, problems: null },
      {
        collectionStartDate: startDate2,
        problems: 'Invalid end date syntax in event remarks; assuming no end date'
      }
    ]);

    const checkColumns = async (
      columnID: QueryColumnID,
      nameColumn: keyof Specimen,
      idColumn: keyof Specimen
    ) => {
      // prettier-ignore
      let results = await Specimen.generalQuery(
        db, [dateSpec, _toColumnSpec(columnID)], null, 0, 10);
      expect(results[0]).toEqual([
        {
          collectionStartDate: startDate1,
          [nameColumn]: specimen1![nameColumn],
          [idColumn]: specimen1![idColumn]
        },
        {
          collectionStartDate: startDate2,
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
      db, [dateSpec, _toColumnSpec(QueryColumnID.Latitude)], null, 0, 10);
    expect(results[0]).toEqual([
      { collectionStartDate: startDate1, latitude: specimen1!.publicLatitude },
      { collectionStartDate: startDate2, latitude: specimen2!.publicLatitude }
    ]);

    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [dateSpec, _toColumnSpec(QueryColumnID.Longitude)], null, 0, 10);
    expect(results[0]).toEqual([
      { collectionStartDate: startDate1, longitude: specimen1!.publicLongitude },
      { collectionStartDate: startDate2, longitude: specimen2!.publicLongitude }
    ]);
  });

  test('query result order', async () => {
    await Specimen.dropAll(db);
    const specimen1 = await _createSpecimen1(db);
    const specimen2 = await _createSpecimen2(db);

    // prettier-ignore
    let results = await Specimen.generalQuery(
      db, [_toColumnSpec(QueryColumnID.CatalogNumber, false)], null, 0, 10);
    expect(results[0]).toEqual([
      { catalogNumber: 'Q2', occurrenceGuid: 'GQ2' },
      { catalogNumber: 'Q1', occurrenceGuid: 'GQ1' }
    ]);
    expect(results[1]).toEqual(2);

    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [_toColumnSpec(QueryColumnID.CollectionEndDate, false)], null, 0, 10);
    expect(results[0]).toEqual([
      { collectionEndDate: null },
      { collectionEndDate: endDate1 }
    ]);
    expect(results[1]).toEqual(2);

    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [_toColumnSpec(QueryColumnID.TypeStatus, false)], null, 0, 10);
    expect(results[0]).toEqual([{ typeStatus: 'paratype' }, { typeStatus: 'normal' }]);
    expect(results[1]).toEqual(2);

    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [_toColumnSpec(QueryColumnID.SpecimenCount, false)], null, 0, 10);
    expect(results[0]).toEqual([{ specimenCount: 2 }, { specimenCount: 1 }]);

    const checkColumns = async (
      columnID: QueryColumnID,
      ascending: boolean,
      nameColumn: keyof Specimen,
      idColumn: keyof Specimen
    ) => {
      // prettier-ignore
      let results = await Specimen.generalQuery(
        db, [_toColumnSpec(columnID, ascending)], null, 0, 10);
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
        db, [_toColumnSpec(QueryColumnID.TaxonUnique, false)], null, 0, 10);
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
      db, [_toColumnSpec(QueryColumnID.Latitude, false)], null, 0, 10);
    expect(results[0]).toEqual([
      { latitude: specimen2!.publicLatitude },
      { latitude: specimen1!.publicLatitude }
    ]);

    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [_toColumnSpec(QueryColumnID.Longitude, true)], null, 0, 10);
    expect(results[0]).toEqual([
      { longitude: specimen1!.publicLongitude },
      { longitude: specimen2!.publicLongitude }
    ]);
  });

  test('query based on whether columns are blank', async () => {
    await Specimen.dropAll(db);
    await _createSpecimen1(db);
    await _createSpecimen2(db);

    // prettier-ignore
    let results = await Specimen.generalQuery(
      db, [
        _toColumnSpec(QueryColumnID.CatalogNumber),
        _toColumnSpec(QueryColumnID.CollectionEndDate, true)
      ], null, 0, 10);
    expect(results[0]).toEqual([
      { catalogNumber: 'Q1', occurrenceGuid: 'GQ1', collectionEndDate: endDate1 },
      { catalogNumber: 'Q2', occurrenceGuid: 'GQ2', collectionEndDate: null }
    ]);
    expect(results[1]).toEqual(2);

    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [
        _toColumnSpec(QueryColumnID.CatalogNumber),
        _toColumnSpec(QueryColumnID.CollectionEndDate, null, true)
      ], null, 0, 10);
    expect(results[0]).toEqual([
      { catalogNumber: 'Q2', occurrenceGuid: 'GQ2', collectionEndDate: null }
    ]);
    expect(results[1]).toEqual(1);

    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [
        _toColumnSpec(QueryColumnID.CatalogNumber),
        _toColumnSpec(QueryColumnID.CollectionEndDate, null, false)
      ], null, 0, 10);
    expect(results[0]).toEqual([
      { catalogNumber: 'Q1', occurrenceGuid: 'GQ1', collectionEndDate: endDate1 }
    ]);
    expect(results[1]).toEqual(1);
  });

  test('query with taxa constraints', async () => {
    await Specimen.dropAll(db);
    const specimen1 = await _createSpecimen1(db);
    const specimen2 = await _createSpecimen2(db);
    const specimen3 = await _createSpecimen3(db);

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
      db, [_toColumnSpec(QueryColumnID.CatalogNumber, true)], taxonFilter, 0, 10);
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
      db, [_toColumnSpec(QueryColumnID.CatalogNumber, true)], taxonFilter, 0, 10);
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
      db, [_toColumnSpec(QueryColumnID.CatalogNumber, true)], taxonFilter, 0, 10);
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
      db, [_toColumnSpec(QueryColumnID.CatalogNumber, true)], taxonFilter, 0, 10);
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
      db, [_toColumnSpec(QueryColumnID.CatalogNumber, true)], taxonFilter, 0, 10);
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
      db, [_toColumnSpec(QueryColumnID.CatalogNumber, true)], taxonFilter, 0, 10);
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
      db, [_toColumnSpec(QueryColumnID.CatalogNumber, true)], taxonFilter, 0, 10);
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
      db, [_toColumnSpec(QueryColumnID.CatalogNumber, true)], taxonFilter, 0, 10);
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

    // prettier-ignore
    let results = await Specimen.generalQuery(
      db, [_toColumnSpec(QueryColumnID.Family, true)], null, 0, 10);
    expect(results[0]).toEqual([
      { familyName: 'Araneidae', familyID: specimen1!.familyID },
      { familyName: 'Plethodontidae', familyID: specimen2!.familyID }
    ]);

    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [
        _toColumnSpec(QueryColumnID.ResultCount, true),
        _toColumnSpec(QueryColumnID.Family, true)
      ], null, 0, 10);
    expect(results[0]).toEqual([
      { resultCount: 2, familyName: 'Araneidae', familyID: specimen1!.familyID },
      { resultCount: 1, familyName: 'Plethodontidae', familyID: specimen2!.familyID }
    ]);

    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [
        _toColumnSpec(QueryColumnID.ResultCount, true),
        _toColumnSpec(QueryColumnID.Genus, true)
      ], null, 0, 10);
    expect(results[0]).toEqual([
      { resultCount: 1, genusName: 'Argiope', genusID: specimen1!.genusID },
      { resultCount: 1, genusName: 'Eurycea', genusID: specimen2!.genusID },
      { resultCount: 1, genusName: 'Gea', genusID: specimen3!.genusID }
    ]);
  });

  test('batch queries of filtered results', async () => {
    await Specimen.dropAll(db);
    await _createSpecimen1(db);
    const specimen2 = await _createSpecimen2(db);
    const specimen3 = await _createSpecimen3(db);

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
      db, [_toColumnSpec(QueryColumnID.CatalogNumber, true)], taxonFilter, 0, 1);
    expect(results[0]).toEqual([{ catalogNumber: 'Q2', occurrenceGuid: 'GQ2' }]);
    expect(results[1]).toEqual(2);

    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [_toColumnSpec(QueryColumnID.CatalogNumber, true)], taxonFilter, 1, 1);
    expect(results[0]).toEqual([{ catalogNumber: 'Q3', occurrenceGuid: 'GQ3' }]);
    expect(results[1]).toEqual(null);
  });

  test('combined criteria query', async () => {
    await Specimen.dropAll(db);
    await _createSpecimen1(db);
    await _createSpecimen1(db);
    const specimen2 = await _createSpecimen2(db);
    const specimen3 = await _createSpecimen3(db);

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
        _toColumnSpec(QueryColumnID.CollectionRemarks, null, false)
      ], taxonFilter, 0, 10);
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

    // prettier-ignore
    let results = await Specimen.generalQuery(
      db, [_toColumnSpec(QueryColumnID.Phylum, null, true)], null, 0, 10);
    expect(results).toEqual([[], 0]);

    // prettier-ignore
    results = await Specimen.generalQuery(db, [], null, 0, 10);
    expect(results).toEqual([[], 0]);

    // prettier-ignore
    results = await Specimen.generalQuery(
      db, [_toColumnSpec(QueryColumnID.ResultCount, null, true)], null, 0, 10);
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
  source.startDate = startDate1.toISOString();
  source.collectionRemarks =
    'cave; *end date ' + endDate1ISO.substring(0, endDate1ISO.indexOf('T'));
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

    startDate: startDate2.toISOString(),
    collectors: 'Person X',
    determinationDate: detDate2.toISOString(),
    collectionRemarks: '*end date foo',
    determiners: 'Person Y',
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

    startDate: startDate.toISOString(),
    collectors: 'Some One',
    collectionRemarks: 'had fun!',
    determinationDate: detDate.toISOString(),
    determiners: 'Person A',
    typeStatus: 'normal',
    organismQuantity: '3'
  };
  return await Specimen.create(db, source3);
}

async function _getLocationByID(db: DB, locationID: number): Promise<Location | null> {
  const locations = await Location.getByIDs(db, [locationID]);
  return locations.length > 0 ? locations[0] : null;
}

function _toColumnSpec(
  columnID: QueryColumnID,
  ascending: boolean | null = null,
  nullValues: boolean | null = null
): QueryColumnSpec {
  return { columnID, ascending, nullValues };
}
