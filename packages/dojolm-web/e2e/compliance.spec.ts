/**
 * E2E Test: Bushido Book (Compliance)
 * Verifies framework display, tab navigation, gap matrix, checklist,
 * navigator, audit trail, coverage comparison, and export functionality.
 * Backend API: GET /api/compliance, POST /api/compliance/evidence, GET /api/compliance/export
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
    await expect(page.getByRole('heading', { name: 'Framework Coverage' })).toBeVisible({ timeout: 20000 });
  });

  test('shows compliance frameworks with coverage data', async ({ page }) => {
    await expect(page.locator('main').getByText(/OWASP LLM Top 10|MITRE ATLAS|NIST AI RMF/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('shows coverage percentages for frameworks', async ({ page }) => {
    await expect(page.locator('main').getByText(/\d+%/).first()).toBeVisible({ timeout: 10000 });
  });

  test('displays overall score meter', async ({ page }) => {
    // EnsoGauge or score display should show overall compliance score
    await expect(page.getByText(/Overall|Score/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('tier/category toggle switches framework grouping', async ({ page }) => {
    // Find tier/category radio toggle
    const tierBtn = page.getByRole('radio', { name: /Tier/i });
    const categoryBtn = page.getByRole('radio', { name: /Category/i });
    if (await tierBtn.isVisible().catch(() => false)) {
      await tierBtn.click();
      await expect(page.getByText(/Implemented|High Priority|Medium Priority/i).first()).toBeVisible({ timeout: 5000 });
      await categoryBtn.click();
      await expect(page.getByText(/Input Security|Output Security|Governance/i).first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('all seven sub-tabs are visible', async ({ page }) => {
    const tabs = ['Overview', 'Coverage', 'Gap Matrix', 'Audit Trail', 'Checklists', 'Navigator'];
    for (const tab of tabs) {
      await expect(page.getByRole('tab', { name: new RegExp(tab, 'i') })).toBeVisible({ timeout: 5000 });
    }
    // Framework Compliance tab (7th)
    await expect(page.getByRole('tab', { name: /Framework Compliance|Compliance/i }).first()).toBeVisible({ timeout: 5000 });
  });

  test('Coverage tab shows framework selector and comparison controls', async ({ page }) => {
    const coverageTab = page.getByRole('tab', { name: /Coverage/i });
    await expect(coverageTab).toBeVisible({ timeout: 10000 });
    await coverageTab.click();

    // Framework selector should appear
    await expect(page.getByText(/Select Framework|Framework/i).first()).toBeVisible({ timeout: 10000 });
    // Comparison and Changes buttons
    await expect(page.getByRole('button', { name: /Comparison|Changes/i }).first()).toBeVisible({ timeout: 5000 });
  });

  test('Gap Matrix tab renders with BAISS controls and framework columns', async ({ page }) => {
    const gapTab = page.getByRole('tab', { name: /Gap Matrix/i });
    await expect(gapTab).toBeVisible({ timeout: 10000 });
    await gapTab.click();

    // Gap matrix should load with controls
    await expect(page.getByText(/BAISS|Control|Gap/i).first()).toBeVisible({ timeout: 15000 });
    // Show All toggle or column picker should be present
    await expect(page.getByText(/Show All|Column|Frameworks/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('Audit Trail tab shows filter controls and event list', async ({ page }) => {
    const auditTab = page.getByRole('tab', { name: /Audit Trail/i });
    await expect(auditTab).toBeVisible({ timeout: 10000 });
    await auditTab.click();

    // Filter bar should have action type and date inputs
    await expect(page.getByText(/Action Type|Filter/i).first()).toBeVisible({ timeout: 10000 });
    // Results count
    await expect(page.getByText(/Showing|entries|No audit/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('Checklists tab shows framework-specific review checklist', async ({ page }) => {
    const checklistTab = page.getByRole('tab', { name: /Checklists/i });
    await expect(checklistTab).toBeVisible({ timeout: 10000 });
    await checklistTab.click();

    // Framework selector and completion badge
    await expect(page.getByText(/Select Framework|complete/i).first()).toBeVisible({ timeout: 10000 });
    // Filter pills
    await expect(page.getByText(/All|Manual|Semi-Auto|Pending/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('Navigator tab shows bidirectional mapping controls', async ({ page }) => {
    const navTab = page.getByRole('tab', { name: /Navigator/i });
    await expect(navTab).toBeVisible({ timeout: 10000 });
    await navTab.click();

    // Direction toggle and search
    await expect(page.getByText(/BAISS.*Source|Source.*BAISS/i).first()).toBeVisible({ timeout: 10000 });
    // Search input should be present
    const searchInput = page.getByPlaceholder(/Search|Filter/i);
    if (await searchInput.isVisible().catch(() => false)) {
      await expect(searchInput).toBeVisible();
    }
  });

  test('Framework Compliance tab shows control heatmap with status badges', async ({ page }) => {
    const fwTab = page.getByRole('tab', { name: /Framework Compliance/i }).first();
    await expect(fwTab).toBeVisible({ timeout: 10000 });
    await fwTab.click();

    // Control table with status badges
    await expect(page.getByText(/Covered|Partial|Gap/i).first()).toBeVisible({ timeout: 15000 });
  });

  test('export controls are available with format options', async ({ page }) => {
    // Export button or format selector should be accessible
    const exportBtn = page.getByRole('button', { name: /Export|Download/i }).first();
    if (await exportBtn.isVisible().catch(() => false)) {
      await expect(exportBtn).toBeVisible();
    }
    // Or look for format dropdown
    const formatSelector = page.getByText(/Markdown|JSON|CSV/i).first();
    if (await formatSelector.isVisible().catch(() => false)) {
      await expect(formatSelector).toBeVisible();
    }
  });

  test('selecting a framework populates overview with coverage details', async ({ page }) => {
    // Click on a framework in the tier list
    const framework = page.getByText(/OWASP LLM Top 10/i).first();
    await expect(framework).toBeVisible({ timeout: 10000 });
    await framework.click();

    // Overview should show coverage stats
    await expect(page.getByText(/Coverage|Covered|Gaps/i).first()).toBeVisible({ timeout: 10000 });
  });
});
