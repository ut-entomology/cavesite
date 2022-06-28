import { test, expect } from '@playwright/test';

const URL = 'http://localhost/taxa';
const NO_TAXA_SELECTED = 'No taxa selected';

const browseTaxaButtonID = 'button:has-text("Browse")';
const browseTaxaDialogID = '.tree-browser-content';
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
const selectAllButtonID = 'button:has-text("Select All")';
const deselectAllButtonID = 'button:has-text("Deselect All")';

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
  const araneidaeID =
    '.autocomplete-list-item:has-text("Araneidae (Arachnida Araneae)")';

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
  await page.click(browseTaxaButtonID);
  await expect(page.locator(browseTaxaDialogID)).toBeVisible();

  await expect(
    page.locator(toAncestorRowSelectorID('Animalia') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toAncestorRowSelectorID('Animalia'))).not.toBeVisible();
  await expect(page.locator(toAncestorRowNameID('Animalia'))).toBeVisible();
  await expect(
    page.locator(toAncestorRowNameID('Animalia') + '.clickable')
  ).not.toBeVisible();

  await expect(page.locator(toChildRowSelectorID('Arthropoda'))).toBeVisible();
  await expect(
    page.locator(toChildRowNameID('Arthropoda') + '.clickable')
  ).toBeVisible();
  await expect(page.locator(toChildRowSelectorID('Mollusca'))).toBeVisible();
  await expect(page.locator(toChildRowNameID('Mollusca') + '.clickable')).toBeVisible();

  await page.locator(closeButtonID).click();
  await expect(page.locator(browseTaxaDialogID)).not.toBeVisible();
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

test('navigating to children and selecting via the taxon browser', async ({ page }) => {
  await page.goto(URL);

  // Enter 'Araneae' into the autocompletion box and browse via the loupe.

  await page.fill(autocompleteInputID, 'Araneae');
  await page.click(autoLoupeID);
  await expect(page.locator(browseTaxaDialogID)).toBeVisible();

  await expect(
    page.locator(toChildRowNameID('Agelenidae') + '.clickable')
  ).toBeVisible();

  // Click the child 'Agelenidae' to browse there.

  await page.click(toChildRowNameID('Agelenidae'));

  await expect(page.locator(toAncestorRowNameID('Animalia'))).toBeVisible();
  await expect(page.locator(toAncestorRowSelectorID('Animalia'))).not.toBeVisible();

  await expect(page.locator(toAncestorRowNameID('Agelenidae'))).toBeVisible();
  await expect(page.locator(toAncestorRowSelectorID('Agelenidae'))).toBeVisible();
  await expect(
    page.locator(toAncestorRowNameID('Agelenidae') + '.clickable')
  ).not.toBeVisible();

  await expect(page.locator(toChildRowSelectorID('Agelenopsis'))).toBeVisible();
  await expect(
    page.locator(toChildRowNameID('Agelenopsis') + '.clickable')
  ).toBeVisible();

  // Click 'Agelenopsis' to browse there.

  await page.click(toChildRowNameID('Agelenopsis'));

  await expect(page.locator(toAncestorRowNameID('Agelenidae'))).toBeVisible();
  await expect(page.locator(toAncestorRowSelectorID('Agelenidae'))).toBeVisible();
  await expect(
    page.locator(toAncestorRowNameID('Agelenidae') + '.clickable')
  ).toBeVisible();

  await expect(page.locator(toAncestorRowNameID('Agelenopsis'))).toBeVisible();
  await expect(page.locator(toAncestorRowSelectorID('Agelenopsis'))).toBeVisible();
  await expect(
    page.locator(toAncestorRowNameID('Agelenopsis') + '.clickable')
  ).not.toBeVisible();

  await expect(page.locator(toChildRowSelectorID('Agelenopsis aperta'))).toBeVisible();
  await expect(
    page.locator(toChildRowNameID('Agelenopsis aperta') + '.clickable')
  ).not.toBeVisible();

  // Add 'Agelenopsis aperta' to the selected taxa.

  await expect(
    page.locator(toChildRowSelectorID('Agelenopsis aperta') + '.selection')
  ).not.toBeVisible();
  await page.click(toChildRowSelectorID('Agelenopsis aperta'));
  await expect(
    page.locator(toChildRowSelectorID('Agelenopsis aperta') + '.selection')
  ).toBeVisible();

  // Close the taxon browser and check the taxon tree.

  await page.click(closeButtonID);
  await expect(page.locator(browseTaxaDialogID)).not.toBeVisible();
  await expect(
    page.locator(toTreeRowSelectorID('Agelenopsis aperta') + '.selection')
  ).toBeVisible();
  await expect(
    page.locator(toTreeRowSelectorID('Agelenopsis aperta') + '.clickable')
  ).not.toBeVisible();
  await expect(
    page.locator(toTreeRowSelectorID('genus: Agelenopsis') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toTreeRowSelectorID('genus: Agelenopsis'))).toBeVisible();
});

