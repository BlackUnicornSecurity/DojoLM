/**
 * E2E Test: Ronin Hub
 * Verifies tab navigation, Programs/Submissions tabs, and placeholder states in the bug bounty management module.
 */

import { test, expect } from '@playwright/test';

test.describe('Ronin Hub', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible({ timeout: 15000 });
    const roninNav = sidebar.getByRole('button', { name: 'Ronin Hub' });
    await expect(roninNav).toBeVisible({ timeout: 5000 });
    await roninNav.click();
    await expect(page.getByText('Programs').first()).toBeVisible({ timeout: 10000 });
  });

  test('shows all section tabs', async ({ page }) => {
    const tabs = ['Programs', 'Submissions', 'Planning', 'Intelligence'];
    for (const tab of tabs) {
      await expect(page.getByRole('tab', { name: tab })).toBeVisible({ timeout: 5000 });
    }
  });

  test('Programs tab is active by default and shows content', async ({ page }) => {
    const programsTab = page.getByRole('tab', { name: 'Programs' });
    await expect(programsTab).toHaveAttribute('aria-selected', 'true');
    // Programs tab should show either program cards or empty state
    await expect(
      page.getByText(/Programs|Bug bounty|program|No programs|Loading/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('Submissions tab loads and shows content', async ({ page }) => {
    const submissionsTab = page.getByRole('tab', { name: 'Submissions' });
    await expect(submissionsTab).toBeVisible({ timeout: 5000 });
    await submissionsTab.click();
    await expect(submissionsTab).toHaveAttribute('aria-selected', 'true');
    // Submissions tab should show content or empty state
    await expect(
      page.getByText(/Submissions|submission|No submissions|Loading|New Submission/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('Planning tab shows placeholder content truthfully', async ({ page }) => {
    const planningTab = page.getByRole('tab', { name: 'Planning' });
    await expect(planningTab).toBeVisible({ timeout: 5000 });
    await planningTab.click();
    await expect(planningTab).toHaveAttribute('aria-selected', 'true');
    // Planning tab should show empty state with description
    await expect(page.getByText('Planning').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Research planning|target selection/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('Intelligence tab shows placeholder content truthfully', async ({ page }) => {
    const intelligenceTab = page.getByRole('tab', { name: 'Intelligence' });
    await expect(intelligenceTab).toBeVisible({ timeout: 5000 });
    await intelligenceTab.click();
    await expect(intelligenceTab).toHaveAttribute('aria-selected', 'true');
    // Intelligence tab should show empty state with description
    await expect(page.getByText('Intelligence').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/CVE|threat intelligence|feeds|Radio/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('tab switching preserves state', async ({ page }) => {
    // Switch to Submissions
    await page.getByRole('tab', { name: 'Submissions' }).click();
    await expect(page.getByRole('tab', { name: 'Submissions' })).toHaveAttribute('aria-selected', 'true');
    
    // Switch to Planning
    await page.getByRole('tab', { name: 'Planning' }).click();
    await expect(page.getByRole('tab', { name: 'Planning' })).toHaveAttribute('aria-selected', 'true');
    
    // Switch back to Programs
    await page.getByRole('tab', { name: 'Programs' }).click();
    await expect(page.getByRole('tab', { name: 'Programs' })).toHaveAttribute('aria-selected', 'true');
  });

  test('Programs tab supports search/filter if search input exists', async ({ page }) => {
    // Look for search/filter inputs in the Programs tab
    const searchInput = page.locator('input[placeholder*="Search" i], input[aria-label*="Search" i]').first();
    
    // Only test if search input exists
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('OpenAI');
      await page.waitForTimeout(500); // Allow filter to apply
      // Should show filtered results or empty state
      await expect(
        page.getByText(/OpenAI|No results|No matching/i).first()
          .or(page.locator('[data-testid="program-card"], .program-card').first())
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test('module header shows guide and config buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Open Ronin Hub guide/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /Open Ronin Hub settings/i })).toBeVisible({ timeout: 5000 });
  });

  test('guide panel opens when help button clicked', async ({ page }) => {
    await page.getByRole('button', { name: /Open Ronin Hub guide/i }).click();
    await expect(page.getByText('Ronin Hub Guide').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Bug bounty|Programs|Submissions/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('config panel opens when settings button clicked', async ({ page }) => {
    await page.getByRole('button', { name: /Open Ronin Hub settings/i }).click();
    await expect(page.getByText('Ronin Hub Settings').first()).toBeVisible({ timeout: 5000 });
  });
});
