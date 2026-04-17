/**
 * File: api/admin/validation/export/[runId]/__tests__/route.test.ts
 * Purpose: Tests for Admin Validation Export API (GET) — downloadable report in json/csv/markdown
 * Test IDs: VEXP-001 through VEXP-004
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
  auditLog: {
    configChange: vi.fn(),
    exportAction: vi.fn().mockResolvedValue(undefined),
  },
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
      decision: { verdict: 'PASS', non_conformities: [] },
      metrics: { accuracy: 0.98, precision: 0.97, recall: 0.99, f1: 0.98, mcc: 0.96, specificity: 0.98, fpr: 0.02, fnr: 0.01 },
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
// GET /api/admin/validation/export/[runId]
// ===========================================================================

describe('GET /api/admin/validation/export/[runId]', () => {
  it('VEXP-001: should export report as JSON with Content-Disposition attachment', async () => {
    mockReadFile.mockResolvedValue(JSON.stringify(FULL_REPORT));

    const req = new NextRequest(
      `http://localhost:42001/api/admin/validation/export/${VALID_UUID}?format=json`,
      { method: 'GET' }
    );

    const res = await GET(req, makeContext(VALID_UUID));

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/json');
    expect(res.headers.get('Content-Disposition')).toContain('attachment');
    expect(res.headers.get('Content-Disposition')).toContain('.json');

    const text = await res.text();
    const data = JSON.parse(text);
    expect(data.run_id).toBe(VALID_UUID);
  });

  it('VEXP-002: should export report as CSV with correct headers', async () => {
    mockReadFile.mockResolvedValue(JSON.stringify(FULL_REPORT));

    const req = new NextRequest(
      `http://localhost:42001/api/admin/validation/export/${VALID_UUID}?format=csv`,
      { method: 'GET' }
    );

    const res = await GET(req, makeContext(VALID_UUID));

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/csv');
    expect(res.headers.get('Content-Disposition')).toContain('.csv');

    const text = await res.text();
    expect(text).toContain('module_id');
    expect(text).toContain('prompt-injection');
  });

  it('VEXP-003: should reject unsupported format param', async () => {
    const req = new NextRequest(
      `http://localhost:42001/api/admin/validation/export/${VALID_UUID}?format=xml`,
      { method: 'GET' }
    );

    const res = await GET(req, makeContext(VALID_UUID));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('format must be');
  });

  it('VEXP-004: should return 404 when report file does not exist', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'));

    const req = new NextRequest(
      `http://localhost:42001/api/admin/validation/export/${VALID_UUID}`,
      { method: 'GET' }
    );

    const res = await GET(req, makeContext(VALID_UUID));
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toContain('not found');
  });
});
