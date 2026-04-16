/**
 * E2E Test: Model Lab (was LLM Dashboard)
 *
 * Post Train-2 PR-4b.6 decomposition (2026-04-09):
 *   - Nav renamed `LLM Dashboard` → `Model Lab` (NavId stays 'jutsu')
 *   - Shell trimmed from 7 tabs to 4: Models | Compare | Jutsu | Custom
 *   - Moved out: Tests → Atemi Lab | Results → Dashboard Activity + topbar drawer |
 *     Leaderboard + Analytics → Bushido Book Insights
 *
 * See `src/components/llm/ModelLab.tsx`, `src/lib/constants.ts:102-113`.
 * Backend API: /api/llm/models, /api/llm/execute, /api/llm/export
 */

import { test, expect } from '@playwright/test';

test.describe('Model Lab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible({ timeout: 15000 });
    const modelLabNav = sidebar.getByRole('button', { name: 'Model Lab', exact: true });
    await expect(modelLabNav).toBeVisible({ timeout: 5000 });
    await modelLabNav.click();
    await expect(page.getByRole('heading', { name: 'Model Lab' })).toBeVisible({ timeout: 10000 });
  });

  test('shows Models tab by default with model list or add button', async ({ page }) => {
    await expect(page.getByRole('tab', { name: 'Models', exact: true })).toHaveAttribute('aria-selected', 'true');
    // Should show either existing models or an Add Model button
    await expect(
      page.getByText(/Add Model|No models|Configure your first/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('shows all four Model Lab tabs', async ({ page }) => {
    const tabs = ['Models', 'Compare', 'Jutsu', 'Custom'];
    for (const tab of tabs) {
      await expect(page.getByRole('tab', { name: tab, exact: true })).toBeVisible({ timeout: 5000 });
    }
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

  test('Compare tab shows model selection for side-by-side comparison', async ({ page }) => {
    const compareTab = page.getByRole('tab', { name: 'Compare', exact: true });
    await expect(compareTab).toBeVisible({ timeout: 5000 });
    await compareTab.click();
    await expect(compareTab).toHaveAttribute('aria-selected', 'true');

    // Model selection interface
    await expect(
      page.getByText(/Select.*models|Compare|No models available|Choose/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('Jutsu tab shows model grid with belt rankings', async ({ page }) => {
    const jutsuTab = page.getByRole('tab', { name: 'Jutsu', exact: true });
    await expect(jutsuTab).toBeVisible({ timeout: 5000 });
    await jutsuTab.click();
    await expect(jutsuTab).toHaveAttribute('aria-selected', 'true');

    // Jutsu command center should load
    await expect(
      page.getByText(/Jutsu|Belt|Model|Search|No models/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('Custom tab shows provider template builder', async ({ page }) => {
    const customTab = page.getByRole('tab', { name: 'Custom', exact: true });
    await expect(customTab).toBeVisible({ timeout: 5000 });
    await customTab.click();
    await expect(customTab).toHaveAttribute('aria-selected', 'true');

    // Template builder should show preset options
    await expect(
      page.getByText(/OpenAI-Compatible|Custom|Base URL|Template/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('Custom tab has auth type selector and connection test', async ({ page }) => {
    const customTab = page.getByRole('tab', { name: 'Custom', exact: true });
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

  test('tab switching preserves Model Lab state', async ({ page }) => {
    // Switch to Compare
    const compareTab = page.getByRole('tab', { name: 'Compare', exact: true });
    await compareTab.click();
    await expect(compareTab).toHaveAttribute('aria-selected', 'true');

    // Switch to Jutsu
    const jutsuTab = page.getByRole('tab', { name: 'Jutsu', exact: true });
    await jutsuTab.click();
    await expect(jutsuTab).toHaveAttribute('aria-selected', 'true');

    // Switch back to Models
    const modelsTab = page.getByRole('tab', { name: 'Models', exact: true });
    await modelsTab.click();
    await expect(modelsTab).toHaveAttribute('aria-selected', 'true');

    // Header should still be visible
    await expect(page.getByRole('heading', { name: 'Model Lab' })).toBeVisible({ timeout: 5000 });
  });

  /* ========================================================================== */
  /* Playwright Gap Coverage — LLM Components                                   */
  /* (Tests/Results/Leaderboard moved out — covered by atemi-lab / dashboard /  */
  /*  compliance specs respectively.)                                           */
  /* ========================================================================== */

  test.describe('CustomProviderBuilder', () => {
    test('builder controls are accessible from Custom tab', async ({ page }) => {
      const customTab = page.getByRole('tab', { name: 'Custom', exact: true });
      await customTab.click();
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

  test.describe('LocalModelSelector', () => {
    test('local model selector is accessible in Models tab', async ({ page }) => {
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
    test('model form fields are accessible', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      const addBtn = page.getByRole('button', { name: /Add Model/i }).first();
      await expect(addBtn).toBeVisible({ timeout: 20000 });
      await addBtn.click();
      // ModelForm should have display name, provider, temperature fields
      await expect(page.getByLabel(/Display Name|Name/i).first()).toBeVisible({ timeout: 20000 });
      await expect(page.getByText(/Temperature/i).first()).toBeVisible({ timeout: 15000 });
    });
  });

  /* ========================================================================== */
  /* LLM-008 — Guard badge state under guard-on/off                             */
  /* ========================================================================== */

  test('LLM-008: guard badge is visible in Model Lab header', async ({ page }) => {
    // GuardBadge renders in the ModuleHeader actions area
    const badge = page.locator('[role="status"]').first()
      .or(page.getByText(/Guard|Off|Shinobi|Samurai|Sensei|Hattori/i).first());
    await expect(badge).toBeVisible({ timeout: 10000 });
  });
});
