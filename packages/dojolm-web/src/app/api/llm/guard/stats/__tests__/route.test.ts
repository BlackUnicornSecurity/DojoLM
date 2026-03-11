/**
 * File: llm/guard/stats/__tests__/route.test.ts
 * Purpose: Tests for GET /api/llm/guard/stats
 * Source: src/app/api/llm/guard/stats/route.ts
 *
 * Index:
 * - GS-001: Returns stats with 200 (line 38)
 * - GS-002: Auth failure returns 401 (line 51)
 * - GS-003: Internal error returns 500 (line 65)
 * - GS-004: Response wrapped in { data } (line 77)
 * - GS-005: Stats contain expected fields (line 88)
 * - GS-006: Calls getGuardStats once (line 103)
 * - GS-007: Empty stats returned correctly (line 113)
 * - GS-008: Stats with high block counts (line 125)
 * - GS-009: Stats with mixed actions (line 139)
 * - GS-010: Multiple calls return fresh data (line 155)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockCheckApiAuth = vi.fn().mockReturnValue(null);
const mockGetGuardStats = vi.fn();

vi.mock('@/lib/api-auth', () => ({
  checkApiAuth: (...args: unknown[]) => mockCheckApiAuth(...args),
}));

vi.mock('@/lib/storage/guard-storage', () => ({
  getGuardStats: (...args: unknown[]) => mockGetGuardStats(...args),
}));

function createGetRequest(): NextRequest {
  return new NextRequest('http://localhost:3000/api/llm/guard/stats');
}

let GET: typeof import('../../stats/route').GET;

beforeEach(async () => {
  vi.clearAllMocks();
  mockCheckApiAuth.mockReturnValue(null);
  const mod = await import('../route');
  GET = mod.GET;
});

describe('GET /api/llm/guard/stats', () => {
  it('GS-001: returns stats with 200 status', async () => {
    mockGetGuardStats.mockResolvedValue({
      totalEvents: 100,
      byAction: { allow: 80, block: 15, log: 5 },
      byMode: { shinobi: 50, hattori: 50 },
    });

    const res = await GET(createGetRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toBeDefined();
  });

  it('GS-002: auth failure blocks request', async () => {
    const { NextResponse } = await import('next/server');
    mockCheckApiAuth.mockReturnValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    );

    const res = await GET(createGetRequest());
    expect(res.status).toBe(401);
  });

  it('GS-003: internal error returns 500', async () => {
    mockGetGuardStats.mockRejectedValue(new Error('DB error'));

    const res = await GET(createGetRequest());
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Internal server error');
  });

  it('GS-004: response wrapped in { data } envelope', async () => {
    const stats = { totalEvents: 42, byAction: { allow: 42 } };
    mockGetGuardStats.mockResolvedValue(stats);

    const res = await GET(createGetRequest());
    const json = await res.json();
    expect(json).toHaveProperty('data');
    expect(json.data.totalEvents).toBe(42);
  });

  it('GS-005: stats contain expected structure', async () => {
    const stats = {
      totalEvents: 200,
      byAction: { allow: 150, block: 30, log: 20 },
      byMode: { shinobi: 100, hattori: 100 },
      byDirection: { input: 120, output: 80 },
    };
    mockGetGuardStats.mockResolvedValue(stats);

    const res = await GET(createGetRequest());
    const json = await res.json();
    expect(json.data.totalEvents).toBe(200);
    expect(json.data.byAction.allow).toBe(150);
    expect(json.data.byMode.shinobi).toBe(100);
  });

  it('GS-006: calls getGuardStats exactly once', async () => {
    mockGetGuardStats.mockResolvedValue({ totalEvents: 0 });

    await GET(createGetRequest());
    expect(mockGetGuardStats).toHaveBeenCalledTimes(1);
  });

  it('GS-007: empty stats returned correctly', async () => {
    mockGetGuardStats.mockResolvedValue({
      totalEvents: 0,
      byAction: {},
      byMode: {},
    });

    const res = await GET(createGetRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.totalEvents).toBe(0);
  });

  it('GS-008: stats with high block counts', async () => {
    mockGetGuardStats.mockResolvedValue({
      totalEvents: 10000,
      byAction: { allow: 2000, block: 7500, log: 500 },
    });

    const res = await GET(createGetRequest());
    const json = await res.json();
    expect(json.data.byAction.block).toBe(7500);
  });

  it('GS-009: stats with mixed actions and directions', async () => {
    mockGetGuardStats.mockResolvedValue({
      totalEvents: 500,
      byAction: { allow: 300, block: 100, log: 100 },
      byDirection: { input: 250, output: 250 },
      byMode: { samurai: 200, sensei: 150, hattori: 150 },
    });

    const res = await GET(createGetRequest());
    const json = await res.json();
    expect(json.data.byDirection.input).toBe(250);
    expect(json.data.byMode.samurai).toBe(200);
  });

  it('GS-010: successive calls return latest data', async () => {
    mockGetGuardStats.mockResolvedValueOnce({ totalEvents: 10 });
    const res1 = await GET(createGetRequest());
    const json1 = await res1.json();
    expect(json1.data.totalEvents).toBe(10);

    mockGetGuardStats.mockResolvedValueOnce({ totalEvents: 20 });
    const res2 = await GET(createGetRequest());
    const json2 = await res2.json();
    expect(json2.data.totalEvents).toBe(20);
  });
});
