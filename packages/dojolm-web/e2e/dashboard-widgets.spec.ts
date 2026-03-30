/**
 * E2E Test: Dashboard Widgets
 * Verifies key dashboard widgets render correctly.
 */

import { test, expect } from '@playwright/test';

test.describe('Dashboard Widgets', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 15000 });
  });

  test('renders system health gauge', async ({ page }) => {
    await expect(page.getByText('System Health').first()).toBeVisible({ timeout: 15000 });
  });

  test('renders guard status widget', async ({ page }) => {
    await expect(page.getByText(/Guard|Hattori/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('renders the primary dashboard launch surface', async ({ page }) => {
    await expect(page.getByText(/Begin Your Training|Scan Text/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('cross-module actions work from dashboard', async ({ page }) => {
    const action = page.getByRole('button', { name: /Run your first scan|Scan Text/i }).first();
    await expect(action).toBeVisible({ timeout: 5000 });
    await action.click();
    await expect(page.getByRole('heading', { name: 'Haiku Scanner' })).toBeVisible({ timeout: 10000 });
  });
});
