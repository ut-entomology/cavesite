import { test, expect } from '@playwright/test';

const URL = 'http://localhost/taxa';

const clearTaxaButtonID = 'button:has-text("Clear")';
const noticeContainerID = '.notice-container';
const confirmClearTaxaButtonID = `${noticeContainerID} ${clearTaxaButtonID}`;
const cancelButtonID = 'button:has-text("Cancel")';
const autoSelectorID = '.auto_control div.selector';
const autoLoupeID = '.auto_control .loupe_icon';
const autocompleteInputID = '.autocomplete-input';
const autocompleteClearButton = ' .autocomplete-clear-button';
const autocompleteListID = '.autocomplete-list';
const autocompleteListItemID = '.autocomplete-list-item';

const toTaxonRowSelectorID = (taxon: string) =>
  `.taxon-row:has-text("${taxon}") .selector`;

test.afterEach(async ({ page }) => {
  if (await page.$(clearTaxaButtonID)) {
    await page.click(clearTaxaButtonID);
    await page.click(confirmClearTaxaButtonID);
  }
});

test('test for initial state', async ({ page }) => {
  await page.goto(URL);

  const title = page.locator('.tab_title');
  await expect(title).toContainText('Selected Taxa');

  const main = page.locator('main');
  await expect(main).toContainText('No taxa selected');

  const initialInput = await page.inputValue(autocompleteInputID);
  expect(initialInput).toBeFalsy();
  await expect(page.locator(autoSelectorID)).not.toBeVisible();
  await expect(page.locator(autoLoupeID)).not.toBeVisible();
  await expect(page.locator(autocompleteClearButton)).not.toBeVisible();

  await expect(page.locator(clearTaxaButtonID)).not.toBeVisible();
});

test('test increasingly specific autocomplete', async ({ page }) => {
  await page.goto(URL);

  await page.fill(autocompleteInputID, 'a');
  let list = page.locator(autocompleteListID);
  await expect(list).not.toBeVisible();
  await expect(page.locator(autoSelectorID)).not.toBeVisible();
  await expect(page.locator(autoLoupeID)).not.toBeVisible();
  await expect(page.locator(autocompleteClearButton)).toBeVisible();

  await page.fill(autocompleteInputID, 'ar');
  await expect(list).toBeVisible();
  await expect(list).toContainText('Arachnida');
  await expect(list).toContainText('paraconcinna');
  await expect(list).toContainText('Pardosa');
  await expect(page.locator(autoSelectorID)).not.toBeVisible();
  await expect(page.locator(autoLoupeID)).not.toBeVisible();

  await page.fill(autocompleteInputID, 'ara');
  await expect(list).toContainText('Arachnida');
  await expect(list).toContainText('paraconcinna');
  await expect(list).not.toContainText('Pardosa');
  await expect(page.locator(autoSelectorID)).not.toBeVisible();
  await expect(page.locator(autoLoupeID)).not.toBeVisible();

  await page.fill(autocompleteInputID, 'arac');
  await expect(list).toContainText('Arachnida');
  await expect(list).toContainText('paraconcinna');
  await expect(list).not.toContainText('Pardosa');
  await expect(page.locator(autoSelectorID)).not.toBeVisible();
  await expect(page.locator(autoLoupeID)).not.toBeVisible();

  await page.fill(autocompleteInputID, 'arachnida');
  await expect(list).toContainText('Arachnida');
  let items = page.locator(autocompleteListItemID);
  await expect(items).toHaveCount(1);
  await expect(page.locator(autoSelectorID)).toBeVisible();
  await expect(page.locator(autoLoupeID)).toBeVisible();
  await expect(page.locator(autocompleteClearButton)).toBeVisible();

  const main = page.locator('main');
  await expect(main).toContainText('No taxa selected');
  await expect(page.locator(clearTaxaButtonID)).not.toBeVisible();
});

