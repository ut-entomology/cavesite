import type { DB } from '../integrations/postgres';
import { toLocalDate } from '../integrations/postgres';
import { DatabaseMutex } from '../util/test_util';
import { Specimen, SpecimenSource } from '../model/specimen';
import { LocationVisit } from './location_visit';
import { EffortPoints, pointSorter, sortPointsXThenY } from '../../shared/model';

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

const locality1 = 'Cave 1';
const locality2 = 'Cave 2';
const locality3 = 'Cave 3';
const date1 = _toISODate('2020-01-01');
const date2 = _toISODate('2020-01-02');
const date3 = _toISODate('2020-02-02');
const date4 = _toISODate('2020-02-03');
const date5 = _toISODate('2020-02-04');
const collectors1 = 'Somebody';
const collectors2 = 'Someone Else|Yet Another';
const detDate = _toISODate('2022-05-01');

const mutex = new DatabaseMutex();
let db: DB;
let nextCatalogNumber = 1;

beforeAll(async () => {
  db = await mutex.lock();
});

test('sequentially specifying a single subspecies', async () => {
  let specimen = await _addSpecimen({
    locality: locality1,
    startDate: date1,
    collectors: collectors1,
    kingdom: 'Animalia'
  });
  await _checkVisitFor(specimen, { kingdomCounts: '1' });

  specimen = await _addSpecimen({
    locality: locality1,
    startDate: date1,
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda'
  });
  await _checkVisitFor(specimen, {
    kingdomCounts: '0',
    phylumNames: 'Arthropoda',
    phylumCounts: '1'
  });

  specimen = await _addSpecimen({
    locality: locality1,
    startDate: date1,
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Arachnida'
  });
  await _checkVisitFor(specimen, {
    kingdomCounts: '0',
    phylumNames: 'Arthropoda',
    phylumCounts: '0',
    classNames: 'Arachnida',
    classCounts: '1'
  });

  specimen = await _addSpecimen({
    locality: locality1,
    startDate: date1,
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Arachnida',
    order: 'Araneae'
  });
  await _checkVisitFor(specimen, {
    kingdomCounts: '0',
    phylumNames: 'Arthropoda',
    phylumCounts: '0',
    classNames: 'Arachnida',
    classCounts: '0',
    orderNames: 'Araneae',
    orderCounts: '1'
  });

  specimen = await _addSpecimen({
    locality: locality1,
    startDate: date1,
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Arachnida',
    order: 'Araneae',
    family: 'Thomisidae'
  });
  await _checkVisitFor(specimen, {
    kingdomCounts: '0',
    phylumNames: 'Arthropoda',
    phylumCounts: '0',
    classNames: 'Arachnida',
    classCounts: '0',
    orderNames: 'Araneae',
    orderCounts: '0',
    familyNames: 'Thomisidae',
    familyCounts: '1'
  });

  specimen = await _addSpecimen({
    locality: locality1,
    startDate: date1,
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Arachnida',
    order: 'Araneae',
    family: 'Thomisidae',
    genus: 'Mecaphesa'
  });
  await _checkVisitFor(specimen, {
    kingdomCounts: '0',
    phylumNames: 'Arthropoda',
    phylumCounts: '0',
    classNames: 'Arachnida',
    classCounts: '0',
    orderNames: 'Araneae',
    orderCounts: '0',
    familyNames: 'Thomisidae',
    familyCounts: '0',
    genusNames: 'Mecaphesa',
    genusCounts: '1'
  });

  specimen = await _addSpecimen({
    locality: locality1,
    startDate: date1,
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Arachnida',
    order: 'Araneae',
    family: 'Thomisidae',
    genus: 'Mecaphesa',
    specificEpithet: 'celer'
  });
  await _checkVisitFor(specimen, {
    kingdomCounts: '0',
    phylumNames: 'Arthropoda',
    phylumCounts: '0',
    classNames: 'Arachnida',
    classCounts: '0',
    orderNames: 'Araneae',
    orderCounts: '0',
    familyNames: 'Thomisidae',
    familyCounts: '0',
    genusNames: 'Mecaphesa',
    genusCounts: '0',
    speciesNames: 'Mecaphesa celer',
    speciesCounts: '1'
  });

  specimen = await _addSpecimen({
    locality: locality1,
    startDate: date1,
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Arachnida',
    order: 'Araneae',
    family: 'Thomisidae',
    genus: 'Mecaphesa',
    specificEpithet: 'celer',
    infraspecificEpithet: 'xyz'
  });
  await _checkVisitFor(specimen, {
    kingdomCounts: '0',
    phylumNames: 'Arthropoda',
    phylumCounts: '0',
    classNames: 'Arachnida',
    classCounts: '0',
    orderNames: 'Araneae',
    orderCounts: '0',
    familyNames: 'Thomisidae',
    familyCounts: '0',
    genusNames: 'Mecaphesa',
    genusCounts: '0',
    speciesNames: 'Mecaphesa celer',
    speciesCounts: '0',
    subspeciesNames: 'Mecaphesa celer xyz',
    subspeciesCounts: '1'
  });
});

