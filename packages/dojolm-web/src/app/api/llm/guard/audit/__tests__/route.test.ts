/**
 * File: llm/guard/audit/__tests__/route.test.ts
 * Purpose: Tests for GET /api/llm/guard/audit
 * Source: src/app/api/llm/guard/audit/route.ts
 *
 * Index:
 * - GA-001: Returns events with 200 (line 48)
 * - GA-002: Auth failure returns 401 (line 62)
 * - GA-003: Filters by mode (line 73)
 * - GA-004: Normalizes old mode names (metsuke -> shinobi) (line 87)
 * - GA-005: Filters by direction (line 99)
 * - GA-006: Filters by action (line 111)
 * - GA-007: Filters by date range (line 123)
 * - GA-008: Filters by modelConfigId (line 137)
 * - GA-009: Respects limit param (capped at 100) (line 149)
 * - GA-010: Respects offset param (line 163)
 * - GA-011: Ignores invalid mode values (line 175)
 * - GA-012: Ignores invalid direction values (line 187)
 * - GA-013: Ignores invalid date formats (line 198)
 * - GA-014: Internal error returns 500 (line 210)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockCheckApiAuth = vi.fn().mockReturnValue(null);
const mockQueryGuardEvents = vi.fn();

vi.mock('@/lib/api-auth', () => ({
  checkApiAuth: (...args: unknown[]) => mockCheckApiAuth(...args),
}));

vi.mock('@/lib/storage/guard-storage', () => ({
  queryGuardEvents: (...args: unknown[]) => mockQueryGuardEvents(...args),
}));

function createGetRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/llm/guard/audit');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url);
}

let GET: typeof import('../../audit/route').GET;

beforeEach(async () => {
  vi.clearAllMocks();
  mockCheckApiAuth.mockReturnValue(null);
  mockQueryGuardEvents.mockResolvedValue({ events: [], total: 0 });
  const mod = await import('../route');
  GET = mod.GET;
});

describe('GET /api/llm/guard/audit', () => {
  it('GA-001: returns events with 200 and meta.total', async () => {
    mockQueryGuardEvents.mockResolvedValue({
      events: [{ id: 'ev1', mode: 'shinobi', action: 'log' }],
      total: 1,
    });

    const res = await GET(createGetRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.meta.total).toBe(1);
  });

  it('GA-002: auth failure blocks request', async () => {
    const { NextResponse } = await import('next/server');
    mockCheckApiAuth.mockReturnValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    );

    const res = await GET(createGetRequest());
    expect(res.status).toBe(401);
  });

  it('GA-003: passes mode filter to query', async () => {
    await GET(createGetRequest({ mode: 'hattori' }));

    expect(mockQueryGuardEvents).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'hattori' })
    );
  });

  it('GA-004: normalizes old mode name metsuke -> shinobi', async () => {
    await GET(createGetRequest({ mode: 'metsuke' }));

    expect(mockQueryGuardEvents).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'shinobi' })
    );
  });

  it('GA-005: passes direction filter to query', async () => {
    await GET(createGetRequest({ direction: 'input' }));

    expect(mockQueryGuardEvents).toHaveBeenCalledWith(
      expect.objectContaining({ direction: 'input' })
    );
  });

  it('GA-006: passes action filter to query', async () => {
    await GET(createGetRequest({ action: 'block' }));

    expect(mockQueryGuardEvents).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'block' })
    );
  });

  it('GA-007: passes date range filters', async () => {
    await GET(createGetRequest({
      startDate: '2024-01-01',
      endDate: '2024-12-31',
    }));

    expect(mockQueryGuardEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      })
    );
  });

  it('GA-008: passes modelConfigId filter', async () => {
    await GET(createGetRequest({ modelConfigId: 'model-123' }));

    expect(mockQueryGuardEvents).toHaveBeenCalledWith(
      expect.objectContaining({ modelConfigId: 'model-123' })
    );
  });

  it('GA-009: limit is capped at 100', async () => {
    await GET(createGetRequest({ limit: '500' }));

    expect(mockQueryGuardEvents).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 100 })
    );
  });

  it('GA-010: offset is passed through', async () => {
    await GET(createGetRequest({ offset: '50' }));

    expect(mockQueryGuardEvents).toHaveBeenCalledWith(
      expect.objectContaining({ offset: 50 })
    );
  });

  it('GA-011: ignores invalid mode values', async () => {
    await GET(createGetRequest({ mode: 'invalid_mode' }));

    expect(mockQueryGuardEvents).toHaveBeenCalledWith(
      expect.not.objectContaining({ mode: expect.anything() })
    );
  });

  it('GA-012: ignores invalid direction values', async () => {
    await GET(createGetRequest({ direction: 'sideways' }));

    expect(mockQueryGuardEvents).toHaveBeenCalledWith(
      expect.not.objectContaining({ direction: expect.anything() })
    );
  });

  it('GA-013: ignores invalid date formats', async () => {
    await GET(createGetRequest({ startDate: 'not-a-date' }));

    expect(mockQueryGuardEvents).toHaveBeenCalledWith(
      expect.not.objectContaining({ startDate: expect.anything() })
    );
  });

  it('GA-014: internal error returns 500', async () => {
    mockQueryGuardEvents.mockRejectedValue(new Error('DB error'));

    const res = await GET(createGetRequest());
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Internal server error');
  });
});
