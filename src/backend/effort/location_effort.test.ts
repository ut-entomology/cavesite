import type { DB } from '../integrations/postgres';
import { toLocalDate } from '../integrations/postgres';
import { DatabaseMutex } from '../util/test_util';
import { Specimen, SpecimenSource } from '../model/specimen';
import { LocationVisit } from './location_visit';
import { LocationEffort } from './location_effort';
import { ComparedTaxa } from '../../shared/model';

type PartialSpecimenSource = Pick<
  SpecimenSource,
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
  await LocationVisit.dropAll(db, ComparedTaxa.all);

  // Sequentially add specimens to one location from different dates.

  let specimen = await _addSpecimen({
    locality: locality1,
    eventDate: _toISODate('2020-02-01'),
    recordedBy: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Arachnida',
    order: 'Araneae',
    family: 'Thomisidae',
    genus: 'Mecaphesa'
  });
  let locationID1 = specimen.localityID;
  // prettier-ignore
  let points = [[1, 1]];
  await _retally();
  let effort = await _getEffort(specimen.localityID);
  expect(effort).toEqual({
    locationID: specimen.localityID,
    countyName: 'Travis County',
    localityName: 'Cave 1',
    isCave: true,
    flags: 0,
    totalVisits: 1,
    totalPersonVisits: 1,
    totalSpecies: 1,
    kingdomNames: 'Animalia',
    kingdomVisits: '1',
    phylumNames: 'Arthropoda',
    phylumVisits: '1',
    classNames: 'Arachnida',
    classVisits: '1',
    orderNames: 'Araneae',
    orderVisits: '1',
    familyNames: 'Thomisidae',
    familyVisits: '1',
    genusNames: 'Mecaphesa',
    genusVisits: '1',
    speciesNames: null,
    speciesVisits: null,
    subspeciesNames: null,
    subspeciesVisits: null,
    perVisitPoints: _toJsonPoints(points),
    perPersonVisitPoints: _toJsonPoints(points)
  });

  specimen = await _addSpecimen({
    locality: locality1,
    eventDate: _toISODate('2020-02-02'),
    recordedBy: collectors1,
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
  effort = await _getEffort(specimen.localityID);
  expect(effort).toEqual({
    locationID: specimen.localityID,
    countyName: 'Travis County',
    localityName: 'Cave 1',
    isCave: true,
    flags: 0,
    totalVisits: 2,
    totalPersonVisits: 2,
    totalSpecies: 1,
    kingdomNames: 'Animalia',
    kingdomVisits: '2',
    phylumNames: 'Arthropoda',
    phylumVisits: '2',
    classNames: 'Arachnida',
    classVisits: '2',
    orderNames: 'Araneae',
    orderVisits: '2',
    familyNames: 'Thomisidae',
    familyVisits: '2',
    genusNames: 'Mecaphesa',
    genusVisits: '2',
    speciesNames: 'Mecaphesa celer',
    speciesVisits: '1',
    subspeciesNames: null,
    subspeciesVisits: null,
    perVisitPoints: _toJsonPoints(points),
    perPersonVisitPoints: _toJsonPoints(points)
  });

  specimen = await _addSpecimen({
    locality: locality1,
    eventDate: _toISODate('2020-02-03'),
    recordedBy: collectors1,
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
  effort = await _getEffort(specimen.localityID);
  expect(effort).toEqual({
    locationID: specimen.localityID,
    countyName: 'Travis County',
    localityName: 'Cave 1',
    isCave: true,
    flags: 0,
    totalVisits: 3,
    totalPersonVisits: 3,
    totalSpecies: 1,
    kingdomNames: 'Animalia',
    kingdomVisits: '3',
    phylumNames: 'Arthropoda',
    phylumVisits: '3',
    classNames: 'Arachnida',
    classVisits: '3',
    orderNames: 'Araneae',
    orderVisits: '3',
    familyNames: 'Thomisidae',
    familyVisits: '3',
    genusNames: 'Mecaphesa',
    genusVisits: '3',
    speciesNames: 'Mecaphesa celer',
    speciesVisits: '2',
    subspeciesNames: null,
    subspeciesVisits: null,
    perVisitPoints: _toJsonPoints(points),
    perPersonVisitPoints: _toJsonPoints(points)
  });

  specimen = await _addSpecimen({
    locality: locality1,
    eventDate: _toISODate('2020-02-04'),
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
  points.push([4, 1]);
  await _retally();
  effort = await _getEffort(specimen.localityID);
  expect(effort).toEqual({
    locationID: specimen.localityID,
    countyName: 'Travis County',
    localityName: 'Cave 1',
    isCave: true,
    flags: 0,
    totalVisits: 4,
    totalPersonVisits: 4,
    totalSpecies: 1,
    kingdomNames: 'Animalia',
    kingdomVisits: '4',
    phylumNames: 'Arthropoda',
    phylumVisits: '4',
    classNames: 'Arachnida',
    classVisits: '4',
    orderNames: 'Araneae',
    orderVisits: '4',
    familyNames: 'Thomisidae',
    familyVisits: '4',
    genusNames: 'Mecaphesa',
    genusVisits: '4',
    speciesNames: 'Mecaphesa celer',
    speciesVisits: '3',
    subspeciesNames: 'Mecaphesa celer xyz',
    subspeciesVisits: '1',
    perVisitPoints: _toJsonPoints(points),
    perPersonVisitPoints: _toJsonPoints(points)
  });

  specimen = await _addSpecimen({
    locality: locality1,
    eventDate: _toISODate('2020-02-05'),
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
  points.push([5, 2]);
  await _retally();
  effort = await _getEffort(specimen.localityID);
  expect(effort).toEqual({
    locationID: specimen.localityID,
    countyName: 'Travis County',
    localityName: 'Cave 1',
    isCave: true,
    flags: 0,
    totalVisits: 5,
    totalPersonVisits: 5,
    totalSpecies: 2,
    kingdomNames: 'Animalia',
    kingdomVisits: '5',
    phylumNames: 'Arthropoda',
    phylumVisits: '5',
    classNames: 'Arachnida',
    classVisits: '5',
    orderNames: 'Araneae',
    orderVisits: '5',
    familyNames: 'Thomisidae',
    familyVisits: '5',
    genusNames: 'Mecaphesa',
    genusVisits: '5',
    speciesNames: 'Mecaphesa celer',
    speciesVisits: '4',
    subspeciesNames: 'Mecaphesa celer xyz|Mecaphesa celer pdq',
    subspeciesVisits: '1,1',
    perVisitPoints: _toJsonPoints(points),
    perPersonVisitPoints: _toJsonPoints(points)
  });

  specimen = await _addSpecimen({
    locality: locality1,
    eventDate: _toISODate('2020-02-06'),
    recordedBy: collectors1,
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
  effort = await _getEffort(specimen.localityID);
  expect(effort).toEqual({
    locationID: specimen.localityID,
    countyName: 'Travis County',
    localityName: 'Cave 1',
    isCave: true,
    flags: 0,
    totalVisits: 6,
    totalPersonVisits: 6,
    totalSpecies: 3,
    kingdomNames: 'Animalia',
    kingdomVisits: '6',
    phylumNames: 'Arthropoda',
    phylumVisits: '6',
    classNames: 'Arachnida',
    classVisits: '6',
    orderNames: 'Araneae',
    orderVisits: '6',
    familyNames: 'Thomisidae',
    familyVisits: '6',
    genusNames: 'Mecaphesa',
    genusVisits: '6',
    speciesNames: 'Mecaphesa celer|Mecaphesa dubia',
    speciesVisits: '4,1',
    subspeciesNames: 'Mecaphesa celer xyz|Mecaphesa celer pdq',
    subspeciesVisits: '1,1',
    perVisitPoints: _toJsonPoints(points),
    perPersonVisitPoints: _toJsonPoints(points)
  });

  specimen = await _addSpecimen({
    locality: locality1,
    eventDate: _toISODate('2020-02-07'),
    recordedBy: collectors1,
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
  effort = await _getEffort(specimen.localityID);
  expect(effort).toEqual({
    locationID: specimen.localityID,
    countyName: 'Travis County',
    localityName: 'Cave 1',
    isCave: true,
    flags: 0,
    totalVisits: 7,
    totalPersonVisits: 7,
    totalSpecies: 4,
    kingdomNames: 'Animalia',
    kingdomVisits: '7',
    phylumNames: 'Arthropoda',
    phylumVisits: '7',
    classNames: 'Arachnida',
    classVisits: '7',
    orderNames: 'Araneae',
    orderVisits: '7',
    familyNames: 'Thomisidae',
    familyVisits: '7',
    genusNames: 'Mecaphesa|Xysticus',
    genusVisits: '6,1',
    speciesNames: 'Mecaphesa celer|Mecaphesa dubia|Xysticus funestus',
    speciesVisits: '4,1,1',
    subspeciesNames: 'Mecaphesa celer xyz|Mecaphesa celer pdq',
    subspeciesVisits: '1,1',
    perVisitPoints: _toJsonPoints(points),
    perPersonVisitPoints: _toJsonPoints(points)
  });

  specimen = await _addSpecimen({
    locality: locality1,
    eventDate: _toISODate('2020-02-08'),
    recordedBy: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Arachnida',
    order: 'Araneae',
    family: 'Thomisidae',
    genus: 'Ozyptila'
  });
  points.push([8, 5]);
  await _retally();
  effort = await _getEffort(specimen.localityID);
  expect(effort).toEqual({
    locationID: specimen.localityID,
    countyName: 'Travis County',
    localityName: 'Cave 1',
    isCave: true,
    flags: 0,
    totalVisits: 8,
    totalPersonVisits: 8,
    totalSpecies: 5,
    kingdomNames: 'Animalia',
    kingdomVisits: '8',
    phylumNames: 'Arthropoda',
    phylumVisits: '8',
    classNames: 'Arachnida',
    classVisits: '8',
    orderNames: 'Araneae',
    orderVisits: '8',
    familyNames: 'Thomisidae',
    familyVisits: '8',
    genusNames: 'Mecaphesa|Xysticus|Ozyptila',
    genusVisits: '6,1,1',
    speciesNames: 'Mecaphesa celer|Mecaphesa dubia|Xysticus funestus',
    speciesVisits: '4,1,1',
    subspeciesNames: 'Mecaphesa celer xyz|Mecaphesa celer pdq',
    subspeciesVisits: '1,1',
    perVisitPoints: _toJsonPoints(points),
    perPersonVisitPoints: _toJsonPoints(points)
  });

  specimen = await _addSpecimen({
    locality: locality1,
    eventDate: _toISODate('2020-02-09'),
    recordedBy: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Arachnida',
    order: 'Araneae',
    family: 'Thomisidae',
    genus: 'Bassaniana'
  });
  points.push([9, 6]);
  await _retally();
  effort = await _getEffort(specimen.localityID);
  expect(effort).toEqual({
    locationID: specimen.localityID,
    countyName: 'Travis County',
    localityName: 'Cave 1',
    isCave: true,
    flags: 0,
    totalVisits: 9,
    totalPersonVisits: 9,
    totalSpecies: 6,
    kingdomNames: 'Animalia',
    kingdomVisits: '9',
    phylumNames: 'Arthropoda',
    phylumVisits: '9',
    classNames: 'Arachnida',
    classVisits: '9',
    orderNames: 'Araneae',
    orderVisits: '9',
    familyNames: 'Thomisidae',
    familyVisits: '9',
    genusNames: 'Mecaphesa|Xysticus|Ozyptila|Bassaniana',
    genusVisits: '6,1,1,1',
    speciesNames: 'Mecaphesa celer|Mecaphesa dubia|Xysticus funestus',
    speciesVisits: '4,1,1',
    subspeciesNames: 'Mecaphesa celer xyz|Mecaphesa celer pdq',
    subspeciesVisits: '1,1',
    perVisitPoints: _toJsonPoints(points),
    perPersonVisitPoints: _toJsonPoints(points)
  });

  specimen = await _addSpecimen({
    locality: locality1,
    eventDate: _toISODate('2020-02-10'),
    recordedBy: collectors1,
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
  effort = await _getEffort(specimen.localityID);
  expect(effort).toEqual({
    locationID: specimen.localityID,
    countyName: 'Travis County',
    localityName: 'Cave 1',
    isCave: true,
    flags: 0,
    totalVisits: 10,
    totalPersonVisits: 10,
    totalSpecies: 6,
    kingdomNames: 'Animalia',
    kingdomVisits: '10',
    phylumNames: 'Arthropoda',
    phylumVisits: '10',
    classNames: 'Arachnida',
    classVisits: '10',
    orderNames: 'Araneae',
    orderVisits: '10',
    familyNames: 'Thomisidae',
    familyVisits: '10',
    genusNames: 'Mecaphesa|Xysticus|Ozyptila|Bassaniana',
    genusVisits: '6,1,2,1',
    speciesNames: 'Mecaphesa celer|Mecaphesa dubia|Xysticus funestus|Ozyptila distans',
    speciesVisits: '4,1,1,1',
    subspeciesNames: 'Mecaphesa celer xyz|Mecaphesa celer pdq',
    subspeciesVisits: '1,1',
    perVisitPoints: _toJsonPoints(points),
    perPersonVisitPoints: _toJsonPoints(points)
  });

  specimen = await _addSpecimen({
    locality: locality1,
    eventDate: _toISODate('2020-02-11'),
    recordedBy: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Arachnida',
    order: 'Araneae',
    family: 'Theridiidae',
    genus: 'Latrodectus'
  });
  points.push([11, 7]);
  await _retally();
  effort = await _getEffort(specimen.localityID);
  expect(effort).toEqual({
    locationID: specimen.localityID,
    countyName: 'Travis County',
    localityName: 'Cave 1',
    isCave: true,
    flags: 0,
    totalVisits: 11,
    totalPersonVisits: 11,
    totalSpecies: 7,
    kingdomNames: 'Animalia',
    kingdomVisits: '11',
    phylumNames: 'Arthropoda',
    phylumVisits: '11',
    classNames: 'Arachnida',
    classVisits: '11',
    orderNames: 'Araneae',
    orderVisits: '11',
    familyNames: 'Thomisidae|Theridiidae',
    familyVisits: '10,1',
    genusNames: 'Mecaphesa|Xysticus|Ozyptila|Bassaniana|Latrodectus',
    genusVisits: '6,1,2,1,1',
    speciesNames: 'Mecaphesa celer|Mecaphesa dubia|Xysticus funestus|Ozyptila distans',
    speciesVisits: '4,1,1,1',
    subspeciesNames: 'Mecaphesa celer xyz|Mecaphesa celer pdq',
    subspeciesVisits: '1,1',
    perVisitPoints: _toJsonPoints(points),
    perPersonVisitPoints: _toJsonPoints(points)
  });

  specimen = await _addSpecimen({
    locality: locality1,
    eventDate: _toISODate('2020-02-12'),
    recordedBy: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Arachnida',
    order: 'Opiliones'
  });
  points.push([12, 8]);
  await _retally();
  effort = await _getEffort(specimen.localityID);
  expect(effort).toEqual({
    locationID: specimen.localityID,
    countyName: 'Travis County',
    localityName: 'Cave 1',
    isCave: true,
    flags: 0,
    totalVisits: 12,
    totalPersonVisits: 12,
    totalSpecies: 8,
    kingdomNames: 'Animalia',
    kingdomVisits: '12',
    phylumNames: 'Arthropoda',
    phylumVisits: '12',
    classNames: 'Arachnida',
    classVisits: '12',
    orderNames: 'Araneae|Opiliones',
    orderVisits: '11,1',
    familyNames: 'Thomisidae|Theridiidae',
    familyVisits: '10,1',
    genusNames: 'Mecaphesa|Xysticus|Ozyptila|Bassaniana|Latrodectus',
    genusVisits: '6,1,2,1,1',
    speciesNames: 'Mecaphesa celer|Mecaphesa dubia|Xysticus funestus|Ozyptila distans',
    speciesVisits: '4,1,1,1',
    subspeciesNames: 'Mecaphesa celer xyz|Mecaphesa celer pdq',
    subspeciesVisits: '1,1',
    perVisitPoints: _toJsonPoints(points),
    perPersonVisitPoints: _toJsonPoints(points)
  });

  specimen = await _addSpecimen({
    locality: locality1,
    eventDate: _toISODate('2020-02-13'),
    recordedBy: collectors1,
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
  effort = await _getEffort(specimen.localityID);
  expect(effort).toEqual({
    locationID: specimen.localityID,
    countyName: 'Travis County',
    localityName: 'Cave 1',
    isCave: true,
    flags: 0,
    totalVisits: 13,
    totalPersonVisits: 13,
    totalSpecies: 9,
    kingdomNames: 'Animalia',
    kingdomVisits: '13',
    phylumNames: 'Arthropoda',
    phylumVisits: '13',
    classNames: 'Arachnida|Insecta',
    classVisits: '12,1',
    orderNames: 'Araneae|Opiliones|Orthoptera',
    orderVisits: '11,1,1',
    familyNames: 'Thomisidae|Theridiidae|Rhaphidophoridae',
    familyVisits: '10,1,1',
    genusNames: 'Mecaphesa|Xysticus|Ozyptila|Bassaniana|Latrodectus|Diestrammena',
    genusVisits: '6,1,2,1,1,1',
    speciesNames:
      'Mecaphesa celer|Mecaphesa dubia|Xysticus funestus|Ozyptila distans|Diestrammena asynamora',
    speciesVisits: '4,1,1,1,1',
    subspeciesNames: 'Mecaphesa celer xyz|Mecaphesa celer pdq',
    subspeciesVisits: '1,1',
    perVisitPoints: _toJsonPoints(points),
    perPersonVisitPoints: _toJsonPoints(points)
  });

  specimen = await _addSpecimen({
    locality: locality1,
    eventDate: _toISODate('2020-02-14'),
    recordedBy: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Chilopoda'
  });
  points.push([14, 10]);
  await _retally();
  effort = await _getEffort(specimen.localityID);
  expect(effort).toEqual({
    locationID: specimen.localityID,
    countyName: 'Travis County',
    localityName: 'Cave 1',
    isCave: true,
    flags: 0,
    totalVisits: 14,
    totalPersonVisits: 14,
    totalSpecies: 10,
    kingdomNames: 'Animalia',
    kingdomVisits: '14',
    phylumNames: 'Arthropoda',
    phylumVisits: '14',
    classNames: 'Arachnida|Insecta|Chilopoda',
    classVisits: '12,1,1',
    orderNames: 'Araneae|Opiliones|Orthoptera',
    orderVisits: '11,1,1',
    familyNames: 'Thomisidae|Theridiidae|Rhaphidophoridae',
    familyVisits: '10,1,1',
    genusNames: 'Mecaphesa|Xysticus|Ozyptila|Bassaniana|Latrodectus|Diestrammena',
    genusVisits: '6,1,2,1,1,1',
    speciesNames:
      'Mecaphesa celer|Mecaphesa dubia|Xysticus funestus|Ozyptila distans|Diestrammena asynamora',
    speciesVisits: '4,1,1,1,1',
    subspeciesNames: 'Mecaphesa celer xyz|Mecaphesa celer pdq',
    subspeciesVisits: '1,1',
    perVisitPoints: _toJsonPoints(points),
    perPersonVisitPoints: _toJsonPoints(points)
  });

  specimen = await _addSpecimen({
    locality: locality1,
    eventDate: _toISODate('2020-02-15'),
    recordedBy: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Chilopoda',
    order: 'Scolopendromorpha',
    family: 'Cryptopidae'
  });
  points.push([15, 10]);
  await _retally();
  effort = await _getEffort(specimen.localityID);
  expect(effort).toEqual({
    locationID: specimen.localityID,
    countyName: 'Travis County',
    localityName: 'Cave 1',
    isCave: true,
    flags: 0,
    totalVisits: 15,
    totalPersonVisits: 15,
    totalSpecies: 10,
    kingdomNames: 'Animalia',
    kingdomVisits: '15',
    phylumNames: 'Arthropoda',
    phylumVisits: '15',
    classNames: 'Arachnida|Insecta|Chilopoda',
    classVisits: '12,1,2',
    orderNames: 'Araneae|Opiliones|Orthoptera|Scolopendromorpha',
    orderVisits: '11,1,1,1',
    familyNames: 'Thomisidae|Theridiidae|Rhaphidophoridae|Cryptopidae',
    familyVisits: '10,1,1,1',
    genusNames: 'Mecaphesa|Xysticus|Ozyptila|Bassaniana|Latrodectus|Diestrammena',
    genusVisits: '6,1,2,1,1,1',
    speciesNames:
      'Mecaphesa celer|Mecaphesa dubia|Xysticus funestus|Ozyptila distans|Diestrammena asynamora',
    speciesVisits: '4,1,1,1,1',
    subspeciesNames: 'Mecaphesa celer xyz|Mecaphesa celer pdq',
    subspeciesVisits: '1,1',
    perVisitPoints: _toJsonPoints(points),
    perPersonVisitPoints: _toJsonPoints(points)
  });

  specimen = await _addSpecimen({
    locality: locality1,
    eventDate: _toISODate('2020-02-16'),
    recordedBy: collectors1,
    kingdom: 'Animalia',
    phylum: 'Annelida'
  });
  points.push([16, 11]);
  await _retally();
  effort = await _getEffort(specimen.localityID);
  expect(effort).toEqual({
    locationID: specimen.localityID,
    countyName: 'Travis County',
    localityName: 'Cave 1',
    isCave: true,
    flags: 0,
    totalVisits: 16,
    totalPersonVisits: 16,
    totalSpecies: 11,
    kingdomNames: 'Animalia',
    kingdomVisits: '16',
    phylumNames: 'Arthropoda|Annelida',
    phylumVisits: '15,1',
    classNames: 'Arachnida|Insecta|Chilopoda',
    classVisits: '12,1,2',
    orderNames: 'Araneae|Opiliones|Orthoptera|Scolopendromorpha',
    orderVisits: '11,1,1,1',
    familyNames: 'Thomisidae|Theridiidae|Rhaphidophoridae|Cryptopidae',
    familyVisits: '10,1,1,1',
    genusNames: 'Mecaphesa|Xysticus|Ozyptila|Bassaniana|Latrodectus|Diestrammena',
    genusVisits: '6,1,2,1,1,1',
    speciesNames:
      'Mecaphesa celer|Mecaphesa dubia|Xysticus funestus|Ozyptila distans|Diestrammena asynamora',
    speciesVisits: '4,1,1,1,1',
    subspeciesNames: 'Mecaphesa celer xyz|Mecaphesa celer pdq',
    subspeciesVisits: '1,1',
    perVisitPoints: _toJsonPoints(points),
    perPersonVisitPoints: _toJsonPoints(points)
  });

  // Add a second location for which species have accumulated.

  specimen = await _addSpecimen({
    locality: locality2,
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
  let locationID2 = specimen.localityID;
  await _addSpecimen({
    locality: locality2,
    eventDate: date1,
    recordedBy: collectors1,
    kingdom: 'Animalia',
    phylum: 'Annelida'
  });
  await _addSpecimen({
    locality: locality2,
    eventDate: date1,
    recordedBy: collectors1,
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
    eventDate: date1,
    recordedBy: collectors1,
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
  effort = await _getEffort(specimen.localityID);
  expect(effort).toEqual({
    locationID: specimen.localityID,
    countyName: 'Travis County',
    localityName: 'Cave 2',
    isCave: true,
    flags: 0,
    totalVisits: 1,
    totalPersonVisits: 1,
    totalSpecies: 4,
    kingdomNames: 'Animalia',
    kingdomVisits: '1',
    phylumNames: 'Arthropoda|Annelida',
    phylumVisits: '1,1',
    classNames: 'Arachnida',
    classVisits: '1',
    orderNames: 'Araneae',
    orderVisits: '1',
    familyNames: 'Thomisidae|Salticidae',
    familyVisits: '1,1',
    genusNames: 'Mecaphesa|Phidippus',
    genusVisits: '1,1',
    speciesNames: 'Mecaphesa celer|Phidippus audax|Phidippus regius',
    speciesVisits: '1,1,1',
    subspeciesNames: null,
    subspeciesVisits: null,
    perVisitPoints: _toJsonPoints(points),
    perPersonVisitPoints: _toJsonPoints(points)
  });

  await _addSpecimen({
    locality: locality2,
    eventDate: date2,
    recordedBy: collectors1,
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
    eventDate: date2,
    recordedBy: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Arachnida',
    order: 'Araneae',
    family: 'Salticidae',
    genus: 'Maevia'
  });
  await _addSpecimen({
    locality: locality2,
    eventDate: date2,
    recordedBy: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Chilopoda',
    order: 'Scolopendromorpha',
    family: 'Cryptopidae',
    genus: 'Cryptops'
  });
  await _addSpecimen({
    locality: locality2,
    eventDate: date2,
    recordedBy: collectors1,
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
    eventDate: date2,
    recordedBy: collectors1,
    kingdom: 'Animalia',
    phylum: 'Mollusca'
  });
  points.push([2, 9]);
  await _retally();
  effort = await _getEffort(specimen.localityID);
  expect(effort).toEqual({
    locationID: specimen.localityID,
    countyName: 'Travis County',
    localityName: 'Cave 2',
    isCave: true,
    flags: 0,
    totalVisits: 2,
    totalPersonVisits: 2,
    totalSpecies: 9,
    kingdomNames: 'Animalia',
    kingdomVisits: '2',
    phylumNames: 'Arthropoda|Annelida|Mollusca',
    phylumVisits: '2,1,1',
    classNames: 'Arachnida|Chilopoda',
    classVisits: '2,1',
    orderNames: 'Araneae|Scolopendromorpha',
    orderVisits: '2,1',
    familyNames: 'Thomisidae|Salticidae|Cryptopidae|Theridiidae',
    familyVisits: '1,2,1,1',
    genusNames: 'Mecaphesa|Phidippus|Maevia|Cryptops|Latrodectus',
    genusVisits: '1,2,1,1,1',
    speciesNames:
      'Mecaphesa celer|Phidippus audax|Phidippus regius|Phidippus texanus|Latrodectus mactans',
    speciesVisits: '1,1,1,1,1',
    subspeciesNames: null,
    subspeciesVisits: null,
    perVisitPoints: _toJsonPoints(points),
    perPersonVisitPoints: _toJsonPoints(points)
  });

  // Add multi-person visits.

  await _addSpecimen({
    locality: locality2,
    eventDate: date3,
    recordedBy: collectors2,
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
    eventDate: date5,
    recordedBy: collectors2,
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
  effort = await _getEffort(specimen.localityID);
  expect(effort).toEqual({
    locationID: specimen.localityID,
    countyName: 'Travis County',
    localityName: 'Cave 2',
    isCave: true,
    flags: 0,
    totalVisits: 4,
    totalPersonVisits: 6,
    totalSpecies: 11,
    kingdomNames: 'Animalia',
    kingdomVisits: '4',
    phylumNames: 'Arthropoda|Annelida|Mollusca',
    phylumVisits: '4,1,1',
    classNames: 'Arachnida|Chilopoda',
    classVisits: '4,1',
    orderNames: 'Araneae|Scolopendromorpha',
    orderVisits: '4,1',
    familyNames: 'Thomisidae|Salticidae|Cryptopidae|Theridiidae',
    familyVisits: '1,4,1,1',
    genusNames: 'Mecaphesa|Phidippus|Maevia|Cryptops|Latrodectus',
    genusVisits: '1,4,1,1,1',
    speciesNames:
      'Mecaphesa celer|Phidippus audax|Phidippus regius|Phidippus texanus|Latrodectus mactans|Phidippus mystaceus|Phidippus cardinalis',
    speciesVisits: '1,1,1,1,1,1,1',
    subspeciesNames: null,
    subspeciesVisits: null,
    perVisitPoints: _toJsonPoints(perVisitPoints),
    perPersonVisitPoints: _toJsonPoints(perPersonVisitPoints)
  });

  // Add an earlier visit to be sure points generate in date order.

  await _addSpecimen({
    locality: locality2,
    eventDate: date4,
    recordedBy: collectors1,
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Arachnida',
    order: 'Araneae',
    family: 'Salticidae',
    genus: 'Naphrys'
  });
  specimen = await _addSpecimen({
    locality: locality2,
    eventDate: date4,
    recordedBy: collectors1,
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
  effort = await _getEffort(specimen.localityID);
  expect(effort).toEqual({
    locationID: specimen.localityID,
    countyName: 'Travis County',
    localityName: 'Cave 2',
    isCave: true,
    flags: 0,
    totalVisits: 5,
    totalPersonVisits: 7,
    totalSpecies: 13,
    kingdomNames: 'Animalia',
    kingdomVisits: '5',
    phylumNames: 'Arthropoda|Annelida|Mollusca',
    phylumVisits: '5,1,1',
    classNames: 'Arachnida|Chilopoda',
    classVisits: '5,1',
    orderNames: 'Araneae|Scolopendromorpha',
    orderVisits: '5,1',
    familyNames: 'Thomisidae|Salticidae|Cryptopidae|Theridiidae',
    familyVisits: '1,5,1,2',
    genusNames: 'Mecaphesa|Phidippus|Maevia|Cryptops|Latrodectus|Naphrys|Steatoda',
    genusVisits: '1,4,1,1,1,1,1',
    speciesNames:
      'Mecaphesa celer|Phidippus audax|Phidippus regius|Phidippus texanus|Latrodectus mactans|Phidippus mystaceus|Phidippus cardinalis',
    speciesVisits: '1,1,1,1,1,1,1',
    subspeciesNames: null,
    subspeciesVisits: null,
    perVisitPoints: _toJsonPoints(perVisitPoints),
    perPersonVisitPoints: _toJsonPoints(perPersonVisitPoints)
  });

  // Retrieve multiple location efforts.

  let efforts = await LocationEffort.getByLocationIDs(
    db,
    ComparedTaxa.all,
    [locationID2],
    false
  );
  expect(efforts[0].locationID).toEqual(locationID2);
  expect(efforts.length).toEqual(1);

  efforts = await LocationEffort.getByLocationIDs(
    db,
    ComparedTaxa.all,
    [locationID2, locationID1],
    false
  );
  expect(efforts.map((effort) => effort.locationID)).toEqual([
    locationID1,
    locationID2
  ]);
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
  await LocationVisit.addSpecimen(db, ComparedTaxa.all, specimen);
  return specimen;
}

async function _getEffort(locationID: number): Promise<LocationEffort> {
  const effort = await LocationEffort.getByLocationIDs(
    db,
    ComparedTaxa.all,
    [locationID],
    false
  );
  return effort[0];
}

async function _retally(): Promise<void> {
  await LocationEffort.dropAll(db, ComparedTaxa.all);
  await LocationEffort.tallyEffort(db, ComparedTaxa.all);
}

function _toISODate(dateString: string): string {
  return toLocalDate(new Date(dateString)).toISOString();
}

function _toJsonPoints(points: number[][]): string {
  return JSON.stringify(points);
}