test('adding existing taxonomic groups', async () => {
  const expectedVisitData = {
    kingdomCounts: '0',
    phylumNames: 'Arthropoda',
    phylumCounts: '0',
    classNames: 'Arachnida',
    classCounts: '0',
    orderNames: 'Araneae',
    orderCounts: '0',
    familyNames: 'Thomisidae',
    familyCounts: '0',
    genusNames: 'Mecaphesa',
    genusCounts: '0',
    speciesNames: 'Mecaphesa celer',
    speciesCounts: '0',
    subspeciesNames: 'Mecaphesa celer xyz',
    subspeciesCounts: '1'
  };

  let specimen = await _addSpecimen({
    locality: locality1,
    startDate: date2,
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Arachnida',
    order: 'Araneae',
    family: 'Thomisidae',
    genus: 'Mecaphesa',
    specificEpithet: 'celer',
    infraspecificEpithet: 'xyz'
  });
  await _checkVisitFor(specimen, expectedVisitData);

  specimen = await _addSpecimen({
    locality: locality1,
    startDate: date2,
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Arachnida',
    order: 'Araneae',
    family: 'Thomisidae',
    genus: 'Mecaphesa',
    specificEpithet: 'celer',
    infraspecificEpithet: 'xyz'
  });
  await _checkVisitFor(specimen, expectedVisitData);

  specimen = await _addSpecimen({
    locality: locality1,
    startDate: date2,
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Arachnida',
    order: 'Araneae',
    family: 'Thomisidae',
    genus: 'Mecaphesa',
    specificEpithet: 'celer'
  });
  await _checkVisitFor(specimen, expectedVisitData);

  specimen = await _addSpecimen({
    locality: locality1,
    startDate: date2,
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Arachnida',
    order: 'Araneae',
    family: 'Thomisidae',
    genus: 'Mecaphesa'
  });
  await _checkVisitFor(specimen, expectedVisitData);

  specimen = await _addSpecimen({
    locality: locality1,
    startDate: date2,
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Arachnida',
    order: 'Araneae',
    family: 'Thomisidae'
  });
  await _checkVisitFor(specimen, expectedVisitData);

  specimen = await _addSpecimen({
    locality: locality1,
    startDate: date2,
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Arachnida',
    order: 'Araneae'
  });
  await _checkVisitFor(specimen, expectedVisitData);

  specimen = await _addSpecimen({
    locality: locality1,
    startDate: date2,
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Arachnida'
  });
  await _checkVisitFor(specimen, expectedVisitData);

  specimen = await _addSpecimen({
    locality: locality1,
    startDate: date2,
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda'
  });
  await _checkVisitFor(specimen, expectedVisitData);

  specimen = await _addSpecimen({
    locality: locality1,
    startDate: date2,
    collectors: collectors1,
    kingdom: 'Animalia'
  });
  await _checkVisitFor(specimen, expectedVisitData);
});

