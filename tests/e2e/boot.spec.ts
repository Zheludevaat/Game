import { expect, test } from '@playwright/test';

test('boots to an actionable first screen without console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  await page.goto('/');
  await expect(page.locator('body')).toBeVisible();
  await page.waitForTimeout(1500);
  expect(errors).toEqual([]);
});
