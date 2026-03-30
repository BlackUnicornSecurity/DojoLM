/**
 * E2E Test: Test Lab (Armory)
 * Verifies fixture explorer and fixture browsing.
 */

import { test, expect } from '@playwright/test';

test.describe('Armory', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible({ timeout: 15000 });
    const armoryNav = sidebar.getByRole('button', { name: 'Armory' });
    await expect(armoryNav).toBeVisible({ timeout: 5000 });
    await armoryNav.click();
    await expect(page.getByRole('heading', { name: 'Armory' })).toBeVisible({ timeout: 10000 });
  });

  test('shows fixture explorer', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Fixture Explorer' })).toBeVisible({ timeout: 20000 });
  });

  test('shows Armory section tabs', async ({ page }) => {
    await expect(page.getByRole('tab', { name: 'Fixtures' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('tab', { name: 'Test Payloads' })).toBeVisible({ timeout: 10000 });
  });

  test('supports view mode switching', async ({ page }) => {
    const gridButton = page.getByRole('button', { name: 'Grid view' });
    await expect(page.getByRole('button', { name: 'Tree view' })).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('button', { name: 'Search view' })).toBeVisible({ timeout: 20000 });
    await expect(gridButton).toBeVisible({ timeout: 10000 });
    await gridButton.click();
    await expect(gridButton).toHaveAttribute('aria-pressed', 'true');
  });

  test('can open a fixture detail from Armory', async ({ page }) => {
    const viewFilesButton = page.getByRole('button', { name: /^View files in / }).first();
    await expect(viewFilesButton).toBeVisible({ timeout: 10000 });
    await viewFilesButton.click();

    const viewFixtureButton = page.getByRole('button', { name: /^View / }).first();
    await expect(viewFixtureButton).toBeVisible({ timeout: 10000 });
    await viewFixtureButton.click();

    await expect(page.getByText(/Content|Hex Preview/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('can scan a fixture from Armory', async ({ page }) => {
    const viewFilesButton = page.getByRole('button', { name: /^View files in / }).first();
    await expect(viewFilesButton).toBeVisible({ timeout: 10000 });
    await viewFilesButton.click();

    const scanFixtureButton = page.getByRole('button', { name: /^Scan / }).first();
    await expect(scanFixtureButton).toBeVisible({ timeout: 10000 });
    await scanFixtureButton.click();

    await expect(page.getByText('Scan Results')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Verdict|Scanned in/i).first()).toBeVisible({ timeout: 10000 });
  });
});
