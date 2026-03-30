/**
 * Route-guard tests.
 *
 * Covers: withAuth, getSessionToken, buildSessionCookie,
 *         buildCsrfCookie, buildLogoutCookies, CSRF enforcement.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// ---- mocks ----

vi.mock('../session', () => ({
  validateSession: vi.fn(),
}));

vi.mock('../rbac', () => ({
  hasPermission: vi.fn(),
  isAtLeastRole: vi.fn(),
  VALID_ROLES: ['admin', 'analyst', 'viewer'],
}));

import {
  withAuth,
  getSessionToken,
  buildSessionCookie,
  buildCsrfCookie,
  buildLogoutCookies,
  SESSION_COOKIE_NAME,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
} from '../route-guard';
import { validateSession } from '../session';
import { hasPermission, isAtLeastRole } from '../rbac';

// ---- helpers ----

const mockValidateSession = validateSession as ReturnType<typeof vi.fn>;
const mockHasPermission = hasPermission as ReturnType<typeof vi.fn>;
const mockIsAtLeastRole = isAtLeastRole as ReturnType<typeof vi.fn>;

const VALID_USER = {
  id: 'u1',
  username: 'alice',
  email: 'alice@example.com',
  role: 'admin',
  displayName: 'Alice',
};

function makeRequest(
  method: string,
  opts?: { sessionToken?: string; csrfCookie?: string; csrfHeader?: string },
): NextRequest {
  const url = 'http://localhost:42001/api/test';
  const headers = new Headers();

  // Build cookie header manually
  const cookies: string[] = [];
  if (opts?.sessionToken) {
    cookies.push(`${SESSION_COOKIE_NAME}=${opts.sessionToken}`);
  }
  if (opts?.csrfCookie) {
    cookies.push(`${CSRF_COOKIE_NAME}=${opts.csrfCookie}`);
  }
  if (cookies.length) {
    headers.set('cookie', cookies.join('; '));
  }
  if (opts?.csrfHeader) {
    headers.set(CSRF_HEADER_NAME, opts.csrfHeader);
  }

  return new NextRequest(url, { method, headers });
}

const dummyHandler = vi.fn((_req, ctx) =>
  NextResponse.json({ ok: true, user: ctx.user }),
);

beforeEach(() => {
  vi.clearAllMocks();
  mockValidateSession.mockReturnValue(null);
  mockIsAtLeastRole.mockReturnValue(true);
  mockHasPermission.mockReturnValue(true);
});

// ---- tests ----

describe('route-guard', () => {
  // RG-001
  it('RG-001: withAuth returns 401 when no session cookie present', async () => {
    const handler = withAuth(dummyHandler);
    const res = await handler(makeRequest('GET'));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/authentication required/i);
    expect(dummyHandler).not.toHaveBeenCalled();
  });

  // RG-002
  it('RG-002: withAuth returns 401 when session is invalid/expired', async () => {
    mockValidateSession.mockReturnValue(null);

    const handler = withAuth(dummyHandler);
    const res = await handler(makeRequest('GET', { sessionToken: 'bad-token' }));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/invalid|expired|authentication required/i);
  });

  // RG-003
  it('RG-003: withAuth calls handler with user on valid session (GET, no CSRF needed)', async () => {
    mockValidateSession.mockReturnValue(VALID_USER);

    const handler = withAuth(dummyHandler);
    const req = makeRequest('GET', { sessionToken: 'valid-tok' });
    const res = await handler(req);

    expect(res.status).toBe(200);
    expect(dummyHandler).toHaveBeenCalledOnce();
    const ctx = dummyHandler.mock.calls[0][1];
    expect(ctx.user).toEqual(VALID_USER);
  });

  // RG-004
  it('RG-004: withAuth enforces CSRF for POST (double-submit cookie pattern)', async () => {
    mockValidateSession.mockReturnValue(VALID_USER);
    const csrfVal = 'csrf-token-xyz';

    const handler = withAuth(dummyHandler);
    const req = makeRequest('POST', {
      sessionToken: 'tok',
      csrfCookie: csrfVal,
      csrfHeader: csrfVal,
    });
    const res = await handler(req);

    expect(res.status).toBe(200);
    expect(dummyHandler).toHaveBeenCalled();
  });

  // RG-005
  it('RG-005: withAuth returns 403 on CSRF mismatch for state-mutating methods', async () => {
    mockValidateSession.mockReturnValue(VALID_USER);

    const handler = withAuth(dummyHandler);
    const req = makeRequest('POST', {
      sessionToken: 'tok',
      csrfCookie: 'cookie-val',
      csrfHeader: 'different-header-val',
    });
    const res = await handler(req);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/csrf/i);
    expect(dummyHandler).not.toHaveBeenCalled();
  });

  // RG-006
  it('RG-006: withAuth skips CSRF when skipCsrf option is true', async () => {
    mockValidateSession.mockReturnValue(VALID_USER);

    const handler = withAuth(dummyHandler, { skipCsrf: true });
    // POST without any CSRF tokens
    const req = makeRequest('POST', { sessionToken: 'tok' });
    const res = await handler(req);

    expect(res.status).toBe(200);
    expect(dummyHandler).toHaveBeenCalled();
  });

  // RG-007
  it('RG-007: withAuth enforces minimum role (returns 403 for insufficient role)', async () => {
    mockValidateSession.mockReturnValue(VALID_USER);
    mockIsAtLeastRole.mockReturnValue(false); // insufficient

    const handler = withAuth(dummyHandler, { role: 'admin' });
    const req = makeRequest('GET', { sessionToken: 'tok' });
    const res = await handler(req);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/insufficient/i);
    expect(mockIsAtLeastRole).toHaveBeenCalledWith('admin', 'admin');
  });

  // RG-008
  it('RG-008: withAuth enforces resource+action permissions (returns 403)', async () => {
    mockValidateSession.mockReturnValue(VALID_USER);
    mockIsAtLeastRole.mockReturnValue(true);
    mockHasPermission.mockReturnValue(false); // denied

    const handler = withAuth(dummyHandler, {
      resource: 'users',
      action: 'delete',
    });
    const req = makeRequest('GET', { sessionToken: 'tok' });
    const res = await handler(req);

    expect(res.status).toBe(403);
    expect(mockHasPermission).toHaveBeenCalledWith('admin', 'users', 'delete');
  });

  // RG-009
  it('RG-009: withAuth passes when both role AND resource+action checks succeed (cumulative)', async () => {
    mockValidateSession.mockReturnValue(VALID_USER);
    mockIsAtLeastRole.mockReturnValue(true);
    mockHasPermission.mockReturnValue(true);

    const handler = withAuth(dummyHandler, {
      role: 'analyst',
      resource: 'models',
      action: 'create',
    });
    const req = makeRequest('GET', { sessionToken: 'tok' });
    const res = await handler(req);

    expect(res.status).toBe(200);
    expect(mockIsAtLeastRole).toHaveBeenCalledWith('admin', 'analyst');
    expect(mockHasPermission).toHaveBeenCalledWith('admin', 'models', 'create');
    expect(dummyHandler).toHaveBeenCalled();
  });

  // RG-010
  it('RG-010: getSessionToken extracts cookie value from request', () => {
    const req = makeRequest('GET', { sessionToken: 'my-session-token' });
    expect(getSessionToken(req)).toBe('my-session-token');
  });

  // RG-011
  it('RG-011: buildSessionCookie includes HttpOnly, Secure, SameSite=Strict attributes', () => {
    const cookie = buildSessionCookie('tok-123', 3600);

    expect(cookie).toContain('tpi_session=tok-123');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=Strict');
    expect(cookie).toContain('Path=/');
    expect(cookie).toContain('Max-Age=3600');
  });

  // RG-012
  it('RG-012: buildCsrfCookie is NOT HttpOnly (readable by JS for double-submit)', () => {
    const cookie = buildCsrfCookie('csrf-abc', 3600);

    expect(cookie).toContain('tpi_csrf=csrf-abc');
    expect(cookie).not.toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Strict');
    expect(cookie).toContain('Max-Age=3600');
  });

  // RG-013
  it('RG-013: buildLogoutCookies sets Max-Age=0 for both cookies', () => {
    const cookies = buildLogoutCookies();

    expect(cookies).toHaveLength(2);
    expect(cookies[0]).toContain('tpi_session=');
    expect(cookies[0]).toContain('Max-Age=0');
    expect(cookies[1]).toContain('tpi_csrf=');
    expect(cookies[1]).toContain('Max-Age=0');
  });

  // RG-014
  it('RG-014: withAuth handles PATCH, PUT, DELETE methods with CSRF enforcement', async () => {
    mockValidateSession.mockReturnValue(VALID_USER);
    const csrfVal = 'csrf-ok';

    for (const method of ['PATCH', 'PUT', 'DELETE']) {
      vi.clearAllMocks();
      mockValidateSession.mockReturnValue(VALID_USER);

      const handler = withAuth(dummyHandler);

      // Without CSRF — should 403
      const reqNoCsrf = makeRequest(method, { sessionToken: 'tok' });
      const resNoCsrf = await handler(reqNoCsrf);
      expect(resNoCsrf.status).toBe(403);

      // With matching CSRF — should 200
      const reqOk = makeRequest(method, {
        sessionToken: 'tok',
        csrfCookie: csrfVal,
        csrfHeader: csrfVal,
      });
      const resOk = await handler(reqOk);
      expect(resOk.status).toBe(200);
    }
  });

  // RG-015: API key auth - defaults to analyst role
  it('RG-015: withAuth authenticates with API key and defaults to analyst role', async () => {
    // No session, but API key present
    mockValidateSession.mockReturnValue(null);
    delete process.env.NODA_API_KEY_ROLE;
    delete process.env.API_KEY_PERMISSIONS;

    const handler = withAuth(dummyHandler);
    const req = new NextRequest('http://localhost:42001/api/test', {
      method: 'GET',
      headers: { 'x-api-key': 'test-api-key' },
    });
    const res = await handler(req);

    expect(res.status).toBe(200);
    expect(dummyHandler).toHaveBeenCalled();
    const ctx = dummyHandler.mock.calls[0][1];
    expect(ctx.user.role).toBe('analyst');
  });

  // RG-016: API key auth - respects API_KEY_ROLE env var
  it('RG-016: withAuth respects NODA_API_KEY_ROLE environment variable', async () => {
    mockValidateSession.mockReturnValue(null);
    process.env.NODA_API_KEY_ROLE = 'viewer';
    delete process.env.API_KEY_PERMISSIONS;

    const handler = withAuth(dummyHandler);
    const req = new NextRequest('http://localhost:42001/api/test', {
      method: 'GET',
      headers: { 'x-api-key': 'test-api-key' },
    });
    const res = await handler(req);

    expect(res.status).toBe(200);
    const ctx = dummyHandler.mock.calls[0][1];
    expect(ctx.user.role).toBe('viewer');
  });

  // RG-017: API key auth - invalid API_KEY_ROLE falls back to analyst
  it('RG-017: withAuth falls back to analyst for invalid API_KEY_ROLE', async () => {
    mockValidateSession.mockReturnValue(null);
    process.env.NODA_API_KEY_ROLE = 'invalid-role';
    delete process.env.API_KEY_PERMISSIONS;

    const handler = withAuth(dummyHandler);
    const req = new NextRequest('http://localhost:42001/api/test', {
      method: 'GET',
      headers: { 'x-api-key': 'test-api-key' },
    });
    const res = await handler(req);

    expect(res.status).toBe(200);
    const ctx = dummyHandler.mock.calls[0][1];
    expect(ctx.user.role).toBe('analyst');
  });

  // RG-018: API key auth - API_KEY_PERMISSIONS mapping
  it('RG-018: withAuth uses API_KEY_PERMISSIONS for per-key role mapping', async () => {
    mockValidateSession.mockReturnValue(null);
    delete process.env.NODA_API_KEY_ROLE;
    
    // Create a SHA-256 hash of the test key (first 16 chars)
    const crypto = await import('node:crypto');
    const testKey = 'my-special-key';
    const keyHash = crypto.createHash('sha256').update(testKey).digest('hex').slice(0, 16);
    
    process.env.API_KEY_PERMISSIONS = JSON.stringify([
      { keyHash, role: 'admin' },
    ]);

    const handler = withAuth(dummyHandler);
    const req = new NextRequest('http://localhost:42001/api/test', {
      method: 'GET',
      headers: { 'x-api-key': testKey },
    });
    const res = await handler(req);

    expect(res.status).toBe(200);
    const ctx = dummyHandler.mock.calls[0][1];
    expect(ctx.user.role).toBe('admin');
  });

  // RG-019: API key auth - unknown key falls back to default role
  it('RG-019: withAuth falls back to default role for unmapped API key', async () => {
    mockValidateSession.mockReturnValue(null);
    process.env.NODA_API_KEY_ROLE = 'viewer';
    
    // Set up permissions for a different key
    process.env.API_KEY_PERMISSIONS = JSON.stringify([
      { keyHash: 'someotherhash', role: 'admin' },
    ]);

    const handler = withAuth(dummyHandler);
    const req = new NextRequest('http://localhost:42001/api/test', {
      method: 'GET',
      headers: { 'x-api-key': 'unknown-key' },
    });
    const res = await handler(req);

    expect(res.status).toBe(200);
    const ctx = dummyHandler.mock.calls[0][1];
    expect(ctx.user.role).toBe('viewer');
  });

  // RG-020: API key auth - CSRF is skipped for API key requests
  it('RG-020: withAuth skips CSRF check for API key authenticated requests', async () => {
    mockValidateSession.mockReturnValue(null);
    delete process.env.NODA_API_KEY_ROLE;

    const handler = withAuth(dummyHandler);
    // POST without CSRF tokens - should work with API key
    const req = new NextRequest('http://localhost:42001/api/test', {
      method: 'POST',
      headers: { 'x-api-key': 'test-api-key' },
    });
    const res = await handler(req);

    expect(res.status).toBe(200);
    expect(dummyHandler).toHaveBeenCalled();
  });
});