test('adding, removing, and clearing via autocomplete controls', async ({ page }) => {
  await page.goto(URL);
  const main = page.locator('main');

  // Add 'arachnida' via the autocompletion box

  await page.fill(autocompleteInputID, 'arachnida');
  await expect(page.locator(autoSelectorID)).toBeVisible();
  await expect(page.locator(autoSelectorID + '.selection')).not.toBeVisible();
  await expect(page.locator(autoLoupeID)).toBeVisible();
  await page.click(autoSelectorID);
  await expect(page.locator(autoSelectorID + '.selection')).toBeVisible();
  await expect(page.locator(autoLoupeID)).toBeVisible();
  await expect(main).toContainText('phylum: Arthropoda');
  await expect(main).toContainText('class: Arachnida');
  expect(await page.inputValue(autocompleteInputID)).toEqual('arachnida');
  await expect(page.locator(autocompleteClearButton)).toBeVisible();
  await expect(page.locator(clearTaxaButtonID)).toBeVisible();

  // Remove 'arachnida' via the autocompletion box.

  await page.click(autoSelectorID);
  await expect(page.locator(autoSelectorID + '.selection')).not.toBeVisible();
  await expect(page.locator(autoSelectorID)).toBeVisible();
  await expect(page.locator(autoLoupeID)).toBeVisible();
  expect(await page.inputValue(autocompleteInputID)).toEqual('arachnida');
  await expect(page.locator(autocompleteClearButton)).toBeVisible();
  await expect(main).toContainText('No taxa selected');
  await expect(page.locator(clearTaxaButtonID)).not.toBeVisible();

  // Clear the remaining autocomplete value.

  await page.click(autocompleteClearButton);
  await expect(page.locator(autoSelectorID)).not.toBeVisible();
  await expect(page.locator(autoLoupeID)).not.toBeVisible();
  await expect(page.locator(autocompleteClearButton)).not.toBeVisible();
  expect(await page.inputValue(autocompleteInputID)).toBeFalsy();
});

test('selecting from the autocompletion list', async ({ page }) => {
  await page.goto(URL);
  const main = page.locator('main');
  const araneidaeID = '.autocomplete-list-item:has-text("Araneidae (")';

  // Type 'ara' into the autocompletion box.

  await page.fill(autocompleteInputID, 'ara');
  let list = page.locator(autocompleteListID);
  await expect(list).toBeVisible();
  await expect(page.locator(araneidaeID)).toBeVisible();

  // Click on 'Araneidae' in the autocompletion list.

  await page.click(araneidaeID);
  await expect(page.locator(araneidaeID)).not.toBeVisible();
  await expect(list).not.toBeVisible();
  await expect(page.locator(autoSelectorID)).toBeVisible();
  await expect(page.locator(autoSelectorID + '.selection')).not.toBeVisible();
  await expect(page.locator(autoLoupeID)).toBeVisible();

  // Add 'Araneidae' to the selected taxa.

  await page.click(autoSelectorID);
  await expect(page.locator(autoSelectorID + '.selection')).toBeVisible();
  await expect(page.locator(autoLoupeID)).toBeVisible();

  await expect(main).toContainText('Arthropoda');
  await expect(page.locator(toTaxonRowSelectorID('Arthropoda'))).toBeVisible();
  await expect(
    page.locator(toTaxonRowSelectorID('Arthropoda') + '.selection')
  ).not.toBeVisible();

  await expect(main).toContainText('Arachnida');
  await expect(page.locator(toTaxonRowSelectorID('Arachnida'))).toBeVisible();
  await expect(
    page.locator(toTaxonRowSelectorID('Arachnida') + '.selection')
  ).not.toBeVisible();

  await expect(main).toContainText('Araneae');
  await expect(page.locator(toTaxonRowSelectorID('Araneae'))).toBeVisible();
  await expect(
    page.locator(toTaxonRowSelectorID('Araneae') + '.selection')
  ).not.toBeVisible();

  await expect(main).toContainText('Araneidae');
  await expect(
    page.locator(toTaxonRowSelectorID('Araneidae') + '.selection')
  ).toBeVisible();
});

test('clears taxon selections tree on confirmation', async ({ page }) => {
  await page.goto(URL);
  const main = page.locator('main');

  // Add 'arachnida' via the autocompletion box.

  await page.fill(autocompleteInputID, 'arachnida');
  await page.click(autoSelectorID);
  await expect(main).toContainText('class: Arachnida');

  // Open the clear taxa confirmation dialog.

  await expect(page.locator(noticeContainerID)).not.toBeVisible();
  await page.click(clearTaxaButtonID);
  await expect(page.locator(noticeContainerID)).toContainText('CAUTION');

  // First cancel clearing selections.

  await page.click(cancelButtonID);
  await expect(page.locator(noticeContainerID)).not.toBeVisible();
  await expect(main).toContainText('class: Arachnida');

  // Then do it again, this time confirming clearing selections.

  await page.click(clearTaxaButtonID);
  await page.click(confirmClearTaxaButtonID);
  await expect(main).not.toContainText('CAUTION');
  await expect(main).not.toContainText('class: Arachnida');
  await expect(main).toContainText('No taxa selected');

  const initialInput = await page.inputValue(autocompleteInputID);
  expect(initialInput).toBeFalsy();
  await expect(page.locator(autoSelectorID)).not.toBeVisible();
  await expect(page.locator(autoLoupeID)).not.toBeVisible();
  await expect(page.locator(autocompleteClearButton)).not.toBeVisible();
});

