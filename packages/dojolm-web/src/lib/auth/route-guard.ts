// SPDX-License-Identifier: Apache-2.0
/**
 * API route protection: session validation, RBAC enforcement, and CSRF.
 *
 * Provides `withAuth()` HOF for wrapping Next.js API route handlers.
 * Handles 401 (unauthenticated) and 403 (insufficient permissions).
 *
 * RBAC semantics: `role` and `resource+action` are BOTH enforced when
 * both are provided (cumulative). Either alone is also valid.
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { validateSession, type SessionUser } from './session';
import { hasPermission, isAtLeastRole, type Resource, type Action, VALID_ROLES } from './rbac';
import { parseAndVerifySessionCookie, buildSignedSessionCookieValue, SESSION_COOKIE_NAME } from './session-claim';
import type { UserRole } from '../db/types';
import { isDemoMode, DEMO_USER } from '../demo';
import { getApiKeyRoleEnv } from '../api-key-env';

/** Valid API key permission entry for JSON mapping */
interface ApiKeyPermission {
  keyHash: string;
  role: UserRole;
}

/**
 * Parse and validate API_KEY_PERMISSIONS JSON env var.
 * YR.14.2: SUNSET fallback only — the DB-backed `api_keys` table is the
 * authoritative source of truth. This path runs only when the supplied
 * key has no DB row and the env var is set.
 */
function getApiKeyPermissions(): Map<string, UserRole> {
  const permissionsMap = new Map<string, UserRole>();
  const permissionsJson = process.env.API_KEY_PERMISSIONS;

  if (!permissionsJson) {
    return permissionsMap;
  }

  try {
    const permissions = JSON.parse(permissionsJson) as ApiKeyPermission[];
    for (const entry of permissions) {
      if (entry.keyHash && VALID_ROLES.includes(entry.role)) {
        permissionsMap.set(entry.keyHash, entry.role);
      }
    }
  } catch {
    console.warn('API_KEY_PERMISSIONS is set but contains invalid JSON — ignoring');
  }

  return permissionsMap;
}

/**
 * One-shot deprecation warn — fires the first time a process resolves
 * an API key via the env-var fallback. Module-scoped boolean so the
 * warn is per-process, not per-request. Reset by tests via
 * `resetEnvFallbackWarn()`.
 */
let envFallbackWarned = false;
function warnEnvFallbackOncePerProcess(): void {
  if (envFallbackWarned) return;
  envFallbackWarned = true;
  console.warn(
    '[api-key] DB miss, falling back to API_KEY_PERMISSIONS env var — sunset deprecation: this path will be removed in YR.14.2+1. Migrate to /admin/api-keys.',
  );
}

/** Test helper — resets the per-process warn latch. Production never calls. */
export function resetEnvFallbackWarn(): void {
  envFallbackWarned = false;
}

/**
 * YR.14.2 — DB-first API-key resolution. Returns the role for a valid
 * X-API-Key header, or `null` for invalid / revoked / expired keys.
 *
 * Resolution order (CRIT-4):
 *   1. Hash the supplied key (SHA-256 hex) and look up `api_keys` row.
 *      - Active row found: return derived role; mark `last_used_at`
 *        best-effort; the route-guard treats this as authenticated.
 *      - Row exists but `revoked_at IS NOT NULL` OR `expires_at <= now`:
 *        the repo's `findByKeyHash` already returns null for these, so
 *        they fall through to step 2. **CRITICAL**: if the env-var
 *        fallback would also resolve this key, it MUST NOT — because a
 *        revoked DB row is intentional revocation.
 *   2. Sunset env-var fallback. Emits a one-time per-process warn so
 *      operators see the deprecation in logs.
 *   3. Default `member` (least privilege). The legacy default was
 *      `operator`; YR.14.2 tightens this because the DB-backed surface
 *      is now the supported issuance path.
 *
 * The CRIT-4 requirement: a key hash that exists in the DB but is
 * revoked is rejected with `null` regardless of whether the env-var
 * fallback would have resolved it. Implemented by checking for any
 * row (active or revoked) before falling through to env-var.
 */
