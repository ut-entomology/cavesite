import { test, expect } from '@playwright/test';

const URL = 'http://localhost/locations';
const NO_LOCATIONS_SELECTED = 'No locations selected';

const browseLocationsButtonID = 'button:has-text("Browse")';
const browseLocationsDialogID = '.tree-browser-content';
const clearLocationsButtonID = 'button:has-text("Clear")';
const noticeContainerID = '.notice-container';
const confirmClearLocationsButtonID = `${noticeContainerID} ${clearLocationsButtonID}`;
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
  await expect(title).toContainText('Selected Locations');

  const main = page.locator('main');
  await expect(main).toContainText(NO_LOCATIONS_SELECTED);

  const initialInput = await page.inputValue(autocompleteInputID);
  expect(initialInput).toBeFalsy();
  await expect(page.locator(autoSelectorID)).not.toBeVisible();
  await expect(page.locator(autoLoupeID)).not.toBeVisible();
  await expect(page.locator(autocompleteClearButton)).not.toBeVisible();

  await expect(page.locator(clearLocationsButtonID)).not.toBeVisible();
});

test('test increasingly specific autocomplete', async ({ page }) => {
  await page.goto(URL);

  await page.fill(autocompleteInputID, 'w');
  let list = page.locator(autocompleteListID);
  await expect(list).not.toBeVisible();
  await expect(page.locator(autoSelectorID)).not.toBeVisible();
  await expect(page.locator(autoLoupeID)).not.toBeVisible();
  await expect(page.locator(autocompleteClearButton)).toBeVisible();

  await page.fill(autocompleteInputID, 'wh');
  await expect(list).toBeVisible();
  await expect(list).toContainText('Wheat Cave');
  await expect(list).toContainText('Arrowhead Cave');
  await expect(list).toContainText('Whirlpool Cave');
  await expect(page.locator(autoSelectorID)).not.toBeVisible();
  await expect(page.locator(autoLoupeID)).not.toBeVisible();

  await page.fill(autocompleteInputID, 'whe');
  await expect(list).toContainText('Wheat Cave');
  await expect(list).toContainText('Arrowhead Cave');
  await expect(list).not.toContainText('Whirlpool Cave');
  await expect(page.locator(autoSelectorID)).not.toBeVisible();
  await expect(page.locator(autoLoupeID)).not.toBeVisible();

  await page.fill(autocompleteInputID, 'wheat');
  await expect(list).toContainText('Wheat Cave (Edwards County)');
  let items = page.locator(autocompleteListItemID);
  await expect(items).toHaveCount(1);
  await expect(page.locator(autoSelectorID)).not.toBeVisible();
  await expect(page.locator(autoLoupeID)).not.toBeVisible();
  await expect(page.locator(autocompleteClearButton)).toBeVisible();

  await page.fill(autocompleteInputID, 'wheat cave');
  await expect(list).toContainText('Wheat Cave (Edwards County)');
  await expect(page.locator(autoSelectorID)).toBeVisible();
  await expect(page.locator(autoLoupeID)).toBeVisible();
  await expect(page.locator(autocompleteClearButton)).toBeVisible();

  const main = page.locator('main');
  await expect(main).toContainText(NO_LOCATIONS_SELECTED);
  await expect(page.locator(clearLocationsButtonID)).not.toBeVisible();
});

test('absence of controls for duplicate location names', async ({ page }) => {
  await page.goto(URL);

  await page.fill(autocompleteInputID, 'cricket cave');
  let list = page.locator(autocompleteListID);
  await expect(list).toContainText('Cricket Cave (Kendall County)');
  await expect(list).toContainText('Cricket Cave (Williamson County)');
  await expect(page.locator(autoSelectorID)).not.toBeVisible();
  await expect(page.locator(autoLoupeID)).not.toBeVisible();
  await expect(page.locator(autocompleteClearButton)).toBeVisible();
});

