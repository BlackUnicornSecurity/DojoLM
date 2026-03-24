/**
 * E2E Test: Admin Panel
 * Verifies admin settings and system health.
 */

import { test, expect } from '@playwright/test';

test.describe('Admin', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible({ timeout: 15000 });
    const adminNav = sidebar.getByRole('button', { name: 'Admin' });
    await expect(adminNav).toBeVisible({ timeout: 5000 });
    await adminNav.click();
    await expect(page.getByRole('heading', { name: 'Admin & Settings' })).toBeVisible({ timeout: 10000 });
  });

  test('shows admin tabs', async ({ page }) => {
    const tabs = ['General', 'API Keys', 'System Health', 'Validation'];
    for (const tab of tabs) {
      await expect(page.getByRole('tab', { name: tab })).toBeVisible({ timeout: 10000 });
    }
  });

  test('shows system health information', async ({ page }) => {
    const healthTab = page.getByRole('tab', { name: 'System Health' });
    await expect(healthTab).toBeVisible({ timeout: 5000 });
    await healthTab.click();
    await expect(healthTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText('System Health').first()).toBeVisible();
  });
});
