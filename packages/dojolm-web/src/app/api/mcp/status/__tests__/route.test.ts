/**
 * File: route.test.ts
 * Tests: MCP-001 to MCP-010
 * Coverage: GET/POST /api/mcp/status
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockCheckApiAuth = vi.fn().mockReturnValue(null);

vi.mock('@/lib/api-auth', () => ({
  checkApiAuth: (...args: unknown[]) => mockCheckApiAuth(...args),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeGetRequest(): NextRequest {
  return new NextRequest('http://localhost:3000/api/mcp/status', {
    method: 'GET',
  });
}

function makePostRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/mcp/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeInvalidJsonPostRequest(): NextRequest {
  return new NextRequest('http://localhost:3000/api/mcp/status', {
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

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ GET } = await import('../route'));
    mockCheckApiAuth.mockReturnValue(null);
  });

  // MCP-001
  it('MCP-001: returns connected false', async () => {
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.connected).toBe(false);
  });

  // MCP-002
  it('MCP-002: returns message about MCP not configured', async () => {
    const res = await GET(makeGetRequest());
    const body = await res.json();
    expect(body.message).toMatch(/not configured/i);
  });

  // MCP-003
  it('MCP-003: returns auth error when auth fails', async () => {
    const { NextResponse } = require('next/server');
    mockCheckApiAuth.mockReturnValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    );
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
  });
});

describe('POST /api/mcp/status', () => {
  let POST: typeof import('../route').POST;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ POST } = await import('../route'));
    mockCheckApiAuth.mockReturnValue(null);
  });

  // MCP-004
  it('MCP-004: accepts valid config', async () => {
    const res = await POST(
      makePostRequest({ serverUrl: 'http://localhost:8080', apiKey: 'key-123', enabled: true }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.connected).toBe(false);
    expect(body.config.serverUrl).toBe('http://localhost:8080');
    expect(body.config.hasApiKey).toBe(true);
    expect(body.config.enabled).toBe(true);
  });

  // MCP-005
  it('MCP-005: returns 400 for invalid JSON', async () => {
    const res = await POST(makeInvalidJsonPostRequest());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Invalid JSON/i);
  });

  // MCP-006
  it('MCP-006: returns 400 when serverUrl is not a string', async () => {
    const res = await POST(makePostRequest({ serverUrl: 123 }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/serverUrl must be a string/i);
  });

  // MCP-007
  it('MCP-007: returns 400 when apiKey is not a string', async () => {
    const res = await POST(makePostRequest({ apiKey: 42 }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/apiKey must be a string/i);
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
    const { NextResponse } = require('next/server');
    mockCheckApiAuth.mockReturnValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    );
    const res = await POST(makePostRequest({ enabled: false }));
    expect(res.status).toBe(401);
  });

  // MCP-010
  it('MCP-010: config acknowledgement includes pending deployment message', async () => {
    const res = await POST(makePostRequest({ serverUrl: 'http://mcp.local' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toMatch(/pending deployment/i);
    expect(body.config.serverUrl).toBe('http://mcp.local');
    expect(body.config.hasApiKey).toBe(false);
    expect(body.config.enabled).toBe(false);
  });
});
