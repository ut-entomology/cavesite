import { test, expect } from '@playwright/test';

test('basic test', async ({ page }) => {
  await page.goto('http://localhost/taxa');
  const title = page.locator('.tab_title');
  await expect(title).toHaveText('Selected Taxa');
});
