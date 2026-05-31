import { expect, test } from '@playwright/test';

test('manifest is reachable', async ({ page }) => {
  const response = await page.goto('/manifest.webmanifest');
  expect(response?.ok()).toBe(true);
});
