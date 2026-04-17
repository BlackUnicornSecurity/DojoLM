/**
 * E2E Test: Mobile Navigation (MobileNav bottom bar + More drawer)
 * Verifies mobile navigation works at < 768px viewport.
 * Uses a forced mobile viewport so this spec runs in all playwright projects.
 */

import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });

test.describe('Mobile Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the mobile bottom nav to appear (sidebar text is hidden at mobile widths)
    await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible({ timeout: 15000 });
  });

  test('bottom nav bar is visible on mobile', async ({ page }) => {
    const mobileNav = page.getByRole('navigation', { name: 'Mobile navigation' });
    await expect(mobileNav).toBeVisible();
  });

  test('sidebar is hidden on mobile', async ({ page }) => {
    const sidebar = page.locator('aside');
    await expect(sidebar).not.toBeVisible();
  });

  test('bottom nav shows Home, Scan, Model Lab, Guard, and More buttons', async ({ page }) => {
    const mobileNav = page.getByRole('navigation', { name: 'Mobile navigation' });
    // Buttons use aria-label from the full `label` nav item field (not `mobileLabel`);
    // see src/components/layout/MobileNav.tsx:64. Use exact:true to avoid substring
    // collisions (e.g. "Dashboard" also matches other labels).
    await expect(mobileNav.getByRole('button', { name: 'Dashboard', exact: true })).toBeVisible();
    await expect(mobileNav.getByRole('button', { name: 'Haiku Scanner', exact: true })).toBeVisible();
    await expect(mobileNav.getByRole('button', { name: 'Model Lab', exact: true })).toBeVisible();
    await expect(mobileNav.getByRole('button', { name: 'Hattori Guard', exact: true })).toBeVisible();
    await expect(mobileNav.getByRole('button', { name: /More navigation options/i })).toBeVisible();
  });

  test('tapping Scan navigates to Haiku Scanner', async ({ page }) => {
    const mobileNav = page.getByRole('navigation', { name: 'Mobile navigation' });
    // Button aria-label is the full name as shown in the "bottom nav shows" test
    await mobileNav.getByRole('button', { name: 'Haiku Scanner', exact: true }).click();
    await expect(page.getByText('Input Text').first()).toBeVisible({ timeout: 10000 });
  });

  test('tapping Model Lab navigates to Model Lab', async ({ page }) => {
    const mobileNav = page.getByRole('navigation', { name: 'Mobile navigation' });
    // Button aria-label is the full `label` (Model Lab), visible text is `mobileLabel` (Jutsu).
    await mobileNav.getByRole('button', { name: 'Model Lab', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Model Lab' }).first()).toBeVisible({ timeout: 10000 });
  });

  test('tapping Guard navigates to Hattori Guard', async ({ page }) => {
    const mobileNav = page.getByRole('navigation', { name: 'Mobile navigation' });
    // Button aria-label is the full name as shown in the "bottom nav shows" test
    await mobileNav.getByRole('button', { name: 'Hattori Guard', exact: true }).click();
    await expect(page.getByText('Guard Mode').first()).toBeVisible({ timeout: 10000 });
  });

  test('More button opens the drawer', async ({ page }) => {
    const mobileNav = page.getByRole('navigation', { name: 'Mobile navigation' });
    const moreBtn = mobileNav.getByRole('button', { name: /More navigation options/i });
    await moreBtn.click();

    const drawer = page.getByRole('dialog', { name: 'More navigation options' });
    await expect(drawer).toBeVisible({ timeout: 3000 });
  });

  test('More drawer shows additional navigation items', async ({ page }) => {
    const mobileNav = page.getByRole('navigation', { name: 'Mobile navigation' });
    await mobileNav.getByRole('button', { name: /More navigation options/i }).click();

    const drawer = page.getByRole('dialog', { name: 'More navigation options' });
    await expect(drawer).toBeVisible({ timeout: 3000 });

    // At least some secondary nav items should appear in the drawer
    const buttons = drawer.getByRole('button');
    const count = await buttons.count();
    expect(count).toBeGreaterThan(1); // close button + at least one nav item
  });

  test('More drawer can be closed with X button', async ({ page }) => {
    const mobileNav = page.getByRole('navigation', { name: 'Mobile navigation' });
    await mobileNav.getByRole('button', { name: /More navigation options/i }).click();

    const drawer = page.getByRole('dialog', { name: 'More navigation options' });
    await expect(drawer).toBeVisible({ timeout: 3000 });

    await drawer.getByRole('button', { name: 'Close more menu' }).click();
    await expect(drawer).not.toBeVisible({ timeout: 3000 });
  });

  test('More drawer closes when backdrop is clicked', async ({ page }) => {
    const mobileNav = page.getByRole('navigation', { name: 'Mobile navigation' });
    await mobileNav.getByRole('button', { name: /More navigation options/i }).click();

    const drawer = page.getByRole('dialog', { name: 'More navigation options' });
    await expect(drawer).toBeVisible({ timeout: 3000 });

    // Click backdrop (top of screen, outside nav and drawer)
    await page.mouse.click(195, 100);
    await expect(drawer).not.toBeVisible({ timeout: 3000 });
  });

  test('can navigate to Buki from More drawer', async ({ page }) => {
    // Armory absorbed into Buki (2026-04-13 Testing UX Consolidation).
    // Buki is not isPrimary, so it appears in the More drawer.
    // 2026-04-17: Drawer buttons now render dual-line (label + description) so the
    // accessible name is "BukiFixtures, payloads, synthetic generator, and fuzzer".
    // Match by leading "Buki" substring instead of exact match.
    test.setTimeout(120000);
    const mobileNav = page.getByRole('navigation', { name: 'Mobile navigation' });
    await mobileNav.getByRole('button', { name: /More navigation options/i }).click();

    const drawer = page.getByRole('dialog', { name: 'More navigation options' });
    await expect(drawer).toBeVisible({ timeout: 5000 });

    await drawer.getByRole('button', { name: /^Buki/ }).first().click();
    // Buki page renders ModuleHeader with title "Buki" and tabs: Fixtures, Payloads, etc.
    // On mobile viewport, module loads can be slow; wait for DOM content first.
    // 2026-04-17: Scope to <main> — the sidebar has a hidden "Payloads & Fixtures"
    // nav span that otherwise resolves first and stays hidden forever on mobile.
    await page.waitForLoadState('domcontentloaded');
    await expect(
      page.locator('main').getByText(/Buki|Fixtures|Payloads|Payload Lab/i).first()
    ).toBeVisible({ timeout: 90000 });
  });
});