test('adding multiple taxonomic groups', async () => {
  let specimen = await _addSpecimen({
    locality: locality1,
    startDate: date3,
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Arachnida',
    order: 'Araneae',
    family: 'Thomisidae',
    genus: 'Mecaphesa',
    specificEpithet: 'celer',
    infraspecificEpithet: 'xyz'
  });
  await _checkVisitFor(specimen, {
    kingdomCounts: '0',
    phylumNames: 'Arthropoda',
    phylumCounts: '0',
    classNames: 'Arachnida',
    classCounts: '0',
    orderNames: 'Araneae',
    orderCounts: '0',
    familyNames: 'Thomisidae',
    familyCounts: '0',
    genusNames: 'Mecaphesa',
    genusCounts: '0',
    speciesNames: 'Mecaphesa celer',
    speciesCounts: '0',
    subspeciesNames: 'Mecaphesa celer xyz',
    subspeciesCounts: '1'
  });

  specimen = await _addSpecimen({
    locality: locality1,
    startDate: date3,
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Arachnida',
    order: 'Araneae',
    family: 'Thomisidae',
    genus: 'Mecaphesa',
    specificEpithet: 'celer',
    infraspecificEpithet: 'pdq'
  });
  await _checkVisitFor(specimen, {
    kingdomCounts: '0',
    phylumNames: 'Arthropoda',
    phylumCounts: '0',
    classNames: 'Arachnida',
    classCounts: '0',
    orderNames: 'Araneae',
    orderCounts: '0',
    familyNames: 'Thomisidae',
    familyCounts: '0',
    genusNames: 'Mecaphesa',
    genusCounts: '0',
    speciesNames: 'Mecaphesa celer',
    speciesCounts: '0',
    subspeciesNames: 'Mecaphesa celer xyz|Mecaphesa celer pdq',
    subspeciesCounts: '11'
  });

  specimen = await _addSpecimen({
    locality: locality1,
    startDate: date3,
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Arachnida',
    order: 'Araneae',
    family: 'Thomisidae',
    genus: 'Mecaphesa',
    specificEpithet: 'dubia'
  });
  await _checkVisitFor(specimen, {
    kingdomCounts: '0',
    phylumNames: 'Arthropoda',
    phylumCounts: '0',
    classNames: 'Arachnida',
    classCounts: '0',
    orderNames: 'Araneae',
    orderCounts: '0',
    familyNames: 'Thomisidae',
    familyCounts: '0',
    genusNames: 'Mecaphesa',
    genusCounts: '0',
    speciesNames: 'Mecaphesa celer|Mecaphesa dubia',
    speciesCounts: '01',
    subspeciesNames: 'Mecaphesa celer xyz|Mecaphesa celer pdq',
    subspeciesCounts: '11'
  });

  specimen = await _addSpecimen({
    locality: locality1,
    startDate: date3,
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Arachnida',
    order: 'Araneae',
    family: 'Thomisidae',
    genus: 'Xysticus',
    specificEpithet: 'funestus'
  });
  await _checkVisitFor(specimen, {
    kingdomCounts: '0',
    phylumNames: 'Arthropoda',
    phylumCounts: '0',
    classNames: 'Arachnida',
    classCounts: '0',
    orderNames: 'Araneae',
    orderCounts: '0',
    familyNames: 'Thomisidae',
    familyCounts: '0',
    genusNames: 'Mecaphesa|Xysticus',
    genusCounts: '00',
    speciesNames: 'Mecaphesa celer|Mecaphesa dubia|Xysticus funestus',
    speciesCounts: '011',
    subspeciesNames: 'Mecaphesa celer xyz|Mecaphesa celer pdq',
    subspeciesCounts: '11'
  });

  specimen = await _addSpecimen({
    locality: locality1,
    startDate: date3,
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Arachnida',
    order: 'Araneae',
    family: 'Thomisidae',
    genus: 'Ozyptila'
  });
  await _checkVisitFor(specimen, {
    kingdomCounts: '0',
    phylumNames: 'Arthropoda',
    phylumCounts: '0',
    classNames: 'Arachnida',
    classCounts: '0',
    orderNames: 'Araneae',
    orderCounts: '0',
    familyNames: 'Thomisidae',
    familyCounts: '0',
    genusNames: 'Mecaphesa|Xysticus|Ozyptila',
    genusCounts: '001',
    speciesNames: 'Mecaphesa celer|Mecaphesa dubia|Xysticus funestus',
    speciesCounts: '011',
    subspeciesNames: 'Mecaphesa celer xyz|Mecaphesa celer pdq',
    subspeciesCounts: '11'
  });

  specimen = await _addSpecimen({
    locality: locality1,
    startDate: date3,
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Arachnida',
    order: 'Araneae',
    family: 'Thomisidae',
    genus: 'Bassaniana'
  });
  await _checkVisitFor(specimen, {
    kingdomCounts: '0',
    phylumNames: 'Arthropoda',
    phylumCounts: '0',
    classNames: 'Arachnida',
    classCounts: '0',
    orderNames: 'Araneae',
    orderCounts: '0',
    familyNames: 'Thomisidae',
    familyCounts: '0',
    genusNames: 'Mecaphesa|Xysticus|Ozyptila|Bassaniana',
    genusCounts: '0011',
    speciesNames: 'Mecaphesa celer|Mecaphesa dubia|Xysticus funestus',
    speciesCounts: '011',
    subspeciesNames: 'Mecaphesa celer xyz|Mecaphesa celer pdq',
    subspeciesCounts: '11'
  });

  specimen = await _addSpecimen({
    locality: locality1,
    startDate: date3,
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Arachnida',
    order: 'Araneae',
    family: 'Thomisidae',
    genus: 'Ozyptila',
    specificEpithet: 'distans'
  });
  await _checkVisitFor(specimen, {
    kingdomCounts: '0',
    phylumNames: 'Arthropoda',
    phylumCounts: '0',
    classNames: 'Arachnida',
    classCounts: '0',
    orderNames: 'Araneae',
    orderCounts: '0',
    familyNames: 'Thomisidae',
    familyCounts: '0',
    genusNames: 'Mecaphesa|Xysticus|Ozyptila|Bassaniana',
    genusCounts: '0001',
    speciesNames: 'Mecaphesa celer|Mecaphesa dubia|Xysticus funestus|Ozyptila distans',
    speciesCounts: '0111',
    subspeciesNames: 'Mecaphesa celer xyz|Mecaphesa celer pdq',
    subspeciesCounts: '11'
  });

  specimen = await _addSpecimen({
    locality: locality1,
    startDate: date3,
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Arachnida',
    order: 'Araneae',
    family: 'Theridiidae',
    genus: 'Latrodectus'
  });
  await _checkVisitFor(specimen, {
    kingdomCounts: '0',
    phylumNames: 'Arthropoda',
    phylumCounts: '0',
    classNames: 'Arachnida',
    classCounts: '0',
    orderNames: 'Araneae',
    orderCounts: '0',
    familyNames: 'Thomisidae|Theridiidae',
    familyCounts: '00',
    genusNames: 'Mecaphesa|Xysticus|Ozyptila|Bassaniana|Latrodectus',
    genusCounts: '00011',
    speciesNames: 'Mecaphesa celer|Mecaphesa dubia|Xysticus funestus|Ozyptila distans',
    speciesCounts: '0111',
    subspeciesNames: 'Mecaphesa celer xyz|Mecaphesa celer pdq',
    subspeciesCounts: '11'
  });

  specimen = await _addSpecimen({
    locality: locality1,
    startDate: date3,
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Arachnida',
    order: 'Opiliones'
  });
  await _checkVisitFor(specimen, {
    kingdomCounts: '0',
    phylumNames: 'Arthropoda',
    phylumCounts: '0',
    classNames: 'Arachnida',
    classCounts: '0',
    orderNames: 'Araneae|Opiliones',
    orderCounts: '01',
    familyNames: 'Thomisidae|Theridiidae',
    familyCounts: '00',
    genusNames: 'Mecaphesa|Xysticus|Ozyptila|Bassaniana|Latrodectus',
    genusCounts: '00011',
    speciesNames: 'Mecaphesa celer|Mecaphesa dubia|Xysticus funestus|Ozyptila distans',
    speciesCounts: '0111',
    subspeciesNames: 'Mecaphesa celer xyz|Mecaphesa celer pdq',
    subspeciesCounts: '11'
  });

  specimen = await _addSpecimen({
    locality: locality1,
    startDate: date3,
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Insecta',
    order: 'Orthoptera',
    family: 'Rhaphidophoridae',
    genus: 'Diestrammena',
    specificEpithet: 'asynamora'
  });
  await _checkVisitFor(specimen, {
    kingdomCounts: '0',
    phylumNames: 'Arthropoda',
    phylumCounts: '0',
    classNames: 'Arachnida|Insecta',
    classCounts: '00',
    orderNames: 'Araneae|Opiliones|Orthoptera',
    orderCounts: '010',
    familyNames: 'Thomisidae|Theridiidae|Rhaphidophoridae',
    familyCounts: '000',
    genusNames: 'Mecaphesa|Xysticus|Ozyptila|Bassaniana|Latrodectus|Diestrammena',
    genusCounts: '000110',
    speciesNames:
      'Mecaphesa celer|Mecaphesa dubia|Xysticus funestus|Ozyptila distans|Diestrammena asynamora',
    speciesCounts: '01111',
    subspeciesNames: 'Mecaphesa celer xyz|Mecaphesa celer pdq',
    subspeciesCounts: '11'
  });

  specimen = await _addSpecimen({
    locality: locality1,
    startDate: date3,
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Chilopoda'
  });
  await _checkVisitFor(specimen, {
    kingdomCounts: '0',
    phylumNames: 'Arthropoda',
    phylumCounts: '0',
    classNames: 'Arachnida|Insecta|Chilopoda',
    classCounts: '001',
    orderNames: 'Araneae|Opiliones|Orthoptera',
    orderCounts: '010',
    familyNames: 'Thomisidae|Theridiidae|Rhaphidophoridae',
    familyCounts: '000',
    genusNames: 'Mecaphesa|Xysticus|Ozyptila|Bassaniana|Latrodectus|Diestrammena',
    genusCounts: '000110',
    speciesNames:
      'Mecaphesa celer|Mecaphesa dubia|Xysticus funestus|Ozyptila distans|Diestrammena asynamora',
    speciesCounts: '01111',
    subspeciesNames: 'Mecaphesa celer xyz|Mecaphesa celer pdq',
    subspeciesCounts: '11'
  });

  specimen = await _addSpecimen({
    locality: locality1,
    startDate: date3,
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Chilopoda',
    order: 'Scolopendromorpha',
    family: 'Cryptopidae'
  });
  await _checkVisitFor(specimen, {
    kingdomCounts: '0',
    phylumNames: 'Arthropoda',
    phylumCounts: '0',
    classNames: 'Arachnida|Insecta|Chilopoda',
    classCounts: '000',
    orderNames: 'Araneae|Opiliones|Orthoptera|Scolopendromorpha',
    orderCounts: '0100',
    familyNames: 'Thomisidae|Theridiidae|Rhaphidophoridae|Cryptopidae',
    familyCounts: '0001',
    genusNames: 'Mecaphesa|Xysticus|Ozyptila|Bassaniana|Latrodectus|Diestrammena',
    genusCounts: '000110',
    speciesNames:
      'Mecaphesa celer|Mecaphesa dubia|Xysticus funestus|Ozyptila distans|Diestrammena asynamora',
    speciesCounts: '01111',
    subspeciesNames: 'Mecaphesa celer xyz|Mecaphesa celer pdq',
    subspeciesCounts: '11'
  });

  specimen = await _addSpecimen({
    locality: locality1,
    startDate: date3,
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Annelida'
  });
  await _checkVisitFor(specimen, {
    kingdomCounts: '0',
    phylumNames: 'Arthropoda|Annelida',
    phylumCounts: '01',
    classNames: 'Arachnida|Insecta|Chilopoda',
    classCounts: '000',
    orderNames: 'Araneae|Opiliones|Orthoptera|Scolopendromorpha',
    orderCounts: '0100',
    familyNames: 'Thomisidae|Theridiidae|Rhaphidophoridae|Cryptopidae',
    familyCounts: '0001',
    genusNames: 'Mecaphesa|Xysticus|Ozyptila|Bassaniana|Latrodectus|Diestrammena',
    genusCounts: '000110',
    speciesNames:
      'Mecaphesa celer|Mecaphesa dubia|Xysticus funestus|Ozyptila distans|Diestrammena asynamora',
    speciesCounts: '01111',
    subspeciesNames: 'Mecaphesa celer xyz|Mecaphesa celer pdq',
    subspeciesCounts: '11'
  });
});

