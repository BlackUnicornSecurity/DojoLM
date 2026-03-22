/**
 * File: route.test.ts
 * Tests: MCP-001 to MCP-012
 * Coverage: GET/POST /api/mcp/status (real health-check + server lifecycle)
 */
// @vitest-environment node

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockCheckApiAuth = vi.fn().mockReturnValue(null);

vi.mock('@/lib/api-auth', () => ({
  checkApiAuth: (...args: unknown[]) => mockCheckApiAuth(...args),
}));

// Mock global fetch so we don't hit real MCP server
const mockFetch = vi.fn();

// Mock child_process.spawn
const mockKill = vi.fn();
const mockOn = vi.fn();
const mockSpawn = vi.fn().mockReturnValue({
  killed: false,
  kill: mockKill,
  on: mockOn,
});

vi.mock('node:child_process', () => ({
  spawn: (...args: unknown[]) => mockSpawn(...args),
}));

vi.mock('node:path', () => ({
  resolve: (...parts: string[]) => parts.join('/'),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeGetRequest(): NextRequest {
  return new NextRequest('http://localhost:42001/api/mcp/status', { method: 'GET' });
}

function makePostRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:42001/api/mcp/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeInvalidJsonPostRequest(): NextRequest {
  return new NextRequest('http://localhost:42001/api/mcp/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{bad-json!!!',
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/mcp/status', () => {
  let GET: typeof import('../route').GET;
  const originalFetch = globalThis.fetch;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    globalThis.fetch = mockFetch as unknown as typeof fetch;
    ({ GET } = await import('../route'));
    mockCheckApiAuth.mockReturnValue(null);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // MCP-001
  it('MCP-001: returns connected false when MCP server unreachable', async () => {
    mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.connected).toBe(false);
  });

  // MCP-002
  it('MCP-002: returns helpful message when server is not running', async () => {
    mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));
    const res = await GET(makeGetRequest());
    const body = await res.json();
    expect(body.message).toBeDefined();
    expect(typeof body.message).toBe('string');
  });

  // MCP-003
  it('MCP-003: returns auth error when auth fails', async () => {
    mockCheckApiAuth.mockReturnValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    );
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
  });

  // MCP-011
  it('MCP-011: returns connected true when MCP server responds on /health', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok', running: true, mode: 'basic', uptime: 5000, activeScenarios: [] }),
    });
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.connected).toBe(true);
    expect(body.server?.mode).toBe('basic');
  });
});

describe('POST /api/mcp/status', () => {
  let POST: typeof import('../route').POST;
  const originalFetch = globalThis.fetch;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    globalThis.fetch = mockFetch as unknown as typeof fetch;
    ({ POST } = await import('../route'));
    mockCheckApiAuth.mockReturnValue(null);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // MCP-004
  it('MCP-004: POST enabled=true attempts to start server', async () => {
    // probeHealth fails (server not running), spawn succeeds, waitForServer eventually succeeds
    mockFetch
      .mockRejectedValueOnce(new Error('ECONNREFUSED'))  // probeHealth in startMcpServer
      .mockRejectedValueOnce(new Error('ECONNREFUSED'))  // waitForServer attempt 1
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'ok' }) }); // waitForServer attempt 2
    const res = await POST(makePostRequest({ enabled: true }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.enabled).toBe(true);
    expect(body.message).toBeDefined();
  });

  // MCP-005
  it('MCP-005: returns 400 for invalid JSON', async () => {
    const res = await POST(makeInvalidJsonPostRequest());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Invalid JSON/i);
  });

  // MCP-008
  it('MCP-008: returns 400 when enabled is not a boolean', async () => {
    const res = await POST(makePostRequest({ enabled: 'yes' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/enabled must be a boolean/i);
  });

  // MCP-009
  it('MCP-009: returns auth error when auth fails on POST', async () => {
    mockCheckApiAuth.mockReturnValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    );
    const res = await POST(makePostRequest({ enabled: false }));
    expect(res.status).toBe(401);
  });

  // MCP-010
  it('MCP-010: POST enabled=false stops server', async () => {
    const res = await POST(makePostRequest({ enabled: false }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.connected).toBe(false);
    expect(body.enabled).toBe(false);
    expect(body.message).toMatch(/stopped/i);
  });

  // MCP-012
  it('MCP-012: POST without enabled returns no-action message', async () => {
    const res = await POST(makePostRequest({ someOther: 'field' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toMatch(/no action/i);
  });
});
