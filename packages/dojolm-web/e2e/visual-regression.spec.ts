/**
 * E2E Visual Regression Tests
 *
 * Captures screenshots of critical pages/modules and compares against baselines.
 * Uses Playwright's built-in toHaveScreenshot() with configurable thresholds.
 *
 * Baseline snapshots stored in e2e/visual-regression.spec.ts-snapshots/.
 * Update baselines: npx playwright test visual-regression --update-snapshots
 */

import { test, expect } from '@playwright/test';

const VISUAL_TIMEOUT = 20000;

/** Wait for page to be fully painted (no pending network, animations settled) */
async function waitForStable(page: import('@playwright/test').Page) {
  await page.waitForLoadState('networkidle', { timeout: VISUAL_TIMEOUT });
  // Let CSS transitions/animations settle
  await page.waitForTimeout(500);
}

test.describe('Visual Regression — Critical Pages', () => {
  test('dashboard loads with expected layout', async ({ page }) => {
    await page.goto('/');
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible({ timeout: 15000 });
    await waitForStable(page);
    await expect(page).toHaveScreenshot('dashboard.png', {
      maxDiffPixelRatio: 0.02,
      timeout: VISUAL_TIMEOUT,
    });
  });

  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300);
    await expect(page).toHaveScreenshot('login.png', {
      maxDiffPixelRatio: 0.02,
      timeout: VISUAL_TIMEOUT,
    });
  });
});

test.describe('Visual Regression — Module Screens', () => {
  async function navigateToModule(page: import('@playwright/test').Page, name: string, readyText: RegExp, timeout = 10000) {
    await page.goto('/');
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible({ timeout: 15000 });
    const nav = sidebar.getByRole('button', { name });
    await expect(nav).toBeVisible({ timeout: 5000 });
    await nav.click();
    await expect(page.getByText(readyText).first()).toBeVisible({ timeout });
    await waitForStable(page);
  }

  test('Haiku Scanner module', async ({ page }) => {
    await navigateToModule(page, 'Scanner', /Scan|Scanner/i);
    await expect(page).toHaveScreenshot('scanner.png', {
      maxDiffPixelRatio: 0.03,
      timeout: VISUAL_TIMEOUT,
    });
  });

  test('Hattori Guard module', async ({ page }) => {
    await navigateToModule(page, 'Guard', /Guard|Protection/i);
    await expect(page).toHaveScreenshot('guard.png', {
      maxDiffPixelRatio: 0.03,
      timeout: VISUAL_TIMEOUT,
    });
  });

  test('Buki module', async ({ page }) => {
    // Armory absorbed into Buki (2026-04-13 Testing UX Consolidation).
    // Baseline file kept as armory.png for now — rename tracked in TI-007.
    await navigateToModule(page, 'Buki', /Payload Lab|Buki|Fixtures/i);
    await expect(page).toHaveScreenshot('armory.png', {
      maxDiffPixelRatio: 0.03,
      timeout: VISUAL_TIMEOUT,
    });
  });

  test('Model Lab module', async ({ page }) => {
    // LLM Dashboard renamed to Model Lab (Train-2 PR-4b.6, 2026-04-09).
    // Baseline file kept as llm-dashboard.png for now — rename tracked in TI-007.
    await navigateToModule(page, 'Model Lab', /Model Lab|Models/i);
    await expect(page).toHaveScreenshot('llm-dashboard.png', {
      maxDiffPixelRatio: 0.03,
      timeout: VISUAL_TIMEOUT,
    });
  });

  test('Atemi Lab module', async ({ page }) => {
    await navigateToModule(page, 'Atemi', /Atemi|Adversarial/i);
    await expect(page).toHaveScreenshot('atemi-lab.png', {
      maxDiffPixelRatio: 0.03,
      timeout: VISUAL_TIMEOUT,
    });
  });

  test('Bushido Book module', async ({ page }) => {
    await navigateToModule(page, 'Bushido', /Bushido|Compliance/i, 35000);
    await expect(page).toHaveScreenshot('compliance.png', {
      maxDiffPixelRatio: 0.03,
      timeout: VISUAL_TIMEOUT,
    });
  });

  test('Admin module', async ({ page }) => {
    await navigateToModule(page, 'Admin', /Admin|Settings/i);
    await expect(page).toHaveScreenshot('admin.png', {
      maxDiffPixelRatio: 0.03,
      timeout: VISUAL_TIMEOUT,
    });
  });
});
