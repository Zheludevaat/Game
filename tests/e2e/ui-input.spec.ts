import { expect, test } from '@playwright/test';

const readyMeta = {
  bonusMaxHp: 0,
  bonusStartingMp: 0,
  bonusEssenceGain: 0,
  cosmeticLampAura: false,
  unlockedCodex: [],
  seenPrologue: true,
  seenNewRunCinematic: true,
  bossesSeen: [],
  seenEnding: false,
  ogdoadReached: 0,
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript((meta) => {
    window.localStorage.setItem('sl.meta', JSON.stringify(meta));
    window.localStorage.removeItem('sl.resume');
    window.localStorage.removeItem('sl.runSnapshot');
  }, readyMeta);
});

test('settings controls keep native pointer and keyboard input', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: /settings/i })).toBeVisible();
  await page.getByRole('button', { name: /settings/i }).click();
  await expect(page.getByText('Music Volume')).toBeVisible();

  const musicSlider = page.locator('.settings-row input[type="range"]').first();
  const beforeSlider = Number(await musicSlider.inputValue());
  await musicSlider.focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(async () => Number(await musicSlider.inputValue())).toBeGreaterThan(beforeSlider);

  const toggle = page.locator('.toggle').first();
  const beforeToggle = await toggle.getAttribute('aria-pressed');
  await toggle.click();
  await expect(toggle).not.toHaveAttribute('aria-pressed', beforeToggle ?? '');

  const scaleValue = page.locator('.settings-dropdown .settings-value');
  const beforeScale = await scaleValue.textContent();
  await page.locator('.settings-dropdown .settings-arrow').last().click();
  await expect(scaleValue).not.toHaveText(beforeScale ?? '');

  await page.getByRole('button', { name: /^back$/i }).click();
  await expect(page.getByRole('button', { name: /new run/i })).toBeVisible();
});

test('touch HUD controls can open pause and settings in a phone landscape viewport', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: /new run/i })).toBeVisible();
  await page.getByRole('button', { name: /new run/i }).click();

  await expect(page.locator('.archetype-card').first()).toBeVisible();
  await page.locator('.archetype-card').first().click();

  await expect(page.getByRole('button', { name: /^pause$/i })).toBeVisible({ timeout: 15_000 });
  const touchPause = page.locator('.touch-pause button[data-action="pause"]');
  if (await touchPause.count()) {
    await expect(page.locator('.touch-joystick-zone')).toBeVisible();
    await touchPause.click();
  } else {
    await page.getByRole('button', { name: /^pause$/i }).click();
  }
  await expect(page.getByRole('button', { name: /^resume$/i })).toBeVisible();

  await page.getByRole('button', { name: /^settings$/i }).click();
  await expect(page.getByText('Music Volume')).toBeVisible();
  await page.getByRole('button', { name: /^back$/i }).click();
  await expect(page.getByRole('button', { name: /^resume$/i })).toBeVisible();
});
