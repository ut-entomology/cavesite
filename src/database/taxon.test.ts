import { test, expect } from '@playwright/test';
import type { Client } from 'pg';

import { initTestDatabase } from '../util/test_util';
import type { TaxonData } from './taxon';
import { Taxon, TaxonRank } from './taxon';

let db: Client;

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
  const createdTaxon = await Taxon.create(db, taxonName, {
    taxonRank: TaxonRank.Kingdom,
    taxonName: taxonName,
    scientificName: taxonName,
    parentID: null
  });
  verifyTaxon(createdTaxon, expectedTaxon);
  const readTaxon = await Taxon.getByID(db, createdTaxon.taxonID);
  verifyTaxon(readTaxon, expectedTaxon);
});

// test('adding phylum of existing kingdom', async () => {
//   const taxonName = 'Animalia';
//   const expectedTaxon = {
//     taxonRank: TaxonRank.Kingdom,
//     taxonName,
//     authorlessUniqueName: taxonName,
//     scientificName: taxonName,
//     parentID: 1
//   };
//   const createdTaxon = await Taxon.create(db, taxonName, {
//     taxonRank: TaxonRank.Phylum,
//     taxonName: taxonName,
//     scientificName: taxonName,
//     parentID: 1
//   });
//   verifyTaxon(createdTaxon, expectedTaxon);
//   const readTaxon = await Taxon.getByID(db, createdTaxon.taxonID);
//   verifyTaxon(readTaxon, expectedTaxon);
// });

test.afterAll(async () => {
  await db.end();
});

function verifyTaxon(
  actualTaxon: Taxon | null,
  expectedTaxon: Omit<TaxonData, 'taxonID'>
): void {
  if (actualTaxon == null) {
    test.fail(true, `Taxon ${JSON.stringify(actualTaxon)} is not null`);
    return;
  }
  expect(actualTaxon.taxonID).toBeGreaterThan(0);
  expect(actualTaxon.taxonRank).toEqual(expectedTaxon.taxonRank);
  expect(actualTaxon.taxonName).toEqual(expectedTaxon.taxonName);
  expect(actualTaxon.authorlessUniqueName).toEqual(expectedTaxon.authorlessUniqueName);
  expect(actualTaxon.scientificName).toEqual(expectedTaxon.scientificName);
  expect(actualTaxon.parentID).toEqual(expectedTaxon.parentID);
}
