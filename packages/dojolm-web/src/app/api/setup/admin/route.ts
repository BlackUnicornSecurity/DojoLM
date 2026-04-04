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

const SESSION_TTL_SECONDS = 24 * 60 * 60;
const MAX_EMAIL_LENGTH = 254; // RFC 5321
const MAX_DISPLAY_NAME_LENGTH = 128;

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
function isValidOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  // In development without configured origin, allow same-origin requests
  if (!appUrl && process.env.NODE_ENV !== 'production') {
    return true;
  }

  // If neither header is present, reject (fetch from browser always sends at least one)
  if (!origin && !referer) {
    return false;
  }

  // Check origin header first (more reliable)
  if (origin) {
    if (appUrl && origin === new URL(appUrl).origin) return true;
    // Allow localhost origins in development
    if (process.env.NODE_ENV !== 'production') {
      try {
        const url = new URL(origin);
        if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return true;
      } catch { /* invalid origin */ }
    }
    return false;
  }

  // Fall back to referer
  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      if (appUrl && refererOrigin === new URL(appUrl).origin) return true;
      if (process.env.NODE_ENV !== 'production') {
        const url = new URL(referer);
        if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return true;
      }
    } catch { /* invalid referer */ }
  }

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
    const { username, email, password, displayName } = body;

    // Validate required fields
    if (!username || !password) {
      recordLoginRateLimitFailure(rateLimitKey);
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    if (typeof username !== 'string' || typeof password !== 'string') {
      recordLoginRateLimitFailure(rateLimitKey);
      return NextResponse.json(
        { error: 'Invalid input format' },
        { status: 400 }
      );
    }

    // Username validation
    if (username.length < 3 || username.length > 64) {
      return NextResponse.json(
        { error: 'Username must be between 3 and 64 characters' },
        { status: 400 }
      );
    }

    if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
      return NextResponse.json(
        { error: 'Username may only contain letters, numbers, underscores, dots, and hyphens' },
        { status: 400 }
      );
    }

    // Password complexity (matches existing rules in /api/auth/users)
    if (password.length < 12 || password.length > 72) {
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
      return NextResponse.json(
        { error: 'Password must contain uppercase, lowercase, digit, and special character' },
        { status: 400 }
      );
    }

    // Email validation (optional, with length bound)
    if (email !== undefined && email !== null && email !== '') {
      if (typeof email !== 'string' || email.length > MAX_EMAIL_LENGTH) {
        return NextResponse.json(
          { error: 'Email must be a string of 254 characters or fewer' },
          { status: 400 }
        );
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        );
      }
    }

    // Display name validation (optional, with type + length bound)
    if (displayName !== undefined && displayName !== null && displayName !== '') {
      if (typeof displayName !== 'string' || displayName.length > MAX_DISPLAY_NAME_LENGTH) {
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
    response.headers.append('Set-Cookie', buildSessionCookie(sessionToken, SESSION_TTL_SECONDS));
    response.headers.append('Set-Cookie', buildCsrfCookie(csrfToken, SESSION_TTL_SECONDS));

    return response;
  } catch {
    return NextResponse.json(
      { error: 'Failed to create admin account' },
      { status: 500 }
    );
  }
}
