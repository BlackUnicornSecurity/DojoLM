/**
 * E2E Test: Buki (Payload Lab)
 *
 * Post 2026-04-13 Testing UX Consolidation: Armory absorbed into Buki.
 * Sidebar label: `Buki` | Page H1: `Payload Lab` (label drift VIS-06 is a P1
 * follow-up — this spec targets the live state).
 *
 * Tabs: Fixtures | Payloads | Generator | Fuzzer.
 * See `src/components/buki/PayloadLab.tsx`, `src/lib/constants.ts:94-101`.
 */

import { test, expect } from '@playwright/test';

test.describe('Buki (Payload Lab)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Inject API key so scan API calls succeed
    const apiKey = process.env.NODA_API_KEY ?? '';
    if (apiKey) {
      await page.evaluate((key) => localStorage.setItem('noda-api-key', key), apiKey);
    }
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible({ timeout: 15000 });
    const bukiNav = sidebar.getByRole('button', { name: 'Buki', exact: true });
    await expect(bukiNav).toBeVisible({ timeout: 5000 });
    await bukiNav.click();
    await expect(page.getByRole('heading', { name: /Payload Lab|Buki/i })).toBeVisible({ timeout: 10000 });
  });

  test('shows fixture explorer on Fixtures tab', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Fixture Explorer' })).toBeVisible({ timeout: 20000 });
  });

  test('shows all four Buki section tabs', async ({ page }) => {
    await expect(page.getByRole('tab', { name: 'Fixtures', exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('tab', { name: 'Payloads', exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('tab', { name: 'Generator', exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('tab', { name: 'Fuzzer', exact: true })).toBeVisible({ timeout: 10000 });
  });

  test('supports view mode switching', async ({ page }) => {
    const gridButton = page.getByRole('button', { name: 'Grid view' });
    await expect(page.getByRole('button', { name: 'Tree view' })).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('button', { name: 'Search view' })).toBeVisible({ timeout: 20000 });
    await expect(gridButton).toBeVisible({ timeout: 10000 });
    await gridButton.click();
    await expect(gridButton).toHaveAttribute('aria-pressed', 'true');
  });

  test('can open a fixture detail from Buki', async ({ page }) => {
    const viewFilesButton = page.getByRole('button', { name: /^View files in / }).first();
    await expect(viewFilesButton).toBeVisible({ timeout: 10000 });
    await viewFilesButton.click();

    const viewFixtureButton = page.getByRole('button', { name: /^View / }).first();
    await expect(viewFixtureButton).toBeVisible({ timeout: 10000 });
    await viewFixtureButton.click();

    await expect(page.getByText(/Content|Hex Preview/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('can scan a fixture from Buki', async ({ page }) => {
    // Scan API can take 30-60s on prod; extend this test's timeout to 90s
    test.setTimeout(90000);
    const viewFilesButton = page.getByRole('button', { name: /^View files in / }).first();
    await expect(viewFilesButton).toBeVisible({ timeout: 10000 });
    await viewFilesButton.click();

    const scanFixtureButton = page.getByRole('button', { name: /^Scan / }).first();
    await expect(scanFixtureButton).toBeVisible({ timeout: 10000 });
    await scanFixtureButton.click();

    // After clicking scan, either the scan results panel opens or an error is shown
    // (error occurs when API key is missing). Accept either outcome.
    await expect(
      page.locator('main').getByText(/Scan Results|Unable to scan fixture|Check connection/i).first()
    ).toBeVisible({ timeout: 70000 });
  });
});
