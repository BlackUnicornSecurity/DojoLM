/**
 * File: auth/login/__tests__/route.test.ts
 * Purpose: Tests for POST /api/auth/login API route
 * Source: src/app/api/auth/login/route.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- Mocks ---

const mockVerifyPassword = vi.fn();
const mockGenerateCsrfToken = vi.fn();

vi.mock('@/lib/auth/auth', () => ({
  verifyPassword: (...args: unknown[]) => mockVerifyPassword(...args),
  generateCsrfToken: (...args: unknown[]) => mockGenerateCsrfToken(...args),
}));

const mockCreateSession = vi.fn();

vi.mock('@/lib/auth/session', () => ({
  createSession: (...args: unknown[]) => mockCreateSession(...args),
}));

const mockBuildSessionCookie = vi.fn();
const mockBuildCsrfCookie = vi.fn();

vi.mock('@/lib/auth/route-guard', () => ({
  buildSessionCookie: (...args: unknown[]) => mockBuildSessionCookie(...args),
  buildCsrfCookie: (...args: unknown[]) => mockBuildCsrfCookie(...args),
}));

const mockFindByUsername = vi.fn();
const mockUpdateLastLogin = vi.fn();

vi.mock('@/lib/db/repositories/user.repository', () => ({
  userRepo: {
    findByUsername: (...args: unknown[]) => mockFindByUsername(...args),
    updateLastLogin: (...args: unknown[]) => mockUpdateLastLogin(...args),
  },
}));

// --- Helpers ---

function createPostRequest(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost:42001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

const mockUser = {
  id: 'user-1',
  username: 'admin',
  email: 'admin@test.com',
  role: 'admin',
  display_name: 'Admin User',
  password_hash: 'hashed-pw',
  enabled: true,
};

// --- Tests ---

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockBuildSessionCookie.mockReturnValue('session=tok; Path=/; HttpOnly');
    mockBuildCsrfCookie.mockReturnValue('csrf=csrf-tok; Path=/');
    mockGenerateCsrfToken.mockReturnValue('csrf-tok-123');
    mockCreateSession.mockReturnValue('session-tok-456');
    const { resetLoginRateLimiter } = await import('@/lib/auth/login-rate-limit');
    resetLoginRateLimiter();
  });

  // AUTH-001: missing username returns 400
  it('AUTH-001: returns 400 when username is missing', async () => {
    const { POST } = await import('@/app/api/auth/login/route');
    const res = await POST(createPostRequest({ password: 'secret' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/required/i);
  });

  // AUTH-002: missing password returns 400
  it('AUTH-002: returns 400 when password is missing', async () => {
    const { POST } = await import('@/app/api/auth/login/route');
    const res = await POST(createPostRequest({ username: 'admin' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/required/i);
  });

  // AUTH-003: missing both fields returns 400
  it('AUTH-003: returns 400 when both fields are missing', async () => {
    const { POST } = await import('@/app/api/auth/login/route');
    const res = await POST(createPostRequest({}));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/required/i);
  });

  // AUTH-004: invalid types returns 400
  it('AUTH-004: returns 400 when username/password are not strings', async () => {
    const { POST } = await import('@/app/api/auth/login/route');
    const res = await POST(createPostRequest({ username: 123, password: true }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid input/i);
  });

  // AUTH-005: user not found — calls verifyPassword for timing safety, returns 401
  it('AUTH-005: returns 401 when user is not found', async () => {
    mockFindByUsername.mockReturnValue(null);
    mockVerifyPassword.mockResolvedValue(false);
    const { POST } = await import('@/app/api/auth/login/route');
    const res = await POST(createPostRequest({ username: 'ghost', password: 'pw' }));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toMatch(/invalid credentials/i);
    // Verify constant-time: verifyPassword called even when user not found
    expect(mockVerifyPassword).toHaveBeenCalled();
  });

  // AUTH-006: disabled user — returns 401 (not 403, to prevent account status leak)
  it('AUTH-006: returns 401 when user account is disabled', async () => {
    mockFindByUsername.mockReturnValue({ ...mockUser, enabled: false });
    mockVerifyPassword.mockResolvedValue(true);
    const { POST } = await import('@/app/api/auth/login/route');
    const res = await POST(createPostRequest({ username: 'admin', password: 'pw' }));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toMatch(/invalid credentials/i);
  });

  // AUTH-007: wrong password returns 401
  it('AUTH-007: returns 401 when password is wrong', async () => {
    mockFindByUsername.mockReturnValue(mockUser);
    mockVerifyPassword.mockResolvedValue(false);
    const { POST } = await import('@/app/api/auth/login/route');
    const res = await POST(createPostRequest({ username: 'admin', password: 'wrong' }));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toMatch(/invalid credentials/i);
  });

  // AUTH-008: successful login returns user and sets cookies
  it('AUTH-008: returns user data and sets cookies on successful login', async () => {
    mockFindByUsername.mockReturnValue(mockUser);
    mockVerifyPassword.mockResolvedValue(true);
    const { POST } = await import('@/app/api/auth/login/route');
    const res = await POST(createPostRequest({ username: 'admin', password: 'correct' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user).toEqual({
      id: 'user-1',
      username: 'admin',
      email: 'admin@test.com',
      role: 'admin',
      displayName: 'Admin User',
    });
    const cookies = res.headers.getSetCookie();
    expect(cookies.length).toBeGreaterThanOrEqual(2);
  });

  // AUTH-009: session creation is called with correct args
  it('AUTH-009: calls createSession with user id', async () => {
    mockFindByUsername.mockReturnValue(mockUser);
    mockVerifyPassword.mockResolvedValue(true);
    const { POST } = await import('@/app/api/auth/login/route');
    await POST(createPostRequest({ username: 'admin', password: 'correct' }));
    expect(mockCreateSession).toHaveBeenCalledWith('user-1', null, null);
  });

  // AUTH-010: internal error returns 500
  it('AUTH-010: returns 500 on internal server error', async () => {
    mockFindByUsername.mockImplementation(() => {
      throw new Error('DB failure');
    });
    const { POST } = await import('@/app/api/auth/login/route');
    const res = await POST(createPostRequest({ username: 'admin', password: 'pw' }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/internal server error/i);
  });

  it('AUTH-011: rate limits repeated failed logins for the same client and username', async () => {
    mockFindByUsername.mockReturnValue(mockUser);
    mockVerifyPassword.mockResolvedValue(false);
    const { POST } = await import('@/app/api/auth/login/route');

    for (let i = 0; i < 9; i++) {
      const res = await POST(createPostRequest(
        { username: 'admin', password: 'wrong' },
        { 'user-agent': 'Vitest Browser A' },
      ));
      expect(res.status).toBe(401);
    }

    const limited = await POST(createPostRequest(
      { username: 'admin', password: 'wrong' },
      { 'user-agent': 'Vitest Browser A' },
    ));
    expect(limited.status).toBe(429);
    expect((await limited.json()).error).toMatch(/too many login attempts/i);
    expect(limited.headers.get('Retry-After')).toBe('60');
  });

  it('AUTH-012: clears failed-attempt state after a successful login', async () => {
    mockFindByUsername.mockReturnValue(mockUser);
    const { POST } = await import('@/app/api/auth/login/route');

    mockVerifyPassword.mockResolvedValue(false);
    for (let i = 0; i < 5; i++) {
      await POST(createPostRequest(
        { username: 'admin', password: 'wrong' },
        { 'user-agent': 'Vitest Browser B' },
      ));
    }

    mockVerifyPassword.mockResolvedValue(true);
    const success = await POST(createPostRequest(
      { username: 'admin', password: 'correct' },
      { 'user-agent': 'Vitest Browser B' },
    ));
    expect(success.status).toBe(200);

    mockVerifyPassword.mockResolvedValue(false);
    const afterReset = await POST(createPostRequest(
      { username: 'admin', password: 'wrong' },
      { 'user-agent': 'Vitest Browser B' },
    ));
    expect(afterReset.status).toBe(401);
  });
});
