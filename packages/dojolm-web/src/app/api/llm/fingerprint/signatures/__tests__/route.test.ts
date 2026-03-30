/**
 * File: fingerprint/signatures/__tests__/route.test.ts
 * Purpose: Tests for GET /api/llm/fingerprint/signatures
 * Coverage: SIG-001 through SIG-004
 * Source: src/app/api/llm/fingerprint/signatures/route.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock checkApiAuth to bypass auth
vi.mock('@/lib/api-auth', () => ({
  checkApiAuth: vi.fn().mockReturnValue(undefined),
}));

// Mock Kagami signatures loader
const mockLoadKagamiSignatures = vi.fn();
vi.mock('bu-tpi/fingerprint', () => ({
  loadKagamiSignatures: (...args: unknown[]) => mockLoadKagamiSignatures(...args),
}));

function createGetRequest(params?: Record<string, string>): NextRequest {
  const url = new URL('http://localhost:42001/api/llm/fingerprint/signatures');
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }
  return new NextRequest(url.toString(), { method: 'GET' });
}

const MOCK_SIGNATURES = [
  {
    modelId: 'gpt-4',
    modelFamily: 'GPT',
    provider: 'OpenAI',
    knowledgeCutoff: '2023-12',
    lastVerified: '2024-01-15',
    features: { reasoning: true, coding: true, vision: false },
  },
  {
    modelId: 'claude-3-opus',
    modelFamily: 'Claude',
    provider: 'Anthropic',
    knowledgeCutoff: '2024-04',
    lastVerified: '2024-05-01',
    features: { reasoning: true, coding: true },
  },
  {
    modelId: 'gpt-3.5-turbo',
    modelFamily: 'GPT',
    provider: 'OpenAI',
    knowledgeCutoff: '2021-09',
    lastVerified: '2024-01-10',
    features: { reasoning: true },
  },
];

describe('GET /api/llm/fingerprint/signatures', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let GET: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockLoadKagamiSignatures.mockReturnValue([...MOCK_SIGNATURES]);
    const mod = await import('../route');
    GET = mod.GET;
  });

  // SIG-001: Returns all signatures without filters
  it('SIG-001: returns all signatures when no filters provided', async () => {
    const req = createGetRequest();
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(3);
    expect(body.signatures).toHaveLength(3);
    expect(body.signatures[0]).toHaveProperty('modelId');
    expect(body.signatures[0]).toHaveProperty('provider');
    expect(body.signatures[0]).toHaveProperty('featureCount');
    expect(body.signatures[0].featureCount).toBe(3);
  });

  // SIG-002: Filters by provider (case-insensitive)
  it('SIG-002: filters signatures by provider', async () => {
    const req = createGetRequest({ provider: 'openai' });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(2);
    expect(body.signatures.every((s: { provider: string }) => s.provider === 'OpenAI')).toBe(true);
  });

  // SIG-003: Filters by model family (case-insensitive)
  it('SIG-003: filters signatures by family', async () => {
    const req = createGetRequest({ family: 'claude' });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(1);
    expect(body.signatures[0].modelId).toBe('claude-3-opus');
  });

  // SIG-004: Returns 500 when loadKagamiSignatures throws
  it('SIG-004: returns 500 on internal error', async () => {
    mockLoadKagamiSignatures.mockImplementation(() => {
      throw new Error('File not found');
    });

    const req = createGetRequest();
    const res = await GET(req);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Failed to load signatures');
  });
});
