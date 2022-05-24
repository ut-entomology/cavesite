import type { DB } from '../integrations/postgres';
import { toLocalDate } from '../integrations/postgres';
import { DatabaseMutex } from '../util/test_util';
import { Specimen, SpecimenSource } from '../model/specimen';
import { LocationVisit } from './location_visit';
//import { pointSorter, sortPointsXThenY } from '../../shared/model';
import { LocationEffort } from './location_effort';

//const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;

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

test('tallying species counts per unit effort', async () => {
  await LocationVisit.dropAll(db);

  // Sequentially add specimens to one location from different dates.

  let specimen = await _addSpecimen({
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
  let startDate = specimen.collectionStartDate;
  // prettier-ignore
  let points = [[1, 1]];
  await _retally();
  let effort = await LocationEffort.getByLocationID(db, specimen.localityID);
  expect(effort).toEqual({
    locationID: specimen.localityID,
    isCave: true,
    startDate,
    endDate: startDate,
    totalVisits: 1,
    totalPersonVisits: 1,
    totalSpecies: 1,
    kingdomNames: 'Animalia',
    phylumNames: 'Arthropoda',
    classNames: 'Arachnida',
    orderNames: 'Araneae',
    familyNames: 'Thomisidae',
    genusNames: 'Mecaphesa',
    speciesNames: null,
    subspeciesNames: null,
    perVisitPoints: _toJsonPoints(points),
    perPersonVisitPoints: _toJsonPoints(points)
  });

  specimen = await _addSpecimen({
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
  // prettier-ignore
  points.push([2, 1]);
  await _retally();
  effort = await LocationEffort.getByLocationID(db, specimen.localityID);
  expect(effort).toEqual({
    locationID: specimen.localityID,
    isCave: true,
    startDate,
    endDate: specimen.collectionStartDate,
    totalVisits: 2,
    totalPersonVisits: 2,
    totalSpecies: 1,
    kingdomNames: 'Animalia',
    phylumNames: 'Arthropoda',
    classNames: 'Arachnida',
    orderNames: 'Araneae',
    familyNames: 'Thomisidae',
    genusNames: 'Mecaphesa',
    speciesNames: 'Mecaphesa celer',
    subspeciesNames: null,
    perVisitPoints: _toJsonPoints(points),
    perPersonVisitPoints: _toJsonPoints(points)
  });

  specimen = await _addSpecimen({
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
  points.push([3, 1]);
  await _retally();
  effort = await LocationEffort.getByLocationID(db, specimen.localityID);
  expect(effort).toEqual({
    locationID: specimen.localityID,
    isCave: true,
    startDate,
    endDate: specimen.collectionStartDate,
    totalVisits: 3,
    totalPersonVisits: 3,
    totalSpecies: 1,
    kingdomNames: 'Animalia',
    phylumNames: 'Arthropoda',
    classNames: 'Arachnida',
    orderNames: 'Araneae',
    familyNames: 'Thomisidae',
    genusNames: 'Mecaphesa',
    speciesNames: 'Mecaphesa celer',
    subspeciesNames: null,
    perVisitPoints: _toJsonPoints(points),
    perPersonVisitPoints: _toJsonPoints(points)
  });

  specimen = await _addSpecimen({
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
  points.push([4, 1]);
  await _retally();
  effort = await LocationEffort.getByLocationID(db, specimen.localityID);
  expect(effort).toEqual({
    locationID: specimen.localityID,
    isCave: true,
    startDate,
    endDate: specimen.collectionStartDate,
    totalVisits: 4,
    totalPersonVisits: 4,
    totalSpecies: 1,
    kingdomNames: 'Animalia',
    phylumNames: 'Arthropoda',
    classNames: 'Arachnida',
    orderNames: 'Araneae',
    familyNames: 'Thomisidae',
    genusNames: 'Mecaphesa',
    speciesNames: 'Mecaphesa celer',
    subspeciesNames: 'Mecaphesa celer xyz',
    perVisitPoints: _toJsonPoints(points),
    perPersonVisitPoints: _toJsonPoints(points)
  });

  specimen = await _addSpecimen({
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
  points.push([5, 2]);
  await _retally();
  effort = await LocationEffort.getByLocationID(db, specimen.localityID);
  expect(effort).toEqual({
    locationID: specimen.localityID,
    isCave: true,
    startDate,
    endDate: specimen.collectionStartDate,
    totalVisits: 5,
    totalPersonVisits: 5,
    totalSpecies: 2,
    kingdomNames: 'Animalia',
    phylumNames: 'Arthropoda',
    classNames: 'Arachnida',
    orderNames: 'Araneae',
    familyNames: 'Thomisidae',
    genusNames: 'Mecaphesa',
    speciesNames: 'Mecaphesa celer',
    subspeciesNames: 'Mecaphesa celer xyz|Mecaphesa celer pdq',
    perVisitPoints: _toJsonPoints(points),
    perPersonVisitPoints: _toJsonPoints(points)
  });

  specimen = await _addSpecimen({
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
  points.push([6, 3]);
  await _retally();
  effort = await LocationEffort.getByLocationID(db, specimen.localityID);
  expect(effort).toEqual({
    locationID: specimen.localityID,
    isCave: true,
    startDate,
    endDate: specimen.collectionStartDate,
    totalVisits: 6,
    totalPersonVisits: 6,
    totalSpecies: 3,
    kingdomNames: 'Animalia',
    phylumNames: 'Arthropoda',
    classNames: 'Arachnida',
    orderNames: 'Araneae',
    familyNames: 'Thomisidae',
    genusNames: 'Mecaphesa',
    speciesNames: 'Mecaphesa celer|Mecaphesa dubia',
    subspeciesNames: 'Mecaphesa celer xyz|Mecaphesa celer pdq',
    perVisitPoints: _toJsonPoints(points),
    perPersonVisitPoints: _toJsonPoints(points)
  });

  specimen = await _addSpecimen({
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
  points.push([7, 4]);
  await _retally();
  effort = await LocationEffort.getByLocationID(db, specimen.localityID);
  expect(effort).toEqual({
    locationID: specimen.localityID,
    isCave: true,
    startDate,
    endDate: specimen.collectionStartDate,
    totalVisits: 7,
    totalPersonVisits: 7,
    totalSpecies: 4,
    kingdomNames: 'Animalia',
    phylumNames: 'Arthropoda',
    classNames: 'Arachnida',
    orderNames: 'Araneae',
    familyNames: 'Thomisidae',
    genusNames: 'Mecaphesa|Xysticus',
    speciesNames: 'Mecaphesa celer|Mecaphesa dubia|Xysticus funestus',
    subspeciesNames: 'Mecaphesa celer xyz|Mecaphesa celer pdq',
    perVisitPoints: _toJsonPoints(points),
    perPersonVisitPoints: _toJsonPoints(points)
  });

  specimen = await _addSpecimen({
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
  points.push([8, 5]);
  await _retally();
  effort = await LocationEffort.getByLocationID(db, specimen.localityID);
  expect(effort).toEqual({
    locationID: specimen.localityID,
    isCave: true,
    startDate,
    endDate: specimen.collectionStartDate,
    totalVisits: 8,
    totalPersonVisits: 8,
    totalSpecies: 5,
    kingdomNames: 'Animalia',
    phylumNames: 'Arthropoda',
    classNames: 'Arachnida',
    orderNames: 'Araneae',
    familyNames: 'Thomisidae',
    genusNames: 'Mecaphesa|Xysticus|Ozyptila',
    speciesNames: 'Mecaphesa celer|Mecaphesa dubia|Xysticus funestus',
    subspeciesNames: 'Mecaphesa celer xyz|Mecaphesa celer pdq',
    perVisitPoints: _toJsonPoints(points),
    perPersonVisitPoints: _toJsonPoints(points)
  });

  specimen = await _addSpecimen({
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
  points.push([9, 6]);
  await _retally();
  effort = await LocationEffort.getByLocationID(db, specimen.localityID);
  expect(effort).toEqual({
    locationID: specimen.localityID,
    isCave: true,
    startDate,
    endDate: specimen.collectionStartDate,
    totalVisits: 9,
    totalPersonVisits: 9,
    totalSpecies: 6,
    kingdomNames: 'Animalia',
    phylumNames: 'Arthropoda',
    classNames: 'Arachnida',
    orderNames: 'Araneae',
    familyNames: 'Thomisidae',
    genusNames: 'Mecaphesa|Xysticus|Ozyptila|Bassaniana',
    speciesNames: 'Mecaphesa celer|Mecaphesa dubia|Xysticus funestus',
    subspeciesNames: 'Mecaphesa celer xyz|Mecaphesa celer pdq',
    perVisitPoints: _toJsonPoints(points),
    perPersonVisitPoints: _toJsonPoints(points)
  });

  specimen = await _addSpecimen({
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
  points.push([10, 6]);
  await _retally();
  effort = await LocationEffort.getByLocationID(db, specimen.localityID);
  expect(effort).toEqual({
    locationID: specimen.localityID,
    isCave: true,
    startDate,
    endDate: specimen.collectionStartDate,
    totalVisits: 10,
    totalPersonVisits: 10,
    totalSpecies: 6,
    kingdomNames: 'Animalia',
    phylumNames: 'Arthropoda',
    classNames: 'Arachnida',
    orderNames: 'Araneae',
    familyNames: 'Thomisidae',
    genusNames: 'Mecaphesa|Xysticus|Ozyptila|Bassaniana',
    speciesNames: 'Mecaphesa celer|Mecaphesa dubia|Xysticus funestus|Ozyptila distans',
    subspeciesNames: 'Mecaphesa celer xyz|Mecaphesa celer pdq',
    perVisitPoints: _toJsonPoints(points),
    perPersonVisitPoints: _toJsonPoints(points)
  });

  specimen = await _addSpecimen({
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
  points.push([11, 7]);
  await _retally();
  effort = await LocationEffort.getByLocationID(db, specimen.localityID);
  expect(effort).toEqual({
    locationID: specimen.localityID,
    isCave: true,
    startDate,
    endDate: specimen.collectionStartDate,
    totalVisits: 11,
    totalPersonVisits: 11,
    totalSpecies: 7,
    kingdomNames: 'Animalia',
    phylumNames: 'Arthropoda',
    classNames: 'Arachnida',
    orderNames: 'Araneae',
    familyNames: 'Thomisidae|Theridiidae',
    genusNames: 'Mecaphesa|Xysticus|Ozyptila|Bassaniana|Latrodectus',
    speciesNames: 'Mecaphesa celer|Mecaphesa dubia|Xysticus funestus|Ozyptila distans',
    subspeciesNames: 'Mecaphesa celer xyz|Mecaphesa celer pdq',
    perVisitPoints: _toJsonPoints(points),
    perPersonVisitPoints: _toJsonPoints(points)
  });

  specimen = await _addSpecimen({
    locality: locality1,
    startDate: _toISODate('2020-02-12'),
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Arachnida',
    order: 'Opiliones'
  });
  points.push([12, 8]);
  await _retally();
  effort = await LocationEffort.getByLocationID(db, specimen.localityID);
  expect(effort).toEqual({
    locationID: specimen.localityID,
    isCave: true,
    startDate,
    endDate: specimen.collectionStartDate,
    totalVisits: 12,
    totalPersonVisits: 12,
    totalSpecies: 8,
    kingdomNames: 'Animalia',
    phylumNames: 'Arthropoda',
    classNames: 'Arachnida',
    orderNames: 'Araneae|Opiliones',
    familyNames: 'Thomisidae|Theridiidae',
    genusNames: 'Mecaphesa|Xysticus|Ozyptila|Bassaniana|Latrodectus',
    speciesNames: 'Mecaphesa celer|Mecaphesa dubia|Xysticus funestus|Ozyptila distans',
    subspeciesNames: 'Mecaphesa celer xyz|Mecaphesa celer pdq',
    perVisitPoints: _toJsonPoints(points),
    perPersonVisitPoints: _toJsonPoints(points)
  });

  specimen = await _addSpecimen({
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
  points.push([13, 9]);
  await _retally();
  effort = await LocationEffort.getByLocationID(db, specimen.localityID);
  expect(effort).toEqual({
    locationID: specimen.localityID,
    isCave: true,
    startDate,
    endDate: specimen.collectionStartDate,
    totalVisits: 13,
    totalPersonVisits: 13,
    totalSpecies: 9,
    kingdomNames: 'Animalia',
    phylumNames: 'Arthropoda',
    classNames: 'Arachnida|Insecta',
    orderNames: 'Araneae|Opiliones|Orthoptera',
    familyNames: 'Thomisidae|Theridiidae|Rhaphidophoridae',
    genusNames: 'Mecaphesa|Xysticus|Ozyptila|Bassaniana|Latrodectus|Diestrammena',
    speciesNames:
      'Mecaphesa celer|Mecaphesa dubia|Xysticus funestus|Ozyptila distans|Diestrammena asynamora',
    subspeciesNames: 'Mecaphesa celer xyz|Mecaphesa celer pdq',
    perVisitPoints: _toJsonPoints(points),
    perPersonVisitPoints: _toJsonPoints(points)
  });

  specimen = await _addSpecimen({
    locality: locality1,
    startDate: _toISODate('2020-02-14'),
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Chilopoda'
  });
  points.push([14, 10]);
  await _retally();
  effort = await LocationEffort.getByLocationID(db, specimen.localityID);
  expect(effort).toEqual({
    locationID: specimen.localityID,
    isCave: true,
    startDate,
    endDate: specimen.collectionStartDate,
    totalVisits: 14,
    totalPersonVisits: 14,
    totalSpecies: 10,
    kingdomNames: 'Animalia',
    phylumNames: 'Arthropoda',
    classNames: 'Arachnida|Insecta|Chilopoda',
    orderNames: 'Araneae|Opiliones|Orthoptera',
    familyNames: 'Thomisidae|Theridiidae|Rhaphidophoridae',
    genusNames: 'Mecaphesa|Xysticus|Ozyptila|Bassaniana|Latrodectus|Diestrammena',
    speciesNames:
      'Mecaphesa celer|Mecaphesa dubia|Xysticus funestus|Ozyptila distans|Diestrammena asynamora',
    subspeciesNames: 'Mecaphesa celer xyz|Mecaphesa celer pdq',
    perVisitPoints: _toJsonPoints(points),
    perPersonVisitPoints: _toJsonPoints(points)
  });

  specimen = await _addSpecimen({
    locality: locality1,
    startDate: _toISODate('2020-02-15'),
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Chilopoda',
    order: 'Scolopendromorpha',
    family: 'Cryptopidae'
  });
  points.push([15, 10]);
  await _retally();
  effort = await LocationEffort.getByLocationID(db, specimen.localityID);
  expect(effort).toEqual({
    locationID: specimen.localityID,
    isCave: true,
    startDate,
    endDate: specimen.collectionStartDate,
    totalVisits: 15,
    totalPersonVisits: 15,
    totalSpecies: 10,
    kingdomNames: 'Animalia',
    phylumNames: 'Arthropoda',
    classNames: 'Arachnida|Insecta|Chilopoda',
    orderNames: 'Araneae|Opiliones|Orthoptera|Scolopendromorpha',
    familyNames: 'Thomisidae|Theridiidae|Rhaphidophoridae|Cryptopidae',
    genusNames: 'Mecaphesa|Xysticus|Ozyptila|Bassaniana|Latrodectus|Diestrammena',
    speciesNames:
      'Mecaphesa celer|Mecaphesa dubia|Xysticus funestus|Ozyptila distans|Diestrammena asynamora',
    subspeciesNames: 'Mecaphesa celer xyz|Mecaphesa celer pdq',
    perVisitPoints: _toJsonPoints(points),
    perPersonVisitPoints: _toJsonPoints(points)
  });

  specimen = await _addSpecimen({
    locality: locality1,
    startDate: _toISODate('2020-02-16'),
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Annelida'
  });
  points.push([16, 11]);
  await _retally();
  effort = await LocationEffort.getByLocationID(db, specimen.localityID);
  expect(effort).toEqual({
    locationID: specimen.localityID,
    isCave: true,
    startDate,
    endDate: specimen.collectionStartDate,
    totalVisits: 16,
    totalPersonVisits: 16,
    totalSpecies: 11,
    kingdomNames: 'Animalia',
    phylumNames: 'Arthropoda|Annelida',
    classNames: 'Arachnida|Insecta|Chilopoda',
    orderNames: 'Araneae|Opiliones|Orthoptera|Scolopendromorpha',
    familyNames: 'Thomisidae|Theridiidae|Rhaphidophoridae|Cryptopidae',
    genusNames: 'Mecaphesa|Xysticus|Ozyptila|Bassaniana|Latrodectus|Diestrammena',
    speciesNames:
      'Mecaphesa celer|Mecaphesa dubia|Xysticus funestus|Ozyptila distans|Diestrammena asynamora',
    subspeciesNames: 'Mecaphesa celer xyz|Mecaphesa celer pdq',
    perVisitPoints: _toJsonPoints(points),
    perPersonVisitPoints: _toJsonPoints(points)
  });

  // Add a second location for which species have accumulated.

  specimen = await _addSpecimen({
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
  startDate = specimen.collectionStartDate;
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
  specimen = await _addSpecimen({
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
  points = [[1, 4]];
  await _retally();
  effort = await LocationEffort.getByLocationID(db, specimen.localityID);
  expect(effort).toEqual({
    locationID: specimen.localityID,
    isCave: true,
    startDate,
    endDate: specimen.collectionStartDate,
    totalVisits: 1,
    totalPersonVisits: 1,
    totalSpecies: 4,
    kingdomNames: 'Animalia',
    phylumNames: 'Arthropoda|Annelida',
    classNames: 'Arachnida',
    orderNames: 'Araneae',
    familyNames: 'Thomisidae|Salticidae',
    genusNames: 'Mecaphesa|Phidippus',
    speciesNames: 'Mecaphesa celer|Phidippus audax|Phidippus regius',
    subspeciesNames: null,
    perVisitPoints: _toJsonPoints(points),
    perPersonVisitPoints: _toJsonPoints(points)
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
  specimen = await _addSpecimen({
    locality: locality2,
    startDate: date2,
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Mollusca'
  });
  points.push([2, 9]);
  await _retally();
  effort = await LocationEffort.getByLocationID(db, specimen.localityID);
  expect(effort).toEqual({
    locationID: specimen.localityID,
    isCave: true,
    startDate,
    endDate: specimen.collectionStartDate,
    totalVisits: 2,
    totalPersonVisits: 2,
    totalSpecies: 9,
    kingdomNames: 'Animalia',
    phylumNames: 'Arthropoda|Annelida|Mollusca',
    classNames: 'Arachnida|Chilopoda',
    orderNames: 'Araneae|Scolopendromorpha',
    familyNames: 'Thomisidae|Salticidae|Cryptopidae|Theridiidae',
    genusNames: 'Mecaphesa|Phidippus|Maevia|Cryptops|Latrodectus',
    speciesNames:
      'Mecaphesa celer|Phidippus audax|Phidippus regius|Phidippus texanus|Latrodectus mactans',
    subspeciesNames: null,
    perVisitPoints: _toJsonPoints(points),
    perPersonVisitPoints: _toJsonPoints(points)
  });

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
  specimen = await _addSpecimen({
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
  let perVisitPoints = JSON.parse(JSON.stringify(points));
  let perPersonVisitPoints = JSON.parse(JSON.stringify(points));
  perVisitPoints.push([3, 10], [4, 11]);
  perPersonVisitPoints.push([4, 10], [6, 11]);
  await _retally();
  effort = await LocationEffort.getByLocationID(db, specimen.localityID);
  expect(effort).toEqual({
    locationID: specimen.localityID,
    isCave: true,
    startDate,
    endDate: specimen.collectionStartDate,
    totalVisits: 4,
    totalPersonVisits: 6,
    totalSpecies: 11,
    kingdomNames: 'Animalia',
    phylumNames: 'Arthropoda|Annelida|Mollusca',
    classNames: 'Arachnida|Chilopoda',
    orderNames: 'Araneae|Scolopendromorpha',
    familyNames: 'Thomisidae|Salticidae|Cryptopidae|Theridiidae',
    genusNames: 'Mecaphesa|Phidippus|Maevia|Cryptops|Latrodectus',
    speciesNames:
      'Mecaphesa celer|Phidippus audax|Phidippus regius|Phidippus texanus|Latrodectus mactans|Phidippus mystaceus|Phidippus cardinalis',
    subspeciesNames: null,
    perVisitPoints: _toJsonPoints(perVisitPoints),
    perPersonVisitPoints: _toJsonPoints(perPersonVisitPoints)
  });
  let endDate = specimen.collectionStartDate;

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
  specimen = await _addSpecimen({
    locality: locality2,
    startDate: date4,
    collectors: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Arachnida',
    order: 'Araneae',
    family: 'Theridiidae',
    genus: 'Steatoda'
  });
  perVisitPoints = JSON.parse(JSON.stringify(points));
  perPersonVisitPoints = JSON.parse(JSON.stringify(points));
  perVisitPoints.push([3, 10], [4, 12], [5, 13]);
  perPersonVisitPoints.push([4, 10], [5, 12], [7, 13]);
  await _retally();
  effort = await LocationEffort.getByLocationID(db, specimen.localityID);
  expect(effort).toEqual({
    locationID: specimen.localityID,
    isCave: true,
    startDate,
    endDate, // of prior visit
    totalVisits: 5,
    totalPersonVisits: 7,
    totalSpecies: 13,
    kingdomNames: 'Animalia',
    phylumNames: 'Arthropoda|Annelida|Mollusca',
    classNames: 'Arachnida|Chilopoda',
    orderNames: 'Araneae|Scolopendromorpha',
    familyNames: 'Thomisidae|Salticidae|Cryptopidae|Theridiidae',
    genusNames: 'Mecaphesa|Phidippus|Maevia|Cryptops|Latrodectus|Naphrys|Steatoda',
    speciesNames:
      'Mecaphesa celer|Phidippus audax|Phidippus regius|Phidippus texanus|Latrodectus mactans|Phidippus mystaceus|Phidippus cardinalis',
    subspeciesNames: null,
    perVisitPoints: _toJsonPoints(perVisitPoints),
    perPersonVisitPoints: _toJsonPoints(perPersonVisitPoints)
  });
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
/*
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
*/
async function _retally(): Promise<void> {
  await LocationEffort.dropAll(db);
  await LocationEffort.tallyEffort(db);
}
/*
function _toDaysEpoch(date: Date | string): number {
  if (typeof date == 'string') date = new Date(date);
  return Math.floor(date.getTime() / MILLIS_PER_DAY);
}
*/
function _toISODate(dateString: string): string {
  return toLocalDate(new Date(dateString)).toISOString();
}

function _toJsonPoints(points: number[][]): string {
  return JSON.stringify(points);
}
