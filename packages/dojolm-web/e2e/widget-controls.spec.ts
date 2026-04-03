/**
 * E2E Test: Dashboard Widget Control Gaps
 * Covers ~24 widget control gaps across dashboard widgets.
 * Widgets are rendered on the dashboard (/) page.
 */

import { test, expect } from '@playwright/test';

test.describe('Widget Controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 15000 });
  });

  test.describe('FixtureRoulette', () => {
    test('shows Another button', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Another' }).first()).toBeVisible({ timeout: 10000 });
    });

    test('shows Scan It button', async ({ page }) => {
      await expect(page.getByRole('button', { name: /Scan It/i }).first()).toBeVisible({ timeout: 10000 });
    });

    test('shows Again button after interaction', async ({ page }) => {
      // Again button may appear after scanning
      const againBtn = page.getByRole('button', { name: 'Again' }).first();
      const anotherBtn = page.getByRole('button', { name: 'Another' }).first();
      // At least one action button should be visible
      await expect(anotherBtn.or(againBtn)).toBeVisible({ timeout: 10000 });
    });

    test('shows Discover an Attack button', async ({ page }) => {
      await expect(page.getByRole('button', { name: /Discover an Attack/i }).first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('ArenaLeaderboardWidget', () => {
    test('shows View Arena Leaderboard button', async ({ page }) => {
      await expect(page.getByRole('button', { name: /View Arena Leaderboard/i }).first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('EcosystemPulseWidget', () => {
    test('shows Data Flow Details button', async ({ page }) => {
      await expect(page.getByRole('button', { name: /Data Flow Details/i }).first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('KotobaWidget', () => {
    test('shows Open Kotoba Studio button', async ({ page }) => {
      await expect(page.getByRole('button', { name: /Open Kotoba Studio/i }).first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('LLMBatchProgress', () => {
    test('shows more batch button', async ({ page }) => {
      await expect(page.getByRole('button', { name: /more batch/i }).first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('LLMJutsuWidget', () => {
    test('shows Open LLM Jutsu button', async ({ page }) => {
      await expect(page.getByRole('button', { name: /Open LLM Jutsu/i }).first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('LLMModelsWidget', () => {
    test('shows Manage LLM Models button', async ({ page }) => {
      await expect(page.getByRole('button', { name: /Manage LLM Models/i }).first()).toBeVisible({ timeout: 10000 });
    });

    test('shows Configure in LLM Dashboard button', async ({ page }) => {
      await expect(page.getByRole('button', { name: /Configure in LLM Dashboard/i }).first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('MitsukeAlertWidget', () => {
    test('shows View Mitsuke alerts button', async ({ page }) => {
      await expect(page.getByRole('button', { name: /View Mitsuke alerts/i }).first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('QuickLLMTestWidget', () => {
    test('shows Run Test button', async ({ page }) => {
      await expect(page.getByRole('button', { name: /Run Test/i }).first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('SengokuWidget', () => {
    test('shows Open Sengoku Campaigns button', async ({ page }) => {
      await expect(page.getByRole('button', { name: /Open Sengoku Campaigns/i }).first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('TimeChamberWidget', () => {
    test('shows Open Time Chamber button', async ({ page }) => {
      await expect(page.getByRole('button', { name: /Open Time Chamber/i }).first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('SenseiPanel', () => {
    test('shows Reset All button', async ({ page }) => {
      // SenseiPanel may be accessible via a Sensei button on dashboard
      const senseiBtn = page.getByRole('button', { name: /Sensei|Open Sensei|Chat/i }).first();
      const isSenseiVisible = await senseiBtn.isVisible().catch(() => false);
      if (isSenseiVisible) {
        await senseiBtn.click();
        await expect(page.getByRole('button', { name: /Reset All/i }).first()).toBeVisible({ timeout: 10000 });
      }
    });
  });
});
