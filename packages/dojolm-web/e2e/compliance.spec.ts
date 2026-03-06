/**
 * E2E Test: Bushido Book (Compliance)
 * Verifies compliance framework display and navigation.
 */

import { test, expect } from '@playwright/test';

test.describe('Bushido Book', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('nav').first()).toBeVisible({ timeout: 15000 });
    const complianceNav = page.locator('nav >> text=Bushido Book').first();
    await expect(complianceNav).toBeVisible({ timeout: 5000 });
    await complianceNav.click();
  });

  test('shows compliance frameworks', async ({ page }) => {
    await expect(page.locator('text=/OWASP|NIST|MITRE|BAISS/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('shows coverage percentages', async ({ page }) => {
    await expect(page.locator('text=/%/').first()).toBeVisible({ timeout: 10000 });
  });
});