export async function getApiKeyRole(apiKey: string): Promise<UserRole | null> {
  if (typeof apiKey !== 'string' || apiKey.length === 0) return null;

  // Dynamic import keeps this module Node-runtime safe; the repo barrel
  // imports better-sqlite3 transitively, which is fine in a Node API
  // handler but not on the Edge.
  const [{ apiKeyRepo, deriveRoleFromScopes }, { hashApiKey }] = await Promise.all([
    import('../db/repositories/api-key.repository'),
    import('../api-keys/code'),
  ]);
  const keyHash = hashApiKey(apiKey);

  // Step 1: DB-first lookup. The repo returns null for revoked/expired
  // rows, so this branch only succeeds for active keys.
  let activeRow: ReturnType<typeof apiKeyRepo.findByKeyHash> = null;
  try {
    activeRow = apiKeyRepo.findByKeyHash(keyHash);
  } catch (err) {
    // DB unavailable — log and fall through to env-var. NEVER return
    // a role from a DB error: that would let a transient lock cause
    // privilege escalation if the env var has the same key with a
    // different role.
    console.error('[api-key] DB lookup failed:', err);
  }

  if (activeRow) {
    // Best-effort last-used update. Wrapped so a transient lock never
    // 503s a legitimate request.
    try {
      const scopes = JSON.parse(activeRow.scopes_json) as unknown;
      const scopeArray = Array.isArray(scopes)
        ? scopes.filter((s): s is string => typeof s === 'string')
        : [];
      apiKeyRepo.markUsed(activeRow.id);
      return deriveRoleFromScopes(scopeArray);
    } catch {
      return deriveRoleFromScopes([]);
    }
  }

  // CRIT-4 — revocation propagation. Before falling back to the env-var
  // path, check whether the DB has ANY row for this hash (including
  // revoked/expired). If it does, the operator's intent is revocation;
  // honour that even if the env var still has the key.
  //
  // Pass-1 security HIGH fold-in: when this check cannot reach the DB,
  // we fail SECURE (return null → 401) rather than fall through to
  // env-var. An adversary who can induce a sustained DB outage holding
  // a revoked key would otherwise resolve through the env-var path.
  // The env-var fallback is for keys NEVER enrolled in the DB, not a
  // failover for unreadable rows.
  let dbRowExists = false;
  let dbRowCheckFailed = false;
  try {
    const { getDatabase } = await import('../db/database');
    const row = getDatabase()
      .prepare('SELECT id FROM api_keys WHERE key_hash = ?')
      .get(keyHash) as { id: string } | undefined;
    dbRowExists = row !== undefined;
  } catch (err) {
    dbRowCheckFailed = true;
    console.error('[api-key] CRIT-4 row-existence check failed (fail-secure):', err);
  }
  if (dbRowExists) {
    // Row exists but is revoked/expired — explicit rejection.
    return null;
  }
  if (dbRowCheckFailed) {
    // Fail-secure: DB unavailable for the existence check, so we cannot
    // safely confirm the absence of a revoked row. Reject the request.
    return null;
  }

  // Step 2: Sunset env-var fallback. Emit one-time deprecation warn.
  const permissionsMap = getApiKeyPermissions();
  if (permissionsMap.size > 0) {
    // Legacy 16-char prefix lookup (kept for backwards compat with
    // pre-YR.14.2 deployments). The DB path uses the full 64-char
    // hash so the two key spaces do not collide.
    const legacyHash = crypto.createHash('sha256').update(apiKey).digest('hex').slice(0, 16);
    const specificRole = permissionsMap.get(legacyHash);
    if (specificRole) {
      warnEnvFallbackOncePerProcess();
      return specificRole;
    }
  }
  const configuredRole = getApiKeyRoleEnv() as UserRole;
  if (VALID_ROLES.includes(configuredRole)) {
    warnEnvFallbackOncePerProcess();
    return configuredRole;
  }

  // Step 3: tightened default. Pre-YR.14.2 returned `operator`; the
  // DB-backed surface is now the supported issuance path, so unmapped
  // keys get the least-privileged role. Operators with deployed
  // unmapped keys MUST issue a real DB-backed key via /admin/api-keys.
  return 'member';
}

// SESSION_COOKIE_NAME is owned by the Edge-safe `session-claim.ts` so
// `middleware/rbac.ts` can import it without pulling in this module's
// node:crypto + DB chain. We re-export below for downstream consumers.
const CSRF_COOKIE_NAME = 'tpi_csrf';
const CSRF_HEADER_NAME = 'x-csrf-token';
const STATE_MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * True when the request carries a CSRF cookie at all. Lets a caller decide
 * whether the double-submit check is even applicable — e.g. the forgiving
 * `/api/auth/logout` route only enforces CSRF when there is a live `tpi_csrf`
 * cookie to validate (no cookie ⇒ no session to protect ⇒ idempotent logout).
 */
export function hasCsrfCookie(req: NextRequest): boolean {
  return Boolean(req.cookies.get(CSRF_COOKIE_NAME)?.value);
}

/**
 * Double-submit CSRF check (single source of truth). Returns true iff the
 * `tpi_csrf` cookie is present AND the `x-csrf-token` header matches it via a
 * timing-safe, length-checked comparison. Used by `withAuth` and by any route
 * that enforces CSRF outside the HOF (e.g. the public, body-less logout route).
 */
