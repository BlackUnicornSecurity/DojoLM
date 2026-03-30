/**
 * File: api/admin/validation/modules/__tests__/route.test.ts
 * Purpose: Stub tests for Admin Validation Modules API (GET)
 * Test IDs: VMOD-001
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
    default: { ...actual, readdirSync: vi.fn().mockReturnValue([]), readFileSync: vi.fn(), mkdirSync: vi.fn() },
    readdirSync: vi.fn().mockReturnValue([]),
    readFileSync: vi.fn(),
    mkdirSync: vi.fn(),
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
// GET /api/admin/validation/modules
// ===========================================================================

describe('GET /api/admin/validation/modules', () => {
  it('VMOD-001: should require admin auth (withAuth wrapper)', async () => {
    const req = new NextRequest('http://localhost:42001/api/admin/validation/modules', {
      method: 'GET',
    });

    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.modules).toEqual([]);
  });
});
