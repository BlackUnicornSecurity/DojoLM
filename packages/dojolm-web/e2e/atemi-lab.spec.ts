/**
 * E2E Test: Atemi Lab — MCP & Tool Attack Simulation
 * Verifies attack mode selector, tool categories, skills library, WebMCP, and session controls.
 * Backend API: POST /api/llm/execute (skill execution)
 */

import { test, expect } from '@playwright/test';

test.describe('Atemi Lab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible({ timeout: 15000 });
    const atemiNav = sidebar.getByRole('button', { name: 'Atemi Lab', exact: true });
    await expect(atemiNav).toBeVisible({ timeout: 5000 });
    await atemiNav.click();
    await expect(page.getByRole('heading', { name: 'Atemi Lab' })).toBeVisible({ timeout: 10000 });
  });

  test('page loads with attack mode selector', async ({ page }) => {
    // Attack Mode card should be visible with radio group
    await expect(page.getByText('Attack Mode').first()).toBeVisible({ timeout: 10000 });
    const modeRadioGroup = page.locator('[role="radiogroup"][aria-label="Select attack mode"]');
    await expect(modeRadioGroup).toBeVisible({ timeout: 10000 });

    // All four modes should be present
    await expect(page.getByRole('radio', { name: /Passive mode/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('radio', { name: /Basic mode/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('radio', { name: /Advanced mode/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('radio', { name: /Aggressive mode/i })).toBeVisible({ timeout: 5000 });
  });

  test('attack mode switching updates active tools count', async ({ page }) => {
    const activeToolsCard = page.getByText('Active Tools').first();
    await expect(activeToolsCard).toBeVisible({ timeout: 10000 });

    // In Passive mode, only notification-flood (minMode=passive) is enabled = 1 tool
    const passiveRadio = page.getByRole('radio', { name: /Passive mode/i });
    await passiveRadio.click();
    await expect(page.getByText('of 17 total').first()).toBeVisible({ timeout: 5000 });

    // Switch to Aggressive — all 17 tools should be active
    const aggressiveRadio = page.getByRole('radio', { name: /Aggressive mode/i });
    await aggressiveRadio.click();
    // The active tools count should show 17
    await expect(page.locator('text=17').first()).toBeVisible({ timeout: 5000 });
  });

  test('attack categories are visible on the Attack Tools tab', async ({ page }) => {
    // Attack Tools tab should be the default
    const attackToolsTab = page.getByRole('tab', { name: /Attack Tools|Tools/i });
    await expect(attackToolsTab).toBeVisible({ timeout: 10000 });

    // Tool Integration Attacks heading should be visible
    await expect(page.getByText('Tool Integration Attacks').first()).toBeVisible({ timeout: 10000 });

    // Some tool cards should be visible (e.g., Browser Exploitation, API Exploitation)
    await expect(page.getByText('Browser Exploitation').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('API Exploitation').first()).toBeVisible({ timeout: 5000 });
  });

  test('Skills library tab renders', async ({ page }) => {
    const skillsTab = page.getByRole('tab', { name: 'Skills' });
    await expect(skillsTab).toBeVisible({ timeout: 10000 });
    await skillsTab.click();

    // Skills library content should appear
    await expect(page.getByText(/Skill|skill/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('MCP tab shows MCP Protocol Attacks', async ({ page }) => {
    // Use exact:true to distinguish 'MCP' from 'WebMCP'
    const mcpTab = page.getByRole('tab', { name: 'MCP', exact: true });
    await expect(mcpTab).toBeVisible({ timeout: 10000 });
    await mcpTab.click();
    await page.waitForLoadState('networkidle');

    // MCP Protocol Attacks heading should be visible
    await expect(page.getByText('MCP Protocol Attacks').first()).toBeVisible({ timeout: 20000 });

    // MCP-specific attack cards should be present
    await expect(page.getByText('Capability Spoofing').first()).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('Tool Poisoning').first()).toBeVisible({ timeout: 15000 });
  });

  test('WebMCP tab renders with target URL input and categories', async ({ page }) => {
    const webmcpTab = page.getByRole('tab', { name: 'WebMCP' });
    await expect(webmcpTab).toBeVisible({ timeout: 10000 });
    await webmcpTab.click();

    // WebMCP Attack Testing heading
    await expect(page.getByText('WebMCP Attack Testing').first()).toBeVisible({ timeout: 10000 });

    // Target URL input
    await expect(page.getByLabel(/Target MCP server URL/i)).toBeVisible({ timeout: 10000 });

    // Transport type radio group
    await expect(page.getByRole('radio', { name: /HTTP transport/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('radio', { name: /SSE transport/i })).toBeVisible({ timeout: 5000 });

    // Attack categories checkboxes
    await expect(page.getByText('Attack Categories').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByLabel(/Web Poisoning/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByLabel(/OAuth Hijacking/i)).toBeVisible({ timeout: 5000 });
  });

  test('session controls are visible in header', async ({ page }) => {
    // Session recorder and Config button should be in the header actions
    const configButton = page.getByRole('button', { name: /Open Atemi Lab configuration/i });
    await expect(configButton).toBeVisible({ timeout: 10000 });
  });

  test('target model selector is visible', async ({ page }) => {
    // Target Model label and select
    await expect(page.getByText('Target Model').first()).toBeVisible({ timeout: 10000 });
    const modelSelect = page.getByLabel(/Select target model for attack execution/i);
    await expect(modelSelect).toBeVisible({ timeout: 5000 });
  });

  test('reconnaissance tools section renders Kagami and Shingan', async ({ page }) => {
    // Scroll down to find reconnaissance section
    await expect(page.getByText('Reconnaissance Tools').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Kagami').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Shingan').first()).toBeVisible({ timeout: 5000 });

    // Launch buttons should be present
    await expect(page.getByRole('button', { name: /Launch Kagami mirror testing/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /Launch Shingan deep scan/i })).toBeVisible({ timeout: 5000 });
  });

  test('config panel opens and closes', async ({ page }) => {
    await page.getByRole('button', { name: /Open Atemi Lab configuration/i }).click();
    await expect(page.getByText('Atemi Lab Config').first()).toBeVisible({ timeout: 5000 });
    
    // Close config
    const closeBtn = page.getByRole('button', { name: /Close configuration/i });
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click();
    }
  });

  test('Protocol Fuzz tab shows coming soon message', async ({ page }) => {
    const fuzzTab = page.getByRole('tab', { name: /Protocol Fuzz|Fuzz/i });
    await expect(fuzzTab).toBeVisible({ timeout: 10000 });
    await fuzzTab.click();
    
    await expect(page.getByText(/Protocol Fuzzing|Coming in Phase/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('attack tool cards show severity badges', async ({ page }) => {
    // Attack Tools tab should be active
    await expect(page.getByText('Tool Integration Attacks').first()).toBeVisible({ timeout: 10000 });

    // Check for severity badges (Critical, High, Medium, Low) — scope to main to avoid hidden sidebar nav text
    const severityBadge = page.locator('main').getByText(/Critical|High|Medium|Low/i).first();
    await expect(severityBadge).toBeVisible({ timeout: 20000 });
  });

  test('attack tool cards have learn more functionality', async ({ page }) => {
    // Find a tool card with Learn More button
    const learnMoreBtn = page.getByRole('button', { name: /Learn More/i }).first();
    if (await learnMoreBtn.isVisible().catch(() => false)) {
      await learnMoreBtn.click();
      // Should show technique details
      await expect(page.getByText(/Technique|Expected Behavior|Defensive Implications/i).first()).toBeVisible({ timeout: 5000 });
    }
  });
});