export function hasValidCsrfDoubleSubmit(req: NextRequest): boolean {
  const csrfCookie = req.cookies.get(CSRF_COOKIE_NAME)?.value;
  const csrfHeader = req.headers.get(CSRF_HEADER_NAME);
  // PT-CSRF-M03: timing-safe comparison; length pre-check avoids a throw in
  // timingSafeEqual on unequal-length buffers (and is not itself a leak).
  return Boolean(
    csrfCookie &&
      csrfHeader &&
      csrfCookie.length === csrfHeader.length &&
      crypto.timingSafeEqual(Buffer.from(csrfCookie), Buffer.from(csrfHeader)),
  );
}

export interface RouteGuardOptions {
  /** Minimum role required. If omitted, any authenticated user is allowed. */
  role?: UserRole;
  /** Specific resource/action check. Cumulative with role when both provided. */
  resource?: Resource;
  action?: Action;
  /** Skip CSRF check (only for non-state-mutating endpoints). Default: false */
  skipCsrf?: boolean;
  /** Extra headers to include on ALL responses (including 401/403).
   *  Use case: v1 deprecated routes need Sunset/Deprecation headers even on auth failure. */
  extraHeaders?: Record<string, string>;
}

/** Context shape matching Next.js 16+ route handler second argument */
type RouteContext = { params: Promise<unknown> };

// Next.js 16+ route handler signature
type RouteHandler = (
  req: NextRequest,
  context: RouteContext
) => Promise<NextResponse | Response> | NextResponse | Response;

/**
 * Handler signature after withAuth resolves params.
 * `params` is always a resolved plain object (never a Promise) by the time
 * the handler receives it — withAuth awaits it before forwarding.
 */
type AuthenticatedHandler = (
  req: NextRequest,
  context: { params?: Record<string, string>; user: SessionUser }
) => Promise<NextResponse | Response> | NextResponse | Response;

/**
 * Higher-order function wrapping an API route with auth + RBAC + CSRF.
 *
 * Both `role` and `resource+action` are enforced when both specified.
 * CSRF validation enforced for POST/PUT/PATCH/DELETE via double-submit cookie.
 */
export function withAuth(
  handler: AuthenticatedHandler,
  options?: RouteGuardOptions
): RouteHandler {
  return async (req: NextRequest, context?: RouteContext) => {
    // Next.js 16+ passes params as a Promise — resolve before forwarding
    let resolvedParams: Record<string, string> | undefined;
    try {
      resolvedParams = context?.params
        ? (await context.params) as Record<string, string>
        : undefined;
    } catch {
      return NextResponse.json(
        { error: 'Route parameter resolution failed' },
        { status: 500 }
      );
    }

    // Demo mode: bypass all auth checks with synthetic admin user
    if (isDemoMode()) {
      return handler(req, { params: resolvedParams, user: DEMO_USER });
    }

    let user: SessionUser | null = null;
    // Track which credential ACTUALLY resolved `user`. The CSRF exemption
    // below (line ~190) keys off this resolved-method signal, not the
    // pre-auth presence of a cookie or header — that distinction matters
    // because a request can carry a malformed cookie AND a valid API key,
    // in which case the API-key path is the real auth and CSRF should be
    // skipped (security pass-1 H-01).
    type AuthMethod = 'none' | 'cookie' | 'api-key';
    let authMethod: AuthMethod = 'none';

    // Try session cookie auth first.
    //
    // YR.13.2: API routes do NOT pass through the Edge middleware (the
    // middleware matcher only covers `/admin/*`, `/members/*`, `/settings/*`).
    // We therefore re-run the cryptographic gate here for `/api/*` so a
    // forged or expired cookie can never reach the DB lookup. Defense in
    // depth: even if a route forgets `role`, the signed-claim check still
    // runs.
    const cookieValue = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (cookieValue) {
      const verified = await parseAndVerifySessionCookie(cookieValue);
      if (verified) {
        user = validateSession(cookieValue);
        if (user) authMethod = 'cookie';
      }
    }

    // YR.14.2: DB-first API-key auth. `getApiKeyRole` returns null for
    // missing / revoked / expired keys. The CRIT-4 invariant: a key
    // present in the env-var fallback but explicitly revoked in the
    // `api_keys` table is rejected — `getApiKeyRole` enforces that.
    const apiKey = req.headers.get('x-api-key');
    if (!user && apiKey) {
      const role = await getApiKeyRole(apiKey);
      if (role !== null) {
        user = {
          id: 'api-key-user',
          username: 'api-key',
          email: '',
          role,
          displayName: 'API Key User',
        };
        authMethod = 'api-key';
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: options?.extraHeaders }
      );
    }

    // CSRF validation for state-mutating methods (double-submit cookie pattern).
    // Skip CSRF only when the resolved auth method is `api-key` — API keys
    // are not vulnerable to CSRF (clients add the header explicitly).
    const isApiKeyAuth = authMethod === 'api-key';
    if (!isApiKeyAuth && !options?.skipCsrf && STATE_MUTATING_METHODS.has(req.method)) {
      // Double-submit cookie pattern (timing-safe) — see hasValidCsrfDoubleSubmit.
      if (!hasValidCsrfDoubleSubmit(req)) {
        // `code` disambiguates this 403 from a permission 403 so clients
        // can render the session-refresh cue (serverCodeFromStatus →
        // 'csrf-failed') without reflecting the error string (F-617).
        return NextResponse.json(
          { error: 'CSRF validation failed', code: 'csrf-validation-failed' },
          { status: 403, headers: options?.extraHeaders }
        );
      }
    }

    // Check role if specified
    if (options?.role && !isAtLeastRole(user.role as UserRole, options.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403, headers: options?.extraHeaders }
      );
    }

    // Check specific permission if specified (cumulative with role check)
    if (options?.resource && options?.action) {
      if (!hasPermission(user.role as UserRole, options.resource, options.action)) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403, headers: options?.extraHeaders }
        );
      }
    }

    return handler(req, { params: resolvedParams, user });
  };
}

