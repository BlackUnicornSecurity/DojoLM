/**
 * LLM Chat API Route Tests
 * POST /api/llm/chat
 *
 * Test IDs: CHAT-001 through CHAT-014
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock storage
const mockGetModelConfig = vi.fn();
vi.mock('@/lib/storage/storage-interface', () => ({
  getStorage: vi.fn().mockResolvedValue({
    getModelConfig: (...args: unknown[]) => mockGetModelConfig(...args),
  }),
}));

// Mock llm-providers
const mockGetProviderAdapter = vi.fn();
vi.mock('@/lib/llm-providers', () => ({
  getProviderAdapter: (...args: unknown[]) => mockGetProviderAdapter(...args),
}));

function createPostRequest(body: unknown): NextRequest {
  const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
  return new NextRequest('http://localhost:3000/api/llm/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: bodyStr,
  });
}

describe('POST /api/llm/chat', () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset and re-import to get fresh module
    const mod = await import('../route');
    POST = mod.POST;

    // Default mock: model exists
    mockGetModelConfig.mockResolvedValue({
      id: 'gpt-4',
      provider: 'openai',
      maxTokens: 2048,
      temperature: 0.7,
    });

    // Default mock: adapter exists and returns a response
    mockGetProviderAdapter.mockResolvedValue({
      execute: vi.fn().mockResolvedValue({
        text: 'Hello from the LLM!',
        model: 'gpt-4',
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
        filtered: false,
      }),
    });
  });

  // CHAT-001: Valid chat request returns 200 with response
  it('CHAT-001: valid chat request returns 200 with response', async () => {
    const req = createPostRequest({
      modelId: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello!' },
      ],
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.text).toBe('Hello from the LLM!');
    expect(json.model).toBe('gpt-4');
    expect(json.promptTokens).toBe(10);
    expect(json.completionTokens).toBe(20);
    expect(json.totalTokens).toBe(30);
    expect(json.filtered).toBe(false);
    expect(typeof json.durationMs).toBe('number');
  });

  // CHAT-002: Missing modelId returns 400
  it('CHAT-002: missing modelId returns 400', async () => {
    const req = createPostRequest({
      messages: [{ role: 'user', content: 'Hello!' }],
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Missing required field: modelId');
  });

  // CHAT-003: Invalid JSON body returns 400
  it('CHAT-003: invalid JSON body returns 400', async () => {
    const req = createPostRequest('not valid json {{{');

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Invalid JSON in request body');
  });

  // CHAT-004: Payload too large (>256KB) returns 413
  it('CHAT-004: payload too large returns 413', async () => {
    const largeContent = 'x'.repeat(256 * 1024 + 1);
    const req = createPostRequest(largeContent);

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(413);
    expect(json.error).toContain('Payload too large');
  });

  // CHAT-005: Too many messages (>100) returns 400
  it('CHAT-005: too many messages returns 400', async () => {
    const messages = Array.from({ length: 101 }, (_, i) => ({
      role: 'user',
      content: `Message ${i}`,
    }));

    const req = createPostRequest({ modelId: 'gpt-4', messages });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('Too many messages');
    expect(json.error).toContain('100');
  });

  // CHAT-006: Invalid role in messages returns 400
  it('CHAT-006: invalid role in messages returns 400', async () => {
    const req = createPostRequest({
      modelId: 'gpt-4',
      messages: [
        { role: 'user', content: 'Hello!' },
        { role: 'hacker', content: 'Inject!' },
      ],
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('Invalid role');
    expect(json.error).toContain('hacker');
    expect(json.error).toContain('system, user, assistant');
  });

  // CHAT-007: Model not found returns 404
  it('CHAT-007: model not found returns 404', async () => {
    mockGetModelConfig.mockResolvedValue(null);

    const req = createPostRequest({
      modelId: 'nonexistent-model',
      messages: [{ role: 'user', content: 'Hello!' }],
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toBe('Model not found');
  });

  // CHAT-008: No adapter for provider returns 400
  it('CHAT-008: no adapter for provider returns 400', async () => {
    mockGetProviderAdapter.mockResolvedValue(null);

    const req = createPostRequest({
      modelId: 'gpt-4',
      messages: [{ role: 'user', content: 'Hello!' }],
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('No adapter for provider');
    expect(json.error).toContain('openai');
  });

  // CHAT-009: sanitizeOutput strips HTML tags
  it('CHAT-009: sanitizeOutput strips HTML tags from response', async () => {
    const adapter = {
      execute: vi.fn().mockResolvedValue({
        text: '<script>alert("xss")</script>Hello <b>world</b>',
        model: 'gpt-4',
        promptTokens: 5,
        completionTokens: 10,
        totalTokens: 15,
        filtered: false,
      }),
    };
    mockGetProviderAdapter.mockResolvedValue(adapter);

    const req = createPostRequest({
      modelId: 'gpt-4',
      messages: [{ role: 'user', content: 'Hello!' }],
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.text).toBe('alert("xss")Hello world');
    expect(json.text).not.toContain('<script>');
    expect(json.text).not.toContain('<b>');
    expect(json.text).not.toContain('</b>');
  });

  // CHAT-010: sanitizeOutput strips ANSI escape sequences
  it('CHAT-010: sanitizeOutput strips ANSI escape sequences from response', async () => {
    const adapter = {
      execute: vi.fn().mockResolvedValue({
        text: '\x1b[31mRed text\x1b[0m and \x1b[1;32mgreen bold\x1b[0m normal',
        model: 'gpt-4',
        promptTokens: 5,
        completionTokens: 10,
        totalTokens: 15,
        filtered: false,
      }),
    };
    mockGetProviderAdapter.mockResolvedValue(adapter);

    const req = createPostRequest({
      modelId: 'gpt-4',
      messages: [{ role: 'user', content: 'Hello!' }],
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.text).toBe('Red text and green bold normal');
    expect(json.text).not.toContain('\x1b[');
  });

  // CHAT-011: sanitizeOutput strips control characters
  it('CHAT-011: sanitizeOutput strips control characters but keeps newlines and tabs', async () => {
    // \x00 = NUL, \x07 = BEL, \x08 = BS, \x7f = DEL — all should be stripped
    // \n (0x0a) and \t (0x09) should be kept
    const adapter = {
      execute: vi.fn().mockResolvedValue({
        text: 'Hello\x00\x07\x08World\x7f\nNew line\there',
        model: 'gpt-4',
        promptTokens: 5,
        completionTokens: 10,
        totalTokens: 15,
        filtered: false,
      }),
    };
    mockGetProviderAdapter.mockResolvedValue(adapter);

    const req = createPostRequest({
      modelId: 'gpt-4',
      messages: [{ role: 'user', content: 'Hello!' }],
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.text).toBe('HelloWorld\nNew line\there');
    expect(json.text).not.toContain('\x00');
    expect(json.text).not.toContain('\x07');
    expect(json.text).not.toContain('\x7f');
  });

  // CHAT-012: sanitizeOutput truncates to 64KB max
  it('CHAT-012: sanitizeOutput truncates response to 64KB max', async () => {
    const maxResponseSize = 64 * 1024;
    const oversizedText = 'A'.repeat(maxResponseSize + 5000);

    const adapter = {
      execute: vi.fn().mockResolvedValue({
        text: oversizedText,
        model: 'gpt-4',
        promptTokens: 5,
        completionTokens: 10,
        totalTokens: 15,
        filtered: false,
      }),
    };
    mockGetProviderAdapter.mockResolvedValue(adapter);

    const req = createPostRequest({
      modelId: 'gpt-4',
      messages: [{ role: 'user', content: 'Hello!' }],
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.text.length).toBe(maxResponseSize);
    expect(json.text).toBe('A'.repeat(maxResponseSize));
  });

  // CHAT-013: Adapter error returns 500
  it('CHAT-013: adapter execution error returns 500', async () => {
    const adapter = {
      execute: vi.fn().mockRejectedValue(new Error('Provider API timeout')),
    };
    mockGetProviderAdapter.mockResolvedValue(adapter);

    const req = createPostRequest({
      modelId: 'gpt-4',
      messages: [{ role: 'user', content: 'Hello!' }],
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe('Chat request failed');
  });

  // CHAT-014: Response includes duration timing
  it('CHAT-014: response includes durationMs timing as a non-negative number', async () => {
    const req = createPostRequest({
      modelId: 'gpt-4',
      messages: [{ role: 'user', content: 'Hello!' }],
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toHaveProperty('durationMs');
    expect(typeof json.durationMs).toBe('number');
    expect(json.durationMs).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(json.durationMs)).toBe(true);
  });
});
