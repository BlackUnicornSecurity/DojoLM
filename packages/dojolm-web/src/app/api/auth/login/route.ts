/**
 * File: /api/auth/login/route.ts
 * Purpose: Login endpoint — validates credentials, creates session, sets cookies
 * Story: S106 (Auth UI Login)
 */

import { NextRequest, NextResponse } from 'next/server';
import { buildSessionCookie, buildCsrfCookie } from '@/lib/auth/route-guard';
import { isDemoMode, DEMO_USER, DEMO_SESSION_TOKEN, DEMO_CSRF_TOKEN, DEMO_SESSION_TTL_SECONDS } from '@/lib/demo';

const SESSION_TTL_SECONDS = 24 * 60 * 60; // 24 hours
const MAX_USERNAME_LENGTH = 128;
const MAX_PASSWORD_LENGTH = 72; // bcrypt internal limit

// Pre-generated dummy hash for constant-time user enumeration prevention
const DUMMY_HASH = '$2b$12$LJ3m4ys3Lg2VBe8iKPSmCeWhzDyEFRPU6AutoSn/MqKMsf3pv6LXe';

function getSessionIpAddress(req: NextRequest): string | null {
  if (!process.env.TRUSTED_PROXY) {
    return null;
  }

  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) {
      return first;
    }
  }

  return req.headers.get('x-real-ip') ?? null;
}

export async function POST(req: NextRequest) {
  // Demo mode: always succeed with demo user
  if (isDemoMode()) {
    const response = NextResponse.json({
      user: {
        id: DEMO_USER.id,
        username: DEMO_USER.username,
        email: DEMO_USER.email,
        role: DEMO_USER.role,
        displayName: DEMO_USER.displayName,
      },
    });
    response.headers.append('Set-Cookie', buildSessionCookie(DEMO_SESSION_TOKEN, DEMO_SESSION_TTL_SECONDS));
    response.headers.append('Set-Cookie', buildCsrfCookie(DEMO_CSRF_TOKEN, DEMO_SESSION_TTL_SECONDS));
    return response;
  }

  try {
    // Lazy-import heavy dependencies only in non-demo mode
    const { verifyPassword, generateCsrfToken } = await import('@/lib/auth/auth');
    const { createSession } = await import('@/lib/auth/session');
    const {
      clearLoginRateLimitFailures,
      getLoginRateLimitKey,
      isLoginRateLimited,
      recordLoginRateLimitFailure,
    } = await import('@/lib/auth/login-rate-limit');
    const { userRepo } = await import('@/lib/db/repositories/user.repository');

    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    if (typeof username !== 'string' || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Invalid input format' },
        { status: 400 }
      );
    }

    if (username.length > MAX_USERNAME_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const rateLimitKey = getLoginRateLimitKey(req, username);
    if (isLoginRateLimited(rateLimitKey)) {
      return NextResponse.json(
        { error: 'Too many login attempts, please try again later' },
        { status: 429 }
      );
    }

    const user = userRepo.findByUsername(username);

    if (!user) {
      // Constant-time: run bcrypt against dummy hash to prevent timing-based enumeration
      await verifyPassword(password, DUMMY_HASH);
      const limited = recordLoginRateLimitFailure(rateLimitKey);
      return NextResponse.json(
        { error: limited ? 'Too many login attempts, please try again later' : 'Invalid credentials' },
        { status: limited ? 429 : 401 }
      );
    }

    // Verify password first, then check enabled — prevents leaking account status
    const passwordValid = await verifyPassword(password, user.password_hash);
    if (!passwordValid || !user.enabled) {
      const limited = recordLoginRateLimitFailure(rateLimitKey);
      return NextResponse.json(
        { error: limited ? 'Too many login attempts, please try again later' : 'Invalid credentials' },
        { status: limited ? 429 : 401 }
      );
    }

    clearLoginRateLimitFailures(rateLimitKey);

    // Create session
    const clientIp = getSessionIpAddress(req);
    const userAgent = req.headers.get('user-agent') ?? null;
    const sessionToken = createSession(user.id, clientIp, userAgent);

    // Update last login
    userRepo.updateLastLogin(user.id);

    // Generate CSRF token
    const csrfToken = generateCsrfToken();

    // Build response with cookies
    const response = NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        displayName: user.display_name,
      },
    });

    response.headers.append('Set-Cookie', buildSessionCookie(sessionToken, SESSION_TTL_SECONDS));
    response.headers.append('Set-Cookie', buildCsrfCookie(csrfToken, SESSION_TTL_SECONDS));

    return response;
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
