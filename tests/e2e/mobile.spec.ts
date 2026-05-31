import { expect, test } from '@playwright/test';

test('main menu does not require page scroll on iPhone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    window.localStorage.setItem('sl.meta', JSON.stringify({ seenPrologue: true }));
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: /new run/i })).toBeVisible();
  const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  const innerHeight = await page.evaluate(() => window.innerHeight);
  expect(scrollHeight).toBeLessThanOrEqual(innerHeight + 2);
});
