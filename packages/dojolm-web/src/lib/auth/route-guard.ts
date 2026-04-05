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
import type { UserRole } from '../db/types';
import { isDemoMode, DEMO_USER } from '../demo';

/** Valid API key permission entry for JSON mapping */
interface ApiKeyPermission {
  keyHash: string;
  role: UserRole;
}

/**
 * Parse and validate API_KEY_PERMISSIONS JSON env var.
 * Intentionally re-parsed on every call to support runtime env changes
 * (e.g., Docker config reload) without requiring a process restart.
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

/** Get role for API key: check specific mapping first, then fall back to API_KEY_ROLE env var */
function getApiKeyRole(apiKey: string): UserRole {
  // Check for key-specific role mapping
  const permissionsMap = getApiKeyPermissions();
  if (permissionsMap.size > 0) {
    // Hash the provided API key for lookup
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex').slice(0, 16);
    const specificRole = permissionsMap.get(keyHash);
    if (specificRole) {
      return specificRole;
    }
  }

  // Fall back to default NODA_API_KEY_ROLE env var with validation
  // This allows scoped API key permissions via environment configuration
  const configuredRole = process.env.NODA_API_KEY_ROLE as UserRole;
  if (VALID_ROLES.includes(configuredRole)) {
    return configuredRole;
  }

  // Safe default - analyst has limited privileges
  return 'analyst';
}

const SESSION_COOKIE_NAME = 'tpi_session';
const CSRF_COOKIE_NAME = 'tpi_csrf';
const CSRF_HEADER_NAME = 'x-csrf-token';
const STATE_MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export interface RouteGuardOptions {
  /** Minimum role required. If omitted, any authenticated user is allowed. */
  role?: UserRole;
  /** Specific resource/action check. Cumulative with role when both provided. */
  resource?: Resource;
  action?: Action;
  /** Skip CSRF check (only for non-state-mutating endpoints). Default: false */
  skipCsrf?: boolean;
}

/** Context shape matching Next.js 16+ route handler second argument */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RouteContext = { params: Promise<any> };

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
  return async (req: NextRequest, context: RouteContext) => {
    // Next.js 16+ passes params as a Promise — resolve before forwarding
    let resolvedParams: Record<string, string> | undefined;
    try {
      resolvedParams = context.params
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

    // Try session cookie auth first
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (token) {
      user = validateSession(token);
    }

    // R8-007: Fall back to API key auth — middleware already validated the key,
    // so if X-API-Key header is present and we reached this handler, the key is valid.
    // API key role is configurable via API_KEY_ROLE env var (defaults to 'analyst').
    // Supports per-key role mapping via API_KEY_PERMISSIONS JSON env var.
    const apiKey = req.headers.get('x-api-key');
    if (!user && apiKey) {
      user = {
        id: 'api-key-user',
        username: 'api-key',
        email: '',
        role: getApiKeyRole(apiKey),
        displayName: 'API Key User',
      };
    }

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // CSRF validation for state-mutating methods (double-submit cookie pattern)
    // Skip CSRF for API key auth — API keys are not vulnerable to CSRF
    const isApiKeyAuth = !token && !!req.headers.get('x-api-key');
    if (!isApiKeyAuth && !options?.skipCsrf && STATE_MUTATING_METHODS.has(req.method)) {
      const csrfCookie = req.cookies.get(CSRF_COOKIE_NAME)?.value;
      const csrfHeader = req.headers.get(CSRF_HEADER_NAME);
      // PT-CSRF-M03 fix: Use timing-safe comparison for CSRF tokens
      const csrfMatch = csrfCookie && csrfHeader && csrfCookie.length === csrfHeader.length &&
        crypto.timingSafeEqual(Buffer.from(csrfCookie), Buffer.from(csrfHeader));
      if (!csrfMatch) {
        return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });
      }
    }

    // Check role if specified
    if (options?.role && !isAtLeastRole(user.role as UserRole, options.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check specific permission if specified (cumulative with role check)
    if (options?.resource && options?.action) {
      if (!hasPermission(user.role as UserRole, options.resource, options.action)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
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

/** Secure flag: only set when HTTPS is available (TLS proxy or direct).
 * When accessed directly on HTTP without a TLS-terminating proxy, omit Secure
 * so cookies are sent. Controlled by TPI_COOKIE_SECURE env var (default: true). */
const SECURE_FLAG = process.env.TPI_COOKIE_SECURE === '0' ? '' : ' Secure;';

/**
 * Cookie helper: builds Set-Cookie header with security attributes.
 */
export function buildSessionCookie(token: string, maxAgeSeconds: number): string {
  return `${SESSION_COOKIE_NAME}=${token}; HttpOnly;${SECURE_FLAG} SameSite=Strict; Path=/; Max-Age=${maxAgeSeconds}`;
}

/**
 * Cookie helper: builds CSRF Set-Cookie (readable by JS for double-submit).
 */
export function buildCsrfCookie(csrfToken: string, maxAgeSeconds: number): string {
  return `${CSRF_COOKIE_NAME}=${csrfToken};${SECURE_FLAG} SameSite=Strict; Path=/; Max-Age=${maxAgeSeconds}`;
}

/**
 * Cookie helper: builds expired cookies for logout.
 */
export function buildLogoutCookies(): string[] {
  return [
    `${SESSION_COOKIE_NAME}=; HttpOnly;${SECURE_FLAG} SameSite=Strict; Path=/; Max-Age=0`,
    `${CSRF_COOKIE_NAME}=;${SECURE_FLAG} SameSite=Strict; Path=/; Max-Age=0`,
  ];
}

export { SESSION_COOKIE_NAME, CSRF_COOKIE_NAME, CSRF_HEADER_NAME };
