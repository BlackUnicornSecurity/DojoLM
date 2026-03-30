/**
 * File: api/admin/validation/verify/__tests__/route.test.ts
 * Purpose: Tests for Admin Validation Verify API (POST) — digital signature verification
 * Test IDs: VVERIFY-001 through VVERIFY-004
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

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { POST } from '../route';

// ---------------------------------------------------------------------------
// Reset mocks
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.KATANA_VERIFY_KEY;
});

// ===========================================================================
// POST /api/admin/validation/verify
// ===========================================================================

describe('POST /api/admin/validation/verify', () => {
  it('VVERIFY-001: should return structural validity for a well-formed signed report', async () => {
    const req = new NextRequest('http://localhost:42001/api/admin/validation/verify', {
      method: 'POST',
      body: JSON.stringify({
        report: {
          schema_version: '1.0.0',
          report_id: 'rpt-001',
          run_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          generated_at: '2026-03-30T00:00:00Z',
          overall_verdict: 'PASS',
          signature: 'abcdef0123456789abcdef0123456789',
        },
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.structural_valid).toBe(true);
    expect(data.signature_present).toBe(true);
    expect(data.signature_format_valid).toBe(true);
    expect(data.crypto_verified).toBe(false);
    expect(data.report_id).toBe('rpt-001');
    expect(data.run_id).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
  });

  it('VVERIFY-002: should reject invalid JSON body', async () => {
    const req = new NextRequest('http://localhost:42001/api/admin/validation/verify', {
      method: 'POST',
      body: 'not-json',
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Invalid JSON in request body');
  });

  it('VVERIFY-003: should return valid=false when report has no signature', async () => {
    const req = new NextRequest('http://localhost:42001/api/admin/validation/verify', {
      method: 'POST',
      body: JSON.stringify({
        report: {
          schema_version: '1.0.0',
          report_id: 'rpt-002',
          run_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          generated_at: '2026-03-30T00:00:00Z',
          overall_verdict: 'PASS',
        },
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.valid).toBe(false);
    expect(data.reason).toContain('does not contain a signature');
  });

  it('VVERIFY-004: should return valid=false for non-hex signature format', async () => {
    const req = new NextRequest('http://localhost:42001/api/admin/validation/verify', {
      method: 'POST',
      body: JSON.stringify({
        report: {
          schema_version: '1.0.0',
          report_id: 'rpt-003',
          run_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          generated_at: '2026-03-30T00:00:00Z',
          overall_verdict: 'PASS',
          signature: 'NOT_HEX!!!',
        },
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.valid).toBe(false);
    expect(data.reason).toContain('invalid');
  });
});