test('interaction of autocompletion box and taxon tree', async ({ page }) => {
  await page.goto(URL);
  const main = page.locator('main');

  // Add taxon via autocompletion box and remove via taxon tree.

  await page.fill(autocompleteInputID, 'arachnida');
  await page.click(autoSelectorID);
  await page.click(toTaxonRowSelectorID('Arachnida'));
  // tree operations clear box in order to simplify the code
  await expect(page.locator(autoSelectorID)).not.toBeVisible();
  await expect(page.locator(autoLoupeID)).not.toBeVisible();
  await expect(main).toContainText('No taxa selected');

  // Add multiple taxa via the autocompletion box and check for proper
  // autocompletion controls for each added taxon.

  await page.fill(autocompleteInputID, 'araneae');
  await page.click(autoSelectorID);
  await page.fill(autocompleteInputID, 'orthoptera');
  await page.click(autoSelectorID);

  await expect(main).toContainText('class: Arachnida');
  await expect(page.locator(toTaxonRowSelectorID('Arachnida'))).toBeVisible();
  await expect(
    page.locator(toTaxonRowSelectorID('Arachnida') + '.selection')
  ).not.toBeVisible();
  await page.fill(autocompleteInputID, 'arachnida');
  await expect(page.locator(autoSelectorID)).toBeVisible();
  await expect(page.locator(autoSelectorID + '.selection')).not.toBeVisible();
  await expect(page.locator(autoLoupeID)).toBeVisible();

  await expect(main).toContainText('order: Araneae');
  await expect(
    page.locator(toTaxonRowSelectorID('Araneae') + '.selection')
  ).toBeVisible();
  await page.fill(autocompleteInputID, 'araneae');
  await expect(page.locator(autoSelectorID + '.selection')).toBeVisible();
  await expect(page.locator(autoLoupeID)).toBeVisible();

  await expect(main).toContainText('class: Insecta');
  await expect(page.locator(toTaxonRowSelectorID('Insecta'))).toBeVisible();
  await expect(
    page.locator(toTaxonRowSelectorID('Insecta') + '.selection')
  ).not.toBeVisible();
  await page.fill(autocompleteInputID, 'insecta');
  await expect(page.locator(autoSelectorID)).toBeVisible();
  await expect(page.locator(autoSelectorID + '.selection')).not.toBeVisible();
  await expect(page.locator(autoLoupeID)).toBeVisible();

  await expect(main).toContainText('order: Orthoptera');
  await expect(
    page.locator(toTaxonRowSelectorID('Orthoptera') + '.selection')
  ).toBeVisible();
  await page.fill(autocompleteInputID, 'Orthoptera');
  await expect(page.locator(autoSelectorID + '.selection')).toBeVisible();
  await expect(page.locator(autoLoupeID)).toBeVisible();

  // Add 'Arachnida' to selections via the taxon tree.

  await page.click(toTaxonRowSelectorID('Arachnida'));
  await expect(main).toContainText('class: Arachnida');
  await expect(main).not.toContainText('order: Araneae');
  await expect(main).toContainText('class: Insecta');
  await expect(main).toContainText('order: Orthoptera');
  await expect(
    page.locator(toTaxonRowSelectorID('Arachnida') + '.selection')
  ).toBeVisible();

  let input = await page.inputValue(autocompleteInputID);
  expect(input).toBeFalsy();
  await expect(page.locator(autoSelectorID)).not.toBeVisible();
  await expect(page.locator(autoLoupeID)).not.toBeVisible();
  await expect(page.locator(autocompleteClearButton)).not.toBeVisible();

  // Remove 'Orthoptera' from the selections tree.

  await page.fill(autocompleteInputID, 'Orthoptera');
  await page.click(toTaxonRowSelectorID('order: Orthoptera'));
  await expect(main).toContainText('phylum: Arthropoda');
  await expect(main).toContainText('class: Arachnida');
  await expect(main).not.toContainText('class: Insecta');
  await expect(main).not.toContainText('order: Orthoptera');

  input = await page.inputValue(autocompleteInputID);
  expect(input).toBeFalsy();
  await expect(page.locator(autoSelectorID)).not.toBeVisible();
  await expect(page.locator(autoLoupeID)).not.toBeVisible();
  await expect(page.locator(autocompleteClearButton)).not.toBeVisible();
});
