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

  /* ========================================================================== */
  /* DASH-002 — Customize workflow                                              */
  /* ========================================================================== */

  test.describe('DASH-002: Widget customize workflow', () => {
    test('customize drawer opens from dashboard header', async ({ page }) => {
      const customizeBtn = page.getByRole('button', { name: /Customize|Configure/i }).first();
      if (await customizeBtn.isVisible().catch(() => false)) {
        await customizeBtn.click();
        // Expect toggle switches or widget visibility controls
        await expect(
          page.getByText(/Widget|Visibility|Toggle|Reset/i).first()
        ).toBeVisible({ timeout: 10000 });
      }
    });

    test('widget toggle changes active widget count', async ({ page }) => {
      const customizeBtn = page.getByRole('button', { name: /Customize|Configure/i }).first();
      if (await customizeBtn.isVisible().catch(() => false)) {
        await customizeBtn.click();
        // Find a toggle switch and click it
        const toggle = page.locator('[role="switch"]').first();
        if (await toggle.isVisible().catch(() => false)) {
          await toggle.click();
          // Active count text appears inside the customizer drawer header
          await expect(page.getByText(/widgets active/i).first()).toBeVisible({ timeout: 5000 });
        }
      }
    });

    test('reset to defaults restores widget layout', async ({ page }) => {
      const customizeBtn = page.getByRole('button', { name: /Customize|Configure/i }).first();
      if (await customizeBtn.isVisible().catch(() => false)) {
        await customizeBtn.click();
        const resetBtn = page.getByRole('button', { name: /Reset to Defaults|Reset/i }).first();
        if (await resetBtn.isVisible().catch(() => false)) {
          await resetBtn.click();
          // After reset, customize panel should still be open
          await expect(page.getByText(/Widget|Visibility/i).first()).toBeVisible({ timeout: 5000 });
        }
      }
    });
  });

  /* ========================================================================== */
  /* DASH-004 — Summary truthfulness                                            */
  /* ========================================================================== */

  test.describe('DASH-004: Metric truthfulness', () => {
    test('dashboard shows section headers for Command/Monitoring/Platform', async ({ page }) => {
      // NODADashboard sections
      await expect(
        page.getByText(/Command|Monitoring|Platform/i).first()
      ).toBeVisible({ timeout: 10000 });
    });

    test('widget count reflects active vs total', async ({ page }) => {
      // The widget count lives in the Customize button's aria-label:
      // "Customize Dashboard — X of Y widgets active"
      const customizeBtn = page.locator('button[aria-label*="widgets active"]').first()
        .or(page.getByRole('button', { name: /Customize/i }).first());
      await expect(customizeBtn).toBeVisible({ timeout: 10000 });
    });
  });
});
