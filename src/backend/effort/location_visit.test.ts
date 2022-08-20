import type { DB } from '../integrations/postgres';
import { toLocalDate } from '../integrations/postgres';
import { DatabaseMutex } from '../util/test_util';
import { Specimen, GbifRecord } from '../model/specimen';
import { LocationVisit } from './location_visit';
import { ComparedFauna } from '../../shared/model';
import { toDaysEpoch } from '../../shared/date_tools';

type PartialGbifRecord = Pick<
  GbifRecord,
  | 'locality'
  | 'eventDate'
  | 'recordedBy'
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
    eventDate: date1,
    recordedBy: collectors1,
    kingdom: 'Animalia'
  });
  await _checkVisitFor(specimen, { kingdomCounts: '1' });

  specimen = await _addSpecimen({
    locality: locality1,
    eventDate: date1,
    recordedBy: collectors1,
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
    eventDate: date1,
    recordedBy: collectors1,
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
    eventDate: date1,
    recordedBy: collectors1,
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
    eventDate: date1,
    recordedBy: collectors1,
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
    eventDate: date1,
    recordedBy: collectors1,
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
    eventDate: date1,
    recordedBy: collectors1,
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
    eventDate: date1,
    recordedBy: collectors1,
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
    eventDate: date2,
    recordedBy: collectors1,
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
    eventDate: date2,
    recordedBy: collectors1,
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
    eventDate: date2,
    recordedBy: collectors1,
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
    eventDate: date2,
    recordedBy: collectors1,
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
    eventDate: date2,
    recordedBy: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Arachnida',
    order: 'Araneae',
    family: 'Thomisidae'
  });
  await _checkVisitFor(specimen, expectedVisitData);

  specimen = await _addSpecimen({
    locality: locality1,
    eventDate: date2,
    recordedBy: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Arachnida',
    order: 'Araneae'
  });
  await _checkVisitFor(specimen, expectedVisitData);

  specimen = await _addSpecimen({
    locality: locality1,
    eventDate: date2,
    recordedBy: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Arachnida'
  });
  await _checkVisitFor(specimen, expectedVisitData);

  specimen = await _addSpecimen({
    locality: locality1,
    eventDate: date2,
    recordedBy: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda'
  });
  await _checkVisitFor(specimen, expectedVisitData);

  specimen = await _addSpecimen({
    locality: locality1,
    eventDate: date2,
    recordedBy: collectors1,
    kingdom: 'Animalia'
  });
  await _checkVisitFor(specimen, expectedVisitData);
});

test('adding multiple taxonomic groups', async () => {
  let specimen = await _addSpecimen({
    locality: locality1,
    eventDate: date3,
    recordedBy: collectors1,
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
    eventDate: date3,
    recordedBy: collectors1,
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
    eventDate: date3,
    recordedBy: collectors1,
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
    eventDate: date3,
    recordedBy: collectors1,
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
    eventDate: date3,
    recordedBy: collectors1,
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
    eventDate: date3,
    recordedBy: collectors1,
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
    eventDate: date3,
    recordedBy: collectors1,
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
    eventDate: date3,
    recordedBy: collectors1,
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
    eventDate: date3,
    recordedBy: collectors1,
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
    eventDate: date3,
    recordedBy: collectors1,
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
    eventDate: date3,
    recordedBy: collectors1,
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
    eventDate: date3,
    recordedBy: collectors1,
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
    eventDate: date3,
    recordedBy: collectors1,
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
    eventDate: date1,
    recordedBy: collectors1,
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
    eventDate: date1,
    recordedBy: collectors2,
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
    eventDate: date2,
    recordedBy: collectors1,
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
    eventDate: date1,
    recordedBy: collectors1,
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

afterAll(async () => {
  await mutex.unlock();
});

async function _addSpecimen(data: PartialGbifRecord): Promise<Specimen> {
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
  await LocationVisit.addSpecimen(db, ComparedFauna.all, specimen);
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
      isCave: specimen.isCave,
      startDate: new Date(specimen.collectionStartDate!),
      startEpochDay: _toDaysEpoch(specimen.collectionStartDate!),
      endDate: new Date(specimen.collectionStartDate!),
      endEpochDay: _toDaysEpoch(specimen.collectionStartDate!),
      flags: 0,
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
    ComparedFauna.all,
    specimen.localityID,
    _toDaysEpoch(specimen.collectionStartDate!),
    specimen.normalizedCollectors!
  );
  return visit!;
}

function _toDaysEpoch(date: Date | string): number {
  if (typeof date == 'string') date = new Date(date);
  return toDaysEpoch(date);
}

function _toISODate(dateString: string): string {
  return toLocalDate(new Date(dateString)).toISOString();
}
