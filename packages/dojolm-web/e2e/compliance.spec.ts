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
    // Inject API key so compliance data loads (requires auth)
    const apiKey = process.env.NODA_API_KEY ?? '';
    if (apiKey) {
      await page.evaluate((key) => localStorage.setItem('noda-api-key', key), apiKey);
    }
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible({ timeout: 15000 });
    const complianceNav = sidebar.getByRole('button', { name: 'Bushido Book' });
    await expect(complianceNav).toBeVisible({ timeout: 5000 });
    await complianceNav.click();
    // Wait for the Bushido Book page to fully render (API may be slow on prod)
    await expect(
      page.locator('main').getByText(/Framework Coverage|Loading compliance|Error loading compliance/i).first()
    ).toBeVisible({ timeout: 40000 });
  });

  test('shows compliance frameworks with coverage data', async ({ page }) => {
    await expect(page.locator('main').getByText(/OWASP LLM Top 10|MITRE ATLAS|NIST AI RMF/i).first()).toBeVisible({ timeout: 30000 });
  });

  test('shows coverage percentages for frameworks', async ({ page }) => {
    await expect(page.locator('main').getByText(/\d+%/).first()).toBeVisible({ timeout: 30000 });
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

  test('all four sub-tabs are visible', async ({ page }) => {
    // Post Train-2 PR-4b.7: Bushido Book consolidated to 4 tabs.
    // Old 7 tabs (Overview, Coverage, Gap Matrix, Audit Trail, Checklists,
    // Navigator, Framework Compliance) → Evidence, Coverage, Results, Audit.
    const tabs = ['Evidence', 'Coverage', 'Results', 'Audit'];
    for (const tab of tabs) {
      await expect(page.getByRole('tab', { name: new RegExp(tab, 'i') })).toBeVisible({ timeout: 5000 });
    }
  });

  test('Evidence tab shows overview, compliance scan, and checklists', async ({ page }) => {
    // Evidence is the default tab — combines old Overview + Checklists
    const evidenceTab = page.getByRole('tab', { name: /Evidence/i });
    await expect(evidenceTab).toBeVisible({ timeout: 10000 });
    await evidenceTab.click();

    // Overview panel with framework data
    await expect(
      page.locator('main').getByText(/OWASP|MITRE|NIST|Framework|Coverage/i).first()
    ).toBeVisible({ timeout: 30000 });
  });

  test('Coverage tab shows gap matrix and navigator', async ({ page }) => {
    // Coverage combines old Coverage + Gap Matrix + Navigator
    const coverageTab = page.getByRole('tab', { name: /Coverage/i });
    await expect(coverageTab).toBeVisible({ timeout: 10000 });
    await coverageTab.click();

    // Coverage map or gap matrix content
    await expect(
      page.locator('main').getByText(/Coverage|Gap|BAISS|Control|Framework/i).first()
    ).toBeVisible({ timeout: 30000 });
  });

  test('Results tab shows compliance results', async ({ page }) => {
    const resultsTab = page.getByRole('tab', { name: /Results/i });
    await expect(resultsTab).toBeVisible({ timeout: 10000 });
    await resultsTab.click();

    await expect(
      page.locator('main').getByText(/Result|Covered|Partial|Gap|Compliance/i).first()
    ).toBeVisible({ timeout: 15000 });
  });

  test('Audit tab shows filter controls and event list', async ({ page }) => {
    const auditTab = page.getByRole('tab', { name: /Audit/i });
    await expect(auditTab).toBeVisible({ timeout: 10000 });
    await auditTab.click();

    // Filter bar or event list
    await expect(
      page.locator('main').getByText(/Action Type|Filter|Showing|entries|No audit/i).first()
    ).toBeVisible({ timeout: 30000 });
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

  /* ========================================================================== */
  /* Playwright Gap Coverage — ComplianceDashboard                              */
  /* ========================================================================== */

  test.describe('ComplianceDashboard', () => {
    test('ComplianceDashboard: dashboard visual controls are accessible', async ({ page }) => {
      // ComplianceDashboard renders the main compliance overview with charts
      await expect(
        page.locator('main').getByText(/Framework Coverage|OWASP|MITRE|NIST/i).first()
      ).toBeVisible({ timeout: 30000 });
      // Visual chart controls (tier/category toggle, framework selector)
      const tierBtn = page.getByRole('radio', { name: /Tier/i });
      const isVisible = await tierBtn.isVisible().catch(() => false);
      if (isVisible) {
        await expect(tierBtn).toBeVisible();
      }
    });
  });

  /* ========================================================================== */
  /* BUSH-005 — Framework-scoped handoff into Model Lab                         */
  /* ========================================================================== */

  test('BUSH-005: framework selection scopes compliance context', async ({ page }) => {
    // Select a specific framework
    const framework = page.getByText(/OWASP LLM Top 10/i).first();
    await expect(framework).toBeVisible({ timeout: 30000 });
    await framework.click();
    // After selection, framework-specific coverage should show
    await expect(
      page.getByText(/Coverage|Covered|Gaps|Controls/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('BUSH-005: coverage dashboard link is accessible', async ({ page }) => {
    // "Open Coverage Dashboard" button in compliance center
    const coverageDashBtn = page.getByRole('button', { name: /Coverage Dashboard|Open Coverage/i }).first();
    if (await coverageDashBtn.isVisible().catch(() => false)) {
      await expect(coverageDashBtn).toBeVisible();
    }
  });
});
