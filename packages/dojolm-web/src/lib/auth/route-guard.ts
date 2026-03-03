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
import { validateSession, type SessionUser } from './session';
import { hasPermission, isAtLeastRole, type Resource, type Action } from './rbac';
import type { UserRole } from '../db/types';

const SESSION_COOKIE_NAME = 'tpi_session';
const CSRF_COOKIE_NAME = 'tpi_csrf';
const CSRF_HEADER_NAME = 'x-csrf-token';
const STATE_MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export interface AuthenticatedRequest extends NextRequest {
  user?: SessionUser;
}

export interface RouteGuardOptions {
  /** Minimum role required. If omitted, any authenticated user is allowed. */
  role?: UserRole;
  /** Specific resource/action check. Cumulative with role when both provided. */
  resource?: Resource;
  action?: Action;
  /** Skip CSRF check (only for non-state-mutating endpoints). Default: false */
  skipCsrf?: boolean;
}

type RouteHandler = (
  req: NextRequest,
  context?: { params?: Record<string, string> }
) => Promise<NextResponse> | NextResponse;

type AuthenticatedHandler = (
  req: NextRequest,
  context: { params?: Record<string, string>; user: SessionUser }
) => Promise<NextResponse> | NextResponse;

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
  return async (req: NextRequest, context?: { params?: Record<string, string> }) => {
    // Extract session token from cookie
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Validate session
    const user = validateSession(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    // CSRF validation for state-mutating methods (double-submit cookie pattern)
    if (!options?.skipCsrf && STATE_MUTATING_METHODS.has(req.method)) {
      const csrfCookie = req.cookies.get(CSRF_COOKIE_NAME)?.value;
      const csrfHeader = req.headers.get(CSRF_HEADER_NAME);
      if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
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

    return handler(req, { params: context?.params, user });
  };
}

/**
 * Extract session token from a request's cookies.
 */
export function getSessionToken(req: NextRequest): string | undefined {
  return req.cookies.get(SESSION_COOKIE_NAME)?.value;
}

/**
 * Cookie helper: builds Set-Cookie header with security attributes.
 */
export function buildSessionCookie(token: string, maxAgeSeconds: number): string {
  return `${SESSION_COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAgeSeconds}`;
}

/**
 * Cookie helper: builds CSRF Set-Cookie (readable by JS for double-submit).
 */
export function buildCsrfCookie(csrfToken: string, maxAgeSeconds: number): string {
  return `${CSRF_COOKIE_NAME}=${csrfToken}; SameSite=Strict; Path=/; Max-Age=${maxAgeSeconds}`;
}

/**
 * Cookie helper: builds expired cookies for logout.
 */
export function buildLogoutCookies(): string[] {
  return [
    `${SESSION_COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`,
    `${CSRF_COOKIE_NAME}=; SameSite=Strict; Path=/; Max-Age=0`,
  ];
}

export { SESSION_COOKIE_NAME, CSRF_COOKIE_NAME, CSRF_HEADER_NAME };
