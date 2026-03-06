/**
 * E2E Test: Hattori Guard
 * Verifies guard mode display and configuration.
 */

import { test, expect } from '@playwright/test';

test.describe('Hattori Guard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('nav').first()).toBeVisible({ timeout: 15000 });
    const guardNav = page.locator('nav >> text=Hattori Guard').first();
    await expect(guardNav).toBeVisible({ timeout: 5000 });
    await guardNav.click();
  });

  test('shows guard mode selector', async ({ page }) => {
    await expect(page.locator('text=/Shinobi|Samurai|Sensei|Hattori/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('shows audit log', async ({ page }) => {
    await expect(page.locator('text=/Audit|Log|Events/i').first()).toBeVisible({ timeout: 10000 });
  });
});
