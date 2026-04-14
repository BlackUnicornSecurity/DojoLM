/**
 * E2E Test: Navigation & Module Switching
 * Verifies all visible modules are accessible from sidebar navigation.
 *
 * Phase 1 remediation (2026-04-14): Battle Arena + Sengoku added (now visible).
 * Removed stale entries: Armory (hidden), LLM Dashboard (renamed → Model Lab),
 * The Kumite (retired → strategic).
 */

import { test, expect, type Locator } from '@playwright/test';

const MODULES = [
  { name: 'Dashboard', readyText: /Dashboard|System Health|Scan Text/i, timeout: 10000 },
  { name: 'Haiku Scanner', readyText: 'Input Text', timeout: 10000 },
  { name: 'Model Lab', readyText: /Model|Jutsu|Testing/i, timeout: 10000 },
  { name: 'Battle Arena', readyText: /Battle Arena|Matches|Warriors/i, timeout: 15000 },
  { name: 'Hattori Guard', readyText: 'Guard Mode', timeout: 10000 },
  { name: 'Bushido Book', readyText: 'Framework Coverage', timeout: 35000 },
  { name: 'Atemi Lab', readyText: 'Attack Tools', timeout: 10000 },
  { name: 'Sengoku', readyText: 'Campaigns', timeout: 10000 },
  { name: 'Ronin Hub', readyText: 'Programs', timeout: 10000 },
  { name: 'Kotoba', readyText: 'Prompt Text', timeout: 10000 },
  { name: 'Admin', readyText: 'General', timeout: 10000 },
];

function getSidebarButton(sidebar: Locator, name: string) {
  return sidebar.getByRole('button', { name, exact: true });
}

test.describe('Navigation', () => {
  test('loads the dashboard homepage', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/NODA|DojoLM/i);
    await expect(page.getByText(/Dashboard|System Health|Scan Text/i).first()).toBeVisible({ timeout: 15000 });
  });

  test('sidebar shows all module navigation items', async ({ page }) => {
    await page.goto('/');
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible({ timeout: 15000 });

    for (const mod of MODULES) {
      await expect(getSidebarButton(sidebar, mod.name)).toBeVisible();
    }
  });

  for (const mod of MODULES) {
    test(`can navigate to ${mod.name}`, async ({ page }) => {
      await page.goto('/');
      const sidebar = page.locator('aside');
      await expect(sidebar).toBeVisible({ timeout: 15000 });
      const navButton = getSidebarButton(sidebar, mod.name);
      await expect(navButton).toBeVisible({ timeout: 5000 });
      await navButton.click();
      await expect(page.getByText(mod.readyText).first()).toBeVisible({ timeout: mod.timeout });
    });
  }
});
