/**
 * E2E Test: LLM Dashboard
 * Verifies model management tabs and dashboard functionality.
 */

import { test, expect } from '@playwright/test';

test.describe('LLM Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible({ timeout: 15000 });
    const llmNav = sidebar.getByRole('button', { name: 'LLM Dashboard' });
    await expect(llmNav).toBeVisible({ timeout: 5000 });
    await llmNav.click();
    await expect(page.getByRole('heading', { name: 'LLM Testing Dashboard' })).toBeVisible({ timeout: 10000 });
  });

  test('shows Models tab by default', async ({ page }) => {
    await expect(page.getByRole('tab', { name: 'Models', exact: true })).toHaveAttribute('aria-selected', 'true');
  });

  test('shows multiple dashboard tabs', async ({ page }) => {
    const tabs = ['Models', 'Tests', 'Results', 'Compare', 'Custom Models', 'Jutsu'];
    for (const tab of tabs) {
      await expect(page.getByRole('tab', { name: tab, exact: true })).toBeVisible({ timeout: 5000 });
    }
    await expect(page.getByRole('tab', { name: /Board|Leaderboard/ })).toBeVisible({ timeout: 5000 });
  });

  test('can switch between tabs', async ({ page }) => {
    const resultsTab = page.getByRole('tab', { name: 'Results' });
    await expect(resultsTab).toBeVisible({ timeout: 5000 });
    await resultsTab.click();
    await expect(resultsTab).toHaveAttribute('aria-selected', 'true');
  });
});
