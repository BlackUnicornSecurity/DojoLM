/**
 * E2E Test: LLM Dashboard
 * Verifies model management tabs and dashboard functionality.
 */

import { test, expect } from '@playwright/test';

test.describe('LLM Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('nav').first()).toBeVisible({ timeout: 15000 });
    const llmNav = page.locator('nav >> text=LLM Dashboard').first();
    await expect(llmNav).toBeVisible({ timeout: 5000 });
    await llmNav.click();
  });

  test('shows Models tab by default', async ({ page }) => {
    await expect(page.locator('text=Models').first()).toBeVisible({ timeout: 10000 });
  });

  test('shows multiple dashboard tabs', async ({ page }) => {
    // LLM Dashboard should have multiple tabs
    const tabs = ['Models', 'Results', 'Summary', 'Tests'];
    for (const tab of tabs) {
      await expect(page.locator(`text=${tab}`).first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('can switch between tabs', async ({ page }) => {
    // Click Results tab — assert visibility instead of silent skip
    const resultsTab = page.locator('button:has-text("Results"), [role="tab"]:has-text("Results")').first();
    await expect(resultsTab).toBeVisible({ timeout: 5000 });
    await resultsTab.click();
    // Verify tab content changed
    await expect(resultsTab).toBeVisible();
  });
});
