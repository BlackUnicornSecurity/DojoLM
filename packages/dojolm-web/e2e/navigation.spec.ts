/**
 * E2E Test: Navigation & Module Switching
 * Verifies all 10 modules are accessible from sidebar navigation.
 */

import { test, expect } from '@playwright/test';

const MODULES = [
  { name: 'Dashboard', selector: 'text=System Health' },
  { name: 'Scanner', selector: 'text=Scan Input' },
  { name: 'Test Lab', selector: 'text=Fixture Explorer' },
  { name: 'LLM Dashboard', selector: 'text=Models' },
  { name: 'Hattori Guard', selector: 'text=Guard Mode' },
  { name: 'Atemi Lab', selector: 'text=Attack Tools' },
  { name: 'Bushido Book', selector: 'text=Compliance' },
  { name: 'The Kumite', selector: 'text=Strategic Hub' },
  { name: 'Amaterasu DNA', selector: 'text=Family Tree' },
  { name: 'Admin', selector: 'text=General' },
];

test.describe('Navigation', () => {
  test('loads the dashboard homepage', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/NODA|DojoLM/i);
    // Dashboard should be visible by default
    await expect(page.locator('text=System Health').first()).toBeVisible({ timeout: 15000 });
  });

  test('sidebar shows all module navigation items', async ({ page }) => {
    await page.goto('/');
    // Wait for app to load
    await expect(page.locator('nav').first()).toBeVisible({ timeout: 15000 });
    // Check that sidebar has navigation items
    const navItems = page.locator('nav button, nav a');
    await expect(navItems.first()).toBeVisible();
  });

  for (const mod of MODULES) {
    test(`can navigate to ${mod.name}`, async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('nav').first()).toBeVisible({ timeout: 15000 });
      // Click module in sidebar — assert visibility instead of silent skip
      const navButton = page.locator(`nav >> text=${mod.name}`).first();
      await expect(navButton).toBeVisible({ timeout: 5000 });
      await navButton.click();
      // Module content should appear
      await expect(page.locator(mod.selector).first()).toBeVisible({ timeout: 10000 });
    });
  }
});