test('navigating to ancestors and selecting via the taxon browser', async ({
  page
}) => {
  await page.goto(URL);

  // Enter 'Araneae' into the autocompletion box and browse via the loupe.

  await page.fill(autocompleteInputID, 'Araneae');
  await page.click(autoLoupeID);
  await expect(page.locator(browseTaxaDialogID)).toBeVisible();

  await expect(
    page.locator(toAncestorRowNameID('Arachnida') + '.clickable')
  ).toBeVisible();

  // Click the ancestor 'Arachnida' to browse there.

  await page.click(toAncestorRowNameID('Arachnida'));

  await expect(page.locator(toChildRowSelectorID('Araneae'))).toBeVisible();
  await expect(page.locator(toChildRowNameID('Araneae') + '.clickable')).toBeVisible();

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

  // Add 'Arthropoda' to the selected taxa via the ancestor selector.

  await page.click(toAncestorRowSelectorID('Arthropoda'));

  await expect(
    page.locator(toAncestorRowSelectorID('Arthropoda') + '.selection')
  ).toBeVisible();
  await expect(
    page.locator(toAncestorRowNameID('Arthropoda') + '.clickable')
  ).toBeVisible();

  await expect(
    page.locator(toAncestorRowSelectorID('Arachnida') + '.selection')
  ).toBeVisible();
  await expect(
    page.locator(toAncestorRowNameID('Arachnida') + '.clickable')
  ).not.toBeVisible();

  await expect(
    page.locator(toChildRowSelectorID('Araneae') + '.selection')
  ).toBeVisible();
  await expect(
    page.locator(toChildRowSelectorID('Ixodida') + '.selection')
  ).toBeVisible();

  // Close the taxon browser and check the taxon tree.

  await page.click(closeButtonID);
  await expect(page.locator(browseTaxaDialogID)).not.toBeVisible();
  await expect(
    page.locator(toTreeRowSelectorID('phylum: Arthropoda') + '.selection')
  ).toBeVisible();
  await expect(
    page.locator(toTreeRowSelectorID('phylum: Arthropoda') + '.clickable')
  ).not.toBeVisible();
  await expect(page.locator(toTreeRowNameID('class: Arachnida'))).not.toBeVisible();
});

test('removing directly selected child via the taxon browser', async ({ page }) => {
  await page.goto(URL);
  const main = page.locator('main');

  // Add 'Latrodectus' to the taxa selections via autocompletion.

  await page.fill(autocompleteInputID, 'latrodectus');
  await page.click(autoSelectorID);
  await expect(
    page.locator(toTreeRowSelectorID('genus: Latrodectus') + '.selection')
  ).toBeVisible();

  // Open 'Theridiidae' via the taxon tree.

  await page.click(toTreeRowNameID('Theridiidae'));
  await expect(page.locator(browseTaxaDialogID)).toBeVisible();
  await expect(page.locator(toAncestorRowNameID('Theridiidae'))).toBeVisible();
  await expect(
    page.locator(toChildRowSelectorID('Latrodectus') + '.selection')
  ).toBeVisible();

  // Remove 'Latrodectus' from selections via the taxon browser.

  await page.click(toChildRowSelectorID('Latrodectus'));
  await expect(
    page.locator(toChildRowSelectorID('Latrodectus') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toChildRowSelectorID('Latrodectus'))).toBeVisible();

  // Make sure it got removed from the taxon tree.

  await page.click(closeButtonID);
  await expect(main).toContainText(NO_TAXA_SELECTED);
});

