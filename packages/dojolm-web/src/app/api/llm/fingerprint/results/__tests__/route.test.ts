/**
 * File: api/llm/fingerprint/results/__tests__/route.test.ts
 * Purpose: Stub tests for Kagami Fingerprint Results API (GET)
 * Test IDs: FPRES-001
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

vi.mock('node:fs', () => ({
  default: {
    promises: {
      readdir: vi.fn().mockRejectedValue(new Error('not found')),
      readFile: vi.fn(),
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
// GET /api/llm/fingerprint/results
// ===========================================================================

describe('GET /api/llm/fingerprint/results', () => {
  it('FPRES-001: should require auth', async () => {
    const { NextResponse } = await import('next/server');
    mockCheckApiAuth.mockReturnValue(
      NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    );

    const req = new NextRequest('http://localhost:42001/api/llm/fingerprint/results', {
      method: 'GET',
    });

    const res = await GET(req);

    expect(res.status).toBe(401);
  });
});
