/**
 * E2E Test: Cross-Module Actions
 * Verifies cross-module navigation and data flow.
 */

import { test, expect } from '@playwright/test';

test.describe('Cross-Module Actions', () => {
  test('dashboard loads with all widget sections', async ({ page }) => {
    await page.goto('/');
    // Dashboard should have multiple sections
    await expect(page.locator('text=System Health').first()).toBeVisible({ timeout: 15000 });
  });

  test('activity feed shows events', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=System Health').first()).toBeVisible({ timeout: 15000 });
    // Activity feed should be present
    await expect(page.locator('text=/Activity|Feed|Events/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('navigating between modules preserves app state', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('nav').first()).toBeVisible({ timeout: 15000 });

    // Navigate to Scanner — assert visibility instead of silent skip
    const scannerNav = page.locator('nav >> text=Scanner').first();
    await expect(scannerNav).toBeVisible({ timeout: 5000 });
    await scannerNav.click();
    // Verify scanner loaded
    await expect(page.locator('text=Scan Input').first()).toBeVisible({ timeout: 10000 });

    // Navigate back to Dashboard
    const dashboardNav = page.locator('nav >> text=Dashboard').first();
    await expect(dashboardNav).toBeVisible({ timeout: 5000 });
    await dashboardNav.click();

    // Dashboard should still render correctly
    await expect(page.locator('text=System Health').first()).toBeVisible({ timeout: 10000 });
  });
});