test('removing directly selected ancestor via the taxon browser', async ({ page }) => {
  await page.goto(URL);
  const main = page.locator('main');

  // Add 'Araneae' to the taxa selections via autocompletion.

  await page.fill(autocompleteInputID, 'araneae');
  await page.click(autoSelectorID);
  await expect(
    page.locator(toTreeRowSelectorID('order: Araneae') + '.selection')
  ).toBeVisible();
  await expect(main).not.toContainText(NO_TAXA_SELECTED);

  // Open browser for 'Latrodectus' via the autocompletion loupe.

  await page.fill(autocompleteInputID, 'latrodectus');
  await page.click(autoLoupeID);
  await expect(page.locator(browseTaxaDialogID)).toBeVisible();

  await expect(
    page.locator(toAncestorRowSelectorID('Arachnida') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toAncestorRowNameID('Arachnida'))).toBeVisible();
  await expect(
    page.locator(toAncestorRowSelectorID('Araneae') + '.selection')
  ).toBeVisible();
  await expect(
    page.locator(toAncestorRowSelectorID('Theridiidae') + '.selection')
  ).toBeVisible();
  await expect(
    page.locator(toAncestorRowSelectorID('Latrodectus') + '.selection')
  ).toBeVisible();

  await expect(
    page.locator(toChildRowSelectorID('Latrodectus mactans') + '.selection')
  ).toBeVisible();
  await expect(page.locator(toChildRowSelectorID('Latrodectus mactans'))).toBeVisible();

  // Remove 'Araneae' from the taxa selections via an ancestor selector.

  await page.click(toAncestorRowSelectorID('Araneae'));

  await expect(
    page.locator(toAncestorRowSelectorID('Arachnida') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toAncestorRowNameID('Arachnida'))).toBeVisible();
  await expect(
    page.locator(toAncestorRowSelectorID('Araneae') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toAncestorRowNameID('Araneae'))).toBeVisible();
  await expect(
    page.locator(toAncestorRowSelectorID('Theridiidae') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toAncestorRowNameID('Theridiidae'))).toBeVisible();
  await expect(
    page.locator(toAncestorRowSelectorID('Latrodectus') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toAncestorRowNameID('Latrodectus'))).toBeVisible();

  await expect(
    page.locator(toChildRowSelectorID('Latrodectus mactans') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toChildRowSelectorID('Latrodectus mactans'))).toBeVisible();

  // Make sure it got removed from the taxon tree.

  await page.click(closeButtonID);
  await expect(main).toContainText(NO_TAXA_SELECTED);
});

