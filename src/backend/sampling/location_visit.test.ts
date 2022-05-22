import type { DB } from '../integrations/postgres';
import { toLocalDate } from '../integrations/postgres';
import { DatabaseMutex } from '../util/test_util';
import { Specimen, SpecimenSource } from '../model/specimen';
import { LocationVisit } from './location_visit';

const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;

type PartialSpecimenSource = Pick<
  SpecimenSource,
  | 'locality'
  | 'startDate'
  | 'collectors'
  | 'kingdom'
  | 'phylum'
  | 'class'
  | 'order'
  | 'family'
  | 'genus'
  | 'specificEpithet'
  | 'infraspecificEpithet'
>;

const date1 = _toISODate('2020-01-01');
// const date2 = _toISODate('2020-01-02');
// const date3 = _toISODate('2020-02-02');
// const date4 = _toISODate('2021-02-02');
const locality1 = 'Cave 1';
const collectors1 = 'Somebody';
const detDate = _toISODate('2022-05-01');

const mutex = new DatabaseMutex();
let db: DB;
let nextCatalogNumber = 1;

beforeAll(async () => {
  db = await mutex.lock();
});

test('sequentially specifying a single species', async () => {
  let specimen = await _addSpecimen({
    locality: locality1,
    startDate: date1,
    collectors: collectors1,
    kingdom: 'Animalia'
  });
  await _checkVisitFor(specimen, { kingdomCounts: '1' });
});

afterAll(async () => {
  await mutex.unlock();
});

async function _addSpecimen(data: PartialSpecimenSource): Promise<Specimen> {
  let scientificName =
    data.genus ||
    data.family ||
    data.order ||
    data.class ||
    data.phylum ||
    data.kingdom;
  if (data.specificEpithet) scientificName += ' ' + data.specificEpithet;
  if (data.infraspecificEpithet) scientificName += ' ' + data.infraspecificEpithet;
  scientificName += ' (Author-Date)';

  const source = Object.assign(
    {
      catalogNumber: 'C#' + nextCatalogNumber,
      occurrenceID: 'ID' + nextCatalogNumber,
      kingdom: 'Animalia',
      phylum: '',
      class: '',
      order: '',
      family: '',
      genus: '',
      specificEpithet: '',
      infraspecificEpithet: '',
      scientificName,
      continent: 'North America',
      country: 'United States',
      stateProvince: 'Texas',
      county: 'Travis County',
      decimalLatitude: '23.45', // ignored
      decimalLongitude: '-93.21', // ignored
      determinationDate: detDate,
      determiners: 'Person D',
      typeStatus: 'normal',
      organismQuantity: '1'
    },
    data
  );
  ++nextCatalogNumber;
  const specimen = await Specimen.create(db, source);
  if (!specimen) throw Error('Invalid specimen');
  await LocationVisit.addSpecimen(db, specimen);
  return specimen;
}

async function _checkVisitFor(
  specimen: Specimen,
  data: Partial<LocationVisit>
): Promise<void> {
  const visit = await _getVisitFor(specimen);
  const expectedVisit = Object.assign(
    {
      locationID: specimen.localityID,
      isCave: specimen.localityName.toLowerCase().includes('cave'),
      startEpochDay: _toDaysEpoch(specimen.collectionStartDate!),
      endEpochDay: null,
      normalizedCollectors: specimen.normalizedCollectors,
      kingdomNames: 'Animalia',
      kingdomCounts: null,
      phylumNames: null,
      phylumCounts: null,
      classNames: null,
      classCounts: null,
      orderNames: null,
      orderCounts: null,
      familyNames: null,
      familyCounts: null,
      genusNames: null,
      genusCounts: null,
      speciesNames: null,
      speciesCounts: null,
      subspeciesNames: null,
      subspeciesCounts: null
    },
    data
  );
  expect(visit).toEqual(expectedVisit);
}

async function _getVisitFor(specimen: Specimen): Promise<LocationVisit> {
  const visit = await LocationVisit.getByKey(
    db,
    specimen.localityID,
    _toDaysEpoch(specimen.collectionStartDate!),
    specimen.normalizedCollectors!
  );
  return visit!;
}

function _toDaysEpoch(date: Date | string): number {
  if (typeof date == 'string') date = new Date(date);
  return Math.floor(date.getTime() / MILLIS_PER_DAY);
}

function _toISODate(dateString: string): string {
  return toLocalDate(new Date(dateString)).toISOString();
}
