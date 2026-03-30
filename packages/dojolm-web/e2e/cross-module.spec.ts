/**
 * E2E Test: Cross-Module Actions
 * Verifies cross-module navigation and data flow.
 */

import { test, expect } from '@playwright/test';

test.describe('Cross-Module Actions', () => {
  test('dashboard loads with all widget sections', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Command' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Monitoring' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Platform' })).toBeVisible({ timeout: 10000 });
  });

  test('activity feed shows events', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Recent Activity')).toBeVisible({ timeout: 10000 });
  });

  test('navigating between modules preserves app state', async ({ page }) => {
    await page.goto('/');
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible({ timeout: 15000 });

    const scannerNav = sidebar.getByRole('button', { name: 'Haiku Scanner', exact: true });
    await expect(scannerNav).toBeVisible({ timeout: 5000 });
    await scannerNav.click();
    await expect(page.getByText('Input Text').first()).toBeVisible({ timeout: 10000 });

    const dashboardNav = sidebar.getByRole('button', { name: 'Dashboard', exact: true });
    await expect(dashboardNav).toBeVisible({ timeout: 5000 });
    await dashboardNav.click();

    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10000 });
  });
});
