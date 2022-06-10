import { test, expect } from '@playwright/test';

const URL = 'http://localhost/taxa';

const clearTaxaButtonID = 'button:has-text("Clear")';
const autoSelectorID = '.auto_control div.selector';
const autoLoupeID = '.auto_control .loupe_icon';
const autocompleteInputID = '.autocomplete-input';
const autocompleteClearButton = ' .autocomplete-clear-button';
const autocompleteListID = '.autocomplete-list';
const autocompleteListItemID = '.autocomplete-list-item';

const toTaxonRowSelectorID = (taxon: string) =>
  `.taxon-row:has-text("${taxon}") .selector`;

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

  // Remove 'arachnida' via the autocompletion box

  await page.click(autoSelectorID);
  await expect(page.locator(autoSelectorID + '.selection')).not.toBeVisible();
  await expect(page.locator(autoSelectorID)).toBeVisible();
  await expect(page.locator(autoLoupeID)).toBeVisible();
  expect(await page.inputValue(autocompleteInputID)).toEqual('arachnida');
  await expect(page.locator(autocompleteClearButton)).toBeVisible();
  await expect(main).toContainText('No taxa selected');
  await expect(page.locator(clearTaxaButtonID)).not.toBeVisible();

  // Clear the remaining autocomplete value

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

  // Type 'ara' into the autocompletion box

  await page.fill(autocompleteInputID, 'ara');
  let list = page.locator(autocompleteListID);
  await expect(list).toBeVisible();
  await expect(page.locator(araneidaeID)).toBeVisible();

  // Click on 'Araneidae' in the autocompletion list

  await page.click(araneidaeID);
  await expect(page.locator(araneidaeID)).not.toBeVisible();
  await expect(list).not.toBeVisible();
  await expect(page.locator(autoSelectorID)).toBeVisible();
  await expect(page.locator(autoSelectorID + '.selection')).not.toBeVisible();
  await expect(page.locator(autoLoupeID)).toBeVisible();

  // Add 'Araneidae' to the selected taxa

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
