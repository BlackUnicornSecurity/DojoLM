/**
 * File: llm/fingerprint/__tests__/route.test.ts
 * Purpose: Tests for POST /api/llm/fingerprint, GET /api/llm/fingerprint/results,
 *          and GET /api/llm/fingerprint/signatures
 *
 * Index:
 * POST /api/llm/fingerprint
 * - KFP-001: valid identify request returns 200 with result (line ~140)
 * - KFP-002: valid verify request returns 200 with match result (line ~155)
 * - KFP-003: missing modelId returns 400 (line ~171)
 * - KFP-004: modelId with invalid characters returns 400 (line ~183)
 * - KFP-005: modelId too long (>128 chars) returns 400 (line ~195)
 * - KFP-006: missing mode returns 400 (line ~207)
 * - KFP-007: invalid mode value returns 400 (line ~219)
 * - KFP-008: invalid preset value returns 400 (line ~231)
 * - KFP-009: verify mode without expectedModelId returns 400 (line ~243)
 * - KFP-010: verify mode with invalid expectedModelId characters returns 400 (line ~255)
 * - KFP-011: unauthorized request returns 401 (line ~267)
 * - KFP-012: model not found returns 404 (line ~282)
 * - KFP-013: engine error returns 500 (line ~297)
 * - KFP-014: response includes run id from randomUUID (line ~313)
 * - KFP-015: all valid presets are accepted (line ~327)
 *
 * GET /api/llm/fingerprint/results
 * - KRES-001: returns empty results when no files (line ~350)
 * - KRES-002: returns results from JSON files (line ~362)
 * - KRES-003: invalid modelId query param returns 400 (line ~385)
 * - KRES-004: unauthorized returns 401 (line ~396)
 * - KRES-005: filters by modelId query param (line ~412)
 * - KRES-006: filters by mode query param (line ~437)
 *
 * GET /api/llm/fingerprint/signatures
 * - KSIG-001: returns all signatures with summary fields (line ~470)
 * - KSIG-002: unauthorized returns 401 (line ~487)
 * - KSIG-003: filters by provider query param (line ~503)
 * - KSIG-004: filters by family query param (line ~524)
 * - KSIG-005: returns empty list when no signatures match filter (line ~545)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Module-level mocks — must appear before any imports of the routes
// ---------------------------------------------------------------------------

const mockCheckApiAuth = vi.fn(() => null as NextResponse | null);

vi.mock('@/lib/api-auth', () => ({
  checkApiAuth: (...args: unknown[]) => mockCheckApiAuth(...args as [NextRequest]),
}));

const mockGetModelConfigs = vi.fn(() =>
  Promise.resolve([
    { id: 'test-model', name: 'Test Model', provider: 'openai', apiKey: 'test' },
  ])
);

vi.mock('@/lib/storage/file-storage', () => ({
  fileStorage: {
    getModelConfigs: (...args: unknown[]) => mockGetModelConfigs(...args),
  },
}));

const mockIdentify = vi.fn(() =>
  Promise.resolve({
    candidates: [{ modelId: 'gpt-4o', confidence: 0.95, distance: 0.05 }],
    totalProbes: 40,
    executedAt: new Date().toISOString(),
    elapsed: 5000,
  })
);

const mockVerify = vi.fn(() =>
  Promise.resolve({
    match: true,
    driftScore: 0.1,
    divergentFeatures: [],
  })
);

const mockLoadKagamiSignatures = vi.fn(() => []);

// KagamiEngine must be a real constructor (class) so `new KagamiEngine()` works.
// We define it here and delegate to the per-test mock fns so tests can override them.
class MockKagamiEngine {
  identify(...args: unknown[]) {
    return mockIdentify(...args);
  }
  verify(...args: unknown[]) {
    return mockVerify(...args);
  }
}

vi.mock('bu-tpi/fingerprint', () => ({
  KagamiEngine: MockKagamiEngine,
  loadKagamiSignatures: () => mockLoadKagamiSignatures(),
}));

vi.mock('@/lib/llm-providers', () => ({
  getProviderAdapter: vi.fn(() => Promise.resolve({})),
}));

const mockActiveFingerprintsCreate = vi.fn(() => ({ listeners: new Set() }));
const mockActiveFingerprintsUpdate = vi.fn();
const mockActiveFingerprintsComplete = vi.fn();
const mockActiveFingerprintsGet = vi.fn();

vi.mock('@/lib/fingerprint-state', () => ({
  activeFingerprints: {
    create: (...args: unknown[]) => mockActiveFingerprintsCreate(...args),
    update: (...args: unknown[]) => mockActiveFingerprintsUpdate(...args),
    complete: (...args: unknown[]) => mockActiveFingerprintsComplete(...args),
    get: (...args: unknown[]) => mockActiveFingerprintsGet(...args),
  },
}));

const mockFsMkdir = vi.fn(() => Promise.resolve());
const mockFsWriteFile = vi.fn(() => Promise.resolve());
const mockFsRename = vi.fn(() => Promise.resolve());
const mockFsReaddir = vi.fn(() => Promise.resolve([] as string[]));
const mockFsReadFile = vi.fn();

vi.mock('node:fs', () => ({
  default: {
    promises: {
      mkdir: (...args: unknown[]) => mockFsMkdir(...args),
      writeFile: (...args: unknown[]) => mockFsWriteFile(...args),
      rename: (...args: unknown[]) => mockFsRename(...args),
      readdir: (...args: unknown[]) => mockFsReaddir(...args),
      readFile: (...args: unknown[]) => mockFsReadFile(...args),
    },
  },
  promises: {
    mkdir: (...args: unknown[]) => mockFsMkdir(...args),
    writeFile: (...args: unknown[]) => mockFsWriteFile(...args),
    rename: (...args: unknown[]) => mockFsRename(...args),
    readdir: (...args: unknown[]) => mockFsReaddir(...args),
    readFile: (...args: unknown[]) => mockFsReadFile(...args),
  },
}));

vi.mock('node:crypto', () => ({
  default: { randomUUID: () => 'test-uuid-1234' },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePostRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/llm/fingerprint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeGetRequest(
  base: string,
  params: Record<string, string> = {}
): NextRequest {
  const url = new URL(base);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url);
}

const unauthorizedResponse = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

// ---------------------------------------------------------------------------
// POST /api/llm/fingerprint
// ---------------------------------------------------------------------------

describe('POST /api/llm/fingerprint', () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockCheckApiAuth.mockReturnValue(null);
    mockGetModelConfigs.mockResolvedValue([
      { id: 'test-model', name: 'Test Model', provider: 'openai', apiKey: 'test' },
    ]);
    mockIdentify.mockResolvedValue({
      candidates: [{ modelId: 'gpt-4o', confidence: 0.95, distance: 0.05 }],
      totalProbes: 40,
      executedAt: new Date().toISOString(),
      elapsed: 5000,
    });
    mockVerify.mockResolvedValue({
      match: true,
      driftScore: 0.1,
      divergentFeatures: [],
    });
    mockActiveFingerprintsCreate.mockReturnValue({ listeners: new Set() });
    mockFsMkdir.mockResolvedValue(undefined);
    mockFsWriteFile.mockResolvedValue(undefined);
    mockFsRename.mockResolvedValue(undefined);

    vi.resetModules();
    ({ POST } = await import('../route'));
  });

  // KFP-001
  it('KFP-001: valid identify request returns 200 with result', async () => {
    const res = await POST(makePostRequest({ modelId: 'test-model', mode: 'identify' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toBe('test-uuid-1234');
    expect(json.candidates).toHaveLength(1);
    expect(json.candidates[0].modelId).toBe('gpt-4o');
    expect(json.candidates[0].confidence).toBe(0.95);
  });

  // KFP-002
  it('KFP-002: valid verify request returns 200 with match result', async () => {
    const res = await POST(
      makePostRequest({ modelId: 'test-model', mode: 'verify', expectedModelId: 'gpt-4o' })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toBe('test-uuid-1234');
    expect(json.match).toBe(true);
    expect(json.driftScore).toBe(0.1);
  });

  // KFP-003
  it('KFP-003: missing modelId returns 400', async () => {
    const res = await POST(makePostRequest({ mode: 'identify' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/modelId/i);
  });

  // KFP-004
  it('KFP-004: modelId with invalid characters returns 400', async () => {
    const res = await POST(
      makePostRequest({ modelId: 'invalid model id!', mode: 'identify' })
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/modelId/i);
  });

  // KFP-005
  it('KFP-005: modelId longer than 128 characters returns 400', async () => {
    const longId = 'a'.repeat(129);
    const res = await POST(makePostRequest({ modelId: longId, mode: 'identify' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/modelId/i);
  });

  // KFP-006
  it('KFP-006: missing mode returns 400', async () => {
    const res = await POST(makePostRequest({ modelId: 'test-model' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/mode/i);
  });

  // KFP-007
  it('KFP-007: invalid mode value returns 400', async () => {
    const res = await POST(makePostRequest({ modelId: 'test-model', mode: 'scan' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/mode/i);
  });

  // KFP-008
  it('KFP-008: invalid preset value returns 400', async () => {
    const res = await POST(
      makePostRequest({ modelId: 'test-model', mode: 'identify', preset: 'turbo' })
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/preset/i);
  });

  // KFP-009
  it('KFP-009: verify mode without expectedModelId returns 400', async () => {
    const res = await POST(makePostRequest({ modelId: 'test-model', mode: 'verify' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/expectedModelId/i);
  });

  // KFP-010
  it('KFP-010: verify mode with invalid expectedModelId characters returns 400', async () => {
    const res = await POST(
      makePostRequest({
        modelId: 'test-model',
        mode: 'verify',
        expectedModelId: 'bad model/id',
      })
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/expectedModelId/i);
  });

  // KFP-011
  it('KFP-011: unauthorized request returns 401', async () => {
    mockCheckApiAuth.mockReturnValue(unauthorizedResponse);
    const res = await POST(makePostRequest({ modelId: 'test-model', mode: 'identify' }));
    expect(res.status).toBe(401);
  });

  // KFP-012
  it('KFP-012: model not found returns 404', async () => {
    mockGetModelConfigs.mockResolvedValue([]);
    const res = await POST(makePostRequest({ modelId: 'ghost-model', mode: 'identify' }));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toMatch(/not found/i);
  });

  // KFP-013
  it('KFP-013: engine identify error returns 500', async () => {
    mockIdentify.mockRejectedValue(new Error('Provider timeout'));
    const res = await POST(makePostRequest({ modelId: 'test-model', mode: 'identify' }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  // KFP-014
  it('KFP-014: response id matches randomUUID output', async () => {
    const res = await POST(makePostRequest({ modelId: 'test-model', mode: 'identify' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toBe('test-uuid-1234');
  });

  // KFP-015
  it('KFP-015: all valid presets are accepted without 400', async () => {
    const validPresets = ['quick', 'standard', 'full', 'verify', 'stealth'];
    for (const preset of validPresets) {
      const res = await POST(
        makePostRequest({ modelId: 'test-model', mode: 'identify', preset })
      );
      expect(res.status).toBe(200);
    }
  });
});

// ---------------------------------------------------------------------------
// GET /api/llm/fingerprint/results
// ---------------------------------------------------------------------------

describe('GET /api/llm/fingerprint/results', () => {
  let GET: (req: NextRequest) => Promise<Response>;

  const sampleResult = JSON.stringify({
    id: 'run-abc',
    modelId: 'test-model',
    mode: 'identify',
    createdAt: '2026-03-20T10:00:00Z',
    result: { candidates: [] },
  });

  const anotherResult = JSON.stringify({
    id: 'run-def',
    modelId: 'other-model',
    mode: 'verify',
    createdAt: '2026-03-20T09:00:00Z',
    result: { match: false },
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    mockCheckApiAuth.mockReturnValue(null);
    mockFsReaddir.mockResolvedValue([]);
    mockFsReadFile.mockResolvedValue(sampleResult);

    vi.resetModules();
    ({ GET } = await import('../results/route'));
  });

  // KRES-001
  it('KRES-001: returns empty results when no files exist', async () => {
    mockFsReaddir.mockResolvedValue([]);
    const res = await GET(makeGetRequest('http://localhost:3000/api/llm/fingerprint/results'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.results).toEqual([]);
  });

  // KRES-002
  it('KRES-002: returns parsed results from JSON files', async () => {
    mockFsReaddir.mockResolvedValue(['run-abc.json'] as string[]);
    mockFsReadFile.mockResolvedValue(sampleResult);

    const res = await GET(makeGetRequest('http://localhost:3000/api/llm/fingerprint/results'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.results).toHaveLength(1);
    expect(json.results[0].id).toBe('run-abc');
    expect(json.results[0].modelId).toBe('test-model');
  });

  // KRES-003
  it('KRES-003: invalid modelId query param returns 400', async () => {
    const res = await GET(
      makeGetRequest('http://localhost:3000/api/llm/fingerprint/results', {
        modelId: 'bad model/id!',
      })
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/modelId/i);
  });

  // KRES-004
  it('KRES-004: unauthorized request returns 401', async () => {
    mockCheckApiAuth.mockReturnValue(unauthorizedResponse);
    const res = await GET(makeGetRequest('http://localhost:3000/api/llm/fingerprint/results'));
    expect(res.status).toBe(401);
  });

  // KRES-005
  it('KRES-005: filters results by modelId query param', async () => {
    mockFsReaddir.mockResolvedValue(['run-abc.json', 'run-def.json'] as string[]);
    mockFsReadFile
      .mockResolvedValueOnce(sampleResult)
      .mockResolvedValueOnce(anotherResult);

    const res = await GET(
      makeGetRequest('http://localhost:3000/api/llm/fingerprint/results', {
        modelId: 'test-model',
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.results).toHaveLength(1);
    expect(json.results[0].modelId).toBe('test-model');
  });

  // KRES-006
  it('KRES-006: filters results by mode query param', async () => {
    mockFsReaddir.mockResolvedValue(['run-abc.json', 'run-def.json'] as string[]);
    mockFsReadFile
      .mockResolvedValueOnce(sampleResult)
      .mockResolvedValueOnce(anotherResult);

    const res = await GET(
      makeGetRequest('http://localhost:3000/api/llm/fingerprint/results', { mode: 'verify' })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.results).toHaveLength(1);
    expect(json.results[0].mode).toBe('verify');
  });
});

// ---------------------------------------------------------------------------
// GET /api/llm/fingerprint/signatures
// ---------------------------------------------------------------------------

describe('GET /api/llm/fingerprint/signatures', () => {
  let GET: (req: NextRequest) => Promise<Response>;

  const mockSignatures = [
    {
      modelId: 'gpt-4o',
      modelFamily: 'gpt-4',
      provider: 'openai',
      knowledgeCutoff: '2024-04',
      lastVerified: '2026-01-10',
      features: { f1: 1, f2: 2, f3: 3 },
    },
    {
      modelId: 'claude-3-opus',
      modelFamily: 'claude-3',
      provider: 'anthropic',
      knowledgeCutoff: '2024-08',
      lastVerified: '2026-02-01',
      features: { f1: 1 },
    },
  ];

  beforeEach(async () => {
    vi.clearAllMocks();
    mockCheckApiAuth.mockReturnValue(null);
    mockLoadKagamiSignatures.mockReturnValue(mockSignatures);

    vi.resetModules();
    ({ GET } = await import('../signatures/route'));
  });

  // KSIG-001
  it('KSIG-001: returns all signatures with summary fields', async () => {
    const res = await GET(makeGetRequest('http://localhost:3000/api/llm/fingerprint/signatures'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.total).toBe(2);
    expect(json.signatures).toHaveLength(2);
    // Each signature should expose summary fields, not raw feature data
    const sig = json.signatures[0];
    expect(sig.modelId).toBe('gpt-4o');
    expect(sig.provider).toBe('openai');
    expect(sig.featureCount).toBe(3);
    expect(sig).not.toHaveProperty('features');
  });

  // KSIG-002
  it('KSIG-002: unauthorized request returns 401', async () => {
    mockCheckApiAuth.mockReturnValue(unauthorizedResponse);
    const res = await GET(makeGetRequest('http://localhost:3000/api/llm/fingerprint/signatures'));
    expect(res.status).toBe(401);
  });

  // KSIG-003
  it('KSIG-003: filters signatures by provider query param (case-insensitive)', async () => {
    const res = await GET(
      makeGetRequest('http://localhost:3000/api/llm/fingerprint/signatures', {
        provider: 'Anthropic',
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.total).toBe(1);
    expect(json.signatures[0].modelId).toBe('claude-3-opus');
    expect(json.signatures[0].provider).toBe('anthropic');
  });

  // KSIG-004
  it('KSIG-004: filters signatures by family query param (case-insensitive)', async () => {
    const res = await GET(
      makeGetRequest('http://localhost:3000/api/llm/fingerprint/signatures', {
        family: 'GPT-4',
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.total).toBe(1);
    expect(json.signatures[0].modelId).toBe('gpt-4o');
  });

  // KSIG-005
  it('KSIG-005: returns empty list when no signatures match filter', async () => {
    const res = await GET(
      makeGetRequest('http://localhost:3000/api/llm/fingerprint/signatures', {
        provider: 'mistral',
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.total).toBe(0);
    expect(json.signatures).toEqual([]);
  });
});
