import { test, expect } from '@playwright/test';
import type { Client } from 'pg';

import { initTestDatabase } from '../util/test_util';
import type { TaxonData } from './taxon';
import { Taxon, TaxonRank } from './taxon';

let db: Client;

test.describe('sequentially dependent taxa tests', () => {
  // Each of these tests depends on the prior tests, so run all as a unit.

  test.beforeAll(async () => {
    db = await initTestDatabase();
  });

  test('adding kingdom taxon', async () => {
    const taxonName = 'Animalia';
    const expectedTaxon = {
      taxonRank: TaxonRank.Kingdom,
      taxonName,
      authorlessUniqueName: taxonName,
      scientificName: taxonName,
      parentID: null
    };
    const createdTaxon = await Taxon.create(db, taxonName, expectedTaxon);
    verifyTaxon(createdTaxon, expectedTaxon, 1);
    const readTaxon = await Taxon.getByID(db, createdTaxon.taxonID);
    verifyTaxon(readTaxon, expectedTaxon, 1);
  });

  test('adding phylum of existing kingdom', async () => {
    const taxonName = 'Arthropoda';
    const expectedTaxon = {
      taxonRank: TaxonRank.Phylum,
      taxonName,
      authorlessUniqueName: taxonName,
      scientificName: taxonName,
      parentID: 1
    };
    const createdTaxon = await Taxon.create(db, taxonName, expectedTaxon);
    verifyTaxon(createdTaxon, expectedTaxon, 2);
    const readTaxon = await Taxon.getByID(db, createdTaxon.taxonID);
    verifyTaxon(readTaxon, expectedTaxon, 2);
  });

  test('getOrCreate() gets an existing taxon', async () => {
    const taxonName = 'Arthropoda';
    const expectedTaxon = await Taxon.getByID(db, 2);
    expect(expectedTaxon?.taxonName).toEqual(taxonName);
    const readTaxon = await Taxon.getOrCreate(db, {
      kingdom: 'Animalia',
      phylum: taxonName,
      scientificName: taxonName
    });
    expect(readTaxon).toEqual(expectedTaxon);
  });

  test('auto-creating new taxon having no intermediates', async () => {
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
      authorlessUniqueName: taxonName,
      scientificName: taxonName,
      parentID: 2
    });
  });

  test('auto-creating new species and new intermediate taxa', async () => {
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
      authorlessUniqueName: 'Araneae',
      scientificName: null,
      parentID: 3
    });
    expect(await Taxon.getByID(db, 5)).toEqual({
      taxonID: 5,
      taxonRank: TaxonRank.Family,
      taxonName: 'Thomisidae',
      authorlessUniqueName: 'Thomisidae',
      scientificName: null,
      parentID: 4
    });
    expect(await Taxon.getByID(db, 6)).toEqual({
      taxonID: 6,
      taxonRank: TaxonRank.Genus,
      taxonName: 'Mecaphesa',
      authorlessUniqueName: 'Mecaphesa',
      scientificName: null,
      parentID: 5
    });
    const readTaxon = await Taxon.getByID(db, 7);
    expect(readTaxon).toEqual({
      taxonID: 7,
      taxonRank: TaxonRank.Species,
      taxonName,
      authorlessUniqueName: 'Mecaphesa dubia',
      scientificName: 'Mecaphesa dubia (Author)',
      parentID: 6
    });
    expect(createdTaxon).toEqual(readTaxon);
  });

  test('creating new subspecies with new intermediate species', async () => {
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
      authorlessUniqueName: 'Philodromidae',
      scientificName: null,
      parentID: 4
    });
    expect(await Taxon.getByID(db, 9)).toEqual({
      taxonID: 9,
      taxonRank: TaxonRank.Genus,
      taxonName: 'Philodromus',
      authorlessUniqueName: 'Philodromus',
      scientificName: null,
      parentID: 8
    });
    expect(await Taxon.getByID(db, 10)).toEqual({
      taxonID: 10,
      taxonRank: TaxonRank.Species,
      taxonName: 'rufus',
      authorlessUniqueName: 'Philodromus rufus',
      scientificName: null,
      parentID: 9
    });
    const readTaxon = await Taxon.getByID(db, 11);
    expect(readTaxon).toEqual({
      taxonID: 11,
      taxonRank: TaxonRank.Subspecies,
      taxonName: 'jenningsi',
      authorlessUniqueName: 'Philodromus rufus jenningsi',
      scientificName: 'Philodromus rufus jenningsi Author',
      parentID: 10
    });
    expect(createdTaxon).toEqual(readTaxon);
  });

  test('retrieving taxa by authorless unique name', async () => {
    let taxon = await Taxon.getByUniqueName(db, 'Arthropoda');
    expect(taxon?.taxonID).toEqual(2);
    taxon = await Taxon.getByUniqueName(db, 'Arachnida');
    expect(taxon?.taxonID).toEqual(3);
    taxon = await Taxon.getByUniqueName(db, 'Mecaphesa');
    expect(taxon?.taxonID).toEqual(6);
    taxon = await Taxon.getByUniqueName(db, 'Mecaphesa dubia');
    expect(taxon?.taxonID).toEqual(7);
  });

  test('providing the scientific name of an existing taxon', async () => {
    const expectedTaxon = await Taxon.getByID(db, 4);
    expect(expectedTaxon?.taxonName).toEqual('Araneae');
    expectedTaxon!.scientificName = 'Araneae';
    await expectedTaxon!.save(db);
    const readTaxon = await Taxon.getByID(db, 4);
    expect(readTaxon).toEqual(expectedTaxon);
  });

  test.afterAll(async () => {
    await db.end();
  });
});

function verifyTaxon(
  actualTaxon: Taxon | null,
  expectedTaxon: Omit<TaxonData, 'taxonID'>,
  expectedID: number
): void {
  if (actualTaxon == null) {
    test.fail(true, `Taxon ${JSON.stringify(actualTaxon)} is not null`);
    return;
  }
  expect(actualTaxon.taxonID).toEqual(expectedID);
  expect(actualTaxon.taxonRank).toEqual(expectedTaxon.taxonRank);
  expect(actualTaxon.taxonName).toEqual(expectedTaxon.taxonName);
  expect(actualTaxon.authorlessUniqueName).toEqual(expectedTaxon.authorlessUniqueName);
  expect(actualTaxon.scientificName).toEqual(expectedTaxon.scientificName);
  expect(actualTaxon.parentID).toEqual(expectedTaxon.parentID);
}