test('removing indirectly selected child via the taxon browser', async ({ page }) => {
  await page.goto(URL);

  // Select 'Araneae' via the autocompletion box.

  await page.fill(autocompleteInputID, 'araneae');
  await page.click(autoSelectorID);

  await expect(
    page.locator(toTreeRowSelectorID('class: Arachnida') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toTreeRowSelectorID('class: Arachnida'))).toBeVisible();

  await expect(
    page.locator(toTreeRowSelectorID('order: Araneae') + '.selection')
  ).toBeVisible();

  await expect(page.locator(toChildRowNameID('family: Theridiidae'))).not.toBeVisible();

  // Open 'Theridiidae' via the autocompletion box.

  await page.fill(autocompleteInputID, 'Theridiidae');
  await page.click(autoLoupeID);
  await expect(page.locator(browseTaxaDialogID)).toBeVisible();

  await expect(
    page.locator(toAncestorRowSelectorID('Araneae') + '.selection')
  ).toBeVisible();
  await expect(
    page.locator(toAncestorRowSelectorID('Theridiidae') + '.selection')
  ).toBeVisible();
  await expect(
    page.locator(toChildRowSelectorID('genus: Latrodectus') + '.selection')
  ).toBeVisible();
  await expect(
    page.locator(toChildRowSelectorID('genus: Steatoda') + '.selection')
  ).toBeVisible();

  // Remove 'Latrodectus' via the taxon browser.

  await page.click(toChildRowSelectorID('Latrodectus'));

  await expect(
    page.locator(toAncestorRowSelectorID('Araneae') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toAncestorRowSelectorID('Araneae'))).toBeVisible();
  await expect(
    page.locator(toAncestorRowSelectorID('Theridiidae') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toAncestorRowSelectorID('Theridiidae'))).toBeVisible();

  await expect(
    page.locator(toChildRowSelectorID('genus: Latrodectus') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toChildRowSelectorID('Latrodectus'))).toBeVisible();
  await expect(
    page.locator(toChildRowSelectorID('genus: Steatoda') + '.selection')
  ).toBeVisible();
  await expect(
    page.locator(toChildRowSelectorID('genus: Neospintharus') + '.selection')
  ).toBeVisible();

  // Check parent 'Araneae' from taxon browser.

  await page.click(toAncestorRowNameID('Araneae'));

  await expect(
    page.locator(toAncestorRowSelectorID('Araneae') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toAncestorRowSelectorID('Araneae'))).toBeVisible();

  await expect(
    page.locator(toChildRowSelectorID('family: Theridiidae') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toChildRowSelectorID('Theridiidae'))).toBeVisible();
  await expect(
    page.locator(toChildRowSelectorID('family: Lycosidae') + '.selection')
  ).toBeVisible();
  await expect(
    page.locator(toChildRowSelectorID('family: Gnaphosidae') + '.selection')
  ).toBeVisible();

  // Check the taxon tree after closing the taxon browser.

  await page.click(closeButtonID);
  await expect(page.locator(browseTaxaDialogID)).not.toBeVisible();

  await expect(
    page.locator(toTreeRowSelectorID('genus: Latrodectus'))
  ).not.toBeVisible();
  await expect(
    page.locator(toTreeRowSelectorID('genus: Steatoda') + '.selection')
  ).toBeVisible();
  await expect(
    page.locator(toTreeRowSelectorID('genus: Neospintharus') + '.selection')
  ).toBeVisible();

  await expect(
    page.locator(toTreeRowSelectorID('family: Theridiidae') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toTreeRowSelectorID('family: Theridiidae'))).toBeVisible();
  await expect(
    page.locator(toTreeRowSelectorID('family: Lycosidae') + '.selection')
  ).toBeVisible();
  await expect(
    page.locator(toTreeRowSelectorID('family: Gnaphosidae') + '.selection')
  ).toBeVisible();

  await expect(
    page.locator(toTreeRowSelectorID('order: Araneae') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toTreeRowSelectorID('order: Araneae'))).toBeVisible();
  await expect(page.locator(toTreeRowNameID('order: Ixodida'))).not.toBeVisible();
});

