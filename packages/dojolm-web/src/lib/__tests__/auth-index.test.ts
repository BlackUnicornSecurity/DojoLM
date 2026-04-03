/**
 * Tests for auth module barrel export — verifies all re-exports are accessible.
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('bcrypt', () => ({
  default: { hash: vi.fn(), compare: vi.fn() },
}));

vi.mock('../db/database', () => ({
  getDatabase: vi.fn(() => ({
    prepare: vi.fn().mockReturnValue({ run: vi.fn(), get: vi.fn(), all: vi.fn() }),
  })),
}));

import {
  hashPassword,
  verifyPassword,
  generateSessionToken,
  hashSessionToken,
  generateCsrfToken,
  hasPermission,
  getAllowedActions,
  isAtLeastRole,
  withAuth,
  getSessionToken,
  buildSessionCookie,
  buildCsrfCookie,
  buildLogoutCookies,
  SESSION_COOKIE_NAME,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
} from '../auth/index';

describe('auth barrel export', () => {
  it('exports auth utilities', () => {
    expect(typeof hashPassword).toBe('function');
    expect(typeof verifyPassword).toBe('function');
    expect(typeof generateSessionToken).toBe('function');
    expect(typeof hashSessionToken).toBe('function');
    expect(typeof generateCsrfToken).toBe('function');
  });

  it('exports RBAC functions', () => {
    expect(typeof hasPermission).toBe('function');
    expect(typeof getAllowedActions).toBe('function');
    expect(typeof isAtLeastRole).toBe('function');
  });

  it('exports route guard functions', () => {
    expect(typeof withAuth).toBe('function');
    expect(typeof getSessionToken).toBe('function');
    expect(typeof buildSessionCookie).toBe('function');
    expect(typeof buildCsrfCookie).toBe('function');
    expect(typeof buildLogoutCookies).toBe('function');
  });

  it('exports cookie constants', () => {
    expect(SESSION_COOKIE_NAME).toBeTruthy();
    expect(CSRF_COOKIE_NAME).toBeTruthy();
    expect(CSRF_HEADER_NAME).toBeTruthy();
  });
});
