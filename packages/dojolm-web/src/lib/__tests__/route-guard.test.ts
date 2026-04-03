/**
 * Tests for route-guard cookie helpers and constants
 */
import { describe, it, expect } from 'vitest';
import { buildSessionCookie, buildCsrfCookie, buildLogoutCookies, SESSION_COOKIE_NAME, CSRF_COOKIE_NAME } from '../auth/route-guard';

describe('route-guard helpers', () => {
  describe('buildSessionCookie', () => {
    it('builds valid Set-Cookie header', () => {
      const cookie = buildSessionCookie('test-token', 3600);
      expect(cookie).toContain(SESSION_COOKIE_NAME);
      expect(cookie).toContain('test-token');
      expect(cookie).toContain('Max-Age=3600');
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('SameSite=Strict');
    });
  });

  describe('buildCsrfCookie', () => {
    it('builds CSRF cookie without HttpOnly', () => {
      const cookie = buildCsrfCookie('csrf-token', 3600);
      expect(cookie).toContain(CSRF_COOKIE_NAME);
      expect(cookie).toContain('csrf-token');
      expect(cookie).not.toContain('HttpOnly');
    });
  });

  describe('buildLogoutCookies', () => {
    it('returns expired cookies', () => {
      const cookies = buildLogoutCookies();
      expect(cookies).toHaveLength(2);
      for (const cookie of cookies) {
        expect(cookie).toContain('Max-Age=0');
      }
    });
  });

  describe('constants', () => {
    it('exports cookie names', () => {
      expect(SESSION_COOKIE_NAME).toBeTruthy();
      expect(CSRF_COOKIE_NAME).toBeTruthy();
    });
  });
});
