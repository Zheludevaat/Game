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
  await page.getByRole('button', { name: /begin as magus/i }).click();

  await expect(page.getByRole('button', { name: /^pause$/i })).toBeVisible({ timeout: 15_000 });
  const smallHudText = await page.evaluate(() => {
    const selectors = [
      '.hud-top-left .label',
      '.hud-currency-row',
      '.hud-currency-row *',
      '.hud-top-right .violet-text',
      '.hud-top-right .glow-text',
      '.hud-top-right .pixel-tag',
      '.hud-floor-label',
      '.loadout-strip',
      '.loadout-strip *',
      '.touch-buttons button',
      '.touch-cycle button',
      '.touch-pause button',
      '.hud-pause-btn',
    ].join(',');
    return Array.from(document.querySelectorAll(selectors)).flatMap((el) => {
      const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
      const rect = el.getBoundingClientRect();
      const size = parseFloat(getComputedStyle(el).fontSize || '0');
      return text && rect.width > 0 && rect.height > 0 && rect.bottom >= 0 && rect.top <= window.innerHeight && size < 10.5
        ? [{ text, size }]
        : [];
    });
  });
  expect(smallHudText).toEqual([]);

  const floorBannerBox = await page.locator('.floor-banner').evaluateAll((banners) => banners.map((banner) => {
    const rect = banner.getBoundingClientRect();
    return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
  }));
  for (const box of floorBannerBox) {
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(844);
    expect(box.top).toBeGreaterThanOrEqual(0);
    expect(box.bottom).toBeLessThanOrEqual(390);
  }

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
