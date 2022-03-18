import { test, expect } from '@playwright/test';
import type { DB } from '../util/pg_util';

import { initTestDatabase } from '../util/test_util';
import { Taxon, TaxonRank } from './taxon';

let db: DB;

test.beforeAll(async () => {
  db = await initTestDatabase();
});

test('series of sequentially dependent taxa tests', async () => {
  // Each of these tests depends on the prior tests, so run all as a unit.

  // test adding kingdom taxon

  {
    const taxonName = 'Animalia';
    const sourceTaxon = {
      taxonRank: TaxonRank.Kingdom,
      taxonName,
      scientificName: taxonName,
      parentID: null,
      parentIDSeries: null,
      parentNameSeries: null
    };
    const expectedTaxon = Object.assign({ taxonID: 1 }, sourceTaxon);
    const createdTaxon = await Taxon.create(db, null, null, sourceTaxon);
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
      parentID: 1,
      parentIDSeries: '1',
      parentNameSeries: 'Animalia'
    };
    const expectedTaxon = Object.assign({ taxonID: 2 }, sourceTaxon);
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
    const taxonName = 'dubia';
    const createdTaxon = await Taxon.getOrCreate(db, {
      kingdom: 'Animalia',
      phylum: 'Arthropoda',
      class: 'Arachnida',
      order: 'Araneae',
      family: 'Thomisidae',
      genus: 'Mecaphesa',
      specificEpithet: taxonName,
      scientificName: 'Mecaphesa dubia (Author)'
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
      taxonName,
      scientificName: 'Mecaphesa dubia (Author)',
      parentID: 6,
      parentIDSeries: '1,2,3,4,5,6',
      parentNameSeries: 'Animalia|Arthropoda|Arachnida|Araneae|Thomisidae|Mecaphesa'
    });
    expect(createdTaxon).toEqual(readTaxon);
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

test.afterAll(async () => {
  await db.close();
});
