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
    const taxonInfo = {
      taxonRank: TaxonRank.Kingdom,
      taxonName,
      uniqueName: taxonName,
      author: null,
      parentID: null,
      hasChildren: null
    };
    const expectedTaxon = Object.assign(
      {
        taxonID: 1,
        parentIDPath: '',
        parentNamePath: ''
      },
      taxonInfo
    );
    const createdTaxon = await Taxon.create(db, '', '', taxonInfo);
    expect(createdTaxon).toEqual(expectedTaxon);
    const readTaxon = await Taxon.getByID(db, createdTaxon.taxonID);
    expect(readTaxon).toEqual(expectedTaxon);
  }

  // test adding phylum of existing kingdom

  {
    const taxonName = 'Arthropoda';
    const taxonInfo = {
      taxonRank: TaxonRank.Phylum,
      taxonName,
      uniqueName: taxonName,
      author: null,
      parentID: 1,
      hasChildren: null
    };
    const expectedTaxon = Object.assign(
      { taxonID: 2, parentIDPath: '1', parentNamePath: 'Animalia' },
      taxonInfo
    );
    const createdTaxon = await Taxon.create(db, 'Animalia', '1', taxonInfo);
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
    const createdTaxon = await Taxon.getOrCreate(db, {
      kingdom: 'Animalia',
      phylum: 'Arthropoda',
      class: 'Arachnida',
      scientificName: 'Arachnida'
    });
    expect(createdTaxon).toEqual({
      taxonID: 3,
      taxonRank: TaxonRank.Class,
      taxonName: 'Arachnida',
      uniqueName: 'Arachnida',
      author: null,
      parentID: 2,
      parentIDPath: '1,2',
      parentNamePath: 'Animalia|Arthropoda',
      hasChildren: null
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
      uniqueName: 'Araneae',
      author: null,
      parentID: 3,
      parentIDPath: '1,2,3',
      parentNamePath: 'Animalia|Arthropoda|Arachnida',
      hasChildren: null
    });
    expect(await Taxon.getByID(db, 5)).toEqual({
      taxonID: 5,
      taxonRank: TaxonRank.Family,
      taxonName: 'Thomisidae',
      uniqueName: 'Thomisidae',
      author: null,
      parentID: 4,
      parentIDPath: '1,2,3,4',
      parentNamePath: 'Animalia|Arthropoda|Arachnida|Araneae',
      hasChildren: null
    });
    expect(await Taxon.getByID(db, 6)).toEqual({
      taxonID: 6,
      taxonRank: TaxonRank.Genus,
      taxonName: 'Mecaphesa',
      uniqueName: 'Mecaphesa',
      author: null,
      parentID: 5,
      parentIDPath: '1,2,3,4,5',
      parentNamePath: 'Animalia|Arthropoda|Arachnida|Araneae|Thomisidae',
      hasChildren: null
    });
    const readTaxon = await Taxon.getByID(db, 7);
    expect(readTaxon).toEqual({
      taxonID: 7,
      taxonRank: TaxonRank.Species,
      taxonName: 'dubia',
      uniqueName: 'Mecaphesa dubia',
      author: '(Keyserling, 1880)',
      parentID: 6,
      parentIDPath: '1,2,3,4,5,6',
      parentNamePath: 'Animalia|Arthropoda|Arachnida|Araneae|Thomisidae|Mecaphesa',
      hasChildren: null
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
    expect(createdTaxon.taxonName).toEqual('Mecaphesa');
    expect(createdTaxon.uniqueName).toEqual('Mecaphesa');
    expect(createdTaxon.author).toEqual('Simon, 1900');

    const readTaxon = await Taxon.getByID(db, createdTaxon.taxonID);
    expect(readTaxon?.taxonName).toEqual('Mecaphesa');
    expect(readTaxon?.uniqueName).toEqual('Mecaphesa');
    expect(readTaxon?.author).toEqual('Simon, 1900');
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
      uniqueName: 'Philodromidae',
      author: null,
      parentID: 4,
      parentIDPath: '1,2,3,4',
      parentNamePath: 'Animalia|Arthropoda|Arachnida|Araneae',
      hasChildren: null
    });
    expect(await Taxon.getByID(db, 9)).toEqual({
      taxonID: 9,
      taxonRank: TaxonRank.Genus,
      taxonName: 'Philodromus',
      uniqueName: 'Philodromus',
      author: null,
      parentID: 8,
      parentIDPath: '1,2,3,4,8',
      parentNamePath: 'Animalia|Arthropoda|Arachnida|Araneae|Philodromidae',
      hasChildren: null
    });
    expect(await Taxon.getByID(db, 10)).toEqual({
      taxonID: 10,
      taxonRank: TaxonRank.Species,
      taxonName: 'rufus',
      uniqueName: 'Philodromus rufus',
      author: null,
      parentID: 9,
      parentIDPath: '1,2,3,4,8,9',
      parentNamePath: 'Animalia|Arthropoda|Arachnida|Araneae|Philodromidae|Philodromus',
      hasChildren: null
    });
    const readTaxon = await Taxon.getByID(db, 11);
    expect(readTaxon).toEqual({
      taxonID: 11,
      taxonRank: TaxonRank.Subspecies,
      taxonName: 'jenningsi',
      uniqueName: 'Philodromus rufus jenningsi',
      author: 'Author',
      parentID: 10,
      parentIDPath: '1,2,3,4,8,9,10',
      parentNamePath:
        'Animalia|Arthropoda|Arachnida|Araneae|Philodromidae|Philodromus|rufus',
      hasChildren: null
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
      uniqueName: 'Chordata',
      author: null,
      parentID: 1,
      parentIDPath: '1',
      parentNamePath: 'Animalia',
      hasChildren: null
    });
    expect(await Taxon.getByID(db, 13)).toEqual({
      taxonID: 13,
      taxonRank: TaxonRank.Class,
      taxonName: 'Amphibia',
      uniqueName: 'Amphibia',
      author: null,
      parentID: 12,
      parentIDPath: '1,12',
      parentNamePath: 'Animalia|Chordata',
      hasChildren: null
    });
    expect(await Taxon.getByID(db, 14)).toEqual({
      taxonID: 14,
      taxonRank: TaxonRank.Order,
      taxonName: 'Urodela',
      uniqueName: 'Urodela',
      author: null,
      parentID: 13,
      parentIDPath: '1,12,13',
      parentNamePath: 'Animalia|Chordata|Amphibia',
      hasChildren: null
    });
    expect(await Taxon.getByID(db, 15)).toEqual({
      taxonID: 15,
      taxonRank: TaxonRank.Family,
      taxonName: 'Plethodontidae',
      uniqueName: 'Plethodontidae',
      author: null,
      parentID: 14,
      parentIDPath: '1,12,13,14',
      parentNamePath: 'Animalia|Chordata|Amphibia|Urodela',
      hasChildren: null
    });
    expect(await Taxon.getByID(db, 16)).toEqual({
      taxonID: 16,
      taxonRank: TaxonRank.Genus,
      taxonName: 'Eurycea',
      uniqueName: 'Eurycea',
      author: null,
      parentID: 15,
      parentIDPath: '1,12,13,14,15',
      parentNamePath: 'Animalia|Chordata|Amphibia|Urodela|Plethodontidae',
      hasChildren: null
    });
    const readTaxon = await Taxon.getByID(db, 17);
    expect(readTaxon).toEqual({
      taxonID: 17,
      taxonRank: TaxonRank.Species,
      taxonName: 'rathbuni',
      uniqueName: 'Eurycea rathbuni',
      author: '(Stejneger, 1896)',
      parentID: 16,
      parentIDPath: '1,12,13,14,15,16',
      parentNamePath: 'Animalia|Chordata|Amphibia|Urodela|Plethodontidae|Eurycea',
      hasChildren: null
    });
    expect(createdTaxon).toEqual(readTaxon);
  }

  // test committing followed by an exact match

  {
    let matches = await Taxon.matchName(db, 'Arachnida', 10);
    expect(matches.length).toEqual(0);

    await Taxon.commit(db);

    matches = await Taxon.matchName(db, 'Arachnida', 10);
    expect(matches.length).toEqual(1);
    expect(matches[0].taxonName).toEqual('Arachnida');
    expect(matches[0].hasChildren).toBeNull();

    matches = await Taxon.matchName(db, 'arachnida', 10);
    expect(matches.length).toEqual(1);
    expect(matches[0].taxonName).toEqual('Arachnida');
    expect(matches[0].hasChildren).toBeNull();
  }

  // test reading taxa by exact unique names

  {
    const taxaNames = [
      'Animalia',
      'Arachnida',
      'Araneae',
      'Mecaphesa',
      'Mecaphesa dubia',
      'Philodromus',
      'Eurycea rathbuni'
    ];
    let readTaxa = await Taxon.getByUniqueNames(db, taxaNames);
    findTaxonNames(readTaxa, taxaNames);
    expect(readTaxa.find((t) => t.uniqueName == 'Araneae')?.hasChildren).toBe(true);
    expect(readTaxa.find((t) => t.uniqueName == 'Mecaphesa')?.hasChildren).toBe(true);
    expect(readTaxa.find((t) => t.uniqueName == 'Eurycea rathbuni')?.hasChildren).toBe(
      false
    );

    readTaxa = await Taxon.getByUniqueNames(db, ['foo', 'bar']);
    expect(readTaxa.length).toEqual(0);
  }

  // test providing the author of an existing taxon

  {
    const expectedTaxon = await Taxon.getByID(db, 4);
    expect(expectedTaxon?.taxonName).toEqual('Araneae');
    expectedTaxon!.author = 'Somebody';
    await expectedTaxon!.save(db);
    const readTaxon = await Taxon.getByID(db, 4);
    expect(readTaxon).toEqual(expectedTaxon);
  }

  // test multiple internal subset matches

  {
    let matches = await Taxon.matchName(db, 'ida', 10);
    expect(matches.map((taxon) => taxon.taxonName)).toEqual([
      'Arachnida',
      'Philodromidae',
      'Plethodontidae',
      'Thomisidae'
    ]);

    matches = await Taxon.matchName(db, 'ida', 2);
    expect(matches.map((taxon) => taxon.taxonName)).toEqual([
      'Arachnida',
      'Philodromidae'
    ]);
  }

  // test getting children of parent by parent name

  {
    let readTaxa = await Taxon.getChildrenOf(db, ['Animalia']);
    expect(readTaxa.length).toEqual(1);
    findTaxonNames(readTaxa[0], ['Arthropoda', 'Chordata']);
    readTaxa[0].forEach((t) => expect(t.hasChildren).toBe(true));

    readTaxa = await Taxon.getChildrenOf(db, ['Arachnida']);
    expect(readTaxa.length).toEqual(1);
    findTaxonNames(readTaxa[0], ['Araneae']);
    readTaxa[0].forEach((t) => expect(t.hasChildren).toBe(true));

    readTaxa = await Taxon.getChildrenOf(db, ['Araneae']);
    expect(readTaxa.length).toEqual(1);
    findTaxonNames(readTaxa[0], ['Thomisidae', 'Philodromidae']);
    readTaxa[0].forEach((t) => expect(t.hasChildren).toBe(true));

    readTaxa = await Taxon.getChildrenOf(db, ['Animalia', 'Araneae']);
    expect(readTaxa.length).toEqual(2);
    findTaxonNames(readTaxa[0], ['Arthropoda', 'Chordata']);
    readTaxa[0].forEach((t) => expect(t.hasChildren).toBe(true));
    findTaxonNames(readTaxa[1], ['Thomisidae', 'Philodromidae']);
    readTaxa[1].forEach((t) => expect(t.hasChildren).toBe(true));

    readTaxa = await Taxon.getChildrenOf(db, ['Eurycea rathbuni']);
    expect(readTaxa.length).toEqual(1);
    expect(readTaxa[0].length).toEqual(0);

    readTaxa = await Taxon.getChildrenOf(db, ['not there']);
    expect(readTaxa.length).toEqual(1);
    expect(readTaxa[0].length).toEqual(0);
  }

  // test replacing existing records

  {
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
    let matches = await Taxon.matchName(db, 'jenningsi', 10);
    expect(matches[0].author).toEqual('Author');

    await Taxon.getOrCreate(db, {
      kingdom: 'Animalia',
      phylum: 'Arthropoda',
      class: 'Arachnida',
      order: 'Araneae',
      family: 'Salticidae',
      scientificName: 'Salticidae'
    });
    matches = await Taxon.matchName(db, 'Salticidae', 10);
    expect(matches.length).toEqual(0);

    await Taxon.commit(db);

    matches = await Taxon.matchName(db, 'jenningsi', 10);
    expect(matches.length).toEqual(1);
    expect(matches[0].author).toEqual('New Author');
    matches = await Taxon.matchName(db, 'Salticidae', 10);
    expect(matches.length).toEqual(1);
    matches = await Taxon.matchName(db, 'Thomisidae', 10);
    expect(matches.length).toEqual(0);
  }
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

function findTaxonNames(taxa: Taxon[], lookForNames: string[]) {
  for (const name of lookForNames) {
    const taxon = taxa.find((t) => t.uniqueName == name);
    expect(taxon).not.toBeUndefined();
  }
  expect(taxa.length).toEqual(lookForNames.length);
}
