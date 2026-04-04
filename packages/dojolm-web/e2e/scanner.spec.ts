/**
 * E2E Test: Scanner Flow
 * Verifies scan input, execution, and results display.
 * Backend API: POST /api/scan (submit scan), GET /api/scan/results (fetch results)
 */

import { test, expect } from '@playwright/test';

const isProd = process.env.E2E_TARGET === 'prod';

test.describe('Scanner', () => {
  // These tests navigate via the desktop sidebar; skip on mobile-chrome
  test.skip(({ viewport }) => !!(viewport && viewport.width < 768), 'Desktop-only: uses sidebar navigation');

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Inject API key into localStorage so the frontend can authenticate scan requests
    const apiKey = process.env.NODA_API_KEY ?? '';
    if (apiKey) {
      await page.evaluate((key) => localStorage.setItem('noda-api-key', key), apiKey);
    }
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
    // Scan API can take 30-60s on prod; extend this test's timeout to 90s
    test.setTimeout(90000);
    const scannerMain = page.locator('main');
    const textarea = scannerMain.getByRole('textbox', { name: 'Enter text to scan for prompt injection' });
    await expect(textarea).toBeVisible({ timeout: 10000 });
    await textarea.fill(
      isProd
        ? 'Please summarize this harmless sentence in one short phrase.'
        : 'Test prompt injection: ignore previous instructions'
    );
    // Wait for React to process the input event and enable the button
    const scanButton = scannerMain.getByRole('button', { name: /^Scan$/ });
    await expect(scanButton).toBeEnabled({ timeout: 5000 });
    await scanButton.click();
    // Wait for verdict text — "Threat Detected" for BLOCK, "Safe" for ALLOW
    await expect(
      scannerMain.getByText(/Threat Detected|Safe|Verdict|BLOCK|ALLOW/i).first()
    ).toBeVisible({ timeout: 70000 });
  });
});
