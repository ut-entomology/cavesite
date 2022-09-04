import { test, expect } from '@playwright/test';

const URL = 'http://localhost/predictions';

const dialogID = '.config-effort-content';
const clearLocationsButtonID = 'button:has-text("Clear")';
const noticeContainerID = '.notice-container';
const confirmClearLocationsButtonID = `${noticeContainerID} ${clearLocationsButtonID}`;
const clusterButtonID = 'button:has-text("Clusters")';
const submitButtonID = 'button:has-text("Submit")';
const cancelButtonID = 'button:has-text("Cancel")';
const closeButtonID = 'button:has-text("Close")';
const howToBoxID = '.how_to_box';
const additionalSpeciesShownID = '#predicted_additional_species .outer_bar';
const additionalSpeciesMoreID =
  '#predicted_additional_species button:has-text("Show More")';
const additionalSpeciesShrinkID =
  '#predicted_additional_species button:has-text("Shrink")';
const noPredictionCavesShownID = '#no_prediction_caves .outer_bar';
const noPredictionCavesMoreID = '#no_prediction_caves button:has-text("Show More")';
const noPredictionCavesShrinkID = '#no_prediction_caves button:has-text("Shrink")';
const taxaInClusterShownID = '#taxa_in_cluster .outer_bar';
const taxaInClusterMoreID = '#taxa_in_cluster button:has-text("Show More")';
const taxaInClusterShrinkID = '#taxa_in_cluster button:has-text("Shrink")';
const remainingTaxaShownID = '#predicted_remaining_taxa .outer_bar';
const remainingTaxaMoreID = '#predicted_remaining_taxa button:has-text("Show More")';
const remainingTaxaShrinkID = '#predicted_remaining_taxa button:has-text("Shrink")';
const taxaInCaveShownID = '#taxa_in_cave .outer_bar';
const taxaInCaveMoreID = '#taxa_in_cave button:has-text("Show More")';
const taxaInCaveShrinkID = '#taxa_in_cave button:has-text("Shrink")';
const autoLoupeID = '.auto_control .loupe_icon';
const autocompleteInputID = '.autocomplete-input';

const toAutoListItemID = (location: string) =>
  `.autocomplete-list-item:has-text("${location}")`;
const toTreeRowNameID = (location: string) =>
  `.tree-row .location-name:has-text("${location}")`;
const toTreeRowSelectorID = (location: string) =>
  `.tree-row:has-text("${location}") .selector`;
const toAncestorRowNameID = (location: string) =>
  `.ancestors-row .location-name:has-text("${location}")`;
const toAncestorRowSelectorID = (location: string) =>
  `.ancestors-row .tree-row:has-text("${location}") .selector`;
const toChildRowNameID = (location: string) =>
  `.child-rows .location-name:has-text("${location}")`;
const toChildRowSelectorID = (location: string) =>
  `.child-rows .tree-row:has-text("${location}") .selector`;

test.afterEach(async ({ page }) => {
  if (await page.$(clearLocationsButtonID)) {
    await page.click(clearLocationsButtonID);
    await page.click(confirmClearLocationsButtonID);
  }
});

test('test for initial state', async ({ page }) => {
  await page.goto(URL);

  const title = page.locator('.tab_title');
  await expect(title).toContainText('Range Predictions');

  const main = page.locator('main');
  await expect(main).toContainText(
    'Click the "Load Clusters" button to generate predictions'
  );

  await expect(page.locator(howToBoxID)).toContainText(
    'How to use the Predictions tab'
  );

  await expect(page.locator(dialogID)).not.toBeVisible();
});

