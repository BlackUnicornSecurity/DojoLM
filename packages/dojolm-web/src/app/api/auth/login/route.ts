/**
 * File: /api/auth/login/route.ts
 * Purpose: Login endpoint — validates credentials, creates session, sets cookies
 * Story: S106 (Auth UI Login)
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, generateCsrfToken } from '@/lib/auth/auth';
import { createSession } from '@/lib/auth/session';
import { buildSessionCookie, buildCsrfCookie } from '@/lib/auth/route-guard';
import { userRepo } from '@/lib/db/repositories/user.repository';

const SESSION_TTL_SECONDS = 24 * 60 * 60; // 24 hours
const MAX_USERNAME_LENGTH = 128;
const MAX_PASSWORD_LENGTH = 72; // bcrypt internal limit

// Pre-generated dummy hash for constant-time user enumeration prevention
const DUMMY_HASH = '$2b$12$LJ3m4ys3Lg2VBe8iKPSmCeWhzDyEFRPU6AutoSn/MqKMsf3pv6LXe';

export async function POST(req: NextRequest) {
  try {
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

    // Rate limit is handled by middleware (10 failures/min per IP)

    const user = userRepo.findByUsername(username);

    if (!user) {
      // Constant-time: run bcrypt against dummy hash to prevent timing-based enumeration
      await verifyPassword(password, DUMMY_HASH);
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password first, then check enabled — prevents leaking account status
    const passwordValid = await verifyPassword(password, user.password_hash);
    if (!passwordValid || !user.enabled) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Create session
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
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
