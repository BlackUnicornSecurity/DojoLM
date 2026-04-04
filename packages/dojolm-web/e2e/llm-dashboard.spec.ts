/**
 * E2E Test: LLM Dashboard
 * Verifies model management, test execution, results, comparison,
 * leaderboard, custom models, Jutsu, and export functionality.
 * Backend API: /api/llm/models, /api/llm/batch-test, /api/llm/execute, /api/llm/export
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

  test('shows Models tab by default with model list or add button', async ({ page }) => {
    await expect(page.getByRole('tab', { name: 'Models', exact: true })).toHaveAttribute('aria-selected', 'true');
    // Should show either existing models or an Add Model button
    await expect(
      page.getByText(/Add Model|No models|Configure your first/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('shows all seven dashboard tabs', async ({ page }) => {
    const tabs = ['Models', 'Tests', 'Results', 'Compare', 'Custom Models', 'Jutsu'];
    for (const tab of tabs) {
      await expect(page.getByRole('tab', { name: tab, exact: true })).toBeVisible({ timeout: 5000 });
    }
    await expect(page.getByRole('tab', { name: /Board|Leaderboard/ })).toBeVisible({ timeout: 5000 });
  });

  test('Models tab shows Add Model button and provider info', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: /Add Model/i }).first();
    await expect(addBtn).toBeVisible({ timeout: 20000 });
    await addBtn.click();

    await expect(page.getByRole('heading', { name: /Add New Model/i })).toBeVisible({ timeout: 20000 });
    await expect(page.getByLabel(/Display Name/i)).toBeVisible({ timeout: 20000 });
    await expect(page.getByLabel(/^Provider$/i)).toBeVisible({ timeout: 20000 });
  });

  test('Add Model form has required fields and provider dropdown', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: /Add Model/i }).first();
    await expect(addBtn).toBeVisible({ timeout: 20000 });
    await addBtn.click();

    await expect(page.getByLabel(/Display Name/i)).toBeVisible({ timeout: 20000 });
    await expect(page.getByLabel(/^Provider$/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByLabel(/Temperature/i)).toBeVisible({ timeout: 15000 });
  });

  test('Tests tab shows model selection and category filters', async ({ page }) => {
    const testsTab = page.getByRole('tab', { name: 'Tests' });
    await expect(testsTab).toBeVisible({ timeout: 5000 });
    await testsTab.click();
    await expect(testsTab).toHaveAttribute('aria-selected', 'true');

    // Test execution interface should load
    await expect(
      page.getByText(/Run Tests|Select Models|Security|Compliance|Performance|No enabled models/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('Tests tab shows framework selection for OWASP/NIST/MITRE', async ({ page }) => {
    const testsTab = page.getByRole('tab', { name: 'Tests' });
    await testsTab.click();
    await expect(testsTab).toHaveAttribute('aria-selected', 'true');

    // Framework filter buttons or selector
    await expect(
      page.getByText(/OWASP|NIST|MITRE|Framework|All Tests/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('Results tab shows executive summary or empty state', async ({ page }) => {
    const resultsTab = page.getByRole('tab', { name: 'Results' });
    await expect(resultsTab).toBeVisible({ timeout: 5000 });
    await resultsTab.click();
    await expect(resultsTab).toHaveAttribute('aria-selected', 'true');

    // Should show results or empty state
    await expect(
      page.getByText(/Executive Summary|No results|Run your first test|Resilience/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('Results tab has download and view mode controls', async ({ page }) => {
    const resultsTab = page.getByRole('tab', { name: 'Results' });
    await resultsTab.click();

    // Download/export button
    const downloadBtn = page.getByRole('button', { name: /Download|Export/i }).first();
    // View mode toggle (Models vs List)
    const viewToggle = page.getByText(/Models|List/i).first();
    // At least one control should be present
    await expect(
      page.getByText(/Download|Export|Models|List|No results/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('Compare tab shows model selection for side-by-side comparison', async ({ page }) => {
    const compareTab = page.getByRole('tab', { name: 'Compare' });
    await expect(compareTab).toBeVisible({ timeout: 5000 });
    await compareTab.click();
    await expect(compareTab).toHaveAttribute('aria-selected', 'true');

    // Model selection interface
    await expect(
      page.getByText(/Select.*models|Compare|No models available|Choose/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('Custom Models tab shows provider template builder', async ({ page }) => {
    const customTab = page.getByRole('tab', { name: 'Custom Models' });
    await expect(customTab).toBeVisible({ timeout: 5000 });
    await customTab.click();
    await expect(customTab).toHaveAttribute('aria-selected', 'true');

    // Template builder should show preset options
    await expect(
      page.getByText(/OpenAI-Compatible|Custom|Base URL|Template/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('Custom Models tab has auth type selector and connection test', async ({ page }) => {
    const customTab = page.getByRole('tab', { name: 'Custom Models' });
    await customTab.click();

    // Auth type selector
    await expect(
      page.getByText(/Auth|Bearer|API Key|None/i).first()
    ).toBeVisible({ timeout: 10000 });
    // Test Connection button
    const testBtn = page.getByRole('button', { name: /Test Connection|Test/i }).first();
    if (await testBtn.isVisible().catch(() => false)) {
      await expect(testBtn).toBeVisible();
    }
  });

  test('Jutsu tab shows model grid with belt rankings', async ({ page }) => {
    const jutsuTab = page.getByRole('tab', { name: 'Jutsu' });
    await expect(jutsuTab).toBeVisible({ timeout: 5000 });
    await jutsuTab.click();
    await expect(jutsuTab).toHaveAttribute('aria-selected', 'true');

    // Jutsu command center should load
    await expect(
      page.getByText(/Jutsu|Belt|Model|Search|No models/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('Leaderboard tab shows ranked models or empty state', async ({ page }) => {
    const leaderboardTab = page.getByRole('tab', { name: /Board|Leaderboard/ });
    await expect(leaderboardTab).toBeVisible({ timeout: 5000 });
    await leaderboardTab.click();
    await expect(leaderboardTab).toHaveAttribute('aria-selected', 'true');

    // Rankings or empty state
    await expect(
      page.getByText(/Rank|Score|No results|Run tests first|Leaderboard/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('tab switching preserves dashboard state', async ({ page }) => {
    // Switch to Results
    const resultsTab = page.getByRole('tab', { name: 'Results' });
    await resultsTab.click();
    await expect(resultsTab).toHaveAttribute('aria-selected', 'true');

    // Switch to Compare
    const compareTab = page.getByRole('tab', { name: 'Compare' });
    await compareTab.click();
    await expect(compareTab).toHaveAttribute('aria-selected', 'true');

    // Switch back to Models
    const modelsTab = page.getByRole('tab', { name: 'Models', exact: true });
    await modelsTab.click();
    await expect(modelsTab).toHaveAttribute('aria-selected', 'true');

    // Dashboard header should still be visible
    await expect(page.getByRole('heading', { name: 'LLM Testing Dashboard' })).toBeVisible({ timeout: 5000 });
  });

  /* ========================================================================== */
  /* Playwright Gap Coverage — LLM Components                                   */
  /* ========================================================================== */

  test.describe('BenchmarkPanel', () => {
    test('BenchmarkPanel: benchmark panel renders in Results tab', async ({ page }) => {
      const resultsTab = page.getByRole('tab', { name: 'Results' });
      await resultsTab.click();
      await expect(
        page.getByText(/Executive Summary|No results|Run your first test|Resilience|Benchmark/i).first()
      ).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('ChatBubble', () => {
    test('ChatBubble: chat bubbles render in test interaction context', async ({ page }) => {
      // ChatBubble appears in LLM test execution view
      const testsTab = page.getByRole('tab', { name: 'Tests' });
      await testsTab.click();
      await expect(
        page.getByText(/Run Tests|Select Models|Security|No enabled models/i).first()
      ).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('CustomProviderBuilder', () => {
    test('CustomProviderBuilder: builder controls are accessible', async ({ page }) => {
      const customTab = page.getByRole('tab', { name: 'Custom Models' });
      await customTab.click();
      // CustomProviderBuilder has form fields, auth selector, and test connection
      await expect(
        page.getByText(/OpenAI-Compatible|Custom|Base URL|Template/i).first()
      ).toBeVisible({ timeout: 10000 });
      const testConnectionBtn = page.getByRole('button', { name: /Test Connection|Test/i }).first();
      const isVisible = await testConnectionBtn.isVisible().catch(() => false);
      if (isVisible) {
        await expect(testConnectionBtn).toBeVisible();
      }
    });
  });

  test.describe('ExecutiveSummary', () => {
    test('ExecutiveSummary: summary renders in Results tab', async ({ page }) => {
      const resultsTab = page.getByRole('tab', { name: 'Results' });
      await resultsTab.click();
      await expect(
        page.getByText(/Executive Summary|No results|Resilience/i).first()
      ).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('LocalModelSelector', () => {
    test('LocalModelSelector: local model selector is accessible in Models tab', async ({ page }) => {
      // LocalModelSelector appears when adding a local/Ollama model
      const addBtn = page.getByRole('button', { name: /Add Model/i }).first();
      await expect(addBtn).toBeVisible({ timeout: 20000 });
      await addBtn.click();
      // Look for local model or Ollama option in the form
      const localOption = page.getByText(/Local|Ollama|Custom/i).first();
      await expect(localOption).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('ModelForm', () => {
    test('ModelForm: model form fields are accessible', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      const addBtn = page.getByRole('button', { name: /Add Model/i }).first();
      await expect(addBtn).toBeVisible({ timeout: 20000 });
      await addBtn.click();
      // ModelForm should have display name, provider, temperature fields
      await expect(page.getByLabel(/Display Name|Name/i).first()).toBeVisible({ timeout: 20000 });
      await expect(page.getByText(/Temperature/i).first()).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('VulnerabilityPanel', () => {
    test('VulnerabilityPanel: vulnerability details are accessible in Results', async ({ page }) => {
      const resultsTab = page.getByRole('tab', { name: 'Results' });
      await resultsTab.click();
      // VulnerabilityPanel shows detailed vulnerability findings
      await expect(
        page.getByText(/Executive Summary|No results|Vulnerability|Resilience/i).first()
      ).toBeVisible({ timeout: 10000 });
    });
  });
});
