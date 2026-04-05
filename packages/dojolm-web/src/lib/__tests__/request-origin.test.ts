/**
 * File: request-origin.test.ts
 * Purpose: Tests for request origin validation and CORS helpers
 * Coverage: RQORG-001 to RQORG-025
 * Source: src/lib/request-origin.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Module-level mocks — must be defined before dynamic imports
// ---------------------------------------------------------------------------

const mockValidateSession = vi.fn();

vi.mock('@/lib/auth/session', () => ({
  validateSession: (...args: unknown[]) => mockValidateSession(...args),
}));

vi.mock('@/lib/auth/route-guard', () => ({
  SESSION_COOKIE_NAME: 'tpi_session',
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(
  url: string,
  headers: Record<string, string> = {},
  cookies: Record<string, string> = {}
): NextRequest {
  const cookieHeader = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');

  const allHeaders: Record<string, string> = { ...headers };
  if (cookieHeader) {
    allHeaders['cookie'] = cookieHeader;
  }

  return new NextRequest(url, { headers: allHeaders });
}

/** Returns headers that pass the Fetch Metadata check (same-origin browser request) */
function validFetchMetadataHeaders(): Record<string, string> {
  return {
    'sec-fetch-site': 'same-origin',
    'sec-fetch-mode': 'cors',
    'sec-fetch-dest': 'empty',
  };
}