test('respect for components of primary key', async () => {
  let specimen = await _addSpecimen({
    locality: locality2,
    startDate: date1,
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Arachnida'
  });
  await _checkVisitFor(specimen, {
    kingdomCounts: '0',
    phylumNames: 'Arthropoda',
    phylumCounts: '0',
    classNames: 'Arachnida',
    classCounts: '1'
  });

  specimen = await _addSpecimen({
    locality: locality2,
    startDate: date1,
    collectors: collectors2,
    kingdom: 'Animalia',
    phylum: 'Annelida'
  });
  await _checkVisitFor(specimen, {
    kingdomCounts: '0',
    phylumNames: 'Annelida',
    phylumCounts: '1'
  });

  specimen = await _addSpecimen({
    locality: locality2,
    startDate: date2,
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Annelida'
  });
  await _checkVisitFor(specimen, {
    kingdomCounts: '0',
    phylumNames: 'Annelida',
    phylumCounts: '1'
  });

  specimen = await _addSpecimen({
    locality: locality3,
    startDate: date1,
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Insecta'
  });
  await _checkVisitFor(specimen, {
    kingdomCounts: '0',
    phylumNames: 'Arthropoda',
    phylumCounts: '0',
    classNames: 'Insecta',
    classCounts: '1'
  });
});