test("inability to select 'North America' via autocomplete", async ({ page }) => {
  await page.goto(URL);
  await page.fill(autocompleteInputID, 'north america');
  let list = page.locator(autocompleteListID);
  await expect(list).toBeVisible();
  await expect(list).toContainText('No results found');
  await expect(page.locator(autoSelectorID)).not.toBeVisible();
  await expect(page.locator(autoLoupeID)).not.toBeVisible();
});

test("inability to select 'United States' via autocomplete", async ({ page }) => {
  await page.goto(URL);
  await page.fill(autocompleteInputID, 'united states');
  let list = page.locator(autocompleteListID);
  await expect(list).toBeVisible();
  await expect(list).toContainText('No results found');
  await expect(page.locator(autoSelectorID)).not.toBeVisible();
  await expect(page.locator(autoLoupeID)).not.toBeVisible();
});

test("inability to select 'Texas' via autocomplete", async ({ page }) => {
  await page.goto(URL);
  await page.fill(autocompleteInputID, 'texas');
  let list = page.locator(autocompleteListID);
  await expect(list).toBeVisible();
  await expect(list).toContainText('Texas Department of Transportation');
  await expect(page.locator(autoSelectorID)).not.toBeVisible();
  await expect(page.locator(autoLoupeID)).not.toBeVisible();
});

test('adding, removing, and clearing via autocomplete controls', async ({ page }) => {
  await page.goto(URL);
  const main = page.locator('main');

  // Add 'amber cave' via the autocompletion box

  await page.fill(autocompleteInputID, 'amber cave');
  await expect(page.locator(autoSelectorID)).toBeVisible();
  await expect(page.locator(autoSelectorID + '.selection')).not.toBeVisible();
  await expect(page.locator(autoLoupeID)).toBeVisible();
  await page.click(autoSelectorID);
  await expect(page.locator(autoSelectorID + '.selection')).toBeVisible();
  await expect(page.locator(autoLoupeID)).toBeVisible();
  await expect(main).not.toContainText('Texas');
  await expect(page.locator(toTreeRowNameID('Travis County'))).toBeVisible();
  expect(await page.inputValue(autocompleteInputID)).toEqual('amber cave');
  await expect(page.locator(autocompleteClearButton)).toBeVisible();
  await expect(page.locator(clearLocationsButtonID)).toBeVisible();

  // Remove 'amber cave' via the autocompletion box.

  await page.click(autoSelectorID);
  await expect(page.locator(autoSelectorID + '.selection')).not.toBeVisible();
  await expect(page.locator(autoSelectorID)).toBeVisible();
  await expect(page.locator(autoLoupeID)).toBeVisible();
  expect(await page.inputValue(autocompleteInputID)).toEqual('amber cave');
  await expect(page.locator(autocompleteClearButton)).toBeVisible();
  await expect(main).toContainText(NO_LOCATIONS_SELECTED);
  await expect(page.locator(clearLocationsButtonID)).not.toBeVisible();

  // Clear the remaining autocomplete value.

  await page.click(autocompleteClearButton);
  await expect(page.locator(autoSelectorID)).not.toBeVisible();
  await expect(page.locator(autoLoupeID)).not.toBeVisible();
  await expect(page.locator(autocompleteClearButton)).not.toBeVisible();
  expect(await page.inputValue(autocompleteInputID)).toBeFalsy();
});

