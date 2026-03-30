/**
 * File: api/compliance/frameworks/__tests__/route.test.ts
 * Purpose: Tests for Compliance Frameworks API (GET, OPTIONS)
 * Test IDs: FRMWK-001 through FRMWK-010
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

const { mockFetch } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
}));

// Mock global fetch
vi.stubGlobal('fetch', mockFetch);

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { GET, OPTIONS } from '../route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE_URL = 'http://localhost:42001/api/compliance/frameworks';

function getRequest(params?: Record<string, string>): NextRequest {
  const url = new URL(BASE_URL);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }
  return new NextRequest(url.toString(), { method: 'GET' });
}

function mockComplianceResponse(data: Record<string, unknown>, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(JSON.stringify(data)),
  };
}

// ---------------------------------------------------------------------------
// Reset mocks
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckApiAuth.mockReturnValue(null);
});

// ===========================================================================
// OPTIONS /api/compliance/frameworks
// ===========================================================================

describe('OPTIONS /api/compliance/frameworks', () => {
  it('FRMWK-001: returns 204 with Allow header', async () => {
    const req = new NextRequest(BASE_URL, { method: 'OPTIONS' });
    const res = await OPTIONS(req);

    expect(res.status).toBe(204);
    expect(res.headers.get('Allow')).toBe('GET, OPTIONS');
  });
});

// ===========================================================================
// GET /api/compliance/frameworks
// ===========================================================================

describe('GET /api/compliance/frameworks', () => {
  it('FRMWK-002: unauthenticated request returns 401', async () => {
    const authResponse = new (await import('next/server')).NextResponse(
      JSON.stringify({ error: 'Authentication required' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
    mockCheckApiAuth.mockReturnValue(authResponse);

    const res = await GET(getRequest());

    expect(res.status).toBe(401);
  });

  it('FRMWK-003: happy path returns frameworks, summary, and lastUpdated', async () => {
    const mockData = {
      frameworks: [
        { id: 'nist-ai-rmf', name: 'NIST AI RMF', controls: 10 },
        { id: 'iso-42001', name: 'ISO 42001', controls: 8 },
      ],
      summary: { totalControls: 18, compliantControls: 12 },
      lastUpdated: '2026-01-15T00:00:00.000Z',
    };
    mockFetch.mockResolvedValue(mockComplianceResponse(mockData));

    const res = await GET(getRequest());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.frameworks).toHaveLength(2);
    expect(data.summary).toBeDefined();
    expect(data.lastUpdated).toBe('2026-01-15T00:00:00.000Z');
  });

  it('FRMWK-004: forwards baiss query param to compliance API', async () => {
    mockFetch.mockResolvedValue(mockComplianceResponse({ frameworks: [], summary: {} }));

    await GET(getRequest({ baiss: 'true' }));

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('baiss=true');
  });

  it('FRMWK-005: forwards dynamic query param to compliance API', async () => {
    mockFetch.mockResolvedValue(mockComplianceResponse({ frameworks: [], summary: {} }));

    await GET(getRequest({ dynamic: 'true' }));

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('dynamic=true');
  });

  it('FRMWK-006: returns empty frameworks when compliance API returns none', async () => {
    mockFetch.mockResolvedValue(mockComplianceResponse({ frameworks: [], summary: {} }));

    const res = await GET(getRequest());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.frameworks).toEqual([]);
  });

  it('FRMWK-007: compliance API error is forwarded with status', async () => {
    mockFetch.mockResolvedValue(mockComplianceResponse(
      { error: 'Internal error' },
      500
    ));

    const res = await GET(getRequest());
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toMatch(/Failed to load compliance data/);
  });

  it('FRMWK-008: fetch failure returns 500', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const res = await GET(getRequest());
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toMatch(/Failed to retrieve frameworks/);
  });

  it('FRMWK-009: missing frameworks field defaults to empty array', async () => {
    mockFetch.mockResolvedValue(mockComplianceResponse({ summary: { total: 0 } }));

    const res = await GET(getRequest());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.frameworks).toEqual([]);
  });

  it('FRMWK-010: forwards x-api-key header to compliance API', async () => {
    mockFetch.mockResolvedValue(mockComplianceResponse({ frameworks: [], summary: {} }));

    const req = new NextRequest(BASE_URL, {
      method: 'GET',
      headers: { 'x-api-key': 'test-key-123' },
    });
    await GET(req);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const calledOptions = mockFetch.mock.calls[0][1] as RequestInit;
    expect((calledOptions.headers as Record<string, string>)['x-api-key']).toBe('test-key-123');
  });
});
