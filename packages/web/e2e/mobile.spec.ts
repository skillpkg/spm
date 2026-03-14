import { test, expect } from '@playwright/test';

test.describe('mobile layout', () => {
  test('home page cards stack vertically on mobile', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile-only test');
    await page.goto('/');

    // Trending cards grid should be vertical (column direction)
    const grid = page.locator('.spm-trending-grid');
    if (await grid.isVisible()) {
      const box = await grid.boundingBox();
      const cards = grid.locator('.spm-skill-card');
      const count = await cards.count();

      if (count >= 2) {
        const first = await cards.nth(0).boundingBox();
        const second = await cards.nth(1).boundingBox();

        // Cards should be stacked (second card below first, not beside it)
        expect(second!.y).toBeGreaterThan(first!.y);
        // Cards should be full width (not side by side)
        expect(first!.width).toBeGreaterThan(box!.width * 0.8);
      }
    }
  });

  test('sidebar is hidden on mobile', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile-only test');
    await page.goto('/');

    const sidebar = page.locator('.sidebar-desktop');
    await expect(sidebar).toBeHidden();
  });

  test('hamburger menu visible on mobile', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile-only test');
    await page.goto('/');

    const menuBtn = page.locator('.topbar-menu-btn');
    await expect(menuBtn).toBeVisible();
  });

  test('search page filters stack on mobile', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile-only test');
    await page.goto('/search?q=test');

    const layout = page.locator('.spm-search-layout');
    if (await layout.isVisible()) {
      const style = await layout.evaluate((el) => getComputedStyle(el).flexDirection);
      expect(style).toBe('column');
    }
  });

  test('skill detail sidebar below content on mobile', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile-only test');
    await page.goto('/skills/ship');

    const layout = page.locator('.spm-skill-layout');
    if (await layout.isVisible()) {
      const style = await layout.evaluate((el) => getComputedStyle(el).flexDirection);
      expect(style).toBe('column');
    }
  });
});

test.describe('desktop layout', () => {
  test('sidebar visible on desktop', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop-only test');
    await page.goto('/');

    const sidebar = page.locator('.sidebar-desktop');
    await expect(sidebar).toBeVisible();
  });

  test('trending cards display in a row on desktop', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop-only test');
    await page.goto('/');

    const grid = page.locator('.spm-trending-grid');
    if (await grid.isVisible()) {
      const cards = grid.locator('.spm-skill-card');
      const count = await cards.count();

      if (count >= 2) {
        const first = await cards.nth(0).boundingBox();
        const second = await cards.nth(1).boundingBox();

        // Cards should be side by side (same Y position)
        expect(Math.abs(second!.y - first!.y)).toBeLessThan(5);
      }
    }
  });
});
