/**
 * File: api-route-access.test.ts
 * Purpose: Tests for API route access classification helpers
 * Coverage: ARA-001 to ARA-020
 * Source: src/lib/api-route-access.ts
 */

import { describe, it, expect } from 'vitest';
import {
  isPublicApiRoute,
  isPublicReadApiRoute,
  isPublicBrowserActionRoute,
} from '../api-route-access';

// ---------------------------------------------------------------------------
// isPublicApiRoute
// ---------------------------------------------------------------------------
describe('isPublicApiRoute', () => {
  // ARA-001: Health endpoints are unconditionally public
  it('ARA-001: /api/health is a public route', () => {
    expect(isPublicApiRoute('/api/health', 'GET')).toBe(true);
  });

  // ARA-002: Admin health endpoint is public
  it('ARA-002: /api/admin/health is a public route', () => {
    expect(isPublicApiRoute('/api/admin/health', 'GET')).toBe(true);
  });

  // ARA-003: Auth login is public
  it('ARA-003: /api/auth/login is a public route', () => {
    expect(isPublicApiRoute('/api/auth/login', 'POST')).toBe(true);
  });

  // ARA-004: Auth logout is public
  it('ARA-004: /api/auth/logout is a public route', () => {
    expect(isPublicApiRoute('/api/auth/logout', 'POST')).toBe(true);
  });

  // ARA-005: Auth me endpoint is public
  it('ARA-005: /api/auth/me is a public route', () => {
    expect(isPublicApiRoute('/api/auth/me', 'GET')).toBe(true);
  });

  // ARA-006: Protected API route is not public
  it('ARA-006: /api/llm/models is NOT a public route', () => {
    expect(isPublicApiRoute('/api/llm/models', 'GET')).toBe(false);
  });

  // ARA-007: Protected POST route is not public
  it('ARA-007: /api/llm/chat is NOT a public route', () => {
    expect(isPublicApiRoute('/api/llm/chat', 'POST')).toBe(false);
  });

  // ARA-008: Trailing slash does not match a public route
  it('ARA-008: /api/health/ with trailing slash is NOT matched', () => {
    expect(isPublicApiRoute('/api/health/', 'GET')).toBe(false);
  });

  // ARA-009: Public readonly route via GET is public (union with read routes)
  it('ARA-009: /api/stats via GET is public (readonly)', () => {
    expect(isPublicApiRoute('/api/stats', 'GET')).toBe(true);
  });

  // ARA-010: Public readonly route via POST is NOT public
  it('ARA-010: /api/stats via POST is NOT public', () => {
    expect(isPublicApiRoute('/api/stats', 'POST')).toBe(false);
  });

  // ARA-011: Case-insensitive method normalisation — lowercase 'get' treated same as 'GET'
  it('ARA-011: /api/stats via lowercase get is public', () => {
    expect(isPublicApiRoute('/api/stats', 'get')).toBe(true);
  });

  // ARA-012: Arbitrary unknown route is not public
  it('ARA-012: /api/unknown/route is NOT public', () => {
    expect(isPublicApiRoute('/api/unknown/route', 'GET')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isPublicReadApiRoute
// ---------------------------------------------------------------------------
describe('isPublicReadApiRoute', () => {
  // ARA-013: /api/compliance GET is a public read route
  it('ARA-013: /api/compliance via GET is a public read route', () => {
    expect(isPublicReadApiRoute('/api/compliance', 'GET')).toBe(true);
  });

  // ARA-014: /api/fixtures GET is a public read route
  it('ARA-014: /api/fixtures via GET is a public read route', () => {
    expect(isPublicReadApiRoute('/api/fixtures', 'GET')).toBe(true);
  });

  // ARA-015: /api/stats HEAD is a public read route (HEAD is a read method)
  it('ARA-015: /api/stats via HEAD is a public read route', () => {
    expect(isPublicReadApiRoute('/api/stats', 'HEAD')).toBe(true);
  });

  // ARA-016: /api/stats POST is NOT a public read route
  it('ARA-016: /api/stats via POST is NOT a public read route', () => {
    expect(isPublicReadApiRoute('/api/stats', 'POST')).toBe(false);
  });

  // ARA-017: /api/compliance PUT is NOT a public read route
  it('ARA-017: /api/compliance via PUT is NOT a public read route', () => {
    expect(isPublicReadApiRoute('/api/compliance', 'PUT')).toBe(false);
  });

  // ARA-018: Non-listed route is not a public read route even with GET
  it('ARA-018: /api/llm/models via GET is NOT a public read route', () => {
    expect(isPublicReadApiRoute('/api/llm/models', 'GET')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isPublicBrowserActionRoute
// ---------------------------------------------------------------------------
describe('isPublicBrowserActionRoute', () => {
  // ARA-019: POST /api/scan is a browser action route
  it('ARA-019: POST /api/scan is a public browser action route', () => {
    expect(isPublicBrowserActionRoute('/api/scan', 'POST')).toBe(true);
  });

  // ARA-020: POST /api/scan-fixture is a browser action route
  it('ARA-020: POST /api/scan-fixture is a public browser action route', () => {
    expect(isPublicBrowserActionRoute('/api/scan-fixture', 'POST')).toBe(true);
  });

  // ARA-021: GET /api/read-fixture is a browser action route
  it('ARA-021: GET /api/read-fixture is a public browser action route', () => {
    expect(isPublicBrowserActionRoute('/api/read-fixture', 'GET')).toBe(true);
  });

  // ARA-022: GET /api/read-fixture/media is a browser action route
  it('ARA-022: GET /api/read-fixture/media is a public browser action route', () => {
    expect(isPublicBrowserActionRoute('/api/read-fixture/media', 'GET')).toBe(true);
  });

  // ARA-023: GET /api/scan-fixture is a browser action route
  it('ARA-023: GET /api/scan-fixture is a public browser action route', () => {
    expect(isPublicBrowserActionRoute('/api/scan-fixture', 'GET')).toBe(true);
  });

  // ARA-024: POST /api/read-fixture is NOT a browser action route (wrong method)
  it('ARA-024: POST /api/read-fixture is NOT a public browser action route', () => {
    expect(isPublicBrowserActionRoute('/api/read-fixture', 'POST')).toBe(false);
  });

  // ARA-025: GET /api/scan is NOT a browser action route (wrong method)
  it('ARA-025: GET /api/scan is NOT a public browser action route', () => {
    expect(isPublicBrowserActionRoute('/api/scan', 'GET')).toBe(false);
  });

  // ARA-026: DELETE /api/scan is NOT a browser action route
  it('ARA-026: DELETE /api/scan is NOT a public browser action route', () => {
    expect(isPublicBrowserActionRoute('/api/scan', 'DELETE')).toBe(false);
  });

  // ARA-027: Unknown path is not a browser action route
  it('ARA-027: POST /api/unknown is NOT a public browser action route', () => {
    expect(isPublicBrowserActionRoute('/api/unknown', 'POST')).toBe(false);
  });

  // ARA-028: Method normalisation — lowercase 'post' is treated same as 'POST'
  it('ARA-028: lowercase post /api/scan is a public browser action route', () => {
    expect(isPublicBrowserActionRoute('/api/scan', 'post')).toBe(true);
  });
});
