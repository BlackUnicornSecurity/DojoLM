/**
 * File: auth/logout/__tests__/route.test.ts
 * Purpose: Tests for POST /api/auth/logout API route
 * Source: src/app/api/auth/logout/route.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- Mocks ---

const mockDestroySession = vi.fn();
const mockValidateSession = vi.fn().mockReturnValue(null);

vi.mock('@/lib/auth/session', () => ({
  destroySession: (...args: unknown[]) => mockDestroySession(...args),
  validateSession: (...args: unknown[]) => mockValidateSession(...args),
}));

// Audit logger is fire-and-forget; stub to keep tests hermetic.
vi.mock('@/lib/audit-logger', () => ({
  auditLog: {
    authLogout: vi.fn().mockResolvedValue(undefined),
  },
}));

const mockGetSessionToken = vi.fn();
const mockBuildLogoutCookies = vi.fn();

vi.mock('@/lib/auth/route-guard', () => ({
  getSessionToken: (...args: unknown[]) => mockGetSessionToken(...args),
  buildLogoutCookies: (...args: unknown[]) => mockBuildLogoutCookies(...args),
}));

// --- Helpers ---

function createPostRequest(): NextRequest {
  return new NextRequest('http://localhost:42001/api/auth/logout', {
    method: 'POST',
  });
}

function createPostRequestWithCookie(token: string): NextRequest {
  return new NextRequest('http://localhost:42001/api/auth/logout', {
    method: 'POST',
    headers: {
      Cookie: `dojolm_session=${token}`,
    },
  });
}

// --- Tests ---

describe('POST /api/auth/logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBuildLogoutCookies.mockReturnValue([
      'dojolm_session=; Path=/; Max-Age=0',
      'dojolm_csrf=; Path=/; Max-Age=0',
    ]);
  });

  // LOUT-001: successful logout with valid token
  it('LOUT-001: returns success when session token is present', async () => {
    mockGetSessionToken.mockReturnValue('valid-token');
    const { POST } = await import('@/app/api/auth/logout/route');
    const res = await POST(createPostRequestWithCookie('valid-token'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  // LOUT-002: successful logout without token
  it('LOUT-002: returns success even when no session token is present', async () => {
    mockGetSessionToken.mockReturnValue(null);
    const { POST } = await import('@/app/api/auth/logout/route');
    const res = await POST(createPostRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  // LOUT-003: response body has success true
  it('LOUT-003: response body contains success: true', async () => {
    mockGetSessionToken.mockReturnValue('tok');
    const { POST } = await import('@/app/api/auth/logout/route');
    const res = await POST(createPostRequest());
    const body = await res.json();
    expect(body).toEqual({ success: true });
  });

  // LOUT-004: cookies are cleared
  it('LOUT-004: response includes logout cookies to clear session', async () => {
    mockGetSessionToken.mockReturnValue('tok');
    const { POST } = await import('@/app/api/auth/logout/route');
    const res = await POST(createPostRequest());
    const cookies = res.headers.getSetCookie();
    expect(cookies.length).toBe(2);
    expect(cookies[0]).toContain('Max-Age=0');
    expect(cookies[1]).toContain('Max-Age=0');
  });

  // LOUT-005: destroySession called with token
  it('LOUT-005: calls destroySession with the session token', async () => {
    mockGetSessionToken.mockReturnValue('session-abc');
    const { POST } = await import('@/app/api/auth/logout/route');
    await POST(createPostRequest());
    expect(mockDestroySession).toHaveBeenCalledWith('session-abc');
  });

  // LOUT-006: destroySession NOT called when no token
  it('LOUT-006: does not call destroySession when no token exists', async () => {
    mockGetSessionToken.mockReturnValue(null);
    const { POST } = await import('@/app/api/auth/logout/route');
    await POST(createPostRequest());
    expect(mockDestroySession).not.toHaveBeenCalled();
  });

  // LOUT-007: handles missing session gracefully
  it('LOUT-007: handles missing session token gracefully without error', async () => {
    mockGetSessionToken.mockReturnValue(undefined);
    const { POST } = await import('@/app/api/auth/logout/route');
    const res = await POST(createPostRequest());
    expect(res.status).toBe(200);
  });

  // LOUT-008: buildLogoutCookies is called
  it('LOUT-008: calls buildLogoutCookies to generate cookie headers', async () => {
    mockGetSessionToken.mockReturnValue('tok');
    const { POST } = await import('@/app/api/auth/logout/route');
    await POST(createPostRequest());
    expect(mockBuildLogoutCookies).toHaveBeenCalled();
  });

  // LOUT-009: getSessionToken is called with the request
  it('LOUT-009: calls getSessionToken with the incoming request', async () => {
    mockGetSessionToken.mockReturnValue(null);
    const { POST } = await import('@/app/api/auth/logout/route');
    const req = createPostRequest();
    await POST(req);
    expect(mockGetSessionToken).toHaveBeenCalledWith(req);
  });

  // LOUT-010: returns 200 status code
  it('LOUT-010: always returns 200 status code', async () => {
    mockGetSessionToken.mockReturnValue('tok');
    const { POST } = await import('@/app/api/auth/logout/route');
    const res = await POST(createPostRequest());
    expect(res.status).toBe(200);
  });
});
