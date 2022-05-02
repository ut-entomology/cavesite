import type { DB } from '../integrations/postgres';
import { DatabaseMutex } from '../util/test_util';
import { Taxon } from './taxon';
import { TaxonRank } from '../../shared/model';
import { ImportFailure } from './import_failure';

const mutex = new DatabaseMutex();
let db: DB;

beforeAll(async () => {
  db = await mutex.lock();
});

test('sequentially dependent taxa tests', async () => {
  // Each of these tests depends on the prior tests, so run all as a unit.

  // test adding kingdom taxon

  {
    const taxonName = 'Animalia';
    const sourceTaxon = {
      taxonRank: TaxonRank.Kingdom,
      taxonName,
      scientificName: taxonName,
      parentID: null
    };
    const expectedTaxon = Object.assign(
      {
        taxonID: 1,
        parentIDSeries: '',
        parentNameSeries: ''
      },
      sourceTaxon
    );
    const createdTaxon = await Taxon.create(db, '', '', sourceTaxon);
    expect(createdTaxon).toEqual(expectedTaxon);
    const readTaxon = await Taxon.getByID(db, createdTaxon.taxonID);
    expect(readTaxon).toEqual(expectedTaxon);
  }

  // test adding phylum of existing kingdom

  {
    const taxonName = 'Arthropoda';
    const sourceTaxon = {
      taxonRank: TaxonRank.Phylum,
      taxonName,
      scientificName: taxonName,
      parentID: 1
    };
    const expectedTaxon = Object.assign(
      { taxonID: 2, parentIDSeries: '1', parentNameSeries: 'Animalia' },
      sourceTaxon
    );
    const createdTaxon = await Taxon.create(db, 'Animalia', '1', sourceTaxon);
    expect(createdTaxon).toEqual(expectedTaxon);
    const readTaxon = await Taxon.getByID(db, createdTaxon.taxonID);
    expect(readTaxon).toEqual(expectedTaxon);
  }

  // test getOrCreate() gets an existing taxon

  {
    const taxonName = 'Arthropoda';
    const expectedTaxon = await Taxon.getByID(db, 2);
    expect(expectedTaxon?.taxonName).toEqual(taxonName);
    const readTaxon = await Taxon.getOrCreate(db, {
      kingdom: 'Animalia',
      phylum: taxonName,
      scientificName: taxonName
    });
    expect(readTaxon).toEqual(expectedTaxon);
  }

  // test auto-creating new taxon having no intermediates

  {
    const taxonName = 'Arachnida';
    const createdTaxon = await Taxon.getOrCreate(db, {
      kingdom: 'Animalia',
      phylum: 'Arthropoda',
      class: taxonName,
      scientificName: taxonName
    });
    expect(createdTaxon).toEqual({
      taxonID: 3,
      taxonRank: TaxonRank.Class,
      taxonName,
      scientificName: taxonName,
      parentID: 2,
      parentIDSeries: '1,2',
      parentNameSeries: 'Animalia|Arthropoda'
    });
  }

  // test auto-creating new species and new intermediate taxa

  {
    const createdTaxon = await Taxon.getOrCreate(db, {
      kingdom: 'Animalia',
      phylum: 'Arthropoda',
      class: 'Arachnida',
      order: 'Araneae',
      family: 'Thomisidae',
      genus: 'Mecaphesa',
      specificEpithet: 'dubia',
      scientificName: 'Mecaphesa dubia (Keyserling, 1880)'
    });
    expect(await Taxon.getByID(db, 4)).toEqual({
      taxonID: 4,
      taxonRank: TaxonRank.Order,
      taxonName: 'Araneae',
      scientificName: null,
      parentID: 3,
      parentIDSeries: '1,2,3',
      parentNameSeries: 'Animalia|Arthropoda|Arachnida'
    });
    expect(await Taxon.getByID(db, 5)).toEqual({
      taxonID: 5,
      taxonRank: TaxonRank.Family,
      taxonName: 'Thomisidae',
      scientificName: null,
      parentID: 4,
      parentIDSeries: '1,2,3,4',
      parentNameSeries: 'Animalia|Arthropoda|Arachnida|Araneae'
    });
    expect(await Taxon.getByID(db, 6)).toEqual({
      taxonID: 6,
      taxonRank: TaxonRank.Genus,
      taxonName: 'Mecaphesa',
      scientificName: null,
      parentID: 5,
      parentIDSeries: '1,2,3,4,5',
      parentNameSeries: 'Animalia|Arthropoda|Arachnida|Araneae|Thomisidae'
    });
    const readTaxon = await Taxon.getByID(db, 7);
    expect(readTaxon).toEqual({
      taxonID: 7,
      taxonRank: TaxonRank.Species,
      taxonName: 'dubia',
      scientificName: 'Mecaphesa dubia (Keyserling, 1880)',
      parentID: 6,
      parentIDSeries: '1,2,3,4,5,6',
      parentNameSeries: 'Animalia|Arthropoda|Arachnida|Araneae|Thomisidae|Mecaphesa'
    });
    expect(createdTaxon).toEqual(readTaxon);
  }

  // test providing a scientific name for an implied taxon created without one

  {
    const createdTaxon = await Taxon.getOrCreate(db, {
      kingdom: 'Animalia',
      phylum: 'Arthropoda',
      class: 'Arachnida',
      order: 'Araneae',
      family: 'Thomisidae',
      genus: 'Mecaphesa',
      scientificName: 'Mecaphesa Simon, 1900'
    });
    expect(createdTaxon.scientificName).toEqual('Mecaphesa Simon, 1900');

    const readTaxon = await Taxon.getByID(db, createdTaxon.taxonID);
    expect(readTaxon?.scientificName).toEqual('Mecaphesa Simon, 1900');
  }

  // test creating new subspecies with new intermediate species

  {
    const createdTaxon = await Taxon.getOrCreate(db, {
      kingdom: 'Animalia',
      phylum: 'Arthropoda',
      class: 'Arachnida',
      order: 'Araneae',
      family: 'Philodromidae',
      genus: 'Philodromus',
      specificEpithet: 'rufus',
      infraspecificEpithet: 'jenningsi',
      scientificName: 'Philodromus rufus jenningsi Author'
    });
    expect(await Taxon.getByID(db, 8)).toEqual({
      taxonID: 8,
      taxonRank: TaxonRank.Family,
      taxonName: 'Philodromidae',
      scientificName: null,
      parentID: 4,
      parentIDSeries: '1,2,3,4',
      parentNameSeries: 'Animalia|Arthropoda|Arachnida|Araneae'
    });
    expect(await Taxon.getByID(db, 9)).toEqual({
      taxonID: 9,
      taxonRank: TaxonRank.Genus,
      taxonName: 'Philodromus',
      scientificName: null,
      parentID: 8,
      parentIDSeries: '1,2,3,4,8',
      parentNameSeries: 'Animalia|Arthropoda|Arachnida|Araneae|Philodromidae'
    });
    expect(await Taxon.getByID(db, 10)).toEqual({
      taxonID: 10,
      taxonRank: TaxonRank.Species,
      taxonName: 'rufus',
      scientificName: null,
      parentID: 9,
      parentIDSeries: '1,2,3,4,8,9',
      parentNameSeries:
        'Animalia|Arthropoda|Arachnida|Araneae|Philodromidae|Philodromus'
    });
    const readTaxon = await Taxon.getByID(db, 11);
    expect(readTaxon).toEqual({
      taxonID: 11,
      taxonRank: TaxonRank.Subspecies,
      taxonName: 'jenningsi',
      scientificName: 'Philodromus rufus jenningsi Author',
      parentID: 10,
      parentIDSeries: '1,2,3,4,8,9,10',
      parentNameSeries:
        'Animalia|Arthropoda|Arachnida|Araneae|Philodromidae|Philodromus|rufus'
    });
    expect(createdTaxon).toEqual(readTaxon);
  }

  // test creating multiple intermediate taxa under kingdom

  {
    const createdTaxon = await Taxon.getOrCreate(db, {
      kingdom: 'Animalia',
      phylum: 'Chordata',
      class: 'Amphibia',
      order: 'Urodela',
      family: 'Plethodontidae',
      genus: 'Eurycea',
      specificEpithet: 'rathbuni',
      scientificName: 'Eurycea rathbuni (Stejneger, 1896)'
    });
    expect(await Taxon.getByID(db, 12)).toEqual({
      taxonID: 12,
      taxonRank: TaxonRank.Phylum,
      taxonName: 'Chordata',
      scientificName: null,
      parentID: 1,
      parentIDSeries: '1',
      parentNameSeries: 'Animalia'
    });
    expect(await Taxon.getByID(db, 13)).toEqual({
      taxonID: 13,
      taxonRank: TaxonRank.Class,
      taxonName: 'Amphibia',
      scientificName: null,
      parentID: 12,
      parentIDSeries: '1,12',
      parentNameSeries: 'Animalia|Chordata'
    });
    expect(await Taxon.getByID(db, 14)).toEqual({
      taxonID: 14,
      taxonRank: TaxonRank.Order,
      taxonName: 'Urodela',
      scientificName: null,
      parentID: 13,
      parentIDSeries: '1,12,13',
      parentNameSeries: 'Animalia|Chordata|Amphibia'
    });
    expect(await Taxon.getByID(db, 15)).toEqual({
      taxonID: 15,
      taxonRank: TaxonRank.Family,
      taxonName: 'Plethodontidae',
      scientificName: null,
      parentID: 14,
      parentIDSeries: '1,12,13,14',
      parentNameSeries: 'Animalia|Chordata|Amphibia|Urodela'
    });
    expect(await Taxon.getByID(db, 16)).toEqual({
      taxonID: 16,
      taxonRank: TaxonRank.Genus,
      taxonName: 'Eurycea',
      scientificName: null,
      parentID: 15,
      parentIDSeries: '1,12,13,14,15',
      parentNameSeries: 'Animalia|Chordata|Amphibia|Urodela|Plethodontidae'
    });
    const readTaxon = await Taxon.getByID(db, 17);
    expect(readTaxon).toEqual({
      taxonID: 17,
      taxonRank: TaxonRank.Species,
      taxonName: 'rathbuni',
      scientificName: 'Eurycea rathbuni (Stejneger, 1896)',
      parentID: 16,
      parentIDSeries: '1,12,13,14,15,16',
      parentNameSeries: 'Animalia|Chordata|Amphibia|Urodela|Plethodontidae|Eurycea'
    });
    expect(createdTaxon).toEqual(readTaxon);
  }

  // test reading multiple taxa by name

  {
    const taxaNames = [
      'Animalia',
      'Arachnida',
      'Mecaphesa',
      'Mecaphesa dubia (Keyserling, 1880)',
      'Philodromus',
      'Eurycea rathbuni (Stejneger, 1896)'
    ];
    let readTaxa = await Taxon.getByName(db, taxaNames);
    findTaxa(readTaxa, taxaNames);

    readTaxa = await Taxon.getByName(db, ['foo', 'bar']);
    expect(readTaxa.length).toEqual(0);
  }

  // test getting children of parent by parent name

  {
    const taxaNames = ['Thomisidae', 'Philodromidae'];
    let readTaxa = await Taxon.getChildrenOf(db, 'Araneae');
    findTaxa(readTaxa, taxaNames);

    readTaxa = await Taxon.getChildrenOf(db, 'not there');
    findTaxa(readTaxa, []);
  }

  // test providing the scientific name of an existing taxon

  {
    const expectedTaxon = await Taxon.getByID(db, 4);
    expect(expectedTaxon?.taxonName).toEqual('Araneae');
    expectedTaxon!.scientificName = 'Araneae';
    await expectedTaxon!.save(db);
    const readTaxon = await Taxon.getByID(db, 4);
    expect(readTaxon).toEqual(expectedTaxon);
  }
});

