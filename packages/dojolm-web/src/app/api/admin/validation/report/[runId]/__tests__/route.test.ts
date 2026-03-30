/**
 * File: api/admin/validation/report/[runId]/__tests__/route.test.ts
 * Purpose: Tests for Admin Validation Report API (GET) — report retrieval with format param
 * Test IDs: VRPT-001 through VRPT-004
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

const { mockReadFile } = vi.hoisted(() => ({
  mockReadFile: vi.fn().mockRejectedValue(new Error('not found')),
}));

vi.mock('fs/promises', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    default: { ...actual, readFile: mockReadFile },
    readFile: mockReadFile,
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

const FULL_REPORT = {
  run_id: VALID_UUID,
  report_id: 'rpt-001',
  generated_at: '2026-03-30T00:00:00Z',
  overall_verdict: 'PASS',
  non_conformity_count: 0,
  corpus_version: '1.0.0',
  tool_version: '2.0.0',
  modules: [
    {
      module_id: 'prompt-injection',
      tier: 1,
      decision: { verdict: 'PASS' },
      metrics: { accuracy: 0.98, precision: 0.97, recall: 0.99, f1: 0.98 },
      matrix: { tp: 49, tn: 49, fp: 1, fn: 1 },
    },
  ],
};

// ---------------------------------------------------------------------------
// Reset mocks
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
// GET /api/admin/validation/report/[runId]
// ===========================================================================

describe('GET /api/admin/validation/report/[runId]', () => {
  it('VRPT-001: should return full report in JSON format by default', async () => {
    mockReadFile.mockResolvedValue(JSON.stringify(FULL_REPORT));

    const req = new NextRequest(
      `http://localhost:42001/api/admin/validation/report/${VALID_UUID}`,
      { method: 'GET' }
    );

    const res = await GET(req, makeContext(VALID_UUID));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.report_available).toBe(true);
    expect(data.run_id).toBe(VALID_UUID);
    expect(data.overall_verdict).toBe('PASS');
    expect(data.modules).toHaveLength(1);
  });

  it('VRPT-002: should return summary format when ?format=summary', async () => {
    mockReadFile.mockResolvedValue(JSON.stringify(FULL_REPORT));

    const req = new NextRequest(
      `http://localhost:42001/api/admin/validation/report/${VALID_UUID}?format=summary`,
      { method: 'GET' }
    );

    const res = await GET(req, makeContext(VALID_UUID));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.report_available).toBe(true);
    expect(data.run_id).toBe(VALID_UUID);
    expect(data.modules).toHaveLength(1);
    // Summary should include module_id but not raw sample data
    expect(data.modules[0].module_id).toBe('prompt-injection');
    expect(data.modules[0].verdict).toBe('PASS');
  });

  it('VRPT-003: should reject invalid format param', async () => {
    const req = new NextRequest(
      `http://localhost:42001/api/admin/validation/report/${VALID_UUID}?format=xml`,
      { method: 'GET' }
    );

    const res = await GET(req, makeContext(VALID_UUID));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('format must be');
  });

  it('VRPT-004: should return 404 when run does not exist', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'));

    const req = new NextRequest(
      `http://localhost:42001/api/admin/validation/report/${VALID_UUID}`,
      { method: 'GET' }
    );

    const res = await GET(req, makeContext(VALID_UUID));
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe('Validation run not found');
  });
});
