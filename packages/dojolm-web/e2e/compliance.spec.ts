/**
 * E2E Test: Bushido Book (Compliance)
 * Verifies compliance framework display and navigation.
 */

import { test, expect } from '@playwright/test';

test.describe('Bushido Book', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible({ timeout: 15000 });
    const complianceNav = sidebar.getByRole('button', { name: 'Bushido Book' });
    await expect(complianceNav).toBeVisible({ timeout: 5000 });
    await complianceNav.click();
    await expect(page.getByText('Framework Coverage').first()).toBeVisible({ timeout: 20000 });
  });

  test('shows compliance frameworks', async ({ page }) => {
    await expect(page.getByText(/OWASP LLM Top 10|MITRE ATLAS|NIST AI RMF/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('shows coverage percentages', async ({ page }) => {
    await expect(page.getByText(/\d+%/).first()).toBeVisible({ timeout: 10000 });
  });
});
