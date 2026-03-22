/**
 * File: llm/guard/route.test.ts
 * Purpose: Tests for GET/PUT/POST /api/llm/guard API routes
 * Coverage: API-G-001 to API-G-005
 * Source: src/app/api/llm/guard/route.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock guard storage
const mockConfig = {
  enabled: false,
  mode: 'shinobi' as const,
  blockThreshold: 'WARNING' as const,
  engines: null,
  persist: false,
};

vi.mock('@/lib/storage/guard-storage', () => ({
  getGuardConfig: vi.fn().mockResolvedValue({
    enabled: false,
    mode: 'shinobi',
    blockThreshold: 'WARNING',
    engines: null,
    persist: false,
  }),
  saveGuardConfig: vi.fn().mockResolvedValue(undefined),
}));

// Mock api-auth
vi.mock('@/lib/api-auth', () => ({
  checkApiAuth: vi.fn().mockReturnValue(null),
}));

function createGetRequest(): NextRequest {
  return new NextRequest('http://localhost:42001/api/llm/guard', {
    method: 'GET',
  });
}

function createPutRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:42001/api/llm/guard', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('API /api/llm/guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/llm/guard', () => {
    // API-G-001: Fetch current guard config
    it('API-G-001: returns current guard config', async () => {
      const { GET } = await import('@/app/api/llm/guard/route');

      const res = await GET(createGetRequest());
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data).toHaveProperty('enabled');
      expect(body.data).toHaveProperty('mode');
      expect(body.data).toHaveProperty('blockThreshold');
      expect(body.data.mode).toBe('shinobi');
    });

    // API-G-001b: Returns defaults when storage throws
    it('API-G-001b: returns default config when storage fails', async () => {
      const { getGuardConfig } = await import('@/lib/storage/guard-storage');
      vi.mocked(getGuardConfig).mockRejectedValueOnce(new Error('Storage error'));

      const { GET } = await import('@/app/api/llm/guard/route');

      const res = await GET(createGetRequest());
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data).toHaveProperty('mode');
    });
  });

  describe('PUT /api/llm/guard', () => {
    // API-G-002: Update guard mode
    it('API-G-002: updates guard config with valid data', async () => {
      const { saveGuardConfig } = await import('@/lib/storage/guard-storage');
      const { PUT } = await import('@/app/api/llm/guard/route');

      const req = createPutRequest({
        enabled: true,
        mode: 'hattori',
        blockThreshold: 'CRITICAL',
      });

      const res = await PUT(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data.mode).toBe('hattori');
      expect(body.data.enabled).toBe(true);
      expect(body.data.blockThreshold).toBe('CRITICAL');
      expect(saveGuardConfig).toHaveBeenCalled();
    });

    // API-G-003: Reject unknown mode
    it('API-G-003: rejects invalid guard mode', async () => {
      const { PUT } = await import('@/app/api/llm/guard/route');

      const req = createPutRequest({
        enabled: true,
        mode: 'invalid-mode',
        blockThreshold: 'WARNING',
      });

      const res = await PUT(req);
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.error).toContain('mode must be one of');
    });

    // API-G-003b: Reject invalid block threshold
    it('API-G-003b: rejects invalid block threshold', async () => {
      const { PUT } = await import('@/app/api/llm/guard/route');

      const req = createPutRequest({
        enabled: true,
        mode: 'shinobi',
        blockThreshold: 'INVALID',
      });

      const res = await PUT(req);
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.error).toContain('blockThreshold must be one of');
    });

    // API-G-004: Backward-compat old mode name (metsuke -> shinobi)
    it('API-G-004: normalizes old mode name metsuke to shinobi', async () => {
      const { PUT } = await import('@/app/api/llm/guard/route');

      const req = createPutRequest({
        enabled: true,
        mode: 'metsuke',
        blockThreshold: 'WARNING',
      });

      const res = await PUT(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data.mode).toBe('shinobi');
    });

    // API-G-004b: Backward-compat old mode name (ninja -> samurai)
    it('API-G-004b: normalizes old mode name ninja to samurai', async () => {
      const { PUT } = await import('@/app/api/llm/guard/route');

      const req = createPutRequest({
        enabled: true,
        mode: 'ninja',
        blockThreshold: 'WARNING',
      });

      const res = await PUT(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data.mode).toBe('samurai');
    });

    // API-G-005: Reject non-boolean enabled
    it('API-G-005: rejects non-boolean enabled field', async () => {
      const { PUT } = await import('@/app/api/llm/guard/route');

      const req = createPutRequest({
        enabled: 'yes',
        mode: 'shinobi',
        blockThreshold: 'WARNING',
      });

      const res = await PUT(req);
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.error).toContain('enabled must be a boolean');
    });

    // API-G-005b: Reject invalid JSON body
    it('API-G-005b: rejects invalid JSON body', async () => {
      const { PUT } = await import('@/app/api/llm/guard/route');

      const req = new NextRequest('http://localhost:42001/api/llm/guard', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: 'not-json{{',
      });

      const res = await PUT(req);
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.error).toContain('Invalid JSON');
    });

    // API-G-005c: Validate engines array
    it('API-G-005c: rejects empty engines array', async () => {
      const { PUT } = await import('@/app/api/llm/guard/route');

      const req = createPutRequest({
        enabled: true,
        mode: 'shinobi',
        blockThreshold: 'WARNING',
        engines: [],
      });

      const res = await PUT(req);
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.error).toContain('engines');
    });

    // API-G-005d: Validate engine ID characters
    it('API-G-005d: rejects engine IDs with special characters', async () => {
      const { PUT } = await import('@/app/api/llm/guard/route');

      const req = createPutRequest({
        enabled: true,
        mode: 'shinobi',
        blockThreshold: 'WARNING',
        engines: ['valid-engine', '<script>alert(1)</script>'],
      });

      const res = await PUT(req);
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.error).toContain('alphanumeric');
    });
  });

  describe('POST /api/llm/guard (backward compat)', () => {
    // API-G-005e: POST is an alias for PUT
    it('API-G-005e: POST delegates to PUT', async () => {
      const { POST } = await import('@/app/api/llm/guard/route');

      const req = new NextRequest('http://localhost:42001/api/llm/guard', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          enabled: true,
          mode: 'samurai',
          blockThreshold: 'CRITICAL',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data.mode).toBe('samurai');
    });
  });
});
