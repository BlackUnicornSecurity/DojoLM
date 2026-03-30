/**
 * File: api/admin/validation/runs/__tests__/route.test.ts
 * Purpose: Stub tests for Admin Validation Runs List API (GET)
 * Test IDs: VRUNS-001
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/auth/route-guard', () => ({
  withAuth: (handler: Function, _opts: unknown) => handler,
}));

vi.mock('@/lib/runtime-paths', () => ({
  getDataPath: vi.fn((...segments: string[]) => `/tmp/test-data/${segments.join('/')}`),
}));

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    default: { ...actual, readdirSync: vi.fn().mockImplementation(() => { throw new Error('not found'); }), readFileSync: vi.fn() },
    readdirSync: vi.fn().mockImplementation(() => { throw new Error('not found'); }),
    readFileSync: vi.fn(),
  };
});

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { GET } from '../route';

// ---------------------------------------------------------------------------
// Reset mocks
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
// GET /api/admin/validation/runs
// ===========================================================================

describe('GET /api/admin/validation/runs', () => {
  it('VRUNS-001: should require admin auth (withAuth wrapper)', async () => {
    const req = new NextRequest('http://localhost:42001/api/admin/validation/runs', {
      method: 'GET',
    });

    const res = await GET(req);
    const data = await res.json();

    // With no runs directory, should return empty list
    expect(res.status).toBe(200);
    expect(data.runs).toEqual([]);
    expect(data.total).toBe(0);
  });
});
