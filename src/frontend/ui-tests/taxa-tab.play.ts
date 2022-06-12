import { test, expect } from '@playwright/test';

const URL = 'http://localhost/taxa';
const NO_TAXA_SELECTED = 'No taxa selected';

const browseTaxaButtonID = 'button:has-text("Browse")';
const browseTaxaDialogID = '.taxa-browser-content';
const clearTaxaButtonID = 'button:has-text("Clear")';
const noticeContainerID = '.notice-container';
const confirmClearTaxaButtonID = `${noticeContainerID} ${clearTaxaButtonID}`;
const cancelButtonID = 'button:has-text("Cancel")';
const closeButtonID = 'button:has-text("Close")';
const autoSelectorID = '.auto_control div.selector';
const autoLoupeID = '.auto_control .loupe_icon';
const autocompleteInputID = '.autocomplete-input';
const autocompleteClearButton = ' .autocomplete-clear-button';
const autocompleteListID = '.autocomplete-list';
const autocompleteListItemID = '.autocomplete-list-item';

const toTreeRowNameID = (taxon: string) => `.tree-row .taxon-name:has-text("${taxon}")`;
const toTreeRowSelectorID = (taxon: string) =>
  `.tree-row:has-text("${taxon}") .selector`;
const toAncestorRowNameID = (taxon: string) =>
  `.ancestors-row .taxon-name:has-text("${taxon}")`;
const toAncestorRowSelectorID = (taxon: string) =>
  `.ancestors-row .tree-row:has-text("${taxon}") .selector`;
const toChildRowNameID = (taxon: string) =>
  `.child-rows .taxon-name:has-text("${taxon}")`;
const toChildRowSelectorID = (taxon: string) =>
  `.child-rows .tree-row:has-text("${taxon}") .selector`;

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
  await expect(main).toContainText(NO_TAXA_SELECTED);

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
  await expect(main).toContainText(NO_TAXA_SELECTED);
  await expect(page.locator(clearTaxaButtonID)).not.toBeVisible();
});

