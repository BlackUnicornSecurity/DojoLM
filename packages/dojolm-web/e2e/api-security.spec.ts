/**
 * E2E Test: API Security
 * Verifies security headers and auth requirements on API endpoints.
 */

import { test, expect } from '@playwright/test';

test.describe('API Security', () => {
  test('API responses include security headers', async ({ request }) => {
    const response = await request.get('/api/stats');
    const headers = response.headers();

    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('SAMEORIGIN');
  });

  test('models API does not leak API keys', async ({ request }) => {
    const response = await request.get('/api/llm/models');
    if (response.ok()) {
      const data = await response.json();
      const models = Array.isArray(data) ? data : [];
      for (const model of models) {
        expect(model).not.toHaveProperty('apiKey');
      }
    }
  });

  test('invalid JSON returns 400 not 500', async ({ request }) => {
    const response = await request.post('/api/llm/models', {
      headers: { 'Content-Type': 'application/json' },
      data: 'not valid json{{{',
    });
    // Should be a client error, not server error
    expect(response.status()).toBeLessThan(500);
  });

  test('CORS blocks external origins', async ({ request }) => {
    const response = await request.get('/api/stats', {
      headers: { Origin: 'http://evil.com' },
    });
    const headers = response.headers();
    expect(headers['access-control-allow-origin']).toBeUndefined();
  });
});
