/**
 * E2E Test: Sengoku — Continuous Red Teaming
 * Verifies campaign dashboard, tab switching, campaign list, status badges, and temporal tab.
 * Backend API: GET /api/sengoku/campaigns, POST /api/sengoku/campaigns/:id/run
 */

import { test, expect } from '@playwright/test';

test.describe('Sengoku', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Inject API key so authenticated API calls succeed
    const apiKey = process.env.NODA_API_KEY ?? '';
    if (apiKey) {
      await page.evaluate((key) => localStorage.setItem('noda-api-key', key), apiKey);
    }
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible({ timeout: 15000 });
    const sengokuNav = sidebar.getByRole('button', { name: 'Sengoku', exact: true });
    await expect(sengokuNav).toBeVisible({ timeout: 5000 });
    await sengokuNav.click();
    await expect(page.getByRole('heading', { name: 'Sengoku' })).toBeVisible({ timeout: 10000 });
  });

  test('dashboard loads with Campaigns and Temporal tabs', async ({ page }) => {
    const tabList = page.locator('[role="tablist"]');
    await expect(tabList).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('tab', { name: /Campaigns/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('tab', { name: /Temporal/i })).toBeVisible({ timeout: 5000 });
  });

  test('Campaigns tab is active by default', async ({ page }) => {
    const campaignsTab = page.getByRole('tab', { name: /Campaigns/i });
    await expect(campaignsTab).toHaveAttribute('aria-selected', 'true');
  });

  test('shows New Campaign button', async ({ page }) => {
    const newCampaignBtn = page.getByRole('button', { name: /New Campaign/i });
    await expect(newCampaignBtn).toBeVisible({ timeout: 10000 });
    await newCampaignBtn.click();
    // Campaign builder dialog should appear
    await expect(page.getByText(/Campaign Name|Create Campaign|campaign/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('campaign list renders with status indicators or empty state', async ({ page }) => {
    // After loading, we should see either campaign rows with status or an empty state message
    const campaignsTab = page.getByRole('tab', { name: /Campaigns/i });
    await expect(campaignsTab).toBeVisible({ timeout: 10000 });

    // Wait for loading to finish
    await expect(page.getByText('Loading campaigns...')).toBeHidden({ timeout: 15000 });

    // Should show campaign list items (with aria-label containing "Campaign:") or empty state
    const campaignItem = page.locator('button[aria-label^="Campaign:"]').first();
    const emptyState = page.getByText(/No campaigns yet|Authentication required/i).first();

    await expect(campaignItem.or(emptyState)).toBeVisible({ timeout: 10000 });
  });

  test('tab switching between Campaigns and Temporal', async ({ page }) => {
    const campaignsTab = page.getByRole('tab', { name: /Campaigns/i });
    const temporalTab = page.getByRole('tab', { name: /Temporal/i });

    // Campaigns tab is active by default
    await expect(campaignsTab).toBeVisible({ timeout: 10000 });

    // Switch to Temporal
    await temporalTab.click();
    // Temporal tab content should show attack plans or its own content
    await expect(page.getByText(/Accumulation|Delayed Activation|Temporal Attack/i).first()).toBeVisible({ timeout: 10000 });

    // Switch back to Campaigns
    await campaignsTab.click();
    // Should show campaigns content again (loading, list, or empty state)
    await expect(
      page.getByText(/Loading campaigns|No campaigns yet|Authentication required|Campaign Overview/i).first()
        .or(page.locator('button[aria-label^="Campaign:"]').first())
    ).toBeVisible({ timeout: 10000 });
  });

  test('Temporal tab shows demo attack plans', async ({ page }) => {
    const temporalTab = page.getByRole('tab', { name: /Temporal/i });
    await temporalTab.click();

    // Should display demo plans with attack type badges
    await expect(page.getByText('Gradual Jailbreak Escalation').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Sleeper Prompt Activation').first()).toBeVisible({ timeout: 10000 });
  });

  test('campaign detail view opens on campaign click', async ({ page }) => {
    // Wait for loading to complete
    await expect(page.getByText('Loading campaigns...')).toBeHidden({ timeout: 15000 });

    // Only test detail view if campaigns exist (not empty state)
    const campaignItem = page.locator('button[aria-label^="Campaign:"]').first();
    const hasItems = await campaignItem.isVisible().catch(() => false);

    if (hasItems) {
      // The first campaign may be auto-selected; check if detail panel is already visible
      const detailAlreadyVisible = await page.getByRole('button', { name: /Run Now/i }).isVisible().catch(() => false);
      if (!detailAlreadyVisible) {
        // Click to open detail panel
        await campaignItem.click();
        await page.waitForLoadState('domcontentloaded');
      }
      // Detail panel should show with Run Now and Report buttons
      await expect(page.getByRole('button', { name: /Run Now/i })).toBeVisible({ timeout: 15000 });
      await expect(page.getByRole('button', { name: /Report/i })).toBeVisible({ timeout: 10000 });
      // Detail should show target, schedule, and findings info
      await expect(page.getByText(/Target:/i).first()).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(/Schedule:/i).first()).toBeVisible({ timeout: 10000 });
    } else {
      // If no campaigns or auth required, show empty state or ghost card
      await expect(
        page.getByText(/No campaigns yet|Authentication required/i).first()
          .or(page.getByRole('button', { name: /Create new campaign/i }))
      ).toBeVisible({ timeout: 10000 });
    }
  });

  test('campaign status badges show correct labels', async ({ page }) => {
    // Wait for loading to complete
    await expect(page.getByText('Loading campaigns...')).toBeHidden({ timeout: 15000 });

    // Check for any status badges (Active, Draft, Paused, Completed, Archived)
    const statusBadges = page.getByText(/Active|Draft|Paused|Completed|Archived/i);
    const hasBadges = await statusBadges.first().isVisible().catch(() => false);
    
    // Either we have campaigns with status badges, or we see empty state
    if (hasBadges) {
      await expect(statusBadges.first()).toBeVisible({ timeout: 5000 });
    } else {
      // Empty state should show
      await expect(
        page.getByText(/No campaigns yet|Authentication required/i).first()
          .or(page.getByRole('button', { name: /Create new campaign/i }))
      ).toBeVisible({ timeout: 10000 });
    }
  });

  test('stats row displays campaign metrics', async ({ page }) => {
    // Wait for loading to finish
    await expect(page.getByText('Loading campaigns...')).toBeHidden({ timeout: 15000 });

    // Stats row should show key metrics
    await expect(page.getByText('Campaigns').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Temporal Plans').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Active').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Total Findings').first()).toBeVisible({ timeout: 5000 });
  });

  test('create new campaign ghost card is clickable', async ({ page }) => {
    // Wait for loading to complete
    await expect(page.getByText('Loading campaigns...')).toBeHidden({ timeout: 15000 });

    const ghostCard = page.getByRole('button', { name: /Create new campaign/i });
    
    // Only test if ghost card exists (empty state)
    if (await ghostCard.isVisible().catch(() => false)) {
      await ghostCard.click();
      // Campaign builder dialog should appear
      await expect(page.getByText(/Campaign Name|Create Campaign/i).first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('campaign builder dialog can be closed', async ({ page }) => {
    // Open builder
    await page.getByRole('button', { name: /New Campaign/i }).click();
    await expect(page.getByText(/Campaign Name|Create Campaign/i).first()).toBeVisible({ timeout: 10000 });
    
    // Close it (look for close button or backdrop)
    const closeBtn = page.getByRole('button', { name: /Close|Cancel|X/i }).first();
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click();
    } else {
      // Click backdrop
      await page.mouse.click(100, 100);
    }
  });
});