test('committing taxa and matching names', async () => {
  // test committing followed by an exact match

  let matches = await Taxon.matchName(db, 'Arachnida');
  expect(matches.length).toEqual(0);

  await Taxon.commit(db);

  matches = await Taxon.matchName(db, 'Arachnida');
  expect(matches.length).toEqual(1);
  expect(matches[0].taxonName).toEqual('Arachnida');

  // test multiple internal subset matches

  matches = await Taxon.matchName(db, 'ida');
  expect(matches.map((taxon) => taxon.taxonName)).toEqual([
    'Arachnida',
    'Philodromidae',
    'Plethodontidae',
    'Thomisidae'
  ]);

  // test replacing existing records

  await Taxon.getOrCreate(db, {
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Arachnida',
    order: 'Araneae',
    family: 'Philodromidae',
    genus: 'Philodromus',
    specificEpithet: 'rufus',
    infraspecificEpithet: 'jenningsi',
    scientificName: 'Philodromus rufus jenningsi New Author'
  });
  matches = await Taxon.matchName(db, 'jenningsi');
  expect(matches.length).toEqual(1);
  expect(matches[0].scientificName).not.toContain('New Author');

  await Taxon.getOrCreate(db, {
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Arachnida',
    order: 'Araneae',
    family: 'Salticidae',
    scientificName: 'Salticidae'
  });
  matches = await Taxon.matchName(db, 'Salticidae');
  expect(matches.length).toEqual(0);

  await Taxon.commit(db);

  matches = await Taxon.matchName(db, 'jenningsi');
  expect(matches.length).toEqual(1);
  expect(matches[0].scientificName).toContain('New Author');
  matches = await Taxon.matchName(db, 'Salticidae');
  expect(matches.length).toEqual(1);
  matches = await Taxon.matchName(db, 'Thomisidae');
  expect(matches.length).toEqual(0);
});