/**
 * Extract session token from a request's cookies.
 */
export function getSessionToken(req: NextRequest): string | undefined {
  return req.cookies.get(SESSION_COOKIE_NAME)?.value;
}

/** FINDING-006 fix: auto-detect TLS from request when available.
 * Priority: (1) TPI_COOKIE_SECURE env var if explicitly set,
 * (2) x-forwarded-proto header (set by Caddy/nginx),
 * (3) request URL protocol,
 * (4) default to Secure (safe fallback). */
function getSecureFlag(request?: NextRequest): string {
  if (process.env.TPI_COOKIE_SECURE === '0') return '';
  if (process.env.TPI_COOKIE_SECURE === '1') return ' Secure;';

  if (request) {
    const proto = request.headers.get('x-forwarded-proto');
    if (proto === 'http') return '';
    if (proto === 'https') return ' Secure;';
    if (request.url.startsWith('http://')) return '';
  }

  return ' Secure;';
}

/**
 * Cookie helper: builds the Set-Cookie header for a YR.13.2 signed-claim
 * session. The cookie carries `<rawToken>.<base64url(claim)>.<hex(hmac)>` so
 * the Edge middleware can enforce role at the request boundary without a
 * DB lookup.
 *
 * Async because HMAC signing uses Web Crypto. Callers must await.
 *
 * Demo mode is the one exception — it issues an unsigned cookie because
 * the demo bypass is checked before signature verification at every gate
 * (middleware + withAuth). See `buildDemoSessionCookie`.
 */
export async function buildSessionCookie(
  token: string,
  role: UserRole,
  maxAgeSeconds: number,
  request?: NextRequest,
): Promise<string> {
  const value = await buildSignedSessionCookieValue(token, role, maxAgeSeconds);
  return `${SESSION_COOKIE_NAME}=${value}; HttpOnly;${getSecureFlag(request)} SameSite=Strict; Path=/; Max-Age=${maxAgeSeconds}`;
}

/**
 * Demo-mode escape hatch: emit an unsigned cookie carrying just the raw
 * token. Demo gates short-circuit before signature verification, so the
 * cookie does not need a real claim. Used by the login + setup routes when
 * `isDemoMode()` is true; never used in production paths.
 */
export function buildDemoSessionCookie(
  token: string,
  maxAgeSeconds: number,
  request?: NextRequest,
): string {
  return `${SESSION_COOKIE_NAME}=${token}; HttpOnly;${getSecureFlag(request)} SameSite=Strict; Path=/; Max-Age=${maxAgeSeconds}`;
}

/**
 * Cookie helper: builds CSRF Set-Cookie (readable by JS for double-submit).
 * Pass request to auto-detect Secure flag from protocol.
 */
export function buildCsrfCookie(csrfToken: string, maxAgeSeconds: number, request?: NextRequest): string {
  return `${CSRF_COOKIE_NAME}=${csrfToken};${getSecureFlag(request)} SameSite=Strict; Path=/; Max-Age=${maxAgeSeconds}`;
}

/**
 * Cookie helper: builds expired cookies for logout.
 * Pass request to auto-detect Secure flag from protocol.
 */
export function buildLogoutCookies(request?: NextRequest): string[] {
  const secureFlag = getSecureFlag(request);
  return [
    `${SESSION_COOKIE_NAME}=; HttpOnly;${secureFlag} SameSite=Strict; Path=/; Max-Age=0`,
    `${CSRF_COOKIE_NAME}=;${secureFlag} SameSite=Strict; Path=/; Max-Age=0`,
  ];
}

export { SESSION_COOKIE_NAME, CSRF_COOKIE_NAME, CSRF_HEADER_NAME };
