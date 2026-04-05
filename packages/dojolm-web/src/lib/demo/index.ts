/**
 * File: src/lib/demo/index.ts
 * Purpose: Central demo mode utility — single source of truth for demo state
 *
 * When NEXT_PUBLIC_DEMO_MODE=true, the entire app operates in demo mode:
 * - Auth is bypassed (demo admin user auto-logged in)
 * - API routes return mock data instead of hitting real backends
 * - Setup wizard always shows on page load
 * - No database, filesystem, or external LLM provider calls
 */

/**
 * Returns true when the app is running in demo mode.
 * Uses NEXT_PUBLIC_ prefix so it's available on both server and client.
 */
export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
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
  email: 'admin@demo.dojolm.ai',
  role: 'admin',
  displayName: 'Demo Admin',
};

/** Demo session TTL in seconds (24 hours). */
export const DEMO_SESSION_TTL_SECONDS = 86400;

/** Demo session token used for cookie simulation. */
export const DEMO_SESSION_TOKEN = 'demo-session-v1';

/** Demo CSRF token for form submissions. */
export const DEMO_CSRF_TOKEN = 'demo-csrf-v1';
