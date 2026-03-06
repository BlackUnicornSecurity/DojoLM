/**
 * E2E Test: Dashboard Widgets
 * Verifies key dashboard widgets render correctly.
 */

import { test, expect } from '@playwright/test';

test.describe('Dashboard Widgets', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=System Health').first()).toBeVisible({ timeout: 15000 });
  });

  test('renders system health gauge', async ({ page }) => {
    await expect(page.locator('text=System Health').first()).toBeVisible({ timeout: 15000 });
  });

  test('renders guard status widget', async ({ page }) => {
    await expect(page.locator('text=/Guard|Hattori/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('renders quick actions', async ({ page }) => {
    await expect(page.locator('text=Quick Actions').first()).toBeVisible({ timeout: 10000 });
  });

  test('cross-module actions work from dashboard', async ({ page }) => {
    // Click a cross-module action — assert visibility instead of silent skip
    const action = page.locator('text=/Run your first scan|Try It/i').first();
    await expect(action).toBeVisible({ timeout: 5000 });
    await action.click();
    // Should navigate away from dashboard — verify System Health no longer visible
    await expect(page.locator('text=System Health').first()).not.toBeVisible({ timeout: 5000 });
  });
});
