/**
 * File: shingan/formats/__tests__/route.test.ts
 * Purpose: Tests for GET /api/shingan/formats API route
 * Source: src/app/api/shingan/formats/route.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks — declared before any dynamic imports
// ---------------------------------------------------------------------------

vi.mock('@/lib/api-auth', () => ({
  checkApiAuth: vi.fn(() => null),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { checkApiAuth } from '@/lib/api-auth';

const mockCheckApiAuth = vi.mocked(checkApiAuth);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeGetRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:42001'), { method: 'GET' });
}

// Expected formats based on the route implementation
const EXPECTED_FORMATS = [
  { id: 'claude-agent', name: 'Claude Agent', pattern: '.md with YAML frontmatter + tools: list', description: 'Claude Code agent definitions with tool permissions and system prompts' },
  { id: 'claude-skill', name: 'Claude Skill', pattern: 'SKILL.md, *.skill.md', description: 'Claude Code skill files with step-by-step instructions' },
  { id: 'claude-command', name: 'Claude Command', pattern: '.md in .claude/commands/', description: 'Claude Code custom slash commands with prompt templates' },
  { id: 'mcp-tool', name: 'MCP Tool Definition', pattern: '.ts, .json with inputSchema', description: 'Model Context Protocol tool definitions with JSON Schema parameters' },
  { id: 'bmad-agent', name: 'BMAD Compact Agent', pattern: '*.compact.md with structured sections', description: 'BMAD framework agent definitions with customization overlays' },
  { id: 'plugin-manifest', name: 'Plugin Manifest', pattern: 'marketplace.json, plugin.json', description: 'Marketplace plugin manifests with metadata and dependencies' },
  { id: 'hooks-config', name: 'Hooks Config', pattern: 'hooks.json, settings.json', description: 'Claude Code hooks configuration with PreToolUse/PostToolUse handlers' },
];

// ---------------------------------------------------------------------------
// GET /api/shingan/formats
// ---------------------------------------------------------------------------

describe('GET /api/shingan/formats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckApiAuth.mockReturnValue(null);
  });

  it('returns 200 with formats array', async () => {
    const { GET } = await import('../route');
    const req = makeGetRequest('/api/shingan/formats');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('formats');
    expect(Array.isArray(data.formats)).toBe(true);
    expect(data.formats).toHaveLength(EXPECTED_FORMATS.length);
  });

  it('returns correct total count', async () => {
    const { GET } = await import('../route');
    const req = makeGetRequest('/api/shingan/formats');
    const res = await GET(req);

    const data = await res.json();
    expect(data).toHaveProperty('total');
    expect(data.total).toBe(EXPECTED_FORMATS.length);
    expect(data.total).toBe(data.formats.length);
  });

  it('returns formats with required properties', async () => {
    const { GET } = await import('../route');
    const req = makeGetRequest('/api/shingan/formats');
    const res = await GET(req);

    const data = await res.json();
    for (const format of data.formats) {
      expect(format).toHaveProperty('id');
      expect(format).toHaveProperty('name');
      expect(format).toHaveProperty('pattern');
      expect(format).toHaveProperty('description');
      expect(typeof format.id).toBe('string');
      expect(typeof format.name).toBe('string');
      expect(typeof format.pattern).toBe('string');
      expect(typeof format.description).toBe('string');
    }
  });

  it('returns all expected format types', async () => {
    const { GET } = await import('../route');
    const req = makeGetRequest('/api/shingan/formats');
    const res = await GET(req);

    const data = await res.json();
    const formatIds = data.formats.map((f: { id: string }) => f.id);
    
    for (const expected of EXPECTED_FORMATS) {
      expect(formatIds).toContain(expected.id);
    }
  });

  it('returns correct format details for claude-agent', async () => {
    const { GET } = await import('../route');
    const req = makeGetRequest('/api/shingan/formats');
    const res = await GET(req);

    const data = await res.json();
    const claudeAgent = data.formats.find((f: { id: string }) => f.id === 'claude-agent');
    
    expect(claudeAgent).toBeDefined();
    expect(claudeAgent.name).toBe('Claude Agent');
    expect(claudeAgent.pattern).toContain('YAML frontmatter');
    expect(claudeAgent.description).toContain('Claude Code agent');
  });

  it('returns correct format details for mcp-tool', async () => {
    const { GET } = await import('../route');
    const req = makeGetRequest('/api/shingan/formats');
    const res = await GET(req);

    const data = await res.json();
    const mcpTool = data.formats.find((f: { id: string }) => f.id === 'mcp-tool');
    
    expect(mcpTool).toBeDefined();
    expect(mcpTool.name).toBe('MCP Tool Definition');
    expect(mcpTool.description).toContain('Model Context Protocol');
  });

  it('returns correct format details for hooks-config', async () => {
    const { GET } = await import('../route');
    const req = makeGetRequest('/api/shingan/formats');
    const res = await GET(req);

    const data = await res.json();
    const hooksConfig = data.formats.find((f: { id: string }) => f.id === 'hooks-config');
    
    expect(hooksConfig).toBeDefined();
    expect(hooksConfig.name).toBe('Hooks Config');
    expect(hooksConfig.pattern).toContain('hooks.json');
  });

  it('returns static data consistently across multiple calls', async () => {
    const { GET } = await import('../route');
    
    const req1 = makeGetRequest('/api/shingan/formats');
    const res1 = await GET(req1);
    const data1 = await res1.json();
    
    const req2 = makeGetRequest('/api/shingan/formats');
    const res2 = await GET(req2);
    const data2 = await res2.json();
    
    expect(data1).toEqual(data2);
    expect(data1.total).toBe(data2.total);
  });

  it('includes bmad-agent format', async () => {
    const { GET } = await import('../route');
    const req = makeGetRequest('/api/shingan/formats');
    const res = await GET(req);

    const data = await res.json();
    const bmadAgent = data.formats.find((f: { id: string }) => f.id === 'bmad-agent');
    
    expect(bmadAgent).toBeDefined();
    expect(bmadAgent.name).toBe('BMAD Compact Agent');
  });

  it('includes plugin-manifest format', async () => {
    const { GET } = await import('../route');
    const req = makeGetRequest('/api/shingan/formats');
    const res = await GET(req);

    const data = await res.json();
    const pluginManifest = data.formats.find((f: { id: string }) => f.id === 'plugin-manifest');
    
    expect(pluginManifest).toBeDefined();
    expect(pluginManifest.name).toBe('Plugin Manifest');
  });
});

// ---------------------------------------------------------------------------
// Auth guard
// ---------------------------------------------------------------------------

describe('Auth guard', () => {
  const unauthorizedResponse = new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckApiAuth.mockReturnValue(unauthorizedResponse as never);
  });

  it('returns 401 when auth fails', async () => {
    const { GET } = await import('../route');
    const req = makeGetRequest('/api/shingan/formats');
    const res = await GET(req);

    expect(res.status).toBe(401);
  });
});
