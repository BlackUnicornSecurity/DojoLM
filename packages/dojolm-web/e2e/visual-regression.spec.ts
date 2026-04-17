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

const VISUAL_TIMEOUT = 45000;

/**
 * Per-module max-diff thresholds. Tighter for static shells (login, dashboard
 * sidebar); looser for data-heavy pages where live counts / timestamps cause
 * legitimate pixel drift between runs.
 */
const DIFF_RATIO = {
  // Static — ~5%: login form, dashboard shell
  static: 0.05,
  // Moderate — ~8%: scanner, guard, buki, atemi lab (some dynamic content)
  moderate: 0.08,
  // Dynamic — ~10%: admin (live counts), bushido book (live badges), model lab
  dynamic: 0.10,
} as const;

/** Wait for page to be fully painted (no pending network, animations settled) */
async function waitForStable(page: import('@playwright/test').Page) {
  // Use domcontentloaded + extra settle time instead of networkidle which can hang on long-poll endpoints
  await page.waitForLoadState('domcontentloaded', { timeout: VISUAL_TIMEOUT });
  await page.waitForTimeout(2000);
}

test.describe('Visual Regression — Critical Pages', () => {
  test('dashboard loads with expected layout', async ({ page }) => {
    await page.goto('/');
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible({ timeout: 15000 });
    await waitForStable(page);
    await expect(page).toHaveScreenshot('dashboard.png', {
      maxDiffPixelRatio: DIFF_RATIO.static,
      timeout: VISUAL_TIMEOUT,
    });
  });

  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    await expect(page).toHaveScreenshot('login.png', {
      maxDiffPixelRatio: DIFF_RATIO.static,
      timeout: VISUAL_TIMEOUT,
    });
  });
});

test.describe('Visual Regression — Module Screens', () => {
  async function navigateToModule(page: import('@playwright/test').Page, name: string, readyText: RegExp, timeout = 20000) {
    await page.goto('/');
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible({ timeout: 15000 });
    // Use substring match for sidebar button names (exact names include full label)
    const nav = sidebar.getByRole('button', { name });
    await expect(nav).toBeVisible({ timeout: 10000 });
    await nav.click();
    await expect(page.getByText(readyText).first()).toBeVisible({ timeout });
    await waitForStable(page);
  }

  test('Haiku Scanner module', async ({ page }) => {
    await navigateToModule(page, 'Haiku Scanner', /Scan|Scanner/i);
    await expect(page).toHaveScreenshot('scanner.png', {
      maxDiffPixelRatio: DIFF_RATIO.moderate,
      timeout: VISUAL_TIMEOUT,
    });
  });

  test('Hattori Guard module', async ({ page }) => {
    await navigateToModule(page, 'Hattori Guard', /Guard|Protection/i);
    await expect(page).toHaveScreenshot('guard.png', {
      maxDiffPixelRatio: DIFF_RATIO.moderate,
      timeout: VISUAL_TIMEOUT,
    });
  });

  test('Buki module', async ({ page }) => {
    // Armory absorbed into Buki (2026-04-13 Testing UX Consolidation).
    // Baseline renamed from armory.png → buki.png 2026-04-16 (TI-007 closed).
    await navigateToModule(page, 'Buki', /Payload Lab|Buki|Fixtures/i);
    await expect(page).toHaveScreenshot('buki.png', {
      maxDiffPixelRatio: DIFF_RATIO.moderate,
      timeout: VISUAL_TIMEOUT,
    });
  });

  test('Model Lab module', async ({ page }) => {
    // LLM Dashboard renamed to Model Lab (Train-2 PR-4b.6, 2026-04-09).
    // Baseline renamed from llm-dashboard.png → model-lab.png 2026-04-16 (TI-007 closed).
    await navigateToModule(page, 'Model Lab', /Model Lab|Models/i);
    await expect(page).toHaveScreenshot('model-lab.png', {
      maxDiffPixelRatio: DIFF_RATIO.dynamic,
      timeout: VISUAL_TIMEOUT,
    });
  });

  test('Atemi Lab module', async ({ page }) => {
    await navigateToModule(page, 'Atemi Lab', /Atemi|Adversarial/i);
    await expect(page).toHaveScreenshot('atemi-lab.png', {
      maxDiffPixelRatio: DIFF_RATIO.moderate,
      timeout: VISUAL_TIMEOUT,
    });
  });

  test('Bushido Book module', async ({ page }) => {
    await navigateToModule(page, 'Bushido Book', /Bushido|Compliance/i, 40000);
    await expect(page).toHaveScreenshot('compliance.png', {
      maxDiffPixelRatio: DIFF_RATIO.dynamic,
      timeout: VISUAL_TIMEOUT,
    });
  });

  test('Admin module', async ({ page }) => {
    await navigateToModule(page, 'Admin', /Admin|Settings/i);
    await expect(page).toHaveScreenshot('admin.png', {
      maxDiffPixelRatio: DIFF_RATIO.dynamic,
      timeout: VISUAL_TIMEOUT,
    });
  });
});