test('clears taxon selections tree on confirmation', async ({ page }) => {
  await page.goto(URL);
  const main = page.locator('main');

  // Add 'Amber Cave' via the autocompletion box.

  await page.fill(autocompleteInputID, 'amber cave');
  await page.click(toAutoListItemID('Amber Cave'));
  await page.click(autoSelectorID);
  await expect(page.locator(toTreeRowNameID('Amber Cave'))).toBeVisible();

  // Open the clear locations confirmation dialog.

  await expect(page.locator(noticeContainerID)).not.toBeVisible();
  await page.click(clearLocationsButtonID);
  await expect(page.locator(noticeContainerID)).toContainText('CAUTION');

  // First cancel clearing selections.

  await page.click(cancelButtonID);
  await expect(page.locator(noticeContainerID)).not.toBeVisible();
  await expect(page.locator(toTreeRowNameID('Amber Cave'))).toBeVisible();

  // Then do it again, this time confirming clearing selections.

  await page.click(clearLocationsButtonID);
  await page.click(confirmClearLocationsButtonID);
  await expect(main).not.toContainText('CAUTION');
  await expect(page.locator(toTreeRowNameID('Travis County'))).not.toBeVisible();
  await expect(page.locator(toTreeRowNameID('Amber Cave'))).not.toBeVisible();
  await expect(main).toContainText(NO_LOCATIONS_SELECTED);

  const initialInput = await page.inputValue(autocompleteInputID);
  expect(initialInput).toBeFalsy();
  await expect(page.locator(autoSelectorID)).not.toBeVisible();
  await expect(page.locator(autoLoupeID)).not.toBeVisible();
  await expect(page.locator(autocompleteClearButton)).not.toBeVisible();
});

