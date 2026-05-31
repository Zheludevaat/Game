import { expect, test } from '@playwright/test';

test('audio showcase renders playable cue buttons', async ({ page }) => {
  await page.goto('/audio-showcase.html');
  await expect(page.getByRole('heading', { name: /audio showcase/i })).toBeVisible();
  const buttons = page.getByRole('button');
  await expect(buttons.first()).toBeVisible();
  expect(await buttons.count()).toBeGreaterThan(10);
});
