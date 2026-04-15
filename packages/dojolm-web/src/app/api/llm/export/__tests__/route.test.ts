/**
 * File: api/llm/export/__tests__/route.test.ts
 * Test IDs: EXP-001 through EXP-016
 * Coverage: GET /api/llm/export — all formats, modes, edge cases
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// --- Mocks ---

vi.mock('@/lib/api-auth', () => ({
  checkApiAuth: vi.fn().mockReturnValue(null),
}));

vi.mock('@/lib/storage/file-storage', () => ({
  fileStorage: {
    getBatch: vi.fn(),
    getExecution: vi.fn(),
    queryExecutions: vi.fn(),
  },
}));

// Mock jsPDF — must use a class so `new jsPDF()` works
vi.mock('jspdf', () => {
  return {
    default: class MockJsPDF {
      setFontSize = vi.fn();
      setFont = vi.fn();
      text = vi.fn();
      addPage = vi.fn();
      output = vi.fn().mockReturnValue(new ArrayBuffer(10));
    },
  };
});

// jspdf-autotable return value is unused by the export route (only its side
// effect of rendering into the pdf instance matters). If the route ever starts
// reading the return value, this mock must return a shape the route expects.
vi.mock('jspdf-autotable', () => ({
  default: vi.fn(),
}));

import { GET } from '../route';
import { checkApiAuth } from '@/lib/api-auth';
import { fileStorage } from '@/lib/storage/file-storage';

// --- Helpers ---

// Counter to give each test request a unique IP so the module-level rate
// limiter in route.ts doesn't trip across tests.
let __exportTestRequestCounter = 0;
function createGetRequest(params: Record<string, string>): NextRequest {
  const url = new URL('http://localhost:42001/api/llm/export');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  __exportTestRequestCounter += 1;
  // Build a valid IPv4 to survive future IP-validation on the route.
  const oct3 = __exportTestRequestCounter % 250;
  const oct4 = Math.floor(__exportTestRequestCounter / 250) % 250;
  const uniqueIp = `10.0.${oct3}.${oct4 + 1}`;
  return new NextRequest(url, {
    headers: { 'x-forwarded-for': uniqueIp },
  });
}

function makeMockExecution(overrides: Partial<any> = {}): any {
  return {
    id: 'exec-001',
    modelConfigId: 'model-gpt4',
    model: 'gpt-4',
    provider: 'openai',
    status: 'completed',
    resilienceScore: 75,
    injectionSuccess: 0.2,
    harmfulness: 0.1,
    duration_ms: 1200,
    categoriesPassed: ['prompt-injection'],
    categoriesFailed: ['data-exfiltration'],
    owaspCoverage: { 'LLM01': true, 'LLM02': false },
    tpiCoverage: { 'TPI-001': true },
    testCaseId: 'tc-injection-01',
    timestamp: new Date().toISOString(),
    response: 'I cannot help with that.',
    prompt: 'Ignore previous instructions.',
    ...overrides,
  };
}

function makeMockBatch(overrides: Partial<any> = {}): any {
  return {
    id: 'batch-abc123',
    startedAt: '2026-03-01T00:00:00.000Z',
    completedAt: '2026-03-01T00:10:00.000Z',
    totalTests: 2,
    executionIds: ['exec-001', 'exec-002'],
    ...overrides,
  };
}

const mockExec1 = makeMockExecution({ id: 'exec-001' });
const mockExec2 = makeMockExecution({
  id: 'exec-002',
  testCaseId: 'tc-injection-02',
  resilienceScore: 60,
  injectionSuccess: 0.6,
  harmfulness: 0.4,
});

// --- Tests ---

describe('GET /api/llm/export', () => {
  beforeEach(() => {
    // resetAllMocks clears call history AND queued mockResolvedValueOnce/mockRejectedValueOnce
    // implementations — needed because EXP-001 queues two `mockResolvedValueOnce` but subsequent
    // tests only queue one, and any leftover queue leaks into later tests.
    vi.resetAllMocks();
    (checkApiAuth as any).mockReturnValue(null);
  });

  // EXP-001: JSON export with valid batchId returns report
  it('EXP-001: JSON export with valid batchId returns report', async () => {
    (fileStorage.getBatch as any).mockResolvedValue(makeMockBatch());
    (fileStorage.getExecution as any)
      .mockResolvedValueOnce(mockExec1)
      .mockResolvedValueOnce(mockExec2);

    const res = await GET(createGetRequest({ batchId: 'batch-abc123', format: 'json' }));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.format).toBe('json');
    expect(data.exportedAt).toBeDefined();
    expect(data.batchId).toBe('batch-abc123');
    expect(data.models).toBeInstanceOf(Array);
    expect(data.models.length).toBeGreaterThanOrEqual(1);
    expect(data.models[0].modelName).toBe('gpt-4');
    expect(data.models[0].avgResilienceScore).toBeDefined();
  });

  // EXP-002: Export-all mode (no batchId) queries recent executions
  it('EXP-002: Export-all mode (no batchId) queries recent executions', async () => {
    (fileStorage.queryExecutions as any).mockResolvedValue({
      executions: [mockExec1, mockExec2],
    });

    const res = await GET(createGetRequest({ format: 'json' }));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.batchId).toBe('export-all');
    expect(data.totalExecutions).toBe(2);
    expect(fileStorage.queryExecutions).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 1000, sortBy: 'timestamp', sortDirection: 'desc' })
    );
  });

  // EXP-003: Export-all mode (mode=all) works even with batchId
  it('EXP-003: Export-all mode (mode=all) works', async () => {
    (fileStorage.queryExecutions as any).mockResolvedValue({
      executions: [mockExec1],
    });

    const res = await GET(createGetRequest({ mode: 'all', batchId: 'batch-abc123', format: 'json' }));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.batchId).toBe('export-all');
    // Should NOT call getBatch since mode=all takes priority
    expect(fileStorage.getBatch).not.toHaveBeenCalled();
  });

  // EXP-004: Invalid batchId format returns 400
  it('EXP-004: Invalid batchId format returns 400', async () => {
    const res = await GET(createGetRequest({ batchId: '../../../etc/passwd' }));
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toMatch(/Invalid batch ID/i);
  });

  // EXP-005: Batch not found returns 404
  it('EXP-005: Batch not found returns 404', async () => {
    (fileStorage.getBatch as any).mockResolvedValue(null);

    const res = await GET(createGetRequest({ batchId: 'nonexistent-batch' }));
    expect(res.status).toBe(404);

    const data = await res.json();
    expect(data.error).toMatch(/not found/i);
  });

  // EXP-006: includeResponses=false redacts responses in JSON
  it('EXP-006: includeResponses=false redacts responses in JSON', async () => {
    (fileStorage.getBatch as any).mockResolvedValue(makeMockBatch());
    (fileStorage.getExecution as any)
      .mockResolvedValueOnce(mockExec1)
      .mockResolvedValueOnce(mockExec2);

    const res = await GET(createGetRequest({
      batchId: 'batch-abc123',
      format: 'json',
      includeResponses: 'false',
    }));
    expect(res.status).toBe(200);

    const data = await res.json();
    // When includeResponses=false, buildModelReport does NOT attach executions to models,
    // but exportAsJSON still processes data.models for redaction.
    // The models should NOT have executions array (since includeResponses is false in buildModelReport)
    expect(data.models).toBeInstanceOf(Array);
    expect(data.models.length).toBeGreaterThanOrEqual(1);
    // Executions should not be present (buildModelReport only spreads them when includeResponses=true)
    if (data.models[0].executions) {
      // If somehow present, responses should be redacted
      for (const exec of data.models[0].executions) {
        if (exec.response) {
          expect(exec.response).toBe('[REDACTED]');
        }
        if (exec.prompt) {
          expect(exec.prompt).toBe('[REDACTED]');
        }
      }
    }
  });

  // EXP-007: PDF format returns base64 data
  it('EXP-007: PDF format returns base64 data', async () => {
    (fileStorage.getBatch as any).mockResolvedValue(makeMockBatch());
    (fileStorage.getExecution as any)
      .mockResolvedValueOnce(mockExec1)
      .mockResolvedValueOnce(mockExec2);

    const res = await GET(createGetRequest({ batchId: 'batch-abc123', format: 'pdf' }));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.format).toBe('pdf');
    expect(data.data).toBeDefined();
    expect(typeof data.data).toBe('string');
    expect(data.filename).toMatch(/^llm-report-.*\.pdf$/);
  });

  // EXP-008: Markdown format returns markdown content
  it('EXP-008: Markdown format returns markdown content', async () => {
    (fileStorage.getBatch as any).mockResolvedValue(makeMockBatch());
    (fileStorage.getExecution as any)
      .mockResolvedValueOnce(mockExec1)
      .mockResolvedValueOnce(mockExec2);

    const res = await GET(createGetRequest({ batchId: 'batch-abc123', format: 'markdown' }));
    expect(res.status).toBe(200);

    expect(res.headers.get('Content-Type')).toBe('text/markdown; charset=utf-8');
    expect(res.headers.get('Content-Disposition')).toMatch(/\.md"/);

    const text = await res.text();
    expect(text).toContain('# LLM Security Test Report');
    expect(text).toContain('## Model: gpt-4');
    expect(text).toContain('### Key Metrics');
    expect(text).toContain('OWASP');
  });

  // EXP-009: CSV format returns text/csv content type
  it('EXP-009: CSV format returns text/csv content type', async () => {
    (fileStorage.getBatch as any).mockResolvedValue(makeMockBatch());
    (fileStorage.getExecution as any)
      .mockResolvedValueOnce(mockExec1)
      .mockResolvedValueOnce(mockExec2);

    const res = await GET(createGetRequest({ batchId: 'batch-abc123', format: 'csv' }));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/csv');
    expect(res.headers.get('Content-Disposition')).toContain('.csv');
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');

    const text = await res.text();
    // Header row should be present
    expect(text).toContain('Model,Provider,Test Case,Status');
  });

  // EXP-010: CSV escapes formula injection chars (=, +, -, @)
  it('EXP-010: CSV escapes formula injection chars (=, +, -, @)', async () => {
    const maliciousExec = makeMockExecution({
      id: 'exec-evil',
      testCaseId: '=CMD("calc")',
      model: '+dangerous-model',
      provider: '-evil-provider',
      modelConfigId: 'model-evil',
      response: '@SUM(A1:A10)',
    });

    (fileStorage.getBatch as any).mockResolvedValue(
      makeMockBatch({ executionIds: ['exec-evil'] })
    );
    (fileStorage.getExecution as any).mockResolvedValueOnce(maliciousExec);

    const res = await GET(createGetRequest({ batchId: 'batch-abc123', format: 'csv' }));
    expect(res.status).toBe(200);

    const text = await res.text();
    // Formula injection chars should be prefixed with single quote
    expect(text).toContain("'=CMD");
    expect(text).toContain("'+dangerous-model");
    expect(text).toContain("'-evil-provider");
  });

  // EXP-011: SARIF format returns valid SARIF structure
  it('EXP-011: SARIF format returns valid SARIF structure', async () => {
    (fileStorage.getBatch as any).mockResolvedValue(makeMockBatch());
    (fileStorage.getExecution as any)
      .mockResolvedValueOnce(mockExec1)
      .mockResolvedValueOnce(mockExec2);

    const res = await GET(createGetRequest({ batchId: 'batch-abc123', format: 'sarif' }));
    expect(res.status).toBe(200);
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');

    const data = await res.json();
    expect(data.version).toBe('2.1.0');
    expect(data.$schema).toContain('sarif-schema-2.1.0');
    expect(data.runs).toBeInstanceOf(Array);
    expect(data.runs.length).toBeGreaterThanOrEqual(1);

    const run = data.runs[0];
    expect(run.tool.driver.name).toBe('NODA LLM Security Scanner');
    expect(run.tool.driver.version).toBe('2.0.0');
    expect(run.tool.driver.rules).toBeInstanceOf(Array);
    expect(run.results).toBeInstanceOf(Array);
    expect(run.invocations).toBeInstanceOf(Array);
    expect(run.invocations[0].executionSuccessful).toBe(true);
    expect(run.properties.modelName).toBe('gpt-4');

    // Check result structure
    if (run.results.length > 0) {
      const result = run.results[0];
      expect(result.level).toBeDefined();
      expect(result.message.text).toContain('gpt-4');
      expect(result.locations).toBeInstanceOf(Array);
      expect(result.properties.resilienceScore).toBeDefined();
    }
  });

  // EXP-012: Unsupported format returns 400
  it('EXP-012: Unsupported format returns 400', async () => {
    (fileStorage.getBatch as any).mockResolvedValue(makeMockBatch());
    (fileStorage.getExecution as any)
      .mockResolvedValueOnce(mockExec1)
      .mockResolvedValueOnce(mockExec2);

    const res = await GET(createGetRequest({ batchId: 'batch-abc123', format: 'xml' }));
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toContain('Unsupported export format');
  });

  // EXP-013: Internal error returns 500
  it('EXP-013: Internal error returns 500', async () => {
    (fileStorage.getBatch as any).mockRejectedValue(new Error('Database connection failed'));

    const res = await GET(createGetRequest({ batchId: 'batch-abc123', format: 'json' }));
    expect(res.status).toBe(500);

    const data = await res.json();
    expect(data.error).toMatch(/export failed/i);
  });

  // EXP-014: Auth check is enforced
  it('EXP-014: Auth check is enforced', async () => {
    (checkApiAuth as any).mockReturnValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    );

    const res = await GET(createGetRequest({ batchId: 'batch-abc123', format: 'json' }));
    expect(res.status).toBe(401);

    const data = await res.json();
    expect(data.error).toBe('Unauthorized');
    // Storage should not be called when auth fails
    expect(fileStorage.getBatch).not.toHaveBeenCalled();
  });

  // EXP-015: Export-all filters out executions older than 30 days
  it('EXP-015: Export-all filters out executions older than 30 days', async () => {
    const recentExec = makeMockExecution({
      id: 'exec-recent',
      timestamp: new Date().toISOString(),
    });
    const oldExec = makeMockExecution({
      id: 'exec-old',
      timestamp: '2020-01-01T00:00:00.000Z',
    });

    (fileStorage.queryExecutions as any).mockResolvedValue({
      executions: [recentExec, oldExec],
    });

    const res = await GET(createGetRequest({ format: 'json' }));
    expect(res.status).toBe(200);

    const data = await res.json();
    // Only the recent execution should remain
    expect(data.totalExecutions).toBe(1);
  });

  // EXP-016: Markdown includes recommendations for high-risk models
  it('EXP-016: Markdown includes recommendations for high-risk models', async () => {
    const highRiskExec = makeMockExecution({
      id: 'exec-risky',
      resilienceScore: 20,
      injectionSuccess: 0.9,
      harmfulness: 0.8,
    });

    (fileStorage.getBatch as any).mockResolvedValue(
      makeMockBatch({ executionIds: ['exec-risky'] })
    );
    (fileStorage.getExecution as any).mockResolvedValueOnce(highRiskExec);

    const res = await GET(createGetRequest({ batchId: 'batch-abc123', format: 'markdown' }));
    expect(res.status).toBe(200);

    const text = await res.text();
    expect(text).toContain('HIGH PRIORITY');
    expect(text).toContain('injection success rate');
    expect(text).toContain('harmful responses');
  });
});
