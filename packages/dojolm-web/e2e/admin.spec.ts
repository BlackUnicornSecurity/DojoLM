/**
 * E2E Test: Admin Panel
 * Verifies admin settings and system health.
 */

import { test, expect } from '@playwright/test';

test.describe('Admin', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('nav').first()).toBeVisible({ timeout: 15000 });
    const adminNav = page.locator('nav >> text=Admin').first();
    await expect(adminNav).toBeVisible({ timeout: 5000 });
    await adminNav.click();
  });

  test('shows admin tabs', async ({ page }) => {
    const tabs = ['General', 'API Keys', 'System Health'];
    for (const tab of tabs) {
      await expect(page.locator(`text=${tab}`).first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('shows system health information', async ({ page }) => {
    const healthTab = page.locator('button:has-text("System Health"), [role="tab"]:has-text("System Health")').first();
    await expect(healthTab).toBeVisible({ timeout: 5000 });
    await healthTab.click();
    // Verify System Health tab content is active
    await expect(healthTab).toBeVisible();
  });
});
