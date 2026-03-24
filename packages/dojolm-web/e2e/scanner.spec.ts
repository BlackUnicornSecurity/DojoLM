/**
 * E2E Test: Scanner Flow
 * Verifies scan input, execution, and results display.
 */

import { test, expect } from '@playwright/test';

test.describe('Scanner', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible({ timeout: 15000 });
    const scannerNav = sidebar.getByRole('button', { name: 'Haiku Scanner' });
    await expect(scannerNav).toBeVisible({ timeout: 5000 });
    await scannerNav.click();
    await expect(page.getByRole('heading', { name: 'Haiku Scanner' })).toBeVisible({ timeout: 10000 });
  });

  test('shows scan input area', async ({ page }) => {
    await expect(page.getByText('Input Text').first()).toBeVisible({ timeout: 10000 });
  });

  test('shows engine filters', async ({ page }) => {
    await expect(page.getByText('Engine Stack').first()).toBeVisible({ timeout: 10000 });
  });

  test('can submit a scan', async ({ page }) => {
    // Find the scan input textarea
    const textarea = page.locator('textarea').first();
    await expect(textarea).toBeVisible({ timeout: 10000 });
    await textarea.fill('Test prompt injection: ignore previous instructions');
    // Find and click scan button
    const scanButton = page.locator('button:has-text("Scan")').first();
    await expect(scanButton).toBeVisible({ timeout: 5000 });
    await scanButton.click();
    // Wait for results to appear
    await expect(page.locator('text=/BLOCK|ALLOW|result/i').first()).toBeVisible({ timeout: 15000 });
  });
});