test('removing indirectly selected ancestor via the taxon browser', async ({
  page
}) => {
  await page.goto(URL);

  // Select 'Araneae' via the autocompletion box.

  await page.fill(autocompleteInputID, 'araneae');
  await page.click(autoSelectorID);

  await expect(
    page.locator(toTreeRowSelectorID('class: Arachnida') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toTreeRowSelectorID('class: Arachnida'))).toBeVisible();

  await expect(
    page.locator(toTreeRowSelectorID('order: Araneae') + '.selection')
  ).toBeVisible();

  await expect(page.locator(toChildRowNameID('family: Theridiidae'))).not.toBeVisible();

  // Open 'Latrodectus' via the autocompletion box.

  await page.fill(autocompleteInputID, 'Latrodectus');
  await page.click(autoLoupeID);
  await expect(page.locator(browseTaxaDialogID)).toBeVisible();

  await expect(
    page.locator(toAncestorRowSelectorID('Arachnida') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toAncestorRowSelectorID('Arachnida'))).toBeVisible();
  await expect(
    page.locator(toAncestorRowSelectorID('Araneae') + '.selection')
  ).toBeVisible();
  await expect(
    page.locator(toAncestorRowSelectorID('Theridiidae') + '.selection')
  ).toBeVisible();
  await expect(
    page.locator(toAncestorRowSelectorID('Latrodectus') + '.selection')
  ).toBeVisible();

  await expect(
    page.locator(toChildRowSelectorID('Latrodectus hesperus') + '.selection')
  ).toBeVisible();
  await expect(
    page.locator(toChildRowSelectorID('Latrodectus mactans') + '.selection')
  ).toBeVisible();

  // Remove 'Theridiidae' from selections via ancestor selector.

  await page.click(toAncestorRowSelectorID('Theridiidae'));

  await expect(
    page.locator(toAncestorRowSelectorID('Araneae') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toAncestorRowSelectorID('Araneae'))).toBeVisible();
  await expect(
    page.locator(toAncestorRowSelectorID('Theridiidae') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toAncestorRowSelectorID('Theridiidae'))).toBeVisible();
  await expect(
    page.locator(toAncestorRowSelectorID('Latrodectus') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toAncestorRowSelectorID('Latrodectus'))).toBeVisible();

  await expect(
    page.locator(toChildRowSelectorID('Latrodectus hesperus') + '.selection')
  ).not.toBeVisible();
  await expect(
    page.locator(toChildRowSelectorID('Latrodectus hesperus'))
  ).toBeVisible();
  await expect(
    page.locator(toChildRowSelectorID('Latrodectus mactans') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toChildRowSelectorID('Latrodectus mactans'))).toBeVisible();

  // Check 'Theridiidae' to make sure its children are not selected.

  await page.click(toAncestorRowNameID('Theridiidae'));

  await expect(
    page.locator(toChildRowSelectorID('genus: Latrodectus') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toChildRowSelectorID('genus: Latrodectus'))).toBeVisible();
  await expect(
    page.locator(toChildRowSelectorID('genus: Steatoda') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toChildRowSelectorID('genus: Steatoda'))).toBeVisible();

  // Check 'Araneae' to make sure its remaining children are selected.

  await page.click(toAncestorRowNameID('Araneae'));

  await expect(
    page.locator(toAncestorRowSelectorID('Araneae') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toAncestorRowSelectorID('Araneae'))).toBeVisible();

  await expect(
    page.locator(toChildRowSelectorID('family: Theridiidae') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toChildRowSelectorID('family: Theridiidae'))).toBeVisible();
  await expect(
    page.locator(toChildRowSelectorID('family: Agelenidae') + '.selection')
  ).toBeVisible();
  await expect(
    page.locator(toChildRowSelectorID('family: Lycosidae') + '.selection')
  ).toBeVisible();

  // Check the taxon tree after closing the taxon browser.

  await page.click(closeButtonID);
  await expect(page.locator(browseTaxaDialogID)).not.toBeVisible();

  await expect(
    page.locator(toTreeRowSelectorID('Araneae') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toTreeRowSelectorID('Araneae'))).toBeVisible();

  await expect(
    page.locator(toTreeRowSelectorID('family: Theridiidae'))
  ).not.toBeVisible();
  await expect(
    page.locator(toTreeRowSelectorID('family: Agelenidae') + '.selection')
  ).toBeVisible();
  await expect(
    page.locator(toTreeRowSelectorID('family: Lycosidae') + '.selection')
  ).toBeVisible();
});

test('adding ancestor of already-selected taxa via autocompletion box', async ({
  page
}) => {
  await page.goto(URL);

  // Select two descendent taxa of 'Araneae' via the autocompletion box.

  await page.fill(autocompleteInputID, 'Latrodectus mactans');
  await page.click(autoSelectorID);
  await page.fill(autocompleteInputID, 'Lycosidae');
  await page.click(autoSelectorID);

  await expect(
    page.locator(toTreeRowSelectorID('order: Araneae') + '.selection')
  ).not.toBeVisible();
  await expect(
    page.locator(toTreeRowSelectorID('family: Lycosidae') + '.selection')
  ).toBeVisible();
  await expect(
    page.locator(toTreeRowSelectorID('family: Theridiidae') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toTreeRowSelectorID('family: Theridiidae'))).toBeVisible();
  await expect(
    page.locator(toTreeRowSelectorID('Latrodectus mactans') + '.selection')
  ).toBeVisible();

  // Add 'Araneae' via the autocompletion box.

  await page.fill(autocompleteInputID, 'Araneae');
  await page.click(autoSelectorID);

  await expect(
    page.locator(toTreeRowSelectorID('order: Araneae') + '.selection')
  ).toBeVisible();
  await expect(page.locator(toTreeRowNameID('Lycosidae'))).not.toBeVisible();
  await expect(page.locator(toTreeRowNameID('Theridiidae'))).not.toBeVisible();
  await expect(page.locator(toTreeRowNameID('Latrodectus mactans'))).not.toBeVisible();
});

