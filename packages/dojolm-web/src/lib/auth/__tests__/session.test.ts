/**
 * Session management tests.
 *
 * Covers: createSession, validateSession, destroySession,
 *         cleanExpiredSessions, destroyUserSessions.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---- mocks ----

const mockRun = vi.fn();
const mockGet = vi.fn();
const mockPrepare = vi.fn(() => ({ run: mockRun, get: mockGet }));
const mockDb = { prepare: mockPrepare };

vi.mock('../../db/database', () => ({
  getDatabase: () => mockDb,
}));

vi.mock('../auth', () => ({
  generateSessionToken: vi.fn(() => 'raw-token-abc'),
  hashSessionToken: vi.fn((t: string) => `hashed-${t}`),
}));

// crypto.randomUUID is used inside createSession
vi.mock('node:crypto', async () => {
  const actual = await vi.importActual<typeof import('node:crypto')>('node:crypto');
  return { ...actual, default: { ...actual, randomUUID: () => 'uuid-1234' } };
});

import {
  createSession,
  validateSession,
  destroySession,
  cleanExpiredSessions,
  destroyUserSessions,
} from '../session';
import { generateSessionToken, hashSessionToken } from '../auth';

// ---- helpers ----

const savedEnv = process.env.TPI_SESSION_TTL_HOURS;

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.TPI_SESSION_TTL_HOURS;
});

afterEach(() => {
  if (savedEnv !== undefined) {
    process.env.TPI_SESSION_TTL_HOURS = savedEnv;
  } else {
    delete process.env.TPI_SESSION_TTL_HOURS;
  }
});

// ---- tests ----

describe('session', () => {
  // SES-001
  it('SES-001: createSession inserts session into DB and returns token', () => {
    const token = createSession('user-1', '127.0.0.1', 'Mozilla/5.0');

    expect(token).toBe('raw-token-abc');
    expect(generateSessionToken).toHaveBeenCalledOnce();
    expect(hashSessionToken).toHaveBeenCalledWith('raw-token-abc');
    expect(mockPrepare).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO sessions'),
    );
    expect(mockRun).toHaveBeenCalledWith(
      'uuid-1234',        // sessionId
      'user-1',           // userId
      'hashed-raw-token-abc', // tokenHash
      '127.0.0.1',        // ipAddress
      'Mozilla/5.0',      // userAgent
      expect.any(String),  // expiresAt ISO
    );
  });

  // SES-002
  it('SES-002: createSession uses default 24h TTL when no env var', () => {
    const before = Date.now();
    createSession('user-1', null, null);

    const expiresArg = mockRun.mock.calls[0][5] as string;
    const expiresMs = new Date(expiresArg).getTime();
    const expectedMs = before + 24 * 60 * 60 * 1000;

    // Allow 5 seconds tolerance
    expect(expiresMs).toBeGreaterThanOrEqual(expectedMs - 5000);
    expect(expiresMs).toBeLessThanOrEqual(expectedMs + 5000);
  });

  // SES-003
  it('SES-003: createSession uses custom TTL from TPI_SESSION_TTL_HOURS env var', () => {
    process.env.TPI_SESSION_TTL_HOURS = '8';
    const before = Date.now();
    createSession('user-1', null, null);

    const expiresArg = mockRun.mock.calls[0][5] as string;
    const expiresMs = new Date(expiresArg).getTime();
    const expectedMs = before + 8 * 60 * 60 * 1000;

    expect(expiresMs).toBeGreaterThanOrEqual(expectedMs - 5000);
    expect(expiresMs).toBeLessThanOrEqual(expectedMs + 5000);
  });

  // SES-004
  it('SES-004: createSession ignores invalid (NaN/negative) TTL values and falls back to 24h', () => {
    for (const bad of ['NaN', '-5', 'abc', '0']) {
      vi.clearAllMocks();
      process.env.TPI_SESSION_TTL_HOURS = bad;
      const before = Date.now();
      createSession('user-1', null, null);

      const expiresArg = mockRun.mock.calls[0][5] as string;
      const expiresMs = new Date(expiresArg).getTime();
      const expectedMs = before + 24 * 60 * 60 * 1000;

      expect(expiresMs).toBeGreaterThanOrEqual(expectedMs - 5000);
      expect(expiresMs).toBeLessThanOrEqual(expectedMs + 5000);
    }
  });

  // SES-005
  it('SES-005: validateSession returns user for valid non-expired session', () => {
    mockGet.mockReturnValueOnce({
      id: 'u1',
      username: 'alice',
      email: 'alice@test.com',
      role: 'admin',
      display_name: 'Alice',
      enabled: 1,
    });

    const result = validateSession('some-token');

    expect(result).toEqual({
      id: 'u1',
      username: 'alice',
      email: 'alice@test.com',
      role: 'admin',
      displayName: 'Alice',
    });
    expect(hashSessionToken).toHaveBeenCalledWith('some-token');
    expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('SELECT'));
    expect(mockGet).toHaveBeenCalledWith('hashed-some-token');
  });

  // SES-006
  it('SES-006: validateSession returns null for expired session and cleans it up', () => {
    mockGet.mockReturnValueOnce(undefined); // no row = expired or unknown

    const result = validateSession('expired-token');

    expect(result).toBeNull();
    // Should attempt cleanup DELETE
    expect(mockPrepare).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM sessions WHERE token_hash'),
    );
    expect(mockRun).toHaveBeenCalledWith('hashed-expired-token');
  });

  // SES-007
  it('SES-007: validateSession returns null for disabled user (enabled=false)', () => {
    mockGet.mockReturnValueOnce({
      id: 'u2',
      username: 'bob',
      email: 'bob@test.com',
      role: 'viewer',
      display_name: null,
      enabled: 0, // disabled
    });

    const result = validateSession('disabled-user-token');
    expect(result).toBeNull();
  });

  // SES-008
  it('SES-008: validateSession returns null for unknown token hash', () => {
    mockGet.mockReturnValueOnce(undefined);

    const result = validateSession('unknown-token');
    expect(result).toBeNull();
  });

  // SES-009
  it('SES-009: destroySession removes session by token hash', () => {
    destroySession('my-token');

    expect(hashSessionToken).toHaveBeenCalledWith('my-token');
    expect(mockPrepare).toHaveBeenCalledWith(
      'DELETE FROM sessions WHERE token_hash = ?',
    );
    expect(mockRun).toHaveBeenCalledWith('hashed-my-token');
  });

  // SES-010
  it('SES-010: cleanExpiredSessions deletes expired sessions and returns count', () => {
    mockRun.mockReturnValueOnce({ changes: 5 });

    const count = cleanExpiredSessions();

    expect(count).toBe(5);
    expect(mockPrepare).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM sessions WHERE expires_at < datetime('now')"),
    );
  });

  // SES-011
  it('SES-011: destroyUserSessions removes all sessions for a user', () => {
    mockRun.mockReturnValueOnce({ changes: 3 });

    const count = destroyUserSessions('user-99');

    expect(count).toBe(3);
    expect(mockPrepare).toHaveBeenCalledWith(
      'DELETE FROM sessions WHERE user_id = ?',
    );
    expect(mockRun).toHaveBeenCalledWith('user-99');
  });

  // SES-012
  it('SES-012: createSession stores IP address and user agent', () => {
    createSession('user-1', '10.0.0.42', 'CustomAgent/1.0');

    expect(mockRun).toHaveBeenCalledWith(
      expect.any(String), // sessionId
      'user-1',
      expect.any(String), // tokenHash
      '10.0.0.42',
      'CustomAgent/1.0',
      expect.any(String), // expiresAt
    );
  });
});