test('tallying species counts per unit effort', async () => {
  await LocationVisit.dropAll(db);

  // Make sure it starts with just [0,0].

  let tallies = await LocationVisit.tallyCavePoints(db);
  expect(tallies).toEqual({
    speciesCounts: [0],
    perVisitEffort: [0],
    perPersonVisitEffort: [0]
  });

  // Sequentially add specimens to one location from different dates.

  await _addSpecimen({
    locality: locality1,
    startDate: _toISODate('2020-02-01'),
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Arachnida',
    order: 'Araneae',
    family: 'Thomisidae',
    genus: 'Mecaphesa'
  });
  tallies = await LocationVisit.tallyCavePoints(db);
  // prettier-ignore
  let points = [[0, 0], [1, 1]];
  _checkPerVisitTallies(tallies, points);
  _checkPerPersonVisitTallies(tallies, points);

  await _addSpecimen({
    locality: locality1,
    startDate: _toISODate('2020-02-02'),
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Arachnida',
    order: 'Araneae',
    family: 'Thomisidae',
    genus: 'Mecaphesa',
    specificEpithet: 'celer'
  });
  tallies = await LocationVisit.tallyCavePoints(db);
  points.push([2, 1]);
  _checkPerVisitTallies(tallies, points);
  _checkPerPersonVisitTallies(tallies, points);

  await _addSpecimen({
    locality: locality1,
    startDate: _toISODate('2020-02-03'),
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Arachnida',
    order: 'Araneae',
    family: 'Thomisidae',
    genus: 'Mecaphesa',
    specificEpithet: 'celer'
  });
  tallies = await LocationVisit.tallyCavePoints(db);
  points.push([3, 1]);
  _checkPerVisitTallies(tallies, points);
  _checkPerPersonVisitTallies(tallies, points);

  await _addSpecimen({
    locality: locality1,
    startDate: _toISODate('2020-02-04'),
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Arachnida',
    order: 'Araneae',
    family: 'Thomisidae',
    genus: 'Mecaphesa',
    specificEpithet: 'celer',
    infraspecificEpithet: 'xyz'
  });
  tallies = await LocationVisit.tallyCavePoints(db);
  points.push([4, 1]);
  _checkPerVisitTallies(tallies, points);
  _checkPerPersonVisitTallies(tallies, points);

  await _addSpecimen({
    locality: locality1,
    startDate: _toISODate('2020-02-05'),
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Arachnida',
    order: 'Araneae',
    family: 'Thomisidae',
    genus: 'Mecaphesa',
    specificEpithet: 'celer',
    infraspecificEpithet: 'pdq'
  });
  tallies = await LocationVisit.tallyCavePoints(db);
  points.push([5, 2]);
  _checkPerVisitTallies(tallies, points);
  _checkPerPersonVisitTallies(tallies, points);

  await _addSpecimen({
    locality: locality1,
    startDate: _toISODate('2020-02-06'),
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Arachnida',
    order: 'Araneae',
    family: 'Thomisidae',
    genus: 'Mecaphesa',
    specificEpithet: 'dubia'
  });
  tallies = await LocationVisit.tallyCavePoints(db);
  points.push([6, 3]);
  _checkPerVisitTallies(tallies, points);
  _checkPerPersonVisitTallies(tallies, points);

  await _addSpecimen({
    locality: locality1,
    startDate: _toISODate('2020-02-07'),
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Arachnida',
    order: 'Araneae',
    family: 'Thomisidae',
    genus: 'Xysticus',
    specificEpithet: 'funestus'
  });
  tallies = await LocationVisit.tallyCavePoints(db);
  points.push([7, 4]);
  _checkPerVisitTallies(tallies, points);
  _checkPerPersonVisitTallies(tallies, points);

  await _addSpecimen({
    locality: locality1,
    startDate: _toISODate('2020-02-08'),
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Arachnida',
    order: 'Araneae',
    family: 'Thomisidae',
    genus: 'Ozyptila'
  });
  tallies = await LocationVisit.tallyCavePoints(db);
  points.push([8, 5]);
  _checkPerVisitTallies(tallies, points);
  _checkPerPersonVisitTallies(tallies, points);

  await _addSpecimen({
    locality: locality1,
    startDate: _toISODate('2020-02-09'),
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Arachnida',
    order: 'Araneae',
    family: 'Thomisidae',
    genus: 'Bassaniana'
  });
  tallies = await LocationVisit.tallyCavePoints(db);
  points.push([9, 6]);
  _checkPerVisitTallies(tallies, points);
  _checkPerPersonVisitTallies(tallies, points);

  await _addSpecimen({
    locality: locality1,
    startDate: _toISODate('2020-02-10'),
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Arachnida',
    order: 'Araneae',
    family: 'Thomisidae',
    genus: 'Ozyptila',
    specificEpithet: 'distans'
  });
  tallies = await LocationVisit.tallyCavePoints(db);
  points.push([10, 6]);
  _checkPerVisitTallies(tallies, points);
  _checkPerPersonVisitTallies(tallies, points);

  await _addSpecimen({
    locality: locality1,
    startDate: _toISODate('2020-02-11'),
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Arachnida',
    order: 'Araneae',
    family: 'Theridiidae',
    genus: 'Latrodectus'
  });
  tallies = await LocationVisit.tallyCavePoints(db);
  points.push([11, 7]);
  _checkPerVisitTallies(tallies, points);
  _checkPerPersonVisitTallies(tallies, points);

  await _addSpecimen({
    locality: locality1,
    startDate: _toISODate('2020-02-12'),
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Arachnida',
    order: 'Opiliones'
  });
  tallies = await LocationVisit.tallyCavePoints(db);
  points.push([12, 8]);
  _checkPerVisitTallies(tallies, points);
  _checkPerPersonVisitTallies(tallies, points);

  await _addSpecimen({
    locality: locality1,
    startDate: _toISODate('2020-02-13'),
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Insecta',
    order: 'Orthoptera',
    family: 'Rhaphidophoridae',
    genus: 'Diestrammena',
    specificEpithet: 'asynamora'
  });
  tallies = await LocationVisit.tallyCavePoints(db);
  points.push([13, 9]);
  _checkPerVisitTallies(tallies, points);
  _checkPerPersonVisitTallies(tallies, points);

  await _addSpecimen({
    locality: locality1,
    startDate: _toISODate('2020-02-14'),
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Chilopoda'
  });
  tallies = await LocationVisit.tallyCavePoints(db);
  points.push([14, 10]);
  _checkPerVisitTallies(tallies, points);
  _checkPerPersonVisitTallies(tallies, points);

  await _addSpecimen({
    locality: locality1,
    startDate: _toISODate('2020-02-15'),
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Chilopoda',
    order: 'Scolopendromorpha',
    family: 'Cryptopidae'
  });
  tallies = await LocationVisit.tallyCavePoints(db);
  points.push([15, 10]);
  _checkPerVisitTallies(tallies, points);
  _checkPerPersonVisitTallies(tallies, points);

  await _addSpecimen({
    locality: locality1,
    startDate: _toISODate('2020-02-16'),
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Annelida'
  });
  tallies = await LocationVisit.tallyCavePoints(db);
  points.push([16, 11]);
  _checkPerVisitTallies(tallies, points);
  _checkPerPersonVisitTallies(tallies, points);

  // Add a second location for which species have accumulated.

  await _addSpecimen({
    locality: locality2,
    startDate: date1,
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Arachnida',
    order: 'Araneae',
    family: 'Thomisidae',
    genus: 'Mecaphesa',
    specificEpithet: 'celer'
  });
  await _addSpecimen({
    locality: locality2,
    startDate: date1,
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Annelida'
  });
  await _addSpecimen({
    locality: locality2,
    startDate: date1,
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Arachnida',
    order: 'Araneae',
    family: 'Salticidae',
    genus: 'Phidippus',
    specificEpithet: 'audax'
  });
  await _addSpecimen({
    locality: locality2,
    startDate: date1,
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Arachnida',
    order: 'Araneae',
    family: 'Salticidae',
    genus: 'Phidippus',
    specificEpithet: 'regius'
  });
  tallies = await LocationVisit.tallyCavePoints(db);
  points.push([1, 4]);
  _checkPerVisitTallies(tallies, points);
  _checkPerPersonVisitTallies(tallies, points);

  await _addSpecimen({
    locality: locality2,
    startDate: date2,
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Arachnida',
    order: 'Araneae',
    family: 'Salticidae',
    genus: 'Phidippus',
    specificEpithet: 'texanus'
  });
  await _addSpecimen({
    locality: locality2,
    startDate: date2,
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Arachnida',
    order: 'Araneae',
    family: 'Salticidae',
    genus: 'Maevia'
  });
  await _addSpecimen({
    locality: locality2,
    startDate: date2,
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Chilopoda',
    order: 'Scolopendromorpha',
    family: 'Cryptopidae',
    genus: 'Cryptops'
  });
  await _addSpecimen({
    locality: locality2,
    startDate: date2,
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Arachnida',
    order: 'Araneae',
    family: 'Theridiidae',
    genus: 'Latrodectus',
    specificEpithet: 'mactans'
  });
  await _addSpecimen({
    locality: locality2,
    startDate: date2,
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Mollusca'
  });
  tallies = await LocationVisit.tallyCavePoints(db);
  points.push([2, 9]);
  _checkPerVisitTallies(tallies, points);
  _checkPerPersonVisitTallies(tallies, points);

  // Add multi-person visits.

  await _addSpecimen({
    locality: locality2,
    startDate: date3,
    collectors: collectors2,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Arachnida',
    order: 'Araneae',
    family: 'Salticidae',
    genus: 'Phidippus',
    specificEpithet: 'mystaceus'
  });
  await _addSpecimen({
    locality: locality2,
    startDate: date5,
    collectors: collectors2,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Arachnida',
    order: 'Araneae',
    family: 'Salticidae',
    genus: 'Phidippus',
    specificEpithet: 'cardinalis'
  });
  tallies = await LocationVisit.tallyCavePoints(db);
  let perVisitPoints = JSON.parse(JSON.stringify(points));
  let perPersonVisitPoints = JSON.parse(JSON.stringify(points));
  perVisitPoints.push([3, 10], [4, 11]);
  perPersonVisitPoints.push([4, 10], [6, 11]);
  _checkPerVisitTallies(tallies, perVisitPoints);
  _checkPerPersonVisitTallies(tallies, perPersonVisitPoints);

  // Add an earlier visit to be sure points generate in date order.

  await _addSpecimen({
    locality: locality2,
    startDate: date4,
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Arachnida',
    order: 'Araneae',
    family: 'Salticidae',
    genus: 'Naphrys'
  });
  await _addSpecimen({
    locality: locality2,
    startDate: date4,
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Arachnida',
    order: 'Theridiidae',
    family: 'Steatoda'
  });
  tallies = await LocationVisit.tallyCavePoints(db);
  perVisitPoints = JSON.parse(JSON.stringify(points));
  perPersonVisitPoints = JSON.parse(JSON.stringify(points));
  perVisitPoints.push([3, 10], [4, 12], [5, 13]);
  perPersonVisitPoints.push([4, 10], [5, 12], [7, 13]);
  _checkPerVisitTallies(tallies, perVisitPoints);
  _checkPerPersonVisitTallies(tallies, perPersonVisitPoints);
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

function _checkPerPersonVisitTallies(
  tallies: EffortPoints,
  expectedPoints: number[][]
): void {
  expectedPoints.sort(pointSorter);
  const actualPoints = sortPointsXThenY(
    tallies.perPersonVisitEffort,
    tallies.speciesCounts
  );
  expect(actualPoints).toEqual(expectedPoints);
}

function _checkPerVisitTallies(
  tallies: EffortPoints,
  expectedPoints: number[][]
): void {
  expectedPoints.sort(pointSorter);
  const actualPoints = sortPointsXThenY(tallies.perVisitEffort, tallies.speciesCounts);
  expect(actualPoints).toEqual(expectedPoints);
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
      normalizedCollectors: specimen.normalizedCollectors!,
      collectorCount: specimen.normalizedCollectors!.split('|').length,
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
