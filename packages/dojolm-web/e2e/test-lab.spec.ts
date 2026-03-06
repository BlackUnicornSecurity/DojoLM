/**
 * E2E Test: Test Lab (Armory)
 * Verifies fixture explorer and fixture browsing.
 */

import { test, expect } from '@playwright/test';

test.describe('Test Lab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const testLabNav = page.locator('nav >> text=Test Lab').first();
    if (await testLabNav.isVisible()) {
      await testLabNav.click();
    }
  });

  test('shows fixture explorer', async ({ page }) => {
    await expect(page.locator('text=Fixture Explorer').first()).toBeVisible({ timeout: 10000 });
  });

  test('shows fixture categories', async ({ page }) => {
    // Should show provider categories
    await expect(page.locator('text=/DojoLM|Basileak|BonkLM/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('supports view mode switching', async ({ page }) => {
    // View mode buttons (Tree, Search, Grid)
    const viewButtons = page.locator('button:has-text("Tree"), button:has-text("Search"), button:has-text("Grid")');
    await expect(viewButtons.first()).toBeVisible({ timeout: 10000 });
  });
});
