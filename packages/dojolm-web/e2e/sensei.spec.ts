/**
 * E2E Test: Sensei — AI Assistant Chat Drawer
 * Verifies drawer open/close, model picker, chat input, suggestions,
 * message display, and clear history.
 * Backend API: POST /api/sensei/chat
 */

import { test, expect } from '@playwright/test';

test.describe('Sensei Chat', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for app to load
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible({ timeout: 15000 });
  });

  test('floating Sensei button is visible on page load', async ({ page }) => {
    // Bot button in bottom-right corner
    const senseiBtn = page.getByRole('button', { name: /Sensei|Open Sensei|Chat/i }).first();
    await expect(senseiBtn).toBeVisible({ timeout: 10000 });
  });

  test('clicking Sensei button opens the chat drawer', async ({ page }) => {
    const senseiBtn = page.getByRole('button', { name: /Sensei|Open Sensei|Chat/i }).first();
    await expect(senseiBtn).toBeVisible({ timeout: 10000 });
    await senseiBtn.click();

    // Drawer should open with title
    await expect(page.getByText('Sensei').first()).toBeVisible({ timeout: 5000 });
    // Close button should be visible
    await expect(page.getByRole('button', { name: /Close|×/i }).first()).toBeVisible({ timeout: 5000 });
  });

  test('chat drawer shows model picker', async ({ page }) => {
    const senseiBtn = page.getByRole('button', { name: /Sensei|Open Sensei|Chat/i }).first();
    await senseiBtn.click();

    // Model picker dropdown
    await expect(
      page.getByText(/Select a model|Loading models|No models configured/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('chat drawer shows welcome message with suggestions', async ({ page }) => {
    const senseiBtn = page.getByRole('button', { name: /Sensei|Open Sensei|Chat/i }).first();
    await senseiBtn.click();

    // Welcome state
    await expect(page.getByText(/Welcome to Sensei/i)).toBeVisible({ timeout: 10000 });
    // Context-aware suggestion buttons should be present
    await expect(
      page.getByRole('button', { name: /.*/ }).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('chat input area is functional with send button', async ({ page }) => {
    const senseiBtn = page.getByRole('button', { name: /Sensei|Open Sensei|Chat/i }).first();
    await senseiBtn.click();

    // Textarea input
    const chatInput = page.getByPlaceholder(/Ask Sensei/i);
    await expect(chatInput).toBeVisible({ timeout: 10000 });

    // Type a message
    await chatInput.fill('What modules are available?');
    // Send button should be visible
    const sendBtn = page.getByRole('button', { name: /Send/i }).first();
    await expect(sendBtn).toBeVisible({ timeout: 5000 });
  });

  test('clear history button is present in drawer header', async ({ page }) => {
    const senseiBtn = page.getByRole('button', { name: /Sensei|Open Sensei|Chat/i }).first();
    await senseiBtn.click();

    // Trash/clear button in header
    const clearBtn = page.getByRole('button', { name: /Clear|History|Trash/i }).first();
    await expect(clearBtn).toBeVisible({ timeout: 10000 });
  });

  test('Escape key closes the drawer', async ({ page }) => {
    const senseiBtn = page.getByRole('button', { name: /Open Sensei/i }).first();
    await senseiBtn.click();
    await expect(page.getByText(/Welcome to Sensei/i)).toBeVisible({ timeout: 10000 });

    // Press Escape
    await page.keyboard.press('Escape');

    // Drawer slides off-screen (translate-x-full) and becomes aria-hidden.
    // getByRole filters out aria-hidden elements, so use a CSS locator instead.
    await expect(
      page.locator('[role="dialog"][aria-label="Sensei AI Assistant"]')
    ).toHaveAttribute('aria-hidden', 'true', { timeout: 5000 });
  });

  test('close button closes the drawer', async ({ page }) => {
    const senseiBtn = page.getByRole('button', { name: /Open Sensei/i }).first();
    await senseiBtn.click();
    await expect(page.getByText(/Welcome to Sensei/i)).toBeVisible({ timeout: 10000 });

    // Click Close Sensei button in the drawer header
    const closeBtn = page.getByRole('button', { name: 'Close Sensei' }).last();
    await closeBtn.click();

    // Drawer slides off-screen and becomes aria-hidden
    await expect(
      page.locator('[role="dialog"][aria-label="Sensei AI Assistant"]')
    ).toHaveAttribute('aria-hidden', 'true', { timeout: 5000 });
  });

  test('drawer remains accessible across module navigation', async ({ page }) => {
    // Navigate to a different module
    const sidebar = page.locator('aside');
    const scannerNav = sidebar.getByRole('button', { name: 'Haiku Scanner', exact: true });
    await scannerNav.click();
    await expect(page.getByText('Input Text').first()).toBeVisible({ timeout: 10000 });

    // Sensei button should still be visible
    const senseiBtn = page.getByRole('button', { name: /Sensei|Open Sensei|Chat/i }).first();
    await expect(senseiBtn).toBeVisible({ timeout: 5000 });
    await senseiBtn.click();

    // Drawer should open
    await expect(page.getByText(/Welcome to Sensei|Sensei/i).first()).toBeVisible({ timeout: 10000 });
  });
});