test('adding ancestor of already-selected taxa via taxon browser', async ({ page }) => {
  await page.goto(URL);
  await page.goto(URL);

  // Select two descendent taxa of 'Araneae' via the autocompletion box.

  await page.fill(autocompleteInputID, 'Latrodectus mactans');
  await page.click(autoSelectorID);
  await page.fill(autocompleteInputID, 'Lycosidae');
  await page.click(autoSelectorID);

  // Open the taxon browser at 'Araneae'.

  await page.fill(autocompleteInputID, 'araneae');
  await page.click(autoLoupeID);
  await expect(page.locator(browseTaxaDialogID)).toBeVisible();

  await expect(
    page.locator(toAncestorRowSelectorID('Araneae') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toAncestorRowSelectorID('Araneae'))).toBeVisible();

  await expect(
    page.locator(toChildRowSelectorID('family: Lycosidae') + '.selection')
  ).toBeVisible();
  await expect(
    page.locator(toChildRowSelectorID('family: Theridiidae') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toChildRowSelectorID('family: Theridiidae'))).toBeVisible();

  // Add 'Araneae' via the ancestor selector.

  await page.click(toAncestorRowSelectorID('Araneae'));

  await expect(
    page.locator(toAncestorRowSelectorID('order: Araneae') + '.selection')
  ).toBeVisible();
  await expect(
    page.locator(toChildRowSelectorID('family: Lycosidae') + '.selection')
  ).toBeVisible();
  await expect(
    page.locator(toChildRowSelectorID('family: Theridiidae') + '.selection')
  ).toBeVisible();

  // Close the taxon browser and check the taxon tree.

  await page.click(closeButtonID);
  await expect(page.locator(browseTaxaDialogID)).not.toBeVisible();

  await expect(
    page.locator(toTreeRowSelectorID('order: Araneae') + '.selection')
  ).toBeVisible();
  await expect(page.locator(toTreeRowNameID('Lycosidae'))).not.toBeVisible();
  await expect(page.locator(toTreeRowNameID('Theridiidae'))).not.toBeVisible();
  await expect(page.locator(toTreeRowNameID('Latrodectus mactans'))).not.toBeVisible();
});

test('adding ancestor of already-selected taxa via taxon tree', async ({ page }) => {
  await page.goto(URL);

  // Select two descendent taxa of 'Araneae' via the autocompletion box.

  await page.fill(autocompleteInputID, 'Latrodectus mactans');
  await page.click(autoSelectorID);
  await page.fill(autocompleteInputID, 'Lycosidae');
  await page.click(autoSelectorID);

  await expect(
    page.locator(toTreeRowSelectorID('order: Araneae') + '.selection')
  ).not.toBeVisible();
  await expect(
    page.locator(toTreeRowSelectorID('family: Lycosidae') + '.selection')
  ).toBeVisible();
  await expect(
    page.locator(toTreeRowSelectorID('family: Theridiidae') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toTreeRowSelectorID('family: Theridiidae'))).toBeVisible();
  await expect(
    page.locator(toTreeRowSelectorID('Latrodectus mactans') + '.selection')
  ).toBeVisible();

  // Add 'Araneae' via the taxon tree selector.

  await page.click(toTreeRowSelectorID('Araneae'));

  await expect(
    page.locator(toTreeRowSelectorID('order: Araneae') + '.selection')
  ).toBeVisible();
  await expect(page.locator(toTreeRowNameID('Lycosidae'))).not.toBeVisible();
  await expect(page.locator(toTreeRowNameID('Theridiidae'))).not.toBeVisible();
  await expect(page.locator(toTreeRowNameID('Latrodectus mactans'))).not.toBeVisible();
});

