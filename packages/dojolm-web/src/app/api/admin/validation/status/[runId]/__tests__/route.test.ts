/**
 * File: api/admin/validation/status/[runId]/__tests__/route.test.ts
 * Purpose: Tests for Admin Validation Status API (GET) — run progress polling
 * Test IDs: VSTATUS-001 through VSTATUS-004
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

const { mockReadFileSync } = vi.hoisted(() => ({
  mockReadFileSync: vi.fn().mockImplementation(() => { throw new Error('not found'); }),
}));

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    default: {
      ...actual,
      readFileSync: mockReadFileSync,
      writeFileSync: vi.fn(),
      mkdirSync: vi.fn(),
    },
    readFileSync: mockReadFileSync,
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
  };
});

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { GET } from '../route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

function makeContext(runId: string) {
  return { params: Promise.resolve({ runId }) };
}

// ---------------------------------------------------------------------------
// Reset mocks
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
// GET /api/admin/validation/status/[runId]
// ===========================================================================

describe('GET /api/admin/validation/status/[runId]', () => {
  it('VSTATUS-001: should return progress data for a valid run', async () => {
    const progress = {
      status: 'running',
      progress: 50,
      currentModule: 'prompt-injection',
      modulesCompleted: 2,
      modulesTotal: 4,
      samplesProcessed: 100,
      samplesTotal: 200,
      nonConformities: 1,
      elapsed: 30000,
      eta: 30000,
    };

    mockReadFileSync.mockReturnValue(JSON.stringify(progress));

    const req = new NextRequest(
      `http://localhost:42001/api/admin/validation/status/${VALID_UUID}`,
      { method: 'GET' }
    );

    const res = await GET(req, makeContext(VALID_UUID));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe('running');
    expect(data.progress).toBe(50);
    expect(data.currentModule).toBe('prompt-injection');
    expect(data.modulesCompleted).toBe(2);
    expect(data.modulesTotal).toBe(4);
  });

  it('VSTATUS-002: should reject invalid UUID format', async () => {
    const req = new NextRequest(
      'http://localhost:42001/api/admin/validation/status/not-a-uuid',
      { method: 'GET' }
    );

    const res = await GET(req, makeContext('not-a-uuid'));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Invalid run ID format');
  });

  it('VSTATUS-003: should return 404 when progress file does not exist', async () => {
    mockReadFileSync.mockImplementation(() => {
      throw new Error('ENOENT');
    });

    const req = new NextRequest(
      `http://localhost:42001/api/admin/validation/status/${VALID_UUID}`,
      { method: 'GET' }
    );

    const res = await GET(req, makeContext(VALID_UUID));
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe('Validation run not found');
  });

  it('VSTATUS-004: should return 500 for corrupted progress data', async () => {
    mockReadFileSync.mockReturnValue(JSON.stringify({ broken: true }));

    const req = new NextRequest(
      `http://localhost:42001/api/admin/validation/status/${VALID_UUID}`,
      { method: 'GET' }
    );

    const res = await GET(req, makeContext(VALID_UUID));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('Corrupted progress data');
  });
});
