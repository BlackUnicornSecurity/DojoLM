/**
 * File: /api/setup/admin/route.ts
 * Purpose: Create the initial admin account during first-time setup
 * Story: Setup Wizard
 *
 * Security:
 * - Only works when 0 users exist (returns 403 otherwise)
 * - Atomic check+insert via SQLite transaction to prevent TOCTOU race
 * - Origin-validated to mitigate CSRF on unauthenticated endpoint
 * - Rate-limited to prevent brute-force during narrow setup window
 * - Password complexity enforced server-side
 * - Minimal response (no full user object leak)
 * - Auto-creates session + CSRF cookies (auto-login)
 */

import { NextRequest, NextResponse } from 'next/server';
import { userRepo } from '@/lib/db/repositories/user.repository';
import { hashPassword, generateCsrfToken } from '@/lib/auth/auth';
import { createSession } from '@/lib/auth/session';
import { buildSessionCookie, buildCsrfCookie } from '@/lib/auth/route-guard';
import { getDatabase } from '@/lib/db/database';
import {
  getLoginRateLimitKey,
  isLoginRateLimited,
  recordLoginRateLimitFailure,
} from '@/lib/auth/login-rate-limit';
import crypto from 'node:crypto';

const DEFAULT_SESSION_TTL_HOURS = 24;
const MAX_EMAIL_LENGTH = 254; // RFC 5321
const MAX_DISPLAY_NAME_LENGTH = 128;

function getSessionTtlSeconds(): number {
  const hours = parseInt(process.env.TPI_SESSION_TTL_HOURS ?? '', 10);
  return (Number.isFinite(hours) && hours > 0 ? hours : DEFAULT_SESSION_TTL_HOURS) * 60 * 60;
}

function getClientIp(req: NextRequest): string | null {
  if (!process.env.TRUSTED_PROXY) return null;
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.headers.get('x-real-ip') ?? null;
}

/**
 * Validate request origin to mitigate CSRF on this unauthenticated endpoint.
 * Since no session/CSRF cookie exists yet, we check Origin/Referer headers.
 */
function isPrivateNetworkHost(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return true;
  // RFC 1918 private ranges (IPv4)
  if (hostname.startsWith('192.168.') || hostname.startsWith('10.')) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) return true;
  // IPv6 private/link-local ranges
  if (hostname.startsWith('fe80:') || hostname.startsWith('fd') || hostname.startsWith('fc')) return true;
  return false;
}

function isValidOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  const appUrl = process.env.TPI_APP_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL;

  // Only allow bypass in explicit development mode (not staging/test)
  if (!appUrl && process.env.NODE_ENV === 'development') {
    return true;
  }

  // If neither header is present, reject (browser fetch always sends at least one)
  if (!origin && !referer) {
    return false;
  }

  const sourceUrl = origin ?? referer;
  if (!sourceUrl) return false;

  try {
    const parsed = new URL(sourceUrl);
    // Allow if origin matches configured app URL
    if (appUrl && parsed.origin === new URL(appUrl).origin) return true;
    // Allow private network origins (setup is first-run only, LAN access is expected)
    if (isPrivateNetworkHost(parsed.hostname)) return true;
  } catch { /* invalid URL */ }

  return false;
}

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const rateLimitKey = getLoginRateLimitKey(req, '__setup__');
    if (isLoginRateLimited(rateLimitKey)) {
      return NextResponse.json(
        { error: 'Too many attempts, please try again later' },
        { status: 429 }
      );
    }

    // Origin validation (CSRF mitigation for unauthenticated endpoint)
    if (!isValidOrigin(req)) {
      return NextResponse.json(
        { error: 'Invalid request origin' },
        { status: 403 }
      );
    }

    // Guard: only allow when no users exist
    const count = userRepo.countUsers();
    if (count > 0) {
      return NextResponse.json(
        { error: 'Setup already completed' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { email, displayName } = body;
    // Allow env var fallbacks for headless/automated setup
    const username = typeof body.username === 'string' ? body.username
      : (process.env.TPI_ADMIN_USERNAME || undefined);
    const password = typeof body.password === 'string' ? body.password
      : (process.env.TPI_ADMIN_PASSWORD || undefined);

    // Validate required fields
    if (!username || !password) {
      recordLoginRateLimitFailure(rateLimitKey);
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Username validation
    if (username.length < 3 || username.length > 64) {
      recordLoginRateLimitFailure(rateLimitKey);
      return NextResponse.json(
        { error: 'Username must be between 3 and 64 characters' },
        { status: 400 }
      );
    }

    if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
      recordLoginRateLimitFailure(rateLimitKey);
      return NextResponse.json(
        { error: 'Username may only contain letters, numbers, underscores, dots, and hyphens' },
        { status: 400 }
      );
    }

    // Password complexity (matches existing rules in /api/auth/users)
    if (password.length < 12 || password.length > 72) {
      recordLoginRateLimitFailure(rateLimitKey);
      // Log when env var password fails — helps operators diagnose deployment issues
      if (!body.password && process.env.TPI_ADMIN_PASSWORD) {
        console.warn('[setup] TPI_ADMIN_PASSWORD env var does not meet length requirements (12-72 chars)');
      }
      return NextResponse.json(
        { error: 'Password must be between 12 and 72 characters' },
        { status: 400 }
      );
    }

    if (
      !/[A-Z]/.test(password) ||
      !/[a-z]/.test(password) ||
      !/[0-9]/.test(password) ||
      !/[^A-Za-z0-9]/.test(password)
    ) {
      recordLoginRateLimitFailure(rateLimitKey);
      if (!body.password && process.env.TPI_ADMIN_PASSWORD) {
        console.warn('[setup] TPI_ADMIN_PASSWORD env var does not meet complexity requirements (uppercase, lowercase, digit, special char)');
      }
      return NextResponse.json(
        { error: 'Password must contain uppercase, lowercase, digit, and special character' },
        { status: 400 }
      );
    }

    // Email validation (optional, with length bound)
    if (email !== undefined && email !== null && email !== '') {
      if (typeof email !== 'string' || email.length > MAX_EMAIL_LENGTH) {
        recordLoginRateLimitFailure(rateLimitKey);
        return NextResponse.json(
          { error: 'Email must be a string of 254 characters or fewer' },
          { status: 400 }
        );
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        recordLoginRateLimitFailure(rateLimitKey);
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        );
      }
    }

    // Display name validation (optional, with type + length bound)
    if (displayName !== undefined && displayName !== null && displayName !== '') {
      if (typeof displayName !== 'string' || displayName.length > MAX_DISPLAY_NAME_LENGTH) {
        recordLoginRateLimitFailure(rateLimitKey);
        return NextResponse.json(
          { error: 'Display name must be a string of 128 characters or fewer' },
          { status: 400 }
        );
      }
    }

    // Hash password BEFORE the transaction (async, cannot run inside sync transaction)
    const passwordHash = await hashPassword(password);

    // Atomic check-then-insert via SQLite transaction to prevent TOCTOU race
    const db = getDatabase();
    const userId = crypto.randomUUID();
    const sanitizedEmail = (typeof email === 'string' && email.length > 0) ? email : null;
    const sanitizedDisplayName = (typeof displayName === 'string' && displayName.length > 0)
      ? displayName
      : username;

    const atomicInsert = db.transaction(() => {
      // Re-check count inside transaction (serialized by SQLite)
      const innerCount = (db.prepare('SELECT COUNT(*) as total FROM users').get() as { total: number }).total;
      if (innerCount > 0) {
        return null; // Setup already completed by another request
      }

      db.prepare(
        `INSERT INTO users (id, username, email, password_hash, role, display_name, enabled)
         VALUES (?, ?, ?, ?, 'admin', ?, 1)`
      ).run(userId, username.trim(), sanitizedEmail, passwordHash, sanitizedDisplayName);

      return { id: userId, username: username.trim(), role: 'admin' as const };
    });

    const result = atomicInsert();

    if (!result) {
      return NextResponse.json(
        { error: 'Setup already completed' },
        { status: 403 }
      );
    }

    // Create session (auto-login)
    const clientIp = getClientIp(req);
    const userAgent = req.headers.get('user-agent') ?? null;
    const sessionTtl = getSessionTtlSeconds();
    const sessionToken = createSession(result.id, clientIp, userAgent);
    const csrfToken = generateCsrfToken();

    // Update last login
    userRepo.updateLastLogin(result.id);

    // Minimal response — only return what the client needs
    const response = NextResponse.json(
      {
        user: {
          id: result.id,
          username: result.username,
          role: result.role,
        },
      },
      { status: 201 }
    );
    response.headers.append('Set-Cookie', buildSessionCookie(sessionToken, sessionTtl));
    response.headers.append('Set-Cookie', buildCsrfCookie(csrfToken, sessionTtl));

    return response;
  } catch {
    return NextResponse.json(
      { error: 'Failed to create admin account' },
      { status: 500 }
    );
  }
}