test('select-all for no children selected', async ({ page }) => {
  await page.goto(URL);

  // Open 'Araneae'.

  await page.fill(autocompleteInputID, 'araneae');
  await page.click(autoLoupeID);
  await expect(page.locator(browseTaxaDialogID)).toBeVisible();

  await expect(
    page.locator(toAncestorRowSelectorID('Araneae') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toAncestorRowSelectorID('Araneae'))).toBeVisible();

  await expect(
    page.locator(toTreeRowSelectorID('family: Agelenidae') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toTreeRowSelectorID('family: Agelenidae'))).toBeVisible();
  await expect(
    page.locator(toTreeRowSelectorID('family: Lycosidae') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toTreeRowSelectorID('family: Lycosidae'))).toBeVisible();

  // Click 'Select All'.

  await page.click(selectAllButtonID);

  await expect(
    page.locator(toAncestorRowSelectorID('Araneae') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toAncestorRowSelectorID('Araneae'))).toBeVisible();

  await expect(
    page.locator(toChildRowSelectorID('family: Agelenidae') + '.selection')
  ).toBeVisible();
  await expect(
    page.locator(toChildRowSelectorID('family: Lycosidae') + '.selection')
  ).toBeVisible();

  // Close taxon browser and check taxon tree.

  await page.click(closeButtonID);
  await expect(page.locator(browseTaxaDialogID)).not.toBeVisible();

  await expect(
    page.locator(toTreeRowSelectorID('Araneae') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toTreeRowSelectorID('Araneae'))).toBeVisible();

  await expect(
    page.locator(toTreeRowSelectorID('family: Agelenidae') + '.selection')
  ).toBeVisible();
  await expect(
    page.locator(toTreeRowSelectorID('family: Lycosidae') + '.selection')
  ).toBeVisible();
});

test('select-all for some children selected', async ({ page }) => {
  await page.goto(URL);

  // Open 'Araneae'.

  await page.fill(autocompleteInputID, 'araneae');
  await page.click(autoLoupeID);
  await expect(page.locator(browseTaxaDialogID)).toBeVisible();

  // Individually select a few child families.

  await page.click(toChildRowSelectorID('Lycosidae'));
  await page.click(toChildRowSelectorID('Theridiidae'));

  await expect(
    page.locator(toChildRowSelectorID('family: Agelenidae') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toChildRowSelectorID('family: Agelenidae'))).toBeVisible();
  await expect(
    page.locator(toChildRowSelectorID('family: Lycosidae') + '.selection')
  ).toBeVisible();

  // Click 'Select All'.

  await page.click(selectAllButtonID);

  await expect(
    page.locator(toChildRowSelectorID('family: Agelenidae') + '.selection')
  ).toBeVisible();
  await expect(
    page.locator(toChildRowSelectorID('family: Lycosidae') + '.selection')
  ).toBeVisible();

  // Close taxon browser and check taxon tree.

  await page.click(closeButtonID);
  await expect(page.locator(browseTaxaDialogID)).not.toBeVisible();

  await expect(
    page.locator(toTreeRowSelectorID('Araneae') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toTreeRowSelectorID('Araneae'))).toBeVisible();

  await expect(
    page.locator(toTreeRowSelectorID('family: Agelenidae') + '.selection')
  ).toBeVisible();
  await expect(
    page.locator(toTreeRowSelectorID('family: Lycosidae') + '.selection')
  ).toBeVisible();
});