// ---------------------------------------------------------------------------
// getConfiguredAppOrigin
// ---------------------------------------------------------------------------
describe('getConfiguredAppOrigin', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
    delete process.env.TPI_APP_URL; // Ensure BUG-002 override doesn't leak
    mockValidateSession.mockReset();
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  // RQORG-001: Returns configured URL when NEXT_PUBLIC_APP_URL is set
  it('RQORG-001: returns the configured app origin when NEXT_PUBLIC_APP_URL is set', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://dojo.example.com';
    const { getConfiguredAppOrigin } = await import('../request-origin');
    expect(getConfiguredAppOrigin()).toBe('https://dojo.example.com');
  });

  // RQORG-002: Normalises the URL (strips path/trailing slash)
  it('RQORG-002: normalises NEXT_PUBLIC_APP_URL to origin only', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://dojo.example.com/some/path';
    const { getConfiguredAppOrigin } = await import('../request-origin');
    expect(getConfiguredAppOrigin()).toBe('https://dojo.example.com');
  });

  // RQORG-003: Falls back to 127.0.0.1 dev origin when env var not set in development
  it('RQORG-003: returns dev fallback origin in development when env var is absent', async () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    (process.env as Record<string, string>).NODE_ENV = 'development';
    const { getConfiguredAppOrigin } = await import('../request-origin');
    expect(getConfiguredAppOrigin()).toBe('http://127.0.0.1:42001');
  });

  // RQORG-004: Returns null in production when NEXT_PUBLIC_APP_URL is not set
  it('RQORG-004: returns null in production when NEXT_PUBLIC_APP_URL is absent', async () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    (process.env as Record<string, string>).NODE_ENV = 'production';
    const { getConfiguredAppOrigin } = await import('../request-origin');
    expect(getConfiguredAppOrigin()).toBeNull();
  });

  // RQORG-005: Returns null when NEXT_PUBLIC_APP_URL is an invalid URL
  it('RQORG-005: returns null when NEXT_PUBLIC_APP_URL is an invalid URL', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'not-a-valid-url';
    const { getConfiguredAppOrigin } = await import('../request-origin');
    expect(getConfiguredAppOrigin()).toBeNull();
  });

  // RQORG-006: Returns null when NEXT_PUBLIC_APP_URL uses a non-http/https protocol
  it('RQORG-006: returns null when NEXT_PUBLIC_APP_URL uses ftp:// protocol', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'ftp://example.com';
    const { getConfiguredAppOrigin } = await import('../request-origin');
    expect(getConfiguredAppOrigin()).toBeNull();
  });

  // RQORG-007: Trims whitespace from NEXT_PUBLIC_APP_URL
  it('RQORG-007: trims whitespace from NEXT_PUBLIC_APP_URL', async () => {
    process.env.NEXT_PUBLIC_APP_URL = '  https://dojo.example.com  ';
    const { getConfiguredAppOrigin } = await import('../request-origin');
    expect(getConfiguredAppOrigin()).toBe('https://dojo.example.com');
  });

  // ---------------------------------------------------------------------------
  // BUG-002: TPI_APP_URL runtime override
  // ---------------------------------------------------------------------------

  // RQORG-028: TPI_APP_URL takes precedence over NEXT_PUBLIC_APP_URL
  it('RQORG-028: TPI_APP_URL takes precedence over NEXT_PUBLIC_APP_URL', async () => {
    process.env.TPI_APP_URL = 'https://runtime.example.com';
    process.env.NEXT_PUBLIC_APP_URL = 'https://build.example.com';
    const { getConfiguredAppOrigin } = await import('../request-origin');
    expect(getConfiguredAppOrigin()).toBe('https://runtime.example.com');
  });

  // RQORG-029: Falls back to NEXT_PUBLIC_APP_URL when TPI_APP_URL is not set
  it('RQORG-029: falls back to NEXT_PUBLIC_APP_URL when TPI_APP_URL is absent', async () => {
    delete process.env.TPI_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = 'https://build.example.com';
    const { getConfiguredAppOrigin } = await import('../request-origin');
    expect(getConfiguredAppOrigin()).toBe('https://build.example.com');
  });

  // RQORG-030: TPI_APP_URL is normalised (path stripped to origin)
  it('RQORG-030: normalises TPI_APP_URL to origin only', async () => {
    process.env.TPI_APP_URL = 'https://runtime.example.com/some/path';
    const { getConfiguredAppOrigin } = await import('../request-origin');
    expect(getConfiguredAppOrigin()).toBe('https://runtime.example.com');
  });

  // RQORG-031: TPI_APP_URL whitespace is trimmed
  it('RQORG-031: trims whitespace from TPI_APP_URL', async () => {
    process.env.TPI_APP_URL = '  https://runtime.example.com  ';
    const { getConfiguredAppOrigin } = await import('../request-origin');
    expect(getConfiguredAppOrigin()).toBe('https://runtime.example.com');
  });

  // RQORG-033: Empty TPI_APP_URL falls back to NEXT_PUBLIC_APP_URL
  it('RQORG-033: empty TPI_APP_URL falls back to NEXT_PUBLIC_APP_URL', async () => {
    process.env.TPI_APP_URL = '';
    process.env.NEXT_PUBLIC_APP_URL = 'https://build.example.com';
    const { getConfiguredAppOrigin } = await import('../request-origin');
    expect(getConfiguredAppOrigin()).toBe('https://build.example.com');
  });

  // RQORG-034: TPI_APP_URL with invalid protocol returns null
  it('RQORG-034: TPI_APP_URL with invalid protocol returns null', async () => {
    process.env.TPI_APP_URL = 'ftp://example.com';
    delete process.env.NEXT_PUBLIC_APP_URL;
    (process.env as Record<string, string>).NODE_ENV = 'production';
    const { getConfiguredAppOrigin } = await import('../request-origin');
    expect(getConfiguredAppOrigin()).toBeNull();
  });

  // RQORG-035: TPI_APP_URL with non-URL string returns null
  it('RQORG-035: TPI_APP_URL with non-URL string returns null', async () => {
    process.env.TPI_APP_URL = 'not-a-valid-url';
    delete process.env.NEXT_PUBLIC_APP_URL;
    (process.env as Record<string, string>).NODE_ENV = 'production';
    const { getConfiguredAppOrigin } = await import('../request-origin');
    expect(getConfiguredAppOrigin()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// isAllowedCorsOrigin
// ---------------------------------------------------------------------------
describe('isAllowedCorsOrigin', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
    delete process.env.TPI_APP_URL; // Ensure BUG-002 override doesn't leak
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  // RQORG-008: Allows configured origin in production
  it('RQORG-008: allows the exact configured origin in production', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://dojo.example.com';
    (process.env as Record<string, string>).NODE_ENV = 'production';
    const { isAllowedCorsOrigin } = await import('../request-origin');
    expect(isAllowedCorsOrigin('https://dojo.example.com')).toBe(true);
  });

  // RQORG-009: Rejects a different origin in production
  it('RQORG-009: rejects a different origin in production', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://dojo.example.com';
    (process.env as Record<string, string>).NODE_ENV = 'production';
    const { isAllowedCorsOrigin } = await import('../request-origin');
    expect(isAllowedCorsOrigin('https://evil.example.com')).toBe(false);
  });

  // RQORG-010: Rejects invalid origin string
  it('RQORG-010: rejects an invalid origin string', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://dojo.example.com';
    (process.env as Record<string, string>).NODE_ENV = 'production';
    const { isAllowedCorsOrigin } = await import('../request-origin');
    expect(isAllowedCorsOrigin('not-a-url')).toBe(false);
  });

  // RQORG-011: Fails closed when appOrigin is null (production, no env var)
  it('RQORG-011: fails closed when appOrigin cannot be determined', async () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    (process.env as Record<string, string>).NODE_ENV = 'production';
    const { isAllowedCorsOrigin } = await import('../request-origin');
    expect(isAllowedCorsOrigin('https://anything.example.com')).toBe(false);
  });

  // RQORG-012: Allows extra dev origins in development
  it('RQORG-012: allows localhost:42001 in development', async () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    (process.env as Record<string, string>).NODE_ENV = 'development';
    const { isAllowedCorsOrigin } = await import('../request-origin');
    expect(isAllowedCorsOrigin('http://localhost:42001')).toBe(true);
  });

  // RQORG-013: Allows localhost:3001 in development
  it('RQORG-013: allows localhost:3001 in development', async () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    (process.env as Record<string, string>).NODE_ENV = 'development';
    const { isAllowedCorsOrigin } = await import('../request-origin');
    expect(isAllowedCorsOrigin('http://localhost:3001')).toBe(true);
  });

  // RQORG-014: Rejects random origin in development
  it('RQORG-014: rejects an unknown origin in development', async () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    (process.env as Record<string, string>).NODE_ENV = 'development';
    const { isAllowedCorsOrigin } = await import('../request-origin');
    expect(isAllowedCorsOrigin('http://attacker.local')).toBe(false);
  });

  // RQORG-032: TPI_APP_URL propagates to isAllowedCorsOrigin in production
  it('RQORG-032: TPI_APP_URL propagates to isAllowedCorsOrigin in production', async () => {
    process.env.TPI_APP_URL = 'https://runtime.example.com';
    process.env.NEXT_PUBLIC_APP_URL = 'https://build.example.com';
    (process.env as Record<string, string>).NODE_ENV = 'production';
    const { isAllowedCorsOrigin } = await import('../request-origin');
    expect(isAllowedCorsOrigin('https://runtime.example.com')).toBe(true);
    expect(isAllowedCorsOrigin('https://build.example.com')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isTrustedBrowserOriginRequest
// ---------------------------------------------------------------------------
describe('isTrustedBrowserOriginRequest', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  // RQORG-015: Accepts request with matching origin + valid fetch metadata (production)
  it('RQORG-015: accepts same-origin request with valid fetch metadata in production', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://dojo.example.com';
    (process.env as Record<string, string>).NODE_ENV = 'production';
    const { isTrustedBrowserOriginRequest } = await import('../request-origin');

    const req = makeRequest('https://dojo.example.com/api/test', {
      ...validFetchMetadataHeaders(),
      origin: 'https://dojo.example.com',
    });

    expect(isTrustedBrowserOriginRequest(req)).toBe(true);
  });

  // RQORG-016: Accepts when referer origin matches and fetch metadata is valid
  it('RQORG-016: accepts request matching via referer header in production', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://dojo.example.com';
    (process.env as Record<string, string>).NODE_ENV = 'production';
    const { isTrustedBrowserOriginRequest } = await import('../request-origin');

    const req = makeRequest('https://dojo.example.com/api/test', {
      ...validFetchMetadataHeaders(),
      referer: 'https://dojo.example.com/page',
    });

    expect(isTrustedBrowserOriginRequest(req)).toBe(true);
  });

  // RQORG-017: Rejects cross-origin request even with valid fetch metadata
  it('RQORG-017: rejects cross-origin request in production', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://dojo.example.com';
    (process.env as Record<string, string>).NODE_ENV = 'production';
    const { isTrustedBrowserOriginRequest } = await import('../request-origin');

    const req = makeRequest('https://dojo.example.com/api/test', {
      ...validFetchMetadataHeaders(),
      origin: 'https://attacker.example.com',
    });

    expect(isTrustedBrowserOriginRequest(req)).toBe(false);
  });

  // RQORG-018: Rejects request with missing fetch metadata headers
  it('RQORG-018: rejects request missing Fetch Metadata headers', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://dojo.example.com';
    (process.env as Record<string, string>).NODE_ENV = 'production';
    const { isTrustedBrowserOriginRequest } = await import('../request-origin');

    const req = makeRequest('https://dojo.example.com/api/test', {
      origin: 'https://dojo.example.com',
      // No sec-fetch-* headers
    });

    expect(isTrustedBrowserOriginRequest(req)).toBe(false);
  });

  // RQORG-019: Rejects when sec-fetch-site is 'cross-site'
  it('RQORG-019: rejects when sec-fetch-site is cross-site', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://dojo.example.com';
    (process.env as Record<string, string>).NODE_ENV = 'production';
    const { isTrustedBrowserOriginRequest } = await import('../request-origin');

    const req = makeRequest('https://dojo.example.com/api/test', {
      origin: 'https://dojo.example.com',
      'sec-fetch-site': 'cross-site',
      'sec-fetch-mode': 'cors',
      'sec-fetch-dest': 'empty',
    });

    expect(isTrustedBrowserOriginRequest(req)).toBe(false);
  });

  // RQORG-020: Rejects when appOrigin cannot be determined (production, no env var)
  it('RQORG-020: fails closed when appOrigin is null', async () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    (process.env as Record<string, string>).NODE_ENV = 'production';
    const { isTrustedBrowserOriginRequest } = await import('../request-origin');

    const req = makeRequest('https://dojo.example.com/api/test', {
      ...validFetchMetadataHeaders(),
      origin: 'https://dojo.example.com',
    });

    expect(isTrustedBrowserOriginRequest(req)).toBe(false);
  });

  // RQORG-021: Accepts dev-extra origin in development
  it('RQORG-021: accepts localhost:3001 in development', async () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    (process.env as Record<string, string>).NODE_ENV = 'development';
    const { isTrustedBrowserOriginRequest } = await import('../request-origin');

    const req = makeRequest('http://localhost:3001/api/test', {
      ...validFetchMetadataHeaders(),
      origin: 'http://localhost:3001',
    });

    expect(isTrustedBrowserOriginRequest(req)).toBe(true);
  });

  // RQORG-022: Rejects sec-fetch-dest 'script' (not in allowed set)
  it('RQORG-022: rejects when sec-fetch-dest is script', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://dojo.example.com';
    (process.env as Record<string, string>).NODE_ENV = 'production';
    const { isTrustedBrowserOriginRequest } = await import('../request-origin');

    const req = makeRequest('https://dojo.example.com/api/test', {
      origin: 'https://dojo.example.com',
      'sec-fetch-site': 'same-origin',
      'sec-fetch-mode': 'cors',
      'sec-fetch-dest': 'script',
    });

    expect(isTrustedBrowserOriginRequest(req)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isTrustedBrowserSessionRequest
// ---------------------------------------------------------------------------
describe('isTrustedBrowserSessionRequest', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
    mockValidateSession.mockReset();
    mockValidateSession.mockReturnValue(null);
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  // RQORG-023: Returns true for trusted origin + valid session cookie
  it('RQORG-023: returns true when origin is trusted and session is valid', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://dojo.example.com';
    (process.env as Record<string, string>).NODE_ENV = 'production';
    mockValidateSession.mockReturnValue({ id: 'user-1', role: 'admin' });
    const { isTrustedBrowserSessionRequest } = await import('../request-origin');

    const req = makeRequest(
      'https://dojo.example.com/api/test',
      {
        ...validFetchMetadataHeaders(),
        origin: 'https://dojo.example.com',
      },
      { tpi_session: 'valid-token' }
    );

    expect(isTrustedBrowserSessionRequest(req)).toBe(true);
  });

  // RQORG-024: Returns false when origin is trusted but session is invalid
  it('RQORG-024: returns false when session validation fails', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://dojo.example.com';
    (process.env as Record<string, string>).NODE_ENV = 'production';
    mockValidateSession.mockReturnValue(null); // invalid session
    const { isTrustedBrowserSessionRequest } = await import('../request-origin');

    const req = makeRequest(
      'https://dojo.example.com/api/test',
      {
        ...validFetchMetadataHeaders(),
        origin: 'https://dojo.example.com',
      },
      { tpi_session: 'bad-token' }
    );

    expect(isTrustedBrowserSessionRequest(req)).toBe(false);
  });

  // RQORG-025: Returns false when origin check fails regardless of session
  it('RQORG-025: returns false when origin is untrusted even with a valid session', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://dojo.example.com';
    (process.env as Record<string, string>).NODE_ENV = 'production';
    mockValidateSession.mockReturnValue({ id: 'user-1', role: 'admin' });
    const { isTrustedBrowserSessionRequest } = await import('../request-origin');

    const req = makeRequest(
      'https://dojo.example.com/api/test',
      {
        ...validFetchMetadataHeaders(),
        origin: 'https://attacker.example.com', // wrong origin
      },
      { tpi_session: 'valid-token' }
    );

    expect(isTrustedBrowserSessionRequest(req)).toBe(false);
  });

  // RQORG-026: Returns false when no session cookie is present at all
  it('RQORG-026: returns false when session cookie is absent', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://dojo.example.com';
    (process.env as Record<string, string>).NODE_ENV = 'production';
    const { isTrustedBrowserSessionRequest } = await import('../request-origin');

    const req = makeRequest('https://dojo.example.com/api/test', {
      ...validFetchMetadataHeaders(),
      origin: 'https://dojo.example.com',
    });

    expect(isTrustedBrowserSessionRequest(req)).toBe(false);
  });

  // RQORG-027: Returns false when validateSession throws (defensive handling)
  it('RQORG-027: returns false when validateSession throws an error', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://dojo.example.com';
    (process.env as Record<string, string>).NODE_ENV = 'production';
    mockValidateSession.mockImplementation(() => {
      throw new Error('crypto failure');
    });
    const { isTrustedBrowserSessionRequest } = await import('../request-origin');

    const req = makeRequest(
      'https://dojo.example.com/api/test',
      {
        ...validFetchMetadataHeaders(),
        origin: 'https://dojo.example.com',
      },
      { tpi_session: 'error-token' }
    );

    expect(isTrustedBrowserSessionRequest(req)).toBe(false);
  });
});
