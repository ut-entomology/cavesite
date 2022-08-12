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
  await expect(title).toContainText('Collecting Predictions');

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

  await page.click(clusterButtonID);
  await expect(page.locator(dialogID)).toContainText('Configure Cave Clusters');
  await page.click(submitButtonID);

  const main = page.locator('main');
  await expect(main).toContainText('Overall Accuracy');
  await expect(main).toContainText('Accuracy Summary');
  await expect(main).toContainText('Predicted additional species');
  await expect(main).toContainText('Caves with too few visits');
  await expect(main).toContainText('Frequency of taxa found in this cluster');
});
