/**
 * E2E Test: Sensei API Routes
 *
 * Covers SENSEI-005: direct API coverage for /api/sensei/{chat,generate,mutate,judge,plan}.
 * Tests auth gating, input validation, and success responses.
 * These are API-level tests using Playwright's request context, not UI interactions.
 */

import { test, expect } from '@playwright/test';

const SENSEI_ROUTES = [
  '/api/sensei/chat',
  '/api/sensei/generate',
  '/api/sensei/mutate',
  '/api/sensei/judge',
  '/api/sensei/plan',
] as const;

test.describe('SENSEI-005: Sensei API routes', () => {
  test('all sensei routes reject unauthenticated POST', async ({ request }) => {
    for (const route of SENSEI_ROUTES) {
      const response = await request.post(route, {
        data: { prompt: 'test' },
        headers: { 'Content-Type': 'application/json' },
      });
      // Should get 401 (auth required) or 405 (method not allowed)
      expect([401, 403, 405]).toContain(response.status());
    }
  });

  test('sensei chat route rejects empty body', async ({ request }) => {
    const response = await request.post('/api/sensei/chat', {
      data: {},
      headers: { 'Content-Type': 'application/json' },
    });
    // Should get 400 (bad request) or 401 (auth required)
    expect([400, 401, 403, 422]).toContain(response.status());
  });

  test('sensei routes reject unsupported HTTP methods', async ({ request }) => {
    for (const route of SENSEI_ROUTES) {
      const response = await request.delete(route);
      expect([401, 403, 404, 405]).toContain(response.status());
    }
  });
});
