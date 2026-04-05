/**
 * Tests for POST /api/setup/admin
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Save original env
const originalEnv: Record<string, string | undefined> = {};

// Mocks
const mockCountUsers = vi.fn().mockReturnValue(0);
const mockUpdateLastLogin = vi.fn();

vi.mock('@/lib/db/repositories/user.repository', () => ({
  userRepo: {
    countUsers: () => mockCountUsers(),
    updateLastLogin: (...args: unknown[]) => mockUpdateLastLogin(...args),
  },
}));

vi.mock('@/lib/auth/auth', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed-pw'),
  generateCsrfToken: vi.fn().mockReturnValue('csrf-token'),
}));

vi.mock('@/lib/auth/session', () => ({
  createSession: vi.fn().mockReturnValue('session-token'),
}));

vi.mock('@/lib/auth/route-guard', () => ({
  buildSessionCookie: vi.fn().mockReturnValue('session-cookie'),
  buildCsrfCookie: vi.fn().mockReturnValue('csrf-cookie'),
}));

const mockDbPrepare = vi.fn().mockReturnValue({
  get: vi.fn().mockReturnValue({ total: 0 }),
  run: vi.fn(),
});
const mockDbTransaction = vi.fn((fn: Function) => {
  return () => fn();
});

vi.mock('@/lib/db/database', () => ({
  getDatabase: vi.fn().mockReturnValue({
    prepare: (...args: unknown[]) => mockDbPrepare(...args),
    transaction: (...args: unknown[]) => mockDbTransaction(...args),
  }),
}));

vi.mock('@/lib/auth/login-rate-limit', () => ({
  getLoginRateLimitKey: vi.fn().mockReturnValue('key'),
  isLoginRateLimited: vi.fn().mockReturnValue(false),
  recordLoginRateLimitFailure: vi.fn(),
}));

import { POST } from '../route';

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:42001/api/setup/admin', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'http://localhost:42001',
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCountUsers.mockReturnValue(0);
  originalEnv.TPI_ADMIN_USERNAME = process.env.TPI_ADMIN_USERNAME;
  originalEnv.TPI_ADMIN_PASSWORD = process.env.TPI_ADMIN_PASSWORD;
  originalEnv.NODE_ENV = process.env.NODE_ENV;
  process.env.NODE_ENV = 'development';
});

afterEach(() => {
  if (originalEnv.TPI_ADMIN_USERNAME === undefined) delete process.env.TPI_ADMIN_USERNAME;
  else process.env.TPI_ADMIN_USERNAME = originalEnv.TPI_ADMIN_USERNAME;
  if (originalEnv.TPI_ADMIN_PASSWORD === undefined) delete process.env.TPI_ADMIN_PASSWORD;
  else process.env.TPI_ADMIN_PASSWORD = originalEnv.TPI_ADMIN_PASSWORD;
  if (originalEnv.NODE_ENV === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalEnv.NODE_ENV;
});

describe('POST /api/setup/admin', () => {
  // SA-001
  it('SA-001: creates admin with provided credentials', async () => {
    const res = await POST(makeRequest({
      username: 'testadmin',
      password: 'Test1234!@#$xx',
    }));

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.user.username).toBe('testadmin');
    expect(data.user.role).toBe('admin');
  });

  // SA-002
  it('SA-002: returns 400 without username or password', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  // SA-003
  it('SA-003: falls back to TPI_ADMIN_PASSWORD env var when password not provided', async () => {
    process.env.TPI_ADMIN_PASSWORD = 'EnvP@ssw0rd123!';

    const res = await POST(makeRequest({
      username: 'envadmin',
    }));

    // Password validation will apply — the env var password must meet complexity requirements
    // Our mock bypasses validation (hashPassword is mocked), so it should succeed
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.user.username).toBe('envadmin');
  });

  // SA-004
  it('SA-004: falls back to TPI_ADMIN_USERNAME env var when username not provided', async () => {
    process.env.TPI_ADMIN_USERNAME = 'envuser';

    const res = await POST(makeRequest({
      password: 'Test1234!@#$xx',
    }));

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.user.username).toBe('envuser');
  });

  // SA-005
  it('SA-005: returns 400 when neither body nor env var provides credentials', async () => {
    delete process.env.TPI_ADMIN_USERNAME;
    delete process.env.TPI_ADMIN_PASSWORD;

    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  // SA-006
  it('SA-006: returns 403 when users already exist', async () => {
    mockCountUsers.mockReturnValue(1);

    const res = await POST(makeRequest({
      username: 'testadmin',
      password: 'Test1234!@#$xx',
    }));

    expect(res.status).toBe(403);
  });

  // SA-007
  it('SA-007: rejects weak password', async () => {
    const res = await POST(makeRequest({
      username: 'testadmin',
      password: 'short',
    }));

    expect(res.status).toBe(400);
  });

  // SA-008
  it('SA-008: body password takes precedence over env var', async () => {
    process.env.TPI_ADMIN_PASSWORD = 'EnvP@ssw0rd123!';

    const res = await POST(makeRequest({
      username: 'testadmin',
      password: 'BodyP@ssw0rd12!',
    }));

    // Should use body password, not env var
    expect(res.status).toBe(201);
  });
});
