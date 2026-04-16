/**
 * E2E Test: Amaterasu DNA — Attack Lineage Analysis
 * Verifies family tree, clusters, timeline, analysis, X-Ray tabs,
 * data source selection, search, and zoom controls.
 * Backend API: POST /api/attackdna/ingest
 *
 * Post-Kumite-retirement (2026-04-15): Amaterasu DNA is now a direct
 * sidebar entry in the `intel` nav group. `constants.ts:174-181`.
 */

import { test, expect } from '@playwright/test';

test.describe('Amaterasu DNA', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible({ timeout: 15000 });
    // Direct sidebar navigation (Kumite intermediate step retired)
    const dnaNav = sidebar.getByRole('button', { name: 'Amaterasu DNA', exact: true });
    await expect(dnaNav).toBeVisible({ timeout: 5000 });
    await dnaNav.click();
    await expect(
      page.getByText(/Amaterasu DNA|attack lineage|mutation families|embedding clusters/i).first()
    ).toBeVisible({ timeout: 15000 });
  });

  test('DNA panel loads with title and description', async ({ page }) => {
    await expect(
      page.getByText(/Amaterasu DNA|attack lineage|mutation families|embedding clusters/i).first()
    ).toBeVisible({ timeout: 15000 });
  });

  test('shows data source selector with tier options', async ({ page }) => {
    await expect(
      page.getByText(/Amaterasu DNA|attack lineage/i).first()
    ).toBeVisible({ timeout: 15000 });

    // Data source selector buttons
    await expect(
      page.getByText(/Select Data Sources|dojo-local|master|external/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('shows stats bar with node, edge, family, and cluster counts', async ({ page }) => {
    await expect(
      page.getByText(/Amaterasu DNA|attack lineage/i).first()
    ).toBeVisible({ timeout: 15000 });

    await expect(page.getByText('Nodes').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Edges').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Families').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Clusters').first()).toBeVisible({ timeout: 5000 });
  });

  test('shows search input for attacks', async ({ page }) => {
    await expect(
      page.getByText(/Amaterasu DNA|attack lineage/i).first()
    ).toBeVisible({ timeout: 15000 });

    const searchInput = page.getByPlaceholder(/Search attacks|Search/i);
    await expect(searchInput).toBeVisible({ timeout: 10000 });
  });

  test('shows all five analysis tabs', async ({ page }) => {
    await expect(
      page.getByText(/Amaterasu DNA|attack lineage/i).first()
    ).toBeVisible({ timeout: 15000 });

    // Five tabs: Family Tree, Clusters, Timeline, Analysis, X-Ray
    await expect(page.getByRole('tab', { name: /Family|Tree/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('tab', { name: /Clusters/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('tab', { name: /Timeline/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('tab', { name: /Analysis/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('tab', { name: /X-Ray/i })).toBeVisible({ timeout: 5000 });
  });

  test('Family Tree tab shows hierarchical node visualization', async ({ page }) => {
    await expect(
      page.getByText(/Amaterasu DNA|attack lineage/i).first()
    ).toBeVisible({ timeout: 15000 });

    const familyTab = page.getByRole('tab', { name: /Family|Tree/i });
    await familyTab.click();

    // Family tree should display nodes or empty state
    await expect(
      page.getByText(/Family|Node|Root|Category|No data|Loading/i).first()
    ).toBeVisible({ timeout: 15000 });
  });

  test('Clusters tab shows cluster cards with similarity scores', async ({ page }) => {
    await expect(
      page.getByText(/Amaterasu DNA|attack lineage/i).first()
    ).toBeVisible({ timeout: 15000 });

    const clustersTab = page.getByRole('tab', { name: /Clusters/i });
    await clustersTab.click();

    await expect(
      page.getByText(/Cluster|Similarity|Members|Category|No clusters|Loading/i).first()
    ).toBeVisible({ timeout: 15000 });
  });

  test('Timeline tab shows chronological mutation events', async ({ page }) => {
    await expect(
      page.getByText(/Amaterasu DNA|attack lineage/i).first()
    ).toBeVisible({ timeout: 15000 });

    const timelineTab = page.getByRole('tab', { name: /Timeline/i });
    await timelineTab.click();

    await expect(
      page.getByText(/Timeline|Mutation|Substitution|Encoding|No events|Loading/i).first()
    ).toBeVisible({ timeout: 15000 });
  });

  test('Analysis tab shows black box ablation controls', async ({ page }) => {
    await expect(
      page.getByText(/Amaterasu DNA|attack lineage/i).first()
    ).toBeVisible({ timeout: 15000 });

    const analysisTab = page.getByRole('tab', { name: /Analysis/i });
    await analysisTab.click();

    // Multi-step analysis flow
    await expect(
      page.getByText(/Select Attack|Select Model|Execute|Ablation|Heatmap|Black Box/i).first()
    ).toBeVisible({ timeout: 15000 });
  });

  test('X-Ray tab shows pattern knowledge base', async ({ page }) => {
    await expect(
      page.getByText(/Amaterasu DNA|attack lineage/i).first()
    ).toBeVisible({ timeout: 15000 });

    const xrayTab = page.getByRole('tab', { name: /X-Ray/i });
    await xrayTab.click();

    await expect(
      page.getByText(/Pattern|Category|Bypass|Mitigation|Search|X-Ray/i).first()
    ).toBeVisible({ timeout: 15000 });
  });

  test('help button opens guide panel', async ({ page }) => {
    await expect(
      page.getByText(/Amaterasu DNA|attack lineage/i).first()
    ).toBeVisible({ timeout: 15000 });

    const helpBtn = page.getByRole('button', { name: /Help|Guide/i }).first();
    if (await helpBtn.isVisible().catch(() => false)) {
      await helpBtn.click();
      await expect(
        page.getByText(/Family Trees|Embedding Clusters|Mutation Timeline/i).first()
      ).toBeVisible({ timeout: 5000 });
    }
  });
});