test("inabiltiy to select 'Animalia' via autocomplete", async ({ page }) => {
  await page.goto(URL);
  await page.fill(autocompleteInputID, 'animalia');
  let list = page.locator(autocompleteListID);
  await expect(list).toBeVisible();
  await expect(list).toContainText('No results found');
  await expect(page.locator(autoSelectorID)).not.toBeVisible();
  await expect(page.locator(autoLoupeID)).not.toBeVisible();
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
  await expect(main).not.toContainText('Animalia');
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
  await expect(main).toContainText(NO_TAXA_SELECTED);
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
  await expect(page.locator(toTreeRowSelectorID('Arthropoda'))).toBeVisible();
  await expect(
    page.locator(toTreeRowSelectorID('Arthropoda') + '.selection')
  ).not.toBeVisible();

  await expect(main).toContainText('Arachnida');
  await expect(page.locator(toTreeRowSelectorID('Arachnida'))).toBeVisible();
  await expect(
    page.locator(toTreeRowSelectorID('Arachnida') + '.selection')
  ).not.toBeVisible();

  await expect(main).toContainText('Araneae');
  await expect(page.locator(toTreeRowSelectorID('Araneae'))).toBeVisible();
  await expect(
    page.locator(toTreeRowSelectorID('Araneae') + '.selection')
  ).not.toBeVisible();

  await expect(main).toContainText('Araneidae');
  await expect(
    page.locator(toTreeRowSelectorID('Araneidae') + '.selection')
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
  await expect(main).toContainText(NO_TAXA_SELECTED);

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
  await page.click(toTreeRowSelectorID('Arachnida'));
  // tree operations clear box in order to simplify the code
  await expect(page.locator(autoSelectorID)).not.toBeVisible();
  await expect(page.locator(autoLoupeID)).not.toBeVisible();
  await expect(main).toContainText(NO_TAXA_SELECTED);

  // Add multiple taxa via the autocompletion box and check for proper
  // autocompletion controls for each added taxon.

  await page.fill(autocompleteInputID, 'araneae');
  await page.click(autoSelectorID);
  await page.fill(autocompleteInputID, 'orthoptera');
  await page.click(autoSelectorID);

  await expect(main).toContainText('class: Arachnida');
  await expect(page.locator(toTreeRowSelectorID('Arachnida'))).toBeVisible();
  await expect(
    page.locator(toTreeRowSelectorID('Arachnida') + '.selection')
  ).not.toBeVisible();
  await page.fill(autocompleteInputID, 'arachnida');
  await expect(page.locator(autoSelectorID)).toBeVisible();
  await expect(page.locator(autoSelectorID + '.selection')).not.toBeVisible();
  await expect(page.locator(autoLoupeID)).toBeVisible();

  await expect(main).toContainText('order: Araneae');
  await expect(
    page.locator(toTreeRowSelectorID('Araneae') + '.selection')
  ).toBeVisible();
  await page.fill(autocompleteInputID, 'araneae');
  await expect(page.locator(autoSelectorID + '.selection')).toBeVisible();
  await expect(page.locator(autoLoupeID)).toBeVisible();

  await expect(main).toContainText('class: Insecta');
  await expect(page.locator(toTreeRowSelectorID('Insecta'))).toBeVisible();
  await expect(
    page.locator(toTreeRowSelectorID('Insecta') + '.selection')
  ).not.toBeVisible();
  await page.fill(autocompleteInputID, 'insecta');
  await expect(page.locator(autoSelectorID)).toBeVisible();
  await expect(page.locator(autoSelectorID + '.selection')).not.toBeVisible();
  await expect(page.locator(autoLoupeID)).toBeVisible();

  await expect(main).toContainText('order: Orthoptera');
  await expect(
    page.locator(toTreeRowSelectorID('Orthoptera') + '.selection')
  ).toBeVisible();
  await page.fill(autocompleteInputID, 'Orthoptera');
  await expect(page.locator(autoSelectorID + '.selection')).toBeVisible();
  await expect(page.locator(autoLoupeID)).toBeVisible();

  // Add 'Arachnida' to selections via the taxon tree.

  await page.click(toTreeRowSelectorID('Arachnida'));
  await expect(main).toContainText('class: Arachnida');
  await expect(main).not.toContainText('order: Araneae');
  await expect(main).toContainText('class: Insecta');
  await expect(main).toContainText('order: Orthoptera');
  await expect(
    page.locator(toTreeRowSelectorID('Arachnida') + '.selection')
  ).toBeVisible();

  let input = await page.inputValue(autocompleteInputID);
  expect(input).toBeFalsy();
  await expect(page.locator(autoSelectorID)).not.toBeVisible();
  await expect(page.locator(autoLoupeID)).not.toBeVisible();
  await expect(page.locator(autocompleteClearButton)).not.toBeVisible();

  // Remove 'Orthoptera' from the selections tree.

  await page.fill(autocompleteInputID, 'Orthoptera');
  await page.click(toTreeRowSelectorID('order: Orthoptera'));
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

test('removing descendant of selection (via autocompletion) selects peripheral taxa', async ({
  page
}) => {
  await page.goto(URL);
  const main = page.locator('main');

  // Add 'Arachnida' to selections

  await page.fill(autocompleteInputID, 'arachnida');
  await page.click(autoSelectorID);
  await expect(
    page.locator(toTreeRowSelectorID('Arachnida') + '.selection')
  ).toBeVisible();
  await expect(main).not.toContainText('Latrodectus mactans');

  // Remove 'Latrodectus hesperus' from selections.

  await page.fill(autocompleteInputID, 'latrodectus hesperus');
  await expect(page.locator(autoSelectorID + '.selection')).toBeVisible();
  await page.click(autoSelectorID);
  await expect(page.locator(autoSelectorID + '.selection')).not.toBeVisible();
  await expect(page.locator(autoSelectorID)).toBeVisible();

  await expect(
    page.locator(toTreeRowSelectorID('Arachnida') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toTreeRowSelectorID('Arachnida'))).toBeVisible();

  await expect(
    page.locator(toTreeRowSelectorID('Araneae') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toTreeRowSelectorID('Araneae'))).toBeVisible();
  await expect(
    page.locator(toTreeRowSelectorID('Ixodida') + '.selection')
  ).toBeVisible();

  await expect(
    page.locator(toTreeRowSelectorID('Theridiidae') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toTreeRowSelectorID('Theridiidae'))).toBeVisible();
  await expect(
    page.locator(toTreeRowSelectorID('Gnaphosidae') + '.selection')
  ).toBeVisible();

  await expect(
    page.locator(toTreeRowSelectorID('genus: Latrodectus') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toTreeRowSelectorID('genus: Latrodectus'))).toBeVisible();
  await expect(
    page.locator(toTreeRowSelectorID('genus: Steatoda') + '.selection')
  ).toBeVisible();

  await expect(
    page.locator(toTreeRowSelectorID('Latrodectus hesperus'))
  ).not.toBeVisible();
  await expect(
    page.locator(toTreeRowSelectorID('Latrodectus mactans') + '.selection')
  ).toBeVisible();
});

test('taxon tree supports multiple root-level phyla', async ({ page }) => {
  await page.goto(URL);
  const main = page.locator('main');

  await page.fill(autocompleteInputID, 'arthropoda');
  await page.click(autoSelectorID);
  await page.fill(autocompleteInputID, 'mollusca');
  await page.click(autoSelectorID);

  await expect(
    page.locator(toTreeRowSelectorID('Arthropoda') + '.selection')
  ).toBeVisible();
  await expect(
    page.locator(toTreeRowSelectorID('Mollusca') + '.selection')
  ).toBeVisible();
  await expect(main).not.toContainText('Animalia');
});

test('removing phyla from taxon tree removes taxon tree', async ({ page }) => {
  await page.goto(URL);
  const main = page.locator('main');

  await page.fill(autocompleteInputID, 'arthropoda');
  await page.click(autoSelectorID);
  await page.fill(autocompleteInputID, 'mollusca');
  await page.click(autoSelectorID);

  await page.locator(toTreeRowSelectorID('Arthropoda')).click();
  await page.locator(toTreeRowSelectorID('Mollusca')).click();

  await expect(main).not.toContainText('Animalia');
  await expect(main).not.toContainText('phylum: Arthropoda');
  await expect(main).not.toContainText('phylum: Mollusca');
  await expect(main).toContainText(NO_TAXA_SELECTED);
});

test('removing only nested selection eliminates taxon tree', async ({ page }) => {
  await page.goto(URL);
  const main = page.locator('main');

  // Add 'Latrodectus mactans' via the autocompletion box.

  await page.fill(autocompleteInputID, 'latrodectus mactans');
  await page.click(autoSelectorID);

  await expect(
    page.locator(toTreeRowSelectorID('Arachnida') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toTreeRowSelectorID('Arachnida'))).toBeVisible();

  await expect(
    page.locator(toTreeRowSelectorID('Araneae') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toTreeRowSelectorID('Araneae'))).toBeVisible();

  await expect(
    page.locator(toTreeRowSelectorID('Theridiidae') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toTreeRowSelectorID('Theridiidae'))).toBeVisible();

  await expect(
    page.locator(toTreeRowSelectorID('genus: Latrodectus') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toTreeRowSelectorID('genus: Latrodectus'))).toBeVisible();

  await expect(
    page.locator(toTreeRowSelectorID('Latrodectus mactans') + '.selection')
  ).toBeVisible();

  // Remove 'Latrodectus mactans' via the autocompletion box.

  await page.click(autoSelectorID);
  await expect(
    page.locator(toTreeRowSelectorID('Latrodectus mactans'))
  ).not.toBeVisible();
  await expect(main).toContainText(NO_TAXA_SELECTED);

  // Re-add 'Latrodectus mactans' and remove via the taxon tree.

  await page.click(autoSelectorID);
  await expect(
    page.locator(toTreeRowSelectorID('mactans') + '.selection')
  ).toBeVisible();
  await expect(main).not.toContainText(NO_TAXA_SELECTED);

  await page.click(toTreeRowSelectorID('mactans'));
  await expect(
    page.locator(toTreeRowSelectorID('mactans') + '.selection')
  ).not.toBeVisible();
  await expect(main).toContainText(NO_TAXA_SELECTED);
});

test('opening and closing taxon browser via autocompletion', async ({ page }) => {
  await page.goto(URL);

  // Enter 'Araneae' into the autocompletion box and browse via the loupe.

  await page.fill(autocompleteInputID, 'Araneae');
  await expect(page.locator(toTreeRowNameID('Araneae'))).not.toBeVisible();
  await expect(page.locator(browseTaxaDialogID)).not.toBeVisible();
  await page.click(autoLoupeID);
  await expect(page.locator(browseTaxaDialogID)).toBeVisible();

  // Verify ancestors shown for 'Araneae'.

  await expect(
    page.locator(toAncestorRowSelectorID('Araneae') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toAncestorRowSelectorID('Araneae'))).toBeVisible();
  await expect(
    page.locator(toAncestorRowNameID('Araneae') + '.clickable')
  ).not.toBeVisible();
  await expect(
    page.locator(toAncestorRowSelectorID('Arachnida') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toAncestorRowSelectorID('Arachnida'))).toBeVisible();
  await expect(
    page.locator(toAncestorRowNameID('Arachnida') + '.clickable')
  ).toBeVisible();
  await expect(
    page.locator(toAncestorRowSelectorID('Arthropoda') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toAncestorRowSelectorID('Arthropoda'))).toBeVisible();
  await expect(
    page.locator(toAncestorRowNameID('Arthropoda') + '.clickable')
  ).toBeVisible();
  await expect(
    page.locator(toAncestorRowSelectorID('Animalia') + '.selection')
  ).not.toBeVisible();
  await expect(
    page.locator(toAncestorRowNameID('Animalia') + '.clickable')
  ).toBeVisible();

  // Verify some children of 'Araneae'.

  await expect(
    page.locator(toChildRowSelectorID('Agelenidae') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toChildRowSelectorID('Agelenidae'))).toBeVisible();
  await expect(
    page.locator(toChildRowNameID('Agelenidae') + '.clickable')
  ).toBeVisible();
  await expect(
    page.locator(toChildRowSelectorID('Lycosidae') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toChildRowSelectorID('Lycosidae'))).toBeVisible();
  await expect(
    page.locator(toChildRowNameID('Lycosidae') + '.clickable')
  ).toBeVisible();

  // Close taxon browser and confirm nothing has changed.

  await page.locator(closeButtonID).click();
  await expect(page.locator(browseTaxaDialogID)).not.toBeVisible();
  expect(await page.inputValue(autocompleteInputID)).toEqual('Araneae');
  await expect(page.locator(autocompleteClearButton)).toBeVisible();
  await expect(page.locator(autoSelectorID + '.selection')).not.toBeVisible();
  await expect(page.locator(autoSelectorID)).toBeVisible();
  await expect(page.locator(autoLoupeID)).toBeVisible();
  await expect(page.locator(toTreeRowNameID('Araneae'))).not.toBeVisible();
});

test('opening and closing taxon browser via tab button', async ({ page }) => {
  await page.goto(URL);
  const main = page.locator('main');
});

test('opening and closing taxon browser via selection tree links', async ({ page }) => {
  await page.goto(URL);

  // Add 'Araneae' to selections.

  await page.fill(autocompleteInputID, 'Araneae');
  await page.click(autoSelectorID);
  await expect(
    page.locator(toTreeRowSelectorID('Araneae') + '.selection')
  ).toBeVisible();
  await expect(
    page.locator(toTreeRowSelectorID('Arachnida') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toTreeRowSelectorID('Arachnida'))).toBeVisible();

  // Browse 'Araneae' via taxon tree link.

  await expect(page.locator(browseTaxaDialogID)).not.toBeVisible();
  await expect(page.locator(toTreeRowNameID('Araneae'))).toBeVisible();
  await page.click(toTreeRowNameID('Araneae'));
  await expect(page.locator(browseTaxaDialogID)).toBeVisible();

  // Verify ancestors shown for 'Araneae'.

  await expect(
    page.locator(toAncestorRowSelectorID('Araneae') + '.selection')
  ).toBeVisible();
  await expect(
    page.locator(toAncestorRowNameID('Araneae') + '.clickable')
  ).not.toBeVisible();
  await expect(
    page.locator(toAncestorRowSelectorID('Arachnida') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toAncestorRowSelectorID('Arachnida'))).toBeVisible();
  await expect(
    page.locator(toAncestorRowNameID('Arachnida') + '.clickable')
  ).toBeVisible();
  await expect(
    page.locator(toAncestorRowSelectorID('Arthropoda') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toAncestorRowSelectorID('Arthropoda'))).toBeVisible();
  await expect(
    page.locator(toAncestorRowNameID('Arthropoda') + '.clickable')
  ).toBeVisible();
  await expect(
    page.locator(toAncestorRowSelectorID('Animalia') + '.selection')
  ).not.toBeVisible();
  await expect(
    page.locator(toAncestorRowNameID('Animalia') + '.clickable')
  ).toBeVisible();

  // Verify some children of 'Araneae'.

  await expect(
    page.locator(toChildRowSelectorID('Agelenidae') + '.selection')
  ).toBeVisible();
  await expect(
    page.locator(toChildRowNameID('Agelenidae') + '.clickable')
  ).toBeVisible();
  await expect(
    page.locator(toChildRowSelectorID('Lycosidae') + '.selection')
  ).toBeVisible();
  await expect(
    page.locator(toChildRowNameID('Lycosidae') + '.clickable')
  ).toBeVisible();

  // Close taxon browser and confirm nothing has changed.

  await page.locator(closeButtonID).click();
  await expect(page.locator(browseTaxaDialogID)).not.toBeVisible();
  expect(await page.inputValue(autocompleteInputID)).toEqual('Araneae');
  await expect(page.locator(autocompleteClearButton)).toBeVisible();
  await expect(page.locator(autoSelectorID + '.selection')).toBeVisible();
  await expect(page.locator(autoLoupeID)).toBeVisible();
  await expect(
    page.locator(toTreeRowSelectorID('Araneae') + '.selection')
  ).toBeVisible();
  await expect(
    page.locator(toTreeRowSelectorID('Arachnida') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toTreeRowSelectorID('Arachnida'))).toBeVisible();

  // Browse 'Arachnida' via taxon tree link.

  await page.click(toTreeRowNameID('Arachnida'));
  await expect(page.locator(browseTaxaDialogID)).toBeVisible();

  // Verify ancestors shown for 'Arachnida'.

  await expect(page.locator(toAncestorRowNameID('Araneae'))).not.toBeVisible();
  await expect(
    page.locator(toAncestorRowSelectorID('Arachnida') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toAncestorRowSelectorID('Arachnida'))).toBeVisible();
  await expect(
    page.locator(toAncestorRowNameID('Arachnida') + '.clickable')
  ).not.toBeVisible();
  await expect(
    page.locator(toAncestorRowSelectorID('Arthropoda') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toAncestorRowSelectorID('Arthropoda'))).toBeVisible();
  await expect(
    page.locator(toAncestorRowNameID('Arthropoda') + '.clickable')
  ).toBeVisible();
  await expect(
    page.locator(toAncestorRowSelectorID('Animalia') + '.selection')
  ).not.toBeVisible();
  await expect(
    page.locator(toAncestorRowNameID('Animalia') + '.clickable')
  ).toBeVisible();

  // Verify some children of 'Arachnida'.

  await expect(
    page.locator(toChildRowSelectorID('Araneae') + '.selection')
  ).toBeVisible();
  await expect(page.locator(toChildRowNameID('Araneae') + '.clickable')).toBeVisible();
  await expect(
    page.locator(toChildRowSelectorID('Ixodida') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toChildRowNameID('Ixodida') + '.clickable')).toBeVisible();

  await page.locator(closeButtonID).click();
});

test('selecting children via the taxon browser', async ({ page }) => {
  await page.goto(URL);
  const main = page.locator('main');
});

test('selecting ancestors via the taxon browser', async ({ page }) => {
  await page.goto(URL);
  const main = page.locator('main');
});

test('removing children via the taxon browser', async ({ page }) => {
  await page.goto(URL);
  const main = page.locator('main');
});

test('removing ancestors via the taxon browser', async ({ page }) => {
  await page.goto(URL);
  const main = page.locator('main');
});

test('navigating to children and selecting in taxon browser', async ({ page }) => {
  await page.goto(URL);
  const main = page.locator('main');
});

test('navigating to parents and selecting in taxon browser', async ({ page }) => {
  await page.goto(URL);
  const main = page.locator('main');
});

test("inability to select 'Animalia' via taxon browser", async ({ page }) => {
  await page.goto(URL);
  const main = page.locator('main');
});

test('select-all for no children selected', async ({ page }) => {
  await page.goto(URL);
  const main = page.locator('main');
});

test('select-all for all children selected', async ({ page }) => {
  await page.goto(URL);
  const main = page.locator('main');
});

test('select-all for some children selected', async ({ page }) => {
  await page.goto(URL);
  const main = page.locator('main');
});

test('deseelect-all for all children selected', async ({ page }) => {
  await page.goto(URL);
  const main = page.locator('main');
});

test('deselect-all for no children selected', async ({ page }) => {
  await page.goto(URL);
  const main = page.locator('main');
});

test('deselect-all for some children selected', async ({ page }) => {
  await page.goto(URL);
  const main = page.locator('main');
});
