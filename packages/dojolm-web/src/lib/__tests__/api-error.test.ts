/**
 * File: api-error.test.ts
 * Purpose: Tests for centralized API error response helper
 * Coverage: AERR-001 to AERR-006
 * Source: src/lib/api-error.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('apiError', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  // AERR-001: Returns correct status code and message
  it('AERR-001: returns correct status and user message', async () => {
    const { apiError } = await import('../api-error');

    const res = apiError('Not found', 404);
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body.error).toBe('Not found');
  });

  // AERR-002: Does not leak error details in production
  it('AERR-002: does not leak error details in production', async () => {
    (process.env as Record<string, string>).NODE_ENV = 'production';
    const { apiError } = await import('../api-error');

    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = apiError('Server error', 500, new Error('secret internal detail'));
    const body = await res.json();

    expect(body.error).toBe('Server error');
    expect(body.message).toBeUndefined();
  });

  // AERR-003: Includes error details in development
  it('AERR-003: includes error details in development', async () => {
    (process.env as Record<string, string>).NODE_ENV = 'development';
    const { apiError } = await import('../api-error');

    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = apiError('Server error', 500, new Error('debug info'));
    const body = await res.json();

    expect(body.error).toBe('Server error');
    expect(body.message).toBe('debug info');
  });

  // AERR-004: Clamps invalid status codes to 500
  it('AERR-004: clamps invalid status codes to 500', async () => {
    const { apiError } = await import('../api-error');

    const res1 = apiError('Bad', 200);
    expect(res1.status).toBe(500);

    const res2 = apiError('Bad', 999);
    expect(res2.status).toBe(500);
  });

  // AERR-005: Accepts valid error status codes
  it('AERR-005: accepts valid error status codes', async () => {
    const { apiError } = await import('../api-error');

    expect(apiError('Bad Request', 400).status).toBe(400);
    expect(apiError('Unauthorized', 401).status).toBe(401);
    expect(apiError('Forbidden', 403).status).toBe(403);
    expect(apiError('Not Found', 404).status).toBe(404);
    expect(apiError('Conflict', 409).status).toBe(409);
    expect(apiError('Server Error', 500).status).toBe(500);
    expect(apiError('Bad Gateway', 502).status).toBe(502);
  });

  // AERR-006: Works without error parameter
  it('AERR-006: works without error parameter', async () => {
    const { apiError } = await import('../api-error');

    const res = apiError('Custom message', 422);
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toBe('Custom message');
  });
});
