import { test, expect } from '@playwright/test';

const autocompleteInput = '.autocomplete-input';
const autocompleteList = '.autocomplete-list';
const autocompleteListItem = '.autocomplete-list-item';

test('test for initial state', async ({ page }) => {
  await page.goto('http://localhost/taxa');

  const title = page.locator('.tab_title');
  await expect(title).toContainText('Selected Taxa');

  const mainText = page.locator('main');
  await expect(mainText).toContainText('No taxa selected');

  const initialInput = await page.inputValue(autocompleteInput);
  expect(initialInput).toBeFalsy();
});

test('test for more and more specific autocomplete', async ({ page }) => {
  await page.goto('http://localhost/taxa');

  await page.fill(autocompleteInput, 'a');
  let list = page.locator(autocompleteList);
  await expect(list).not.toBeVisible();

  await page.fill(autocompleteInput, 'ar');
  await expect(list).toBeVisible();

  await expect(list).toContainText('Arachnida');
  await expect(list).toContainText('paraconcinna');
  await expect(list).toContainText('Pardosa');

  await page.fill(autocompleteInput, 'ara');
  await expect(list).toContainText('Arachnida');
  await expect(list).toContainText('paraconcinna');
  await expect(list).not.toContainText('Pardosa');

  await page.fill(autocompleteInput, 'arac');
  await expect(list).toContainText('Arachnida');
  await expect(list).toContainText('paraconcinna');
  await expect(list).not.toContainText('Pardosa');

  await page.fill(autocompleteInput, 'arachnida');
  await expect(list).toContainText('Arachnida');
  let items = page.locator(autocompleteListItem);
  await expect(items).toHaveCount(1);
});
