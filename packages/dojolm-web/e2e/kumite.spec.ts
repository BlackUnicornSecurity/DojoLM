/**
 * E2E Test: The Kumite — Strategic Hub
 * Verifies subsystem cards, tab navigation, and subsystem detail views.
 * Subsystems: SAGE, Arena, Mitsuke, DNA, Kagami, Shingan
 */

import { test, expect } from '@playwright/test';

test.describe('The Kumite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible({ timeout: 15000 });
    const kumiteNav = sidebar.getByRole('button', { name: 'The Kumite', exact: true });
    await expect(kumiteNav).toBeVisible({ timeout: 5000 });
    await kumiteNav.click();
    await expect(page.getByRole('heading', { name: 'The Kumite' })).toBeVisible({ timeout: 10000 });
  });

  test('overview page loads with all six subsystem cards', async ({ page }) => {
    // All subsystem cards should be visible on the overview
    await expect(page.getByText('SAGE').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Battle Arena').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Mitsuke').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Amaterasu DNA').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Kagami').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Shingan').first()).toBeVisible({ timeout: 5000 });
  });

  test('subsystem cards display metrics', async ({ page }) => {
    // SAGE metrics
    await expect(page.getByText('Generations').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Best Fitness').first()).toBeVisible({ timeout: 5000 });

    // Arena metrics
    await expect(page.getByText('Active Matches').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Total Rounds').first()).toBeVisible({ timeout: 5000 });

    // Mitsuke metrics
    await expect(page.getByText('Active Sources').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Open Alerts').first()).toBeVisible({ timeout: 5000 });
  });

  test('subsystem cards have Open buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Open SAGE dashboard/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /Open Battle Arena dashboard/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /Open Mitsuke dashboard/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /Open Amaterasu DNA dashboard/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /Open Kagami dashboard/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /Open Shingan dashboard/i })).toBeVisible({ timeout: 5000 });
  });

  test('clicking Open SAGE navigates to SAGE detail with tab bar', async ({ page }) => {
    const openSage = page.getByRole('button', { name: /Open SAGE dashboard/i });
    await expect(openSage).toBeVisible({ timeout: 10000 });
    await openSage.click();

    // Tab navigation bar should appear with all subsystem tabs
    await expect(page.getByRole('tab', { name: /SAGE/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('tab', { name: /Arena/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('tab', { name: /Mitsuke/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('tab', { name: /DNA/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('tab', { name: /Kagami/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('tab', { name: /Shingan/i })).toBeVisible({ timeout: 5000 });

    // Overview button should be available to return
    await expect(page.getByRole('button', { name: /Return to The Kumite overview/i })).toBeVisible({ timeout: 5000 });
  });

  test('SAGE tab shows SAGE content', async ({ page }) => {
    const openSage = page.getByRole('button', { name: /Open SAGE dashboard/i });
    await expect(openSage).toBeVisible({ timeout: 10000 });
    await openSage.click();

    // SAGE tab should be active and show content
    const sageTab = page.getByRole('tab', { name: /SAGE/i });
    await expect(sageTab).toBeVisible({ timeout: 10000 });
    await expect(sageTab).toHaveAttribute('aria-selected', 'true');

    // SAGE content should load
    await expect(
      page.getByText(/Seed Library|Evolution|Generations|Fitness|SAGE/i).first()
    ).toBeVisible({ timeout: 15000 });
  });

  test('Arena tab shows arena content', async ({ page }) => {
    const openArena = page.getByRole('button', { name: /Open Battle Arena dashboard/i });
    await expect(openArena).toBeVisible({ timeout: 10000 });
    await openArena.click();

    // Arena tab should be active and its content loading/visible
    const arenaTab = page.getByRole('tab', { name: /Arena/i });
    await expect(arenaTab).toBeVisible({ timeout: 10000 });

    // Arena content should load (ArenaBrowser renders roster or match controls)
    await expect(
      page.getByText(/Choose Fighters|Agent|Roster|Game Mode|Match|Arena/i).first()
    ).toBeVisible({ timeout: 15000 });
  });

  test('Mitsuke tab shows threat feed content', async ({ page }) => {
    const openMitsuke = page.getByRole('button', { name: /Open Mitsuke dashboard/i });
    await expect(openMitsuke).toBeVisible({ timeout: 10000 });
    await openMitsuke.click();

    // Mitsuke tab should be active
    const mitsukeTab = page.getByRole('tab', { name: /Mitsuke/i });
    await expect(mitsukeTab).toBeVisible({ timeout: 10000 });

    // Threat feed content should load (sources, entries, alerts)
    await expect(
      page.getByText(/Connect Sources|Feed|Source|Alert|Threat|Monitor/i).first()
    ).toBeVisible({ timeout: 15000 });
  });

  test('DNA tab shows Amaterasu analysis view', async ({ page }) => {
    const openDna = page.getByRole('button', { name: /Open Amaterasu DNA dashboard/i });
    await expect(openDna).toBeVisible({ timeout: 10000 });
    await openDna.click();

    // DNA tab should be active
    const dnaTab = page.getByRole('tab', { name: /DNA/i });
    await expect(dnaTab).toBeVisible({ timeout: 10000 });

    // DNA analysis content should load (families, clusters, timeline)
    await expect(
      page.getByText(/Select Data Sources|Family|Lineage|Cluster|Analysis|DNA/i).first()
    ).toBeVisible({ timeout: 15000 });
  });

  test('Kagami tab shows mirror testing content', async ({ page }) => {
    const openKagami = page.getByRole('button', { name: /Open Kagami dashboard/i });
    await expect(openKagami).toBeVisible({ timeout: 10000 });
    await openKagami.click();

    // Kagami tab should be active
    const kagamiTab = page.getByRole('tab', { name: /Kagami/i });
    await expect(kagamiTab).toBeVisible({ timeout: 10000 });

    // Kagami content should load
    await expect(
      page.getByText(/Select Targets|Mirror|Version|Consistency|Kagami/i).first()
    ).toBeVisible({ timeout: 15000 });
  });

  test('Shingan tab shows deep scan content', async ({ page }) => {
    const openShingan = page.getByRole('button', { name: /Open Shingan dashboard/i });
    await expect(openShingan).toBeVisible({ timeout: 10000 });
    await openShingan.click();

    // Shingan tab should be active
    const shinganTab = page.getByRole('tab', { name: /Shingan/i });
    await expect(shinganTab).toBeVisible({ timeout: 10000 });

    // Shingan content should load — scope to main to avoid hidden sidebar nav text
    await expect(
      page.locator('main').getByText(/Configure Scan|Deep Scan|Injection|Trust|Shingan/i).first()
    ).toBeVisible({ timeout: 15000 });
  });

  test('tab switching preserves navigation state', async ({ page }) => {
    // Enter SAGE detail view
    const openSage = page.getByRole('button', { name: /Open SAGE dashboard/i });
    await expect(openSage).toBeVisible({ timeout: 10000 });
    await openSage.click();

    // Switch from SAGE to Arena tab
    const arenaTab = page.getByRole('tab', { name: /Arena/i });
    await expect(arenaTab).toBeVisible({ timeout: 10000 });
    await arenaTab.click();

    // Arena content should load
    await expect(
      page.getByText(/Choose Fighters|Agent|Roster|Game Mode|Match|Arena/i).first()
    ).toBeVisible({ timeout: 15000 });

    // Switch to Kagami tab
    const kagamiTab = page.getByRole('tab', { name: /Kagami/i });
    await kagamiTab.click();

    // Kagami content should load
    await expect(
      page.getByText(/Select Targets|Mirror|Version|Consistency|Kagami/i).first()
    ).toBeVisible({ timeout: 15000 });

    // Return to overview
    const overviewBtn = page.getByRole('button', { name: /Return to The Kumite overview/i });
    await overviewBtn.click();

    // Overview should show all subsystem cards again
    await expect(page.getByRole('button', { name: /Open SAGE dashboard/i })).toBeVisible({ timeout: 10000 });
  });

  test('subsystem cards have help and config buttons', async ({ page }) => {
    // Each card should have help and configure buttons
    await expect(page.getByRole('button', { name: /Help for SAGE/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /Configure SAGE/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /Help for Battle Arena/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /Configure Battle Arena/i })).toBeVisible({ timeout: 5000 });
  });

  test('subsystem cards have category badges', async ({ page }) => {
    // Scope to main to avoid hidden sidebar nav descriptions containing these words
    const main = page.locator('main');
    await expect(main.getByText('Evolution').first()).toBeVisible({ timeout: 10000 });
    await expect(main.getByText('Live').first()).toBeVisible({ timeout: 5000 });
    await expect(main.getByText('Intel').first()).toBeVisible({ timeout: 5000 });
    await expect(main.getByText('Analysis').first()).toBeVisible({ timeout: 5000 });
    await expect(main.getByText('Mirror').first()).toBeVisible({ timeout: 5000 });
    await expect(main.getByText('Deep Scan').first()).toBeVisible({ timeout: 5000 });
  });

  test('guide panel opens from help button', async ({ page }) => {
    await page.getByRole('button', { name: /Help for SAGE/i }).click();
    await expect(page.getByText('SAGE Guide').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Synthetic Attack Generator|mutation|fitness/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('config panel opens from configure button', async ({ page }) => {
    await page.getByRole('button', { name: /Configure SAGE/i }).click();
    await expect(page.getByText(/SAGE Configuration|SAGE Config/i).first()).toBeVisible({ timeout: 5000 });
  });
});
