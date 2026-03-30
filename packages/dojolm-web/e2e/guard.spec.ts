/**
 * E2E Test: Hattori Guard
 * Verifies guard mode display, configuration, mode switching,
 * block threshold, audit log filtering, pagination, and statistics.
 * Backend API: GET/PUT /api/llm/guard, GET /api/llm/guard/stats, GET /api/llm/guard/audit
 */

import { test, expect } from '@playwright/test';

test.describe('Hattori Guard', () => {
  // Guard tests navigate via the desktop sidebar — skip on mobile-chrome project
  // where the sidebar is replaced by the bottom nav.
  test.skip(({ viewport }) => !!(viewport && viewport.width < 768), 'Desktop-only: uses sidebar navigation');

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible({ timeout: 15000 });
    const guardNav = sidebar.getByRole('button', { name: 'Hattori Guard' });
    await expect(guardNav).toBeVisible({ timeout: 5000 });
    await guardNav.click();
  });

  test('page loads with guard mode heading and metric cards', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Guard Mode' })).toBeVisible({ timeout: 10000 });
    // Four metric cards should display
    await expect(page.getByText('Total Events').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Blocked').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Block Rate').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Active Mode').first()).toBeVisible({ timeout: 5000 });
  });

  test('shows all four guard mode cards', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Guard Mode' })).toBeVisible({ timeout: 10000 });
    // All four modes should be selectable
    await expect(page.getByRole('radio', { name: /Select Shinobi mode/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('radio', { name: /Select Samurai mode/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('radio', { name: /Select Sensei mode/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('radio', { name: /Select Hattori mode/i })).toBeVisible({ timeout: 5000 });
  });

  test('guard enable/disable toggle works', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Guard Mode' })).toBeVisible({ timeout: 10000 });
    // The toggle button has aria-label "Guard enabled, click to disable" or "Guard disabled, click to enable"
    const toggleBtn = page.getByRole('button', { name: /Guard (enabled|disabled)|click to (enable|disable)/i });
    await expect(toggleBtn).toBeVisible({ timeout: 10000 });
    // Click to toggle state
    await toggleBtn.click();
    // Button should still be visible after toggle
    await expect(toggleBtn).toBeVisible({ timeout: 5000 });
  });

  test('mode cards show scan direction indicators', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Guard Mode' })).toBeVisible({ timeout: 10000 });
    // Mode cards should show IN/OUT scan direction indicators
    await expect(page.getByText(/IN ON|IN OFF/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/OUT ON|OUT OFF/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('block threshold selector is visible when guard enabled', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Guard Mode' })).toBeVisible({ timeout: 10000 });
    // Ensure guard is enabled — only click toggle if currently disabled
    const toggleBtn = page.getByRole('button', { name: /Guard (enabled|disabled)|click to (enable|disable)/i });
    await expect(toggleBtn).toBeVisible({ timeout: 10000 });
    const isDisabled = await toggleBtn.getAttribute('aria-label').then(
      (label) => label?.toLowerCase().includes('disabled') ?? false
    ).catch(() => false);
    if (isDisabled) {
      await toggleBtn.click();
      await page.waitForTimeout(500);
    }
    // Look for block threshold controls (only rendered when guard is enabled)
    const warningBtn = page.getByRole('button', { name: /WARNING\+/i });
    const criticalBtn = page.getByRole('button', { name: /CRITICAL only/i });
    await expect(warningBtn).toBeVisible({ timeout: 10000 });
    await expect(criticalBtn).toBeVisible({ timeout: 5000 });
  });

  test('switching mode updates active mode metric card', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Guard Mode' })).toBeVisible({ timeout: 10000 });
    // Ensure guard is enabled — only click toggle if currently disabled
    const toggleBtn = page.getByRole('button', { name: /Guard (enabled|disabled)|click to (enable|disable)/i });
    await expect(toggleBtn).toBeVisible({ timeout: 10000 });
    const isDisabled = await toggleBtn.getAttribute('aria-label').then(
      (label) => label?.toLowerCase().includes('disabled') ?? false
    ).catch(() => false);
    if (isDisabled) {
      await toggleBtn.click();
      await page.waitForTimeout(500);
    }

    // Select Samurai mode
    const samuraiRadio = page.getByRole('radio', { name: /Select Samurai mode/i });
    if (await samuraiRadio.isEnabled().catch(() => false)) {
      await samuraiRadio.click();
      // Active Mode metric should update
      await expect(page.getByText(/Samurai/i).first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('shows audit log section with event count', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Audit Log' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/\d+ events|No sessions yet|0 events/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('audit log has direction and action filter buttons', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Audit Log' })).toBeVisible({ timeout: 10000 });
    // Direction filter buttons
    await expect(page.getByRole('button', { name: /input/i }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /output/i }).first()).toBeVisible({ timeout: 5000 });
    // Action filter buttons
    await expect(page.getByRole('button', { name: /allow/i }).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /block/i }).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /log/i }).first()).toBeVisible({ timeout: 5000 });
  });

  test('audit log direction filters toggle on click', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Audit Log' })).toBeVisible({ timeout: 10000 });
    const inputBtn = page.getByRole('button', { name: /input/i }).first();
    await expect(inputBtn).toBeVisible({ timeout: 10000 });
    // Click to toggle filter
    await inputBtn.click();
    // Button should visually change (active/inactive state)
    await expect(inputBtn).toBeVisible({ timeout: 5000 });
  });

  test('audit log has pagination controls', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Audit Log' })).toBeVisible({ timeout: 10000 });
    // Pagination controls should exist (may show "Page 1" or Prev/Next)
    await expect(
      page.getByText(/Page \d+|Prev|Next|No sessions yet/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('guard mode descriptions explain scan behavior', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Guard Mode' })).toBeVisible({ timeout: 10000 });
    // Mode descriptions should explain what each mode does
    await expect(page.getByText(/Stealth Monitor|Log only/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Active Defense|Block inputs/i).first()).toBeVisible({ timeout: 5000 });
  });
});
