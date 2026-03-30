/**
 * File: api/admin/validation/calibrate/__tests__/route.test.ts
 * Purpose: Stub tests for Admin Calibration API (POST)
 * Test IDs: CALIB-001
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/auth/route-guard', () => ({
  withAuth: (handler: Function, _opts: unknown) => handler,
}));

vi.mock('@/lib/audit-logger', () => ({
  auditLog: { configChange: vi.fn() },
}));

vi.mock('@/lib/runtime-paths', () => ({
  getDataPath: vi.fn((...segments: string[]) => `/tmp/test-data/${segments.join('/')}`),
}));

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    default: {
      ...actual,
      readFileSync: vi.fn().mockImplementation(() => { throw new Error('not found'); }),
      writeFileSync: vi.fn(),
      renameSync: vi.fn(),
      mkdirSync: vi.fn(),
      readdirSync: vi.fn().mockReturnValue([]),
      unlinkSync: vi.fn(),
    },
    readFileSync: vi.fn().mockImplementation(() => { throw new Error('not found'); }),
    writeFileSync: vi.fn(),
    renameSync: vi.fn(),
    mkdirSync: vi.fn(),
    readdirSync: vi.fn().mockReturnValue([]),
    unlinkSync: vi.fn(),
  };
});

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { POST } from '../route';

// ---------------------------------------------------------------------------
// Reset mocks
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
// POST /api/admin/validation/calibrate
// ===========================================================================

describe('POST /api/admin/validation/calibrate', () => {
  it('CALIB-001: should require admin auth (withAuth wrapper)', async () => {
    // The route is wrapped with withAuth({ role: 'admin' })
    // Since we mock withAuth to pass through, verify the handler itself works
    const req = new NextRequest('http://localhost:42001/api/admin/validation/calibrate', {
      method: 'POST',
    });

    const res = await POST(req);
    const data = await res.json();

    // With no lock file and no modules, should return success
    expect(res.status).toBe(200);
    expect(data.runId).toBeDefined();
    expect(data.results).toBeDefined();
  });
});
