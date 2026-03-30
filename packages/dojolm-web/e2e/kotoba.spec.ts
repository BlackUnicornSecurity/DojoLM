/**
 * E2E Test: Kotoba
 * Verifies prompt input, example loading, character counter, validation, and scoring UI in the Prompt Optimization Studio.
 */

import { test, expect } from '@playwright/test';

test.describe('Kotoba', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible({ timeout: 15000 });
    const kotobaNav = sidebar.getByRole('button', { name: 'Kotoba' });
    await expect(kotobaNav).toBeVisible({ timeout: 5000 });
    await kotobaNav.click();
    await expect(page.getByText(/Prompt Text/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('shows prompt input textarea', async ({ page }) => {
    const textarea = page.getByRole('textbox', { name: 'Prompt text input' });
    await expect(textarea).toBeVisible({ timeout: 5000 });
    await expect(textarea).toHaveAttribute('placeholder', /Paste your system prompt/i);
  });

  test('shows score button disabled when prompt is too short', async ({ page }) => {
    const scoreButton = page.getByRole('button', { name: /Score Prompt/i });
    await expect(scoreButton).toBeVisible({ timeout: 5000 });
    // Initially disabled (no text)
    await expect(scoreButton).toBeDisabled();
    
    // Type less than 20 characters
    const textarea = page.getByRole('textbox', { name: 'Prompt text input' });
    await textarea.fill('Short');
    await expect(scoreButton).toBeDisabled();
    
    // Should show validation message
    await expect(page.getByText(/at least 20 characters/i)).toBeVisible({ timeout: 5000 });
  });

  test('score button enables when prompt reaches 20+ characters', async ({ page }) => {
    const textarea = page.getByRole('textbox', { name: 'Prompt text input' });
    const scoreButton = page.getByRole('button', { name: /Score Prompt/i });
    
    // Type 20+ characters
    await textarea.fill('This is a test prompt with enough characters to enable scoring.');
    await expect(scoreButton).toBeEnabled({ timeout: 5000 });
  });

  test('character counter displays and updates', async ({ page }) => {
    // Character counter should be visible with format "X / 5,000"
    const counter = page.getByText(/\d+\s*\/\s*5,?000/i);
    await expect(counter).toBeVisible({ timeout: 5000 });
    
    // Type some text and verify counter updates
    const textarea = page.getByRole('textbox', { name: 'Prompt text input' });
    await textarea.fill('Hello world');
    
    // Counter should show 11 characters
    await expect(page.getByText(/11\s*\/\s*5,?000/i)).toBeVisible({ timeout: 5000 });
  });

  test('character counter enforces maximum of 5000 characters', async ({ page }) => {
    const textarea = page.getByRole('textbox', { name: 'Prompt text input' });
    
    // Try to type more than 5000 characters
    const longText = 'a'.repeat(5100);
    await textarea.fill(longText);
    
    // Should be capped at 5000
    const value = await textarea.inputValue();
    expect(value.length).toBeLessThanOrEqual(5000);
  });

  test('loading Secure System Prompt example populates textarea', async ({ page }) => {
    const exampleSelect = page.locator('select[aria-label="Load example prompt"]');
    await expect(exampleSelect).toBeVisible({ timeout: 5000 });
    
    await exampleSelect.selectOption('secure');
    
    const textarea = page.getByRole('textbox', { name: 'Prompt text input' });
    await expect(textarea).toContainText(/SYSTEM BOUNDARIES|customer support|Acme Corp/i, { timeout: 5000 });
    
    // Score button should be enabled (secure example is >20 chars)
    const scoreButton = page.getByRole('button', { name: /Score Prompt/i });
    await expect(scoreButton).toBeEnabled({ timeout: 5000 });
  });

  test('loading Insecure example populates textarea', async ({ page }) => {
    const exampleSelect = page.locator('select[aria-label="Load example prompt"]');
    await exampleSelect.selectOption('insecure');
    
    const textarea = page.getByRole('textbox', { name: 'Prompt text input' });
    await expect(textarea).toContainText(/helpful assistant|creative|thorough/i, { timeout: 5000 });
  });

  test('loading Minimal example populates textarea', async ({ page }) => {
    const exampleSelect = page.locator('select[aria-label="Load example prompt"]');
    await exampleSelect.selectOption('minimal');
    
    const textarea = page.getByRole('textbox', { name: 'Prompt text input' });
    await expect(textarea).toContainText(/chatbot|Answer questions/i, { timeout: 5000 });
  });

  test('scoring shows mock analysis results with grade and score', async ({ page }) => {
    // Load secure example to enable scoring
    const exampleSelect = page.locator('select[aria-label="Load example prompt"]');
    await exampleSelect.selectOption('secure');
    
    // Click score button
    const scoreButton = page.getByRole('button', { name: /Score Prompt/i });
    await expect(scoreButton).toBeEnabled({ timeout: 5000 });
    await scoreButton.click();
    
    // Should show analysis results with grade
    await expect(page.getByText(/Grade:\s*[A-F][+-]?/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/\d+\s*\/\s*100/i).first()).toBeVisible({ timeout: 5000 });
    
    // Should show category breakdown
    await expect(page.getByText('Category Breakdown').first()).toBeVisible({ timeout: 5000 });
  });

  test('scoring displays issues with severity badges', async ({ page }) => {
    // Load secure example and score
    const exampleSelect = page.locator('select[aria-label="Load example prompt"]');
    await exampleSelect.selectOption('secure');
    await page.getByRole('button', { name: /Score Prompt/i }).click();
    
    // Should show issues section
    await expect(page.getByText(/Issues/i).first()).toBeVisible({ timeout: 10000 });
    
    // Should show severity indicators (high, medium, low)
    const severityIndicator = page.getByText(/high|medium|low/i).first();
    await expect(severityIndicator).toBeVisible({ timeout: 5000 });
  });

  test('harden button appears after scoring', async ({ page }) => {
    // Load secure example and score
    const exampleSelect = page.locator('select[aria-label="Load example prompt"]');
    await exampleSelect.selectOption('secure');
    await page.getByRole('button', { name: /Score Prompt/i }).click();
    
    // Wait for results then click harden
    await expect(page.getByText(/Grade:/i).first()).toBeVisible({ timeout: 10000 });
    
    const hardenButton = page.getByRole('button', { name: /Harden/i });
    await expect(hardenButton).toBeVisible({ timeout: 5000 });
  });

  test('hardened output shows improved prompt', async ({ page }) => {
    // Load example, score, and harden
    const exampleSelect = page.locator('select[aria-label="Load example prompt"]');
    await exampleSelect.selectOption('secure');
    await page.getByRole('button', { name: /Score Prompt/i }).click();
    
    await expect(page.getByText(/Grade:/i).first()).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /Harden/i }).click();
    
    // Should show hardened prompt output
    await expect(page.getByText('Hardened Prompt').first()).toBeVisible({ timeout: 5000 });
    const hardenedOutput = page.getByRole('textbox', { name: 'Hardened prompt output' });
    await expect(hardenedOutput).toBeVisible({ timeout: 5000 });
    await expect(hardenedOutput).toContainText(/SYSTEM BOUNDARIES|SAFETY RULES/i);
  });

  test('shows stats row with rules and categories', async ({ page }) => {
    await expect(page.getByText('Rules Loaded').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Score Categories').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Avg Grade').first()).toBeVisible({ timeout: 5000 });
  });

  test('how it works section is visible before scoring', async ({ page }) => {
    await expect(page.getByText('How it works').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Boundary Definition').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Role Clarity').first()).toBeVisible({ timeout: 5000 });
  });
});