test('deseelect-all for all children selected', async ({ page }) => {
  await page.goto(URL);

  // Select 'Ixodida'.

  await page.fill(autocompleteInputID, 'Ixodida');
  await page.click(autoSelectorID);

  await expect(
    page.locator(toTreeRowSelectorID('order: Ixodida') + '.selection')
  ).toBeVisible();

  // Open 'Araneae'.

  await page.fill(autocompleteInputID, 'araneae');
  await page.click(autoLoupeID);
  await expect(page.locator(browseTaxaDialogID)).toBeVisible();

  // Click 'Select All'.

  await page.click(selectAllButtonID);

  await expect(
    page.locator(toAncestorRowSelectorID('Araneae') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toAncestorRowSelectorID('Araneae'))).toBeVisible();

  await expect(
    page.locator(toChildRowSelectorID('family: Agelenidae') + '.selection')
  ).toBeVisible();
  await expect(
    page.locator(toChildRowSelectorID('family: Lycosidae') + '.selection')
  ).toBeVisible();

  // Click 'Deselect All'.

  await page.click(deselectAllButtonID);

  await expect(
    page.locator(toAncestorRowSelectorID('Araneae') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toAncestorRowSelectorID('Araneae'))).toBeVisible();

  await expect(
    page.locator(toChildRowSelectorID('family: Agelenidae') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toChildRowSelectorID('family: Agelenidae'))).toBeVisible();
  await expect(
    page.locator(toChildRowSelectorID('family: Lycosidae') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toChildRowSelectorID('family: Lycosidae'))).toBeVisible();
  await expect(
    page.locator(toChildRowSelectorID('family: Theridiidae') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toChildRowSelectorID('family: Theridiidae'))).toBeVisible();

  // Close taxon browser and check taxon tree.

  await page.click(closeButtonID);
  await expect(page.locator(browseTaxaDialogID)).not.toBeVisible();

  await expect(
    page.locator(toTreeRowSelectorID('order: Ixodida') + '.selection')
  ).toBeVisible();
  await expect(page.locator(toTreeRowNameID('Araneae'))).not.toBeVisible();
  await expect(page.locator(toTreeRowNameID('Agelenidae'))).not.toBeVisible();
  await expect(page.locator(toTreeRowNameID('Lycosidae'))).not.toBeVisible();
  await expect(page.locator(toTreeRowNameID('Theridiidae'))).not.toBeVisible();
});

test('deselect-all for some children selected', async ({ page }) => {
  await page.goto(URL);

  // Select 'Ixodida'.

  await page.fill(autocompleteInputID, 'Ixodida');
  await page.click(autoSelectorID);

  await expect(
    page.locator(toTreeRowSelectorID('order: Ixodida') + '.selection')
  ).toBeVisible();

  // Open 'Araneae'.

  await page.fill(autocompleteInputID, 'araneae');
  await page.click(autoLoupeID);
  await expect(page.locator(browseTaxaDialogID)).toBeVisible();

  // Individually select a few child families.

  await page.click(toChildRowSelectorID('Lycosidae'));
  await page.click(toChildRowSelectorID('Theridiidae'));

  await expect(
    page.locator(toChildRowSelectorID('family: Agelenidae') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toChildRowSelectorID('family: Agelenidae'))).toBeVisible();
  await expect(
    page.locator(toChildRowSelectorID('family: Lycosidae') + '.selection')
  ).toBeVisible();

  // Click 'Deselect All'.

  await page.click(deselectAllButtonID);

  await expect(
    page.locator(toAncestorRowSelectorID('Araneae') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toAncestorRowSelectorID('Araneae'))).toBeVisible();

  await expect(
    page.locator(toChildRowSelectorID('family: Agelenidae') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toChildRowSelectorID('family: Agelenidae'))).toBeVisible();
  await expect(
    page.locator(toChildRowSelectorID('family: Lycosidae') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toChildRowSelectorID('family: Lycosidae'))).toBeVisible();
  await expect(
    page.locator(toChildRowSelectorID('family: Theridiidae') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toChildRowSelectorID('family: Theridiidae'))).toBeVisible();

  // Close taxon browser and check taxon tree.

  await page.click(closeButtonID);
  await expect(page.locator(browseTaxaDialogID)).not.toBeVisible();

  await expect(
    page.locator(toTreeRowSelectorID('order: Ixodida') + '.selection')
  ).toBeVisible();
  await expect(page.locator(toTreeRowNameID('Araneae'))).not.toBeVisible();
  await expect(page.locator(toTreeRowNameID('Agelenidae'))).not.toBeVisible();
  await expect(page.locator(toTreeRowNameID('Lycosidae'))).not.toBeVisible();
  await expect(page.locator(toTreeRowNameID('Theridiidae'))).not.toBeVisible();
});