test('test generating default clustering', async ({ page }) => {
  await page.goto(URL);

  // Verify presence of configuration dialog.

  await page.click(clusterButtonID);
  await expect(page.locator(dialogID)).toContainText('Configure Cave Clusters');
  await page.click(submitButtonID);

  // Verify parts of the page.

  const main = page.locator('main');
  await expect(main).toContainText('Overall Accuracy');
  await expect(main).toContainText('Accuracy Summary');
  await expect(main).toContainText('Predicted additional species');
  await expect(main).toContainText('Caves with too few visits');
  await expect(main).toContainText('Frequency of taxa found in this cluster');

  // Verify functioning of predicted additional species.

  let rows = await page.$$(additionalSpeciesShownID);
  expect(rows.length).toEqual(10);

  await page.click(additionalSpeciesMoreID);
  await page.locator(additionalSpeciesShownID).nth(10).waitFor();
  rows = await page.$$(additionalSpeciesShownID);
  expect(rows.length).toBeGreaterThan(10);

  await page.click(additionalSpeciesShrinkID);
  await expect(page.locator(additionalSpeciesShrinkID)).not.toBeVisible();
  rows = await page.$$(additionalSpeciesShownID);
  expect(rows.length).toEqual(10);

  // Verify functioning of caves with no predictions.

  rows = await page.$$(noPredictionCavesShownID);
  expect(rows.length).toEqual(10);

  await page.click(noPredictionCavesMoreID);
  await page.locator(noPredictionCavesShownID).nth(10).waitFor();
  rows = await page.$$(noPredictionCavesShownID);
  expect(rows.length).toBeGreaterThan(10);

  await page.click(noPredictionCavesShrinkID);
  await expect(page.locator(noPredictionCavesShrinkID)).not.toBeVisible();
  rows = await page.$$(noPredictionCavesShownID);
  expect(rows.length).toEqual(10);

  // Verify functioning of caves with no predictions.

  rows = await page.$$(taxaInClusterShownID);
  expect(rows.length).toEqual(10);

  await page.click(taxaInClusterMoreID);
  await page.locator(taxaInClusterShownID).nth(10).waitFor();
  rows = await page.$$(taxaInClusterShownID);
  expect(rows.length).toBeGreaterThan(10);

  await page.click(taxaInClusterShrinkID);
  await expect(page.locator(taxaInClusterShrinkID)).not.toBeVisible();
  rows = await page.$$(taxaInClusterShownID);
  expect(rows.length).toEqual(10);
});

test('test per-cave popup dialogs', async ({ page }) => {
  await page.goto(URL);

  // Verify presence of configuration dialog.

  await page.click(clusterButtonID);
  await expect(page.locator(dialogID)).toContainText('Configure Cave Clusters');
  await page.click(submitButtonID);

  // Make sure one pops up for prediction additional species caves.

  await page.click('#predicted_additional_species .outer_bar >> nth=0');
  await expect(page.locator('.dialog .location_effort_dialog')).toContainText(
    'Cluster #1'
  );

  // Verify functioning of predicted additional species.

  let rows = await page.$$(remainingTaxaShownID);
  expect(rows.length).toEqual(10);

  await page.click(remainingTaxaMoreID);
  await page.locator(remainingTaxaShownID).nth(10).waitFor();
  rows = await page.$$(remainingTaxaShownID);
  expect(rows.length).toBeGreaterThan(10);

  await page.click(remainingTaxaShrinkID);
  await expect(page.locator(remainingTaxaShrinkID)).not.toBeVisible();
  rows = await page.$$(remainingTaxaShownID);
  expect(rows.length).toEqual(10);

  // Verify functioning of taxa in cave.

  rows = await page.$$(taxaInCaveShownID);
  expect(rows.length).toEqual(10);

  await page.click(taxaInCaveMoreID);
  await page.locator(taxaInCaveShownID).nth(10).waitFor();
  rows = await page.$$(taxaInCaveShownID);
  expect(rows.length).toBeGreaterThan(10);

  await page.click(taxaInCaveShrinkID);
  await expect(page.locator(taxaInCaveShrinkID)).not.toBeVisible();
  rows = await page.$$(taxaInCaveShownID);
  expect(rows.length).toEqual(10);

  // Verify closing dialog.

  await page.click(closeButtonID);
  await expect(page.locator('.dialog .location_effort_dialog')).not.toBeVisible();
});

test('test cave lookup', async ({ page }) => {
  await page.goto(URL);

  // Verify that the lookup opens a per-cave dialog.

  await page.click(clusterButtonID);
  await expect(page.locator(dialogID)).toContainText('Configure Cave Clusters');
  await page.click(submitButtonID);

  await page.fill(autocompleteInputID, 'whirl');
  await page.click(toAutoListItemID('Whirlpool Cave'));
  await page.click(autoLoupeID);

  await expect(page.locator('.dialog .location_effort_dialog')).toContainText(
    'Cluster #'
  );

  await page.click(closeButtonID);
});