test('interaction of autocompletion box and location tree', async ({ page }) => {
  await page.goto(URL);
  const main = page.locator('main');

  // Add taxon via autocompletion box and remove via taxon tree.

  await page.fill(autocompleteInputID, 'amber cave');
  await page.click(autoSelectorID);
  await page.click(toTreeRowSelectorID('Amber Cave'));
  // tree operations clear box in order to simplify the code
  await expect(page.locator(autoSelectorID)).not.toBeVisible();
  await expect(page.locator(autoLoupeID)).not.toBeVisible();
  await expect(main).toContainText(NO_LOCATIONS_SELECTED);

  // Add multiple locations via the autocompletion box and check for proper
  // autocompletion controls for each added location.

  await page.fill(autocompleteInputID, 'amber cave');
  await page.click(toAutoListItemID('Amber Cave'));
  await page.click(autoSelectorID);
  await page.fill(autocompleteInputID, 'apache');
  await page.click(toAutoListItemID('Apache Cave'));
  await page.click(autoSelectorID);
  await page.fill(autocompleteInputID, 'blanco');
  await page.click(toAutoListItemID('Blanco County'));
  await page.click(autoSelectorID);

  await expect(page.locator(toTreeRowSelectorID('Travis County'))).toBeVisible();
  await expect(
    page.locator(toTreeRowSelectorID('Travis County') + '.selection')
  ).not.toBeVisible();
  await page.fill(autocompleteInputID, 'travis county');
  await page.click(toAutoListItemID('Travis County'));
  await expect(page.locator(autoSelectorID)).toBeVisible();
  await expect(page.locator(autoSelectorID + '.selection')).not.toBeVisible();
  await expect(page.locator(autoLoupeID)).toBeVisible();

  await expect(page.locator(toTreeRowSelectorID('Amber Cave'))).toBeVisible();
  await expect(
    page.locator(toTreeRowSelectorID('Amber Cave') + '.selection')
  ).toBeVisible();
  await page.fill(autocompleteInputID, 'amber cave');
  await page.click(toAutoListItemID('Amber Cave'));
  await expect(page.locator(autoSelectorID + '.selection')).toBeVisible();
  await expect(page.locator(autoLoupeID)).toBeVisible();

  await expect(page.locator(toTreeRowSelectorID('Blanco County'))).toBeVisible();
  await expect(
    page.locator(toTreeRowSelectorID('Blanco County') + '.selection')
  ).toBeVisible();
  await page.fill(autocompleteInputID, 'blanco county');
  await page.click(toAutoListItemID('Blanco County'));
  await expect(page.locator(autoSelectorID + '.selection')).toBeVisible();
  await expect(page.locator(autoLoupeID)).toBeVisible();

  await expect(page.locator(toTreeRowSelectorID('Williamson County'))).toBeVisible();
  await expect(
    page.locator(toTreeRowSelectorID('Williamson County') + '.selection')
  ).not.toBeVisible();
  await page.fill(autocompleteInputID, 'williamson county');
  await page.click(toAutoListItemID('Williamson County'));
  await expect(page.locator(autoSelectorID)).toBeVisible();
  await expect(page.locator(autoSelectorID + '.selection')).not.toBeVisible();
  await expect(page.locator(autoLoupeID)).toBeVisible();

  await expect(page.locator(toTreeRowSelectorID('Apache Cave'))).toBeVisible();
  await expect(
    page.locator(toTreeRowSelectorID('Apache Cave') + '.selection')
  ).toBeVisible();
  await page.fill(autocompleteInputID, 'apache cave');
  await page.click(toAutoListItemID('Apache Cave'));
  await expect(page.locator(autoSelectorID + '.selection')).toBeVisible();
  await expect(page.locator(autoLoupeID)).toBeVisible();

  // Add 'Travis County' to selections via the taxon tree.

  await page.click(toTreeRowSelectorID('Travis County'));
  await expect(page.locator(toTreeRowSelectorID('Amber Cave'))).not.toBeVisible();
  await expect(
    page.locator(toTreeRowSelectorID('Travis County') + '.selection')
  ).toBeVisible();

  let input = await page.inputValue(autocompleteInputID);
  expect(input).toBeFalsy();
  await expect(page.locator(autoSelectorID)).not.toBeVisible();
  await expect(page.locator(autoLoupeID)).not.toBeVisible();
  await expect(page.locator(autocompleteClearButton)).not.toBeVisible();

  await page.fill(autocompleteInputID, 'travis county');
  await page.click(toAutoListItemID('Travis County'));
  await expect(page.locator(autoSelectorID + '.selection')).toBeVisible();
  await expect(page.locator(autoLoupeID)).toBeVisible();

  // Remove 'Travis County' from the selections tree.

  await page.click(toTreeRowSelectorID('Travis County'));
  await expect(page.locator(toTreeRowSelectorID('Travis County'))).not.toBeVisible();
  await expect(page.locator(toTreeRowSelectorID('Amber Cave'))).not.toBeVisible();
  await expect(
    page.locator(toTreeRowSelectorID('Blanco County') + '.selection')
  ).toBeVisible();
  await expect(page.locator(toTreeRowSelectorID('Williamson County'))).toBeVisible();
  await expect(
    page.locator(toTreeRowSelectorID('Williamson County') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toTreeRowSelectorID('Apache Cave'))).toBeVisible();

  input = await page.inputValue(autocompleteInputID);
  expect(input).toBeFalsy();
  await expect(page.locator(autoSelectorID)).not.toBeVisible();
  await expect(page.locator(autoLoupeID)).not.toBeVisible();
  await expect(page.locator(autocompleteClearButton)).not.toBeVisible();
});

test('removing county from location tree removes location tree', async ({ page }) => {
  await page.goto(URL);
  const main = page.locator('main');

  await page.fill(autocompleteInputID, 'travis county');
  await page.click(toAutoListItemID('Travis County'));
  await page.click(autoSelectorID);
  await page.fill(autocompleteInputID, 'blanco county');
  await page.click(toAutoListItemID('Blanco County'));
  await page.click(autoSelectorID);

  await page.locator(toTreeRowSelectorID('Travis County')).click();
  await page.locator(toTreeRowSelectorID('Blanco County')).click();

  await expect(page.locator(toTreeRowSelectorID('Travis County'))).not.toBeVisible();
  await expect(page.locator(toTreeRowSelectorID('Blanco County'))).not.toBeVisible();
  await expect(main).toContainText(NO_LOCATIONS_SELECTED);
});

