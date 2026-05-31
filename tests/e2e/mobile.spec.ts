import { expect, test } from '@playwright/test';

test('main menu does not require page scroll on iPhone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    window.localStorage.setItem('sl.meta', JSON.stringify({ seenPrologue: true, seenNewRunCinematic: true, unlockedCodex: [], bossesSeen: [] }));
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /abyss of the seven lamps/i })).toBeVisible();
  await expect(page.locator('.main-menu-status')).toBeVisible();
  await expect(page.getByRole('button', { name: /new run/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /^settings$/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /^guide$/i })).toBeVisible();
  const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  const innerHeight = await page.evaluate(() => window.innerHeight);
  expect(scrollHeight).toBeLessThanOrEqual(innerHeight + 2);
});

test('vessel select carousel shows one useful choice on iPhone viewport without page scroll', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    window.localStorage.setItem('sl.meta', JSON.stringify({ seenPrologue: true, seenNewRunCinematic: true, unlockedCodex: [], bossesSeen: [] }));
    window.localStorage.removeItem('sl.resume');
    window.localStorage.removeItem('sl.runSnapshot');
  });

  await page.goto('/');
  await page.getByRole('button', { name: /new run/i }).click();

  await expect(page.getByRole('heading', { name: /initiation/i })).toBeVisible();
  await expect(page.locator('.vessel-card')).toHaveCount(1);
  await expect(page.getByText('Balanced spellcaster')).toBeVisible();
  await expect(page.getByText(/Best for learning the dungeon/i)).toBeVisible();
  await expect(page.getByText(/Starting Relic/i).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /Begin as Magus/i })).toBeVisible();

  await page.keyboard.press('ArrowRight');
  await expect(page.getByText('Armored wanderer')).toBeVisible();
  await expect(page.getByRole('button', { name: /Begin as Hermit/i })).toBeVisible();
  await page.getByRole('button', { name: /Next vessel/i }).click();
  await expect(page.getByText('Fast astral striker')).toBeVisible();
  await page.getByRole('button', { name: /Previous vessel/i }).click();
  await expect(page.getByText('Armored wanderer')).toBeVisible();
  const cardBox = await page.locator('.vessel-card').boundingBox();
  expect(cardBox).not.toBeNull();
  if (cardBox) {
    await page.mouse.move(cardBox.x + cardBox.width * 0.78, cardBox.y + cardBox.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(cardBox.x + cardBox.width * 0.22, cardBox.y + cardBox.height * 0.5, { steps: 6 });
    await page.mouse.up();
  }
  await expect(page.getByText('Fast astral striker')).toBeVisible();

  const boxes = await page.locator('.vessel-card').evaluateAll((cards) => cards.map((card) => {
    const rect = card.getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right };
  }));
  for (const box of boxes) {
    expect(box.top).toBeGreaterThanOrEqual(0);
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(390);
    expect(box.bottom).toBeLessThanOrEqual(844);
  }
  const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  const innerHeight = await page.evaluate(() => window.innerHeight);
  expect(scrollHeight).toBeLessThanOrEqual(innerHeight + 2);
});

test('vessel select is landscape-first on iPhone landscape viewport', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.addInitScript(() => {
    window.localStorage.setItem('sl.meta', JSON.stringify({ seenPrologue: true, seenNewRunCinematic: true, unlockedCodex: [], bossesSeen: [] }));
    window.localStorage.removeItem('sl.resume');
    window.localStorage.removeItem('sl.runSnapshot');
  });

  await page.goto('/');
  await page.getByRole('button', { name: /new run/i }).click();

  await expect(page.locator('.vessel-card')).toHaveCount(1);
  await expect(page.locator('.vessel-stage')).toBeVisible();
  await expect(page.getByRole('button', { name: /Begin as Magus/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Previous vessel/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Next vessel/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Back$/i })).toBeVisible();

  const layout = await page.evaluate(() => {
    const card = document.querySelector('.vessel-card')?.getBoundingClientRect();
    const stage = document.querySelector('.vessel-stage')?.getBoundingClientRect();
    const copy = document.querySelector('.vessel-copy')?.getBoundingClientRect();
    const back = document.querySelector('.archetype-back')?.getBoundingClientRect();
    return {
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      card: card && { top: card.top, bottom: card.bottom, left: card.left, right: card.right, width: card.width, height: card.height },
      stage: stage && { top: stage.top, bottom: stage.bottom, left: stage.left, right: stage.right, width: stage.width, height: stage.height },
      copy: copy && { top: copy.top, bottom: copy.bottom, left: copy.left, right: copy.right, width: copy.width, height: copy.height },
      back: back && { top: back.top, bottom: back.bottom, left: back.left, right: back.right },
    };
  });

  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.innerWidth + 2);
  expect(layout.scrollHeight).toBeLessThanOrEqual(layout.innerHeight + 2);
  expect(layout.card?.top ?? -1).toBeGreaterThanOrEqual(0);
  expect(layout.card?.bottom ?? 9999).toBeLessThanOrEqual(390);
  expect(layout.stage?.right ?? 9999).toBeLessThan(layout.copy?.left ?? 0);
  expect(layout.stage?.height ?? 0).toBeGreaterThan(300);
  expect(layout.copy?.width ?? 0).toBeGreaterThan(360);
  expect(layout.back?.bottom ?? 9999).toBeLessThan(60);
  const smallText = await page.evaluate(() => {
    const selectors = '.vessel-copy *, .vessel-select-button, .archetype-back .pixel-btn';
    return Array.from(document.querySelectorAll(selectors)).flatMap((el) => {
      const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
      const rect = el.getBoundingClientRect();
      const size = parseFloat(getComputedStyle(el).fontSize || '0');
      return text && rect.width > 0 && rect.height > 0 && rect.bottom >= 0 && rect.top <= window.innerHeight && size < 10.5
        ? [{ text, size }]
        : [];
    });
  });
  expect(smallText).toEqual([]);

  await page.keyboard.press('ArrowRight');
  await expect(page.getByText('Armored wanderer')).toBeVisible();
  await page.getByRole('button', { name: /Next vessel/i }).click();
  await expect(page.getByText('Fast astral striker')).toBeVisible();
});

test('core iPhone landscape menu text stays readable', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.addInitScript(() => {
    window.localStorage.setItem('sl.meta', JSON.stringify({ seenPrologue: true, seenNewRunCinematic: true, unlockedCodex: [], bossesSeen: [] }));
  });

  const findSmallText = async (): Promise<Array<{ text: string; size: number }>> => page.evaluate(() => {
    const selectors = 'button, .pixel-subtitle, .main-menu-status span, .pixel-btn .badge, .settings-row, .settings-value, .settings-remap-btn';
    return Array.from(document.querySelectorAll(selectors)).flatMap((el) => {
      const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
      const rect = el.getBoundingClientRect();
      const size = parseFloat(getComputedStyle(el).fontSize || '0');
      return text && rect.width > 0 && rect.height > 0 && rect.bottom >= 0 && rect.top <= window.innerHeight && size < 10.5
        ? [{ text, size }]
        : [];
    });
  });

  await page.goto('/');
  await expect(page.getByRole('button', { name: /new run/i })).toBeVisible();
  expect(await findSmallText()).toEqual([]);

  await page.getByRole('button', { name: /^settings$/i }).click();
  await expect(page.getByText('Music Volume')).toBeVisible();
  expect(await findSmallText()).toEqual([]);
});
