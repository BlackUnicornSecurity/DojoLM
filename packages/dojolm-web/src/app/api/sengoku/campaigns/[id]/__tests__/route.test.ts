/**
 * File: api/sengoku/campaigns/[id]/__tests__/route.test.ts
 * Purpose: Stub tests for Sengoku Campaign CRUD API (GET, PATCH, DELETE)
 * Test IDs: SCAMP-001
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { mockCheckApiAuth } = vi.hoisted(() => ({
  mockCheckApiAuth: vi.fn(),
}));

vi.mock('@/lib/api-auth', () => ({
  checkApiAuth: mockCheckApiAuth,
}));

vi.mock('@/lib/runtime-paths', () => ({
  getDataPath: vi.fn((...segments: string[]) => `/tmp/test-data/${segments.join('/')}`),
}));

vi.mock('@/lib/sengoku-webhook', () => ({
  validateSengokuWebhookUrl: vi.fn().mockResolvedValue({ valid: true, normalizedUrl: 'https://example.com/hook' }),
}));

vi.mock('node:fs', () => ({
  default: {
    promises: {
      readFile: vi.fn().mockRejectedValue(new Error('not found')),
      writeFile: vi.fn().mockResolvedValue(undefined),
      rename: vi.fn().mockResolvedValue(undefined),
      readdir: vi.fn().mockRejectedValue(new Error('not found')),
    },
  },
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { GET } from '../route';

// ---------------------------------------------------------------------------
// Reset mocks
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckApiAuth.mockReturnValue(null);
});

// ===========================================================================
// GET /api/sengoku/campaigns/[id]
// ===========================================================================

describe('GET /api/sengoku/campaigns/[id]', () => {
  it('SCAMP-001: should require auth', async () => {
    const { NextResponse } = await import('next/server');
    mockCheckApiAuth.mockReturnValue(
      NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    );

    const req = new NextRequest('http://localhost:42001/api/sengoku/campaigns/test-1', {
      method: 'GET',
    });

    const res = await GET(req, { params: Promise.resolve({ id: 'test-1' }) });

    expect(res.status).toBe(401);
  });
});