test('removing only nested selection eliminates taxon tree', async ({ page }) => {
  await page.goto(URL);
  const main = page.locator('main');

  // Add 'Amber Cave' via the autocompletion box.

  await page.fill(autocompleteInputID, 'amber cave');
  await page.click(toAutoListItemID('Amber Cave'));
  await page.click(autoSelectorID);

  await expect(
    page.locator(toTreeRowSelectorID('Travis County') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toTreeRowSelectorID('Travis County'))).toBeVisible();

  await expect(
    page.locator(toTreeRowSelectorID('Amber Cave') + '.selection')
  ).toBeVisible();

  // Remove 'Amber Cave' via the autocompletion box.

  await page.click(autoSelectorID);
  await expect(page.locator(toTreeRowSelectorID('Travis County'))).not.toBeVisible();
  await expect(page.locator(toTreeRowSelectorID('Amber Cave'))).not.toBeVisible();
  await expect(main).toContainText(NO_LOCATIONS_SELECTED);

  // Re-add 'Amber Cave' and remove via the taxon tree.

  await page.click(autoSelectorID);
  await expect(
    page.locator(toTreeRowSelectorID('Amber Cave') + '.selection')
  ).toBeVisible();
  await expect(main).not.toContainText(NO_LOCATIONS_SELECTED);

  await page.click(toTreeRowSelectorID('Amber Cave'));
  await expect(page.locator(toTreeRowSelectorID('Amber Cave'))).not.toBeVisible();
  await expect(main).toContainText(NO_LOCATIONS_SELECTED);
});

test('opening and closing location browser via autocompletion', async ({ page }) => {
  await page.goto(URL);

  // Enter 'Travis County' into the autocompletion box and browse via the loupe.

  await page.fill(autocompleteInputID, 'travis county');
  await page.click(toAutoListItemID('Travis County'));
  await expect(page.locator(toTreeRowNameID('Travis County'))).not.toBeVisible();
  await expect(page.locator(browseLocationsDialogID)).not.toBeVisible();
  await page.click(autoLoupeID);
  await expect(page.locator(browseLocationsDialogID)).toBeVisible();

  // Verify ancestors shown for 'Travis County'.

  await expect(
    page.locator(toAncestorRowSelectorID('Travis County') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toAncestorRowSelectorID('Travis County'))).toBeVisible();
  await expect(
    page.locator(toAncestorRowNameID('Travis County') + '.clickable')
  ).not.toBeVisible();
  await expect(
    page.locator(toAncestorRowSelectorID('Texas') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toAncestorRowNameID('Texas') + '.clickable')).toBeVisible();
  await expect(
    page.locator(toAncestorRowSelectorID('United States'))
  ).not.toBeVisible();
  await expect(
    page.locator(toAncestorRowSelectorID('North America'))
  ).not.toBeVisible();

  // Verify some children of 'Travis County'.

  await expect(
    page.locator(toChildRowSelectorID('Amber Cave') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toChildRowSelectorID('Amber Cave'))).toBeVisible();
  await expect(
    page.locator(toChildRowNameID('Amber Cave') + '.clickable')
  ).not.toBeVisible();
  await expect(
    page.locator(toChildRowSelectorID('Whirlpool Cave') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toChildRowSelectorID('Whirlpool Cave'))).toBeVisible();
  await expect(
    page.locator(toChildRowNameID('Whirlpool Cave') + '.clickable')
  ).not.toBeVisible();

  // Close location browser and confirm nothing has changed.

  await page.locator(closeButtonID).click();
  await expect(page.locator(browseLocationsDialogID)).not.toBeVisible();
  expect(await page.inputValue(autocompleteInputID)).toEqual('Travis County');
  await expect(page.locator(autocompleteClearButton)).toBeVisible();
  await expect(page.locator(autoSelectorID + '.selection')).not.toBeVisible();
  await expect(page.locator(autoSelectorID)).toBeVisible();
  await expect(page.locator(autoLoupeID)).toBeVisible();
  await expect(page.locator(toTreeRowNameID('Travis County'))).not.toBeVisible();
});

