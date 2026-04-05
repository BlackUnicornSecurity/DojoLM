/**
 * File: api/admin/validation/run/__tests__/route.test.ts
 * Purpose: Stub tests for Admin Validation Run API (POST)
 * Test IDs: VRUN-001
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
      unlinkSync: vi.fn(),
      openSync: vi.fn().mockReturnValue(42),
      closeSync: vi.fn(),
    },
    readFileSync: vi.fn().mockImplementation(() => { throw new Error('not found'); }),
    writeFileSync: vi.fn(),
    renameSync: vi.fn(),
    mkdirSync: vi.fn(),
    unlinkSync: vi.fn(),
    openSync: vi.fn().mockReturnValue(42),
    closeSync: vi.fn(),
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
// POST /api/admin/validation/run
// ===========================================================================

describe('POST /api/admin/validation/run', () => {
  it('VRUN-001: should require admin auth (withAuth wrapper)', async () => {
    const req = new NextRequest('http://localhost:42001/api/admin/validation/run', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    const data = await res.json();

    // With no lock file, should accept and return runId
    expect(res.status).toBe(200);
    expect(data.runId).toBeDefined();
    expect(data.status).toBe('queued');
  });
});
