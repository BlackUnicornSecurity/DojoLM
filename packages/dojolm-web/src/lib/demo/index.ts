// SPDX-License-Identifier: Apache-2.0
/**
 * File: src/lib/demo/index.ts
 * Purpose: Central demo/preview/partial mode utilities — single source of
 * truth for runtime feature-maturity state.
 *
 * Modes (Wave 0 Track C.5, 2026-04-18):
 *   - demo    — all API routes return mocks, auth bypassed, no external calls.
 *   - preview — feature is mounted and reachable but backend is limited
 *               (e.g. reference-only, fixed responses). UI renders a Preview
 *               badge so users know not to rely on production behaviour.
 *   - partial — feature has real backend for some flows; other flows are
 *               still mocked or disabled. UI renders a Partial badge.
 *
 * `demo` is an all-or-nothing kill-switch. `preview` and `partial` are
 * feature-scoped maturity labels — they do not change API routing, only UI
 * surfacing. Existing `isDemoMode()` callers are unaffected.
 */

/**
 * Runtime feature-maturity mode surfaced in the UI. `null` means the feature
 * is production-ready (no badge). Only one mode can be active at a time;
 * `demo` always wins when set.
 */
export type FeatureMode = 'demo' | 'preview' | 'partial';

let __demoProdGuardWarned = false;

/**
 * Returns true when the app is running in demo mode.
 * Uses NEXT_PUBLIC_ prefix so it's available on both server and client.
 *
 * Fail-safe: demo mode is refused in production (NODE_ENV==='production' and
 * TPI_ALLOW_DEMO_IN_PROD !== 'true'). This prevents an accidentally set
 * NEXT_PUBLIC_DEMO_MODE=true build-arg from silently disabling all auth on a
 * real deployment.
 */
export function isDemoMode(): boolean {
  const requested = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
  if (!requested) return false;
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.TPI_ALLOW_DEMO_IN_PROD !== 'true'
  ) {
    if (!__demoProdGuardWarned) {
      // eslint-disable-next-line no-console
      console.error(
        '[demo] NEXT_PUBLIC_DEMO_MODE=true is set in production — refusing. ' +
          'Set TPI_ALLOW_DEMO_IN_PROD=true to override (ONLY for staging preview).'
      );
      __demoProdGuardWarned = true;
    }
    return false;
  }
  return true;
}

/**
 * Shape matching SessionUser from auth/session.ts.
 * Defined locally to avoid importing session.ts (which pulls in native DB deps).
 */
interface DemoSessionUser {
  id: string;
  username: string;
  email: string;
  role: string;
  displayName: string | null;
}

/** Demo admin user injected into auth contexts when in demo mode. */
export const DEMO_USER: DemoSessionUser = {
  id: 'demo-admin-001',
  username: 'demo-admin',
  email: 'admin@demo.dojolm.example',
  role: 'admin',
  displayName: 'Demo Admin',
};

/** Demo session TTL in seconds (24 hours). */
export const DEMO_SESSION_TTL_SECONDS = 86400;

/**
 * Demo session/CSRF tokens generated at module load (AUTH-05 fix).
 * Unique per process lifecycle — prevents attackers from pre-knowing the token
 * if demo mode is accidentally enabled in production.
 */
function generateDemoToken(length: number): string {
  // Works in both Node.js and browser environments
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    // Use Web Crypto API (available in Node 19+ and all modern browsers)
    return Array.from({ length: Math.ceil(length / 16) }, () =>
      globalThis.crypto.randomUUID().replace(/-/g, '')
    ).join('').slice(0, length * 2);
  }
  // Fallback: timestamp + Math.random (weaker but non-static)
  return `demo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/** Demo session token — unique per process lifecycle. */
export const DEMO_SESSION_TOKEN = generateDemoToken(32);

/** Demo CSRF token — unique per process lifecycle. */
export const DEMO_CSRF_TOKEN = generateDemoToken(16);

/**
 * Returns the active feature-maturity mode, or `null` when none are set.
 *
 * Resolution order (first match wins):
 *   1. `demo`    — when `isDemoMode()` resolves true.
 *   2. `preview` — when NEXT_PUBLIC_PREVIEW_MODE === 'true'.
 *   3. `partial` — when NEXT_PUBLIC_PARTIAL_MODE === 'true'.
 *   4. `null`    — production, no badge.
 *
 * Preview and partial modes do NOT trigger demo-data routing; they only
 * affect the UI badge surface. Wave 0 Track C.5.
 */
export function getFeatureMode(): FeatureMode | null {
  if (isDemoMode()) return 'demo';
  if (process.env.NEXT_PUBLIC_PREVIEW_MODE === 'true') return 'preview';
  if (process.env.NEXT_PUBLIC_PARTIAL_MODE === 'true') return 'partial';
  return null;
}
