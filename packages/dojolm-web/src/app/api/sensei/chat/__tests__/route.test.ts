/**
 * File: sensei/chat/__tests__/route.test.ts
 * Purpose: Tests for POST /api/sensei/chat (and 405 for GET/PUT/DELETE)
 * Coverage: CHAT-001 through CHAT-005
 * Source: src/app/api/sensei/chat/route.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock checkApiAuth to bypass auth
vi.mock('@/lib/api-auth', () => ({
  checkApiAuth: vi.fn().mockReturnValue(undefined),
}));

// Mock storage
const mockGetModelConfig = vi.fn();
vi.mock('@/lib/storage/storage-interface', () => ({
  getStorage: vi.fn().mockResolvedValue({
    getModelConfig: (...args: unknown[]) => mockGetModelConfig(...args),
  }),
}));

// Mock llm-providers
const mockExecute = vi.fn();
const mockGetProviderAdapter = vi.fn();
vi.mock('@/lib/llm-providers', () => ({
  getProviderAdapter: (...args: unknown[]) => mockGetProviderAdapter(...args),
}));

// Mock sensei lib
vi.mock('@/lib/sensei', () => ({
  buildSenseiContext: vi.fn().mockResolvedValue({
    guardConfig: { mode: 'shinobi', blockedPatterns: [] },
    userRole: 'admin',
  }),
  getSystemMessageBuilder: vi.fn().mockReturnValue(() => 'You are Sensei.'),
  getToolsForPrompt: vi.fn().mockReturnValue([]),
  generateToolDescriptionBlock: vi.fn().mockReturnValue(''),
  extractToolCalls: vi.fn().mockReturnValue({ displayText: 'Hello!', toolCalls: [] }),
  getToolByName: vi.fn(),
  validateArgs: vi.fn().mockReturnValue([]),
  executeToolCall: vi.fn(),
  guardSenseiInput: vi.fn().mockReturnValue({ proceed: true }),
  guardSenseiOutput: vi.fn().mockImplementation((text: string) => ({ sanitizedText: text })),
  guardToolExecution: vi.fn().mockReturnValue({ allowed: true }),
  escapeToolCallTags: vi.fn().mockImplementation((text: string) => text),
}));

// Mock route-guard session cookie name
vi.mock('@/lib/auth/route-guard', () => ({
  SESSION_COOKIE_NAME: 'dojo-session',
  withAuth: (handler: Function, _opts: unknown) => handler,
}));

function createPostRequest(body: unknown): NextRequest {
  const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
  return new NextRequest('http://localhost:42001/api/sensei/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': 'test-key-123',
    },
    body: bodyStr,
  });
}

describe('/api/sensei/chat', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let POST: any, GET: any, PUT: any, DELETE: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockGetModelConfig.mockResolvedValue({
      id: 'gpt-4',
      provider: 'openai',
      maxTokens: 2048,
      temperature: 0.7,
    });

    mockExecute.mockResolvedValue({
      text: 'Hello from Sensei!',
      model: 'gpt-4',
      promptTokens: 10,
      completionTokens: 5,
    });

    mockGetProviderAdapter.mockResolvedValue({
      execute: mockExecute,
    });

    const mod = await import('../route');
    POST = mod.POST;
    GET = mod.GET;
    PUT = mod.PUT;
    DELETE = mod.DELETE;
  });

  // CHAT-001: Valid POST returns SSE stream
  it('CHAT-001: returns SSE stream for valid chat request', async () => {
    const req = createPostRequest({
      modelId: 'gpt-4',
      messages: [{ role: 'user', content: 'Hello Sensei' }],
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/event-stream');
    expect(res.headers.get('Cache-Control')).toBe('no-cache');

    // Read the stream to verify it produces SSE events
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let done = false;
    while (!done) {
      const chunk = await reader.read();
      done = chunk.done;
      if (chunk.value) {
        fullText += decoder.decode(chunk.value, { stream: true });
      }
    }
    // Stream should contain at least a "done" event
    expect(fullText).toContain('"type":"done"');
  });

  // CHAT-002: Missing modelId returns 400
  it('CHAT-002: rejects request with missing modelId', async () => {
    const req = createPostRequest({
      messages: [{ role: 'user', content: 'Hello' }],
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('modelId');
  });

  // CHAT-003: Empty messages array returns 400
  it('CHAT-003: rejects request with empty messages', async () => {
    const req = createPostRequest({
      modelId: 'gpt-4',
      messages: [],
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('non-empty array');
  });

  // CHAT-004: Invalid message role returns 400
  it('CHAT-004: rejects message with invalid role', async () => {
    const req = createPostRequest({
      modelId: 'gpt-4',
      messages: [{ role: 'hacker', content: 'pwn' }],
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Invalid role');
  });

  // CHAT-005: GET/PUT/DELETE return 405
  it('CHAT-005: GET returns 405 Method Not Allowed', async () => {
    const res = await GET();
    expect(res.status).toBe(405);
    const body = await res.json();
    expect(body.error).toContain('Method not allowed');
  });

  it('CHAT-005: PUT returns 405 Method Not Allowed', async () => {
    const res = await PUT();
    expect(res.status).toBe(405);
    const body = await res.json();
    expect(body.error).toContain('Method not allowed');
  });

  it('CHAT-005: DELETE returns 405 Method Not Allowed', async () => {
    const res = await DELETE();
    expect(res.status).toBe(405);
    const body = await res.json();
    expect(body.error).toContain('Method not allowed');
  });
});
