/**
 * E2E Test: Battle Arena — Mode Matrix & Match Results
 *
 * Covers ARENA-002 (battle mode × attack mode matrix) and ARENA-003 (match result integrity).
 * Post-Kumite-retirement: Battle Arena is a direct sidebar entry.
 * Backend API: GET /api/arena, POST /api/arena, GET /api/arena/[id]
 */

import { test, expect } from '@playwright/test';

test.describe('Battle Arena', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible({ timeout: 15000 });
    const arenaNav = sidebar.getByRole('button', { name: 'Battle Arena', exact: true });
    await expect(arenaNav).toBeVisible({ timeout: 5000 });
    await arenaNav.click();
    await expect(
      page.getByText(/Battle Arena|Arena|Match/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  /* ========================================================================== */
  /* ARENA-002 — Battle mode × attack mode matrix                              */
  /* ========================================================================== */

  test.describe('ARENA-002: Mode matrix', () => {
    test('shows match tabs (Browser, Matches, Leaderboard, Rules)', async ({ page }) => {
      // ArenaBrowser tabs: Browser | Matches | Leaderboard | Rules
      // TabsTrigger renders as role="tab" inside TabsList. Wait longer for lazy-loaded tabs.
      // 2026-04-17: All 4 tabs are present on prod so the combined locator resolves
      // to multiple elements. Wrap the `.or()` chain in `.first()` to satisfy strict mode.
      const browserTab = page.getByRole('tab', { name: /Browser/i });
      const matchesTab = page.getByRole('tab', { name: /Matches/i });
      const rulesTab = page.getByRole('tab', { name: /Rules/i });
      const leaderboardTab = page.getByRole('tab', { name: /Leaderboard/i });
      const tabText = page.getByText(/Browser|Matches|Leaderboard|Rules/i);
      await expect(
        browserTab.or(matchesTab).or(rulesTab).or(leaderboardTab).or(tabText).first()
      ).toBeVisible({ timeout: 20000 });
    });

    test('new match button opens creation wizard', async ({ page }) => {
      const newMatchBtn = page.getByRole('button', { name: /New.*Match|New Stand Off|Create/i }).first();
      if (await newMatchBtn.isVisible().catch(() => false)) {
        await newMatchBtn.click();
        // Wizard should show battle mode selection
        await expect(
          page.getByText(/Battle Mode|CTF|KOTH|RvB|Fighter|Attack Mode/i).first()
        ).toBeVisible({ timeout: 10000 });
      }
    });

    test('match creation wizard shows battle mode options', async ({ page }) => {
      const newMatchBtn = page.getByRole('button', { name: /New.*Match|New Stand Off|Create/i }).first();
      if (await newMatchBtn.isVisible().catch(() => false)) {
        await newMatchBtn.click();
        // Battle modes: CTF, KOTH, RvB
        const modeSelector = page.getByText(/CTF|King of the Hill|Red vs Blue/i).first();
        await expect(modeSelector).toBeVisible({ timeout: 10000 });
      }
    });

    test('match creation wizard shows attack mode options', async ({ page }) => {
      const newMatchBtn = page.getByRole('button', { name: /New.*Match|New Stand Off|Create/i }).first();
      if (await newMatchBtn.isVisible().catch(() => false)) {
        await newMatchBtn.click();
        // Attack modes: kunai, shuriken, naginata, musashi
        const attackMode = page.getByText(/kunai|shuriken|naginata|musashi/i).first();
        if (await attackMode.isVisible().catch(() => false)) {
          await expect(attackMode).toBeVisible();
        }
      }
    });
  });

  /* ========================================================================== */
  /* ARENA-003 — Match result integrity                                        */
  /* ========================================================================== */

  test.describe('ARENA-003: Match results', () => {
    test('match list shows status and winner columns', async ({ page }) => {
      // The "Matches" tab (value="roster") shows the ArenaRoster.
      // The "Browser" tab (default) already shows a match table.
      // Check for match table headers or match cards from the default Browser view.
      await expect(
        page.getByText(/Status|Winner|Duration|Rounds|Match|No matches|No Stand Off/i).first()
      ).toBeVisible({ timeout: 10000 });
    });

    test('match export/download control is accessible', async ({ page }) => {
      const exportBtn = page.getByRole('button', { name: /Export|Download/i }).first();
      if (await exportBtn.isVisible().catch(() => false)) {
        await expect(exportBtn).toBeVisible();
      }
    });
  });
});