test('opening and closing location browser via tab button', async ({ page }) => {
  await page.goto(URL);
  await page.click(browseLocationsButtonID);
  await expect(page.locator(browseLocationsDialogID)).toBeVisible();

  await expect(
    page.locator(toAncestorRowSelectorID('Texas') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toAncestorRowSelectorID('Texas'))).not.toBeVisible();
  await expect(page.locator(toAncestorRowNameID('Texas'))).toBeVisible();
  await expect(
    page.locator(toAncestorRowNameID('Texas') + '.clickable')
  ).not.toBeVisible();

  await expect(page.locator(toChildRowSelectorID('Travis County'))).toBeVisible();
  await expect(
    page.locator(toChildRowNameID('Travis County') + '.clickable')
  ).toBeVisible();
  await expect(page.locator(toChildRowSelectorID('Blanco County'))).toBeVisible();
  await expect(
    page.locator(toChildRowNameID('Blanco County') + '.clickable')
  ).toBeVisible();

  await page.locator(closeButtonID).click();
  await expect(page.locator(browseLocationsDialogID)).not.toBeVisible();
});

test('opening and closing location browser via selection tree links', async ({
  page
}) => {
  await page.goto(URL);

  // Add 'Travis County' to selections.

  await page.fill(autocompleteInputID, 'travis county');
  await page.click(autoSelectorID);
  await expect(
    page.locator(toTreeRowSelectorID('Travis County') + '.selection')
  ).toBeVisible();

  // Browse 'Travis County' via taxon tree link.

  await expect(page.locator(browseLocationsDialogID)).not.toBeVisible();
  await page.click(toTreeRowNameID('Travis County'));
  await expect(page.locator(browseLocationsDialogID)).toBeVisible();

  // Verify ancestors shown for 'Travis County'.

  await expect(page.locator(toAncestorRowNameID('Texas'))).toBeVisible();
  await expect(page.locator(toAncestorRowSelectorID('Texas'))).not.toBeVisible();
  await expect(page.locator(toAncestorRowNameID('Texas') + '.clickable')).toBeVisible();
  await expect(page.locator(toAncestorRowNameID('United States'))).not.toBeVisible();
  await expect(page.locator(toAncestorRowNameID('North America'))).not.toBeVisible();

  // Verify some children of 'Travis County'.

  await expect(page.locator(toChildRowSelectorID('Amber Cave'))).toBeVisible();
  await expect(
    page.locator(toChildRowSelectorID('Amber Cave') + '.selection')
  ).toBeVisible();
  await expect(
    page.locator(toChildRowNameID('Amber Cave') + '.clickable')
  ).not.toBeVisible();
  await expect(page.locator(toChildRowSelectorID('Whirlpool Cave'))).toBeVisible();
  await expect(
    page.locator(toChildRowSelectorID('Whirlpool Cave') + '.selection')
  ).toBeVisible();
  await expect(
    page.locator(toChildRowNameID('Whirlpool Cave') + '.clickable')
  ).not.toBeVisible();

  // Close location browser and confirm nothing has changed.

  await page.locator(closeButtonID).click();
  await expect(page.locator(browseLocationsDialogID)).not.toBeVisible();
  expect(await page.inputValue(autocompleteInputID)).toEqual('travis county');
  await expect(page.locator(autocompleteClearButton)).toBeVisible();
  await expect(page.locator(autoSelectorID + '.selection')).toBeVisible();
  await expect(page.locator(autoLoupeID)).toBeVisible();
  await expect(
    page.locator(toTreeRowSelectorID('Travis County') + '.selection')
  ).toBeVisible();
});

