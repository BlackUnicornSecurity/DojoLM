/**
 * File: auth/me/__tests__/route.test.ts
 * Purpose: Tests for GET /api/auth/me API route
 * Source: src/app/api/auth/me/route.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- Mocks ---

const mockValidateSession = vi.fn();

vi.mock('@/lib/auth/session', () => ({
  validateSession: (...args: unknown[]) => mockValidateSession(...args),
}));

const mockGetSessionToken = vi.fn();

vi.mock('@/lib/auth/route-guard', () => ({
  getSessionToken: (...args: unknown[]) => mockGetSessionToken(...args),
}));

// --- Helpers ---

function createGetRequest(): NextRequest {
  return new NextRequest('http://localhost:3000/api/auth/me', {
    method: 'GET',
  });
}

function createGetRequestWithCookie(token: string): NextRequest {
  return new NextRequest('http://localhost:3000/api/auth/me', {
    method: 'GET',
    headers: {
      Cookie: `dojolm_session=${token}`,
    },
  });
}

const mockUser = {
  id: 'user-1',
  username: 'admin',
  email: 'admin@test.com',
  role: 'admin',
  displayName: 'Admin User',
};

// --- Tests ---

describe('GET /api/auth/me', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ME-001: no token returns null user
  it('ME-001: returns null user when no session token is present', async () => {
    mockGetSessionToken.mockReturnValue(null);
    const { GET } = await import('@/app/api/auth/me/route');
    const res = await GET(createGetRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user).toBeNull();
  });

  // ME-002: invalid token returns null user
  it('ME-002: returns null user when session token is invalid', async () => {
    mockGetSessionToken.mockReturnValue('invalid-token');
    mockValidateSession.mockReturnValue(null);
    const { GET } = await import('@/app/api/auth/me/route');
    const res = await GET(createGetRequestWithCookie('invalid-token'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user).toBeNull();
  });

  // ME-003: valid token returns user
  it('ME-003: returns user data when session is valid', async () => {
    mockGetSessionToken.mockReturnValue('valid-token');
    mockValidateSession.mockReturnValue(mockUser);
    const { GET } = await import('@/app/api/auth/me/route');
    const res = await GET(createGetRequestWithCookie('valid-token'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user).toEqual(mockUser);
  });

  // ME-004: returns 200 status when no token
  it('ME-004: returns 200 status even with no token', async () => {
    mockGetSessionToken.mockReturnValue(null);
    const { GET } = await import('@/app/api/auth/me/route');
    const res = await GET(createGetRequest());
    expect(res.status).toBe(200);
  });

  // ME-005: returns 200 status when token is valid
  it('ME-005: returns 200 status when token is valid', async () => {
    mockGetSessionToken.mockReturnValue('tok');
    mockValidateSession.mockReturnValue(mockUser);
    const { GET } = await import('@/app/api/auth/me/route');
    const res = await GET(createGetRequest());
    expect(res.status).toBe(200);
  });

  // ME-006: getSessionToken is called with the request
  it('ME-006: calls getSessionToken with the incoming request', async () => {
    mockGetSessionToken.mockReturnValue(null);
    const { GET } = await import('@/app/api/auth/me/route');
    const req = createGetRequest();
    await GET(req);
    expect(mockGetSessionToken).toHaveBeenCalledWith(req);
  });

  // ME-007: validateSession is called with the token
  it('ME-007: calls validateSession with the token from getSessionToken', async () => {
    mockGetSessionToken.mockReturnValue('my-token');
    mockValidateSession.mockReturnValue(null);
    const { GET } = await import('@/app/api/auth/me/route');
    await GET(createGetRequest());
    expect(mockValidateSession).toHaveBeenCalledWith('my-token');
  });

  // ME-008: validateSession is NOT called when no token
  it('ME-008: does not call validateSession when no token is present', async () => {
    mockGetSessionToken.mockReturnValue(null);
    const { GET } = await import('@/app/api/auth/me/route');
    await GET(createGetRequest());
    expect(mockValidateSession).not.toHaveBeenCalled();
  });

  // ME-009: response contains user key
  it('ME-009: response always contains the user key', async () => {
    mockGetSessionToken.mockReturnValue(null);
    const { GET } = await import('@/app/api/auth/me/route');
    const res = await GET(createGetRequest());
    const body = await res.json();
    expect(body).toHaveProperty('user');
  });

  // ME-010: returns user fields correctly
  it('ME-010: returned user object contains expected fields', async () => {
    mockGetSessionToken.mockReturnValue('tok');
    mockValidateSession.mockReturnValue(mockUser);
    const { GET } = await import('@/app/api/auth/me/route');
    const res = await GET(createGetRequest());
    const body = await res.json();
    expect(body.user).toHaveProperty('id');
    expect(body.user).toHaveProperty('username');
    expect(body.user).toHaveProperty('email');
    expect(body.user).toHaveProperty('role');
  });
});