test('poorly sourced taxa', async () => {
  await expect(() =>
    Taxon.getOrCreate(db, {
      // @ts-ignore
      kingdom: undefined,
      phylum: 'Chordata',
      class: 'Amphibia',
      order: 'Urodela',
      family: 'Plethodontidae',
      genus: 'Eurycea',
      specificEpithet: 'rathbuni',
      scientificName: 'Eurycea rathbuni (Stejneger, 1896)'
    })
  ).rejects.toThrow(new ImportFailure('Kingdom not given'));

  await expect(() =>
    Taxon.getOrCreate(db, {
      kingdom: 'Animalia',
      phylum: 'Chordata',
      order: 'Urodela',
      family: 'Plethodontidae',
      genus: 'Eurycea',
      specificEpithet: 'rathbuni',
      scientificName: 'Eurycea rathbuni (Stejneger, 1896)'
    })
  ).rejects.toThrow(new ImportFailure('Order given without class'));

  await expect(() =>
    Taxon.getOrCreate(db, {
      kingdom: 'Animalia',
      phylum: 'Chordata',
      class: 'Amphibia',
      order: 'Urodela',
      family: 'Plethodontidae',
      specificEpithet: 'rathbuni',
      scientificName: 'Eurycea rathbuni (Stejneger, 1896)'
    })
  ).rejects.toThrow(new ImportFailure('Specific epithet given without genus'));

  await expect(() =>
    Taxon.getOrCreate(db, {
      kingdom: 'Animalia',
      phylum: 'Chordata',
      class: 'Amphibia',
      order: 'Urodela',
      family: 'Plethodontidae',
      genus: 'Eurycea',
      specificEpithet: 'rathbuni',
      // @ts-ignore
      scientificName: undefined
    })
  ).rejects.toThrow(new ImportFailure('Scientific name not given'));
});

afterAll(async () => {
  await mutex.unlock();
});

function findTaxa(taxa: Taxon[], lookForNames: string[]) {
  for (const name of lookForNames) {
    const taxon = taxa.find(
      (found) => found.taxonName == name || found.scientificName == name
    );
    expect(taxon).not.toBeNull();
  }
  expect(taxa.length).toEqual(lookForNames.length);
}