test('navigating to children and selecting via the taxon browser', async ({ page }) => {
  await page.goto(URL);

  // Enter 'Araneae' into the autocompletion box and browse via the loupe.

  await page.click(browseLocationsButtonID);
  await expect(page.locator(browseLocationsDialogID)).toBeVisible();

  await expect(page.locator(toAncestorRowNameID('Texas'))).toBeVisible();
  await expect(page.locator(toAncestorRowSelectorID('Texas'))).not.toBeVisible();
  await expect(
    page.locator(toAncestorRowNameID('Texas') + '.clickable')
  ).not.toBeVisible();
  await expect(page.locator(toAncestorRowNameID('United States'))).not.toBeVisible();
  await expect(page.locator(toAncestorRowNameID('North America'))).not.toBeVisible();

  // Click the child 'Travis County' to browse there.

  await page.click(toChildRowNameID('Travis County'));

  await expect(page.locator(toAncestorRowNameID('Texas'))).toBeVisible();
  await expect(page.locator(toAncestorRowSelectorID('Texas'))).not.toBeVisible();
  await expect(page.locator(toAncestorRowNameID('Texas') + '.clickable')).toBeVisible();

  await expect(page.locator(toChildRowSelectorID('Amber Cave'))).toBeVisible();
  await expect(
    page.locator(toChildRowSelectorID('Amber Cave') + '.selection')
  ).not.toBeVisible();
  await expect(
    page.locator(toChildRowNameID('Amber Cave') + '.clickable')
  ).not.toBeVisible();
  await expect(page.locator(toChildRowSelectorID('Whirlpool Cave'))).toBeVisible();
  await expect(
    page.locator(toChildRowSelectorID('Whirlpool Cave') + '.selection')
  ).not.toBeVisible();
  await expect(
    page.locator(toChildRowNameID('Whirlpool Cave') + '.clickable')
  ).not.toBeVisible();

  // Verify inability to browse to a locality name.

  await page.click(toChildRowNameID('Whirlpool Cave'));
  await expect(page.locator(toChildRowNameID('Whirlpool Cave'))).toBeVisible();

  // Add 'Whirlpool Cave' to the selected taxa.

  await expect(
    page.locator(toChildRowSelectorID('Whirlpool Cave') + '.selection')
  ).not.toBeVisible();
  await page.click(toChildRowSelectorID('Whirlpool Cave'));
  await expect(
    page.locator(toChildRowSelectorID('Whirlpool Cave') + '.selection')
  ).toBeVisible();

  // Close the taxon browser and check the taxon tree.

  await page.click(closeButtonID);
  await expect(page.locator(browseLocationsDialogID)).not.toBeVisible();
  await expect(
    page.locator(toTreeRowSelectorID('Whirlpool Cave') + '.selection')
  ).toBeVisible();
  await expect(
    page.locator(toTreeRowSelectorID('Whirlpool Cave') + '.clickable')
  ).not.toBeVisible();
  await expect(
    page.locator(toTreeRowSelectorID('Travis County') + '.selection')
  ).not.toBeVisible();
  await expect(page.locator(toTreeRowSelectorID('Travis County'))).toBeVisible();
});

test('navigating to ancestors and selecting via the taxon browser', async ({
  page
}) => {
  await page.goto(URL);

  // Enter 'amber cave' into the autocompletion box and browse via the loupe.

  await page.fill(autocompleteInputID, 'amber cave');
  await page.click(autoLoupeID);
  await expect(page.locator(browseLocationsDialogID)).toBeVisible();

  await expect(page.locator(toAncestorRowNameID('Texas') + '.clickable')).toBeVisible();
  await expect(
    page.locator(toAncestorRowNameID('Travis County') + '.clickable')
  ).not.toBeVisible();

  // Click the ancestor 'Texas' to browse there.

  await page.click(toAncestorRowNameID('Texas'));

  await expect(page.locator(toChildRowSelectorID('Travis County'))).toBeVisible();

  await expect(page.locator(toAncestorRowNameID('Texas'))).toBeVisible();
  await expect(page.locator(toAncestorRowSelectorID('Texas'))).not.toBeVisible();

  // Traverse into 'Blanco County'.

  await page.click(toChildRowSelectorID('Blanco County'));
  // TODO: Next line hangs.
  await expect(page.locator(toChildRowSelectorID('Trash Cave'))).toBeVisible();

  // Add 'Blanco Coounty' to the selected locations via the ancestor selector.

  await page.click(toAncestorRowSelectorID('Blanco County'));

  await expect(
    page.locator(toAncestorRowSelectorID('Blanco County') + '.selection')
  ).toBeVisible();
  await expect(
    page.locator(toAncestorRowNameID('Blanco County') + '.clickable')
  ).not.toBeVisible();

  await expect(page.locator(toAncestorRowSelectorID('Texas'))).not.toBeVisible();
  await expect(
    page.locator(toAncestorRowNameID('Texas') + '.clickable')
  ).not.toBeVisible();

  await expect(
    page.locator(toChildRowSelectorID('Trash Cave') + '.selection')
  ).toBeVisible();
  await expect(
    page.locator(toChildRowSelectorID('Winkler Bat Cave') + '.selection')
  ).toBeVisible();

  // Close the location browser and check the location tree.

  await page.click(closeButtonID);
  await expect(page.locator(browseLocationsDialogID)).not.toBeVisible();
  await expect(
    page.locator(toTreeRowSelectorID('Blanco County') + '.selection')
  ).toBeVisible();
  await expect(
    page.locator(toTreeRowSelectorID('Blanco County') + '.clickable')
  ).toBeVisible();
  await expect(page.locator(toTreeRowNameID('Texas'))).not.toBeVisible();
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
  await expect(page.locator(browseLocationsDialogID)).toBeVisible();
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
  await expect(main).toContainText(NO_LOCATIONS_SELECTED);
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
  await expect(main).not.toContainText(NO_LOCATIONS_SELECTED);

  // Open browser for 'Latrodectus' via the autocompletion loupe.

  await page.fill(autocompleteInputID, 'latrodectus');
  await page.click(autoLoupeID);
  await expect(page.locator(browseLocationsDialogID)).toBeVisible();

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
  await expect(main).toContainText(NO_LOCATIONS_SELECTED);
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
  await expect(page.locator(browseLocationsDialogID)).toBeVisible();

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
  await expect(page.locator(browseLocationsDialogID)).not.toBeVisible();

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
  await expect(page.locator(browseLocationsDialogID)).toBeVisible();

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
  await expect(page.locator(browseLocationsDialogID)).not.toBeVisible();

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
  await expect(page.locator(browseLocationsDialogID)).toBeVisible();

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
  await expect(page.locator(browseLocationsDialogID)).not.toBeVisible();

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

  // Add 'Araneae' via the autocompletion box.

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
  await expect(page.locator(browseLocationsDialogID)).toBeVisible();

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
  await expect(page.locator(browseLocationsDialogID)).not.toBeVisible();

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
  await expect(page.locator(browseLocationsDialogID)).toBeVisible();

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
  await expect(page.locator(browseLocationsDialogID)).not.toBeVisible();

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
  await expect(page.locator(browseLocationsDialogID)).toBeVisible();

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
  await expect(page.locator(browseLocationsDialogID)).not.toBeVisible();

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
  await expect(page.locator(browseLocationsDialogID)).toBeVisible();

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
  await expect(page.locator(browseLocationsDialogID)).not.toBeVisible();

  await expect(
    page.locator(toTreeRowSelectorID('order: Ixodida') + '.selection')
  ).toBeVisible();
  await expect(page.locator(toTreeRowNameID('Araneae'))).not.toBeVisible();
  await expect(page.locator(toTreeRowNameID('Agelenidae'))).not.toBeVisible();
  await expect(page.locator(toTreeRowNameID('Lycosidae'))).not.toBeVisible();
  await expect(page.locator(toTreeRowNameID('Theridiidae'))).not.toBeVisible();
});
