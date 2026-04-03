import { describe, it, expect } from 'vitest';
import { validateArgs, sanitizeResult } from '../sensei/tool-executor';
import type { SenseiToolDefinition } from '../sensei/types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const scanTextTool: SenseiToolDefinition = {
  name: 'scan_text',
  description: 'Scan text for prompt injection',
  parameters: {
    type: 'object',
    required: ['text'],
    properties: {
      text: { type: 'string', description: 'Text to scan' },
      verbose: { type: 'boolean', description: 'Verbose output' },
      limit: { type: 'number', description: 'Max results' },
      tags: { type: 'array', description: 'Filter tags' },
    },
  },
  endpoint: '/api/scanner',
  method: 'POST',
  mutating: false,
  requiresConfirmation: false,
  minRole: 'user',
};

const enumTool: SenseiToolDefinition = {
  name: 'set_guard_mode',
  description: 'Set the guard mode',
  parameters: {
    type: 'object',
    required: ['mode'],
    properties: {
      mode: {
        type: 'string',
        enum: ['shinobi', 'samurai', 'sensei', 'hattori'],
        description: 'Guard mode',
      },
    },
  },
  endpoint: '/api/guard/mode',
  method: 'POST',
  mutating: true,
  requiresConfirmation: true,
  minRole: 'admin',
};

// ---------------------------------------------------------------------------
// Tests — validateArgs
// ---------------------------------------------------------------------------

describe('sensei tool-executor', () => {
  describe('validateArgs', () => {
    it('accepts valid required args', () => {
      const errors = validateArgs(scanTextTool, { text: 'hello' });
      expect(errors).toHaveLength(0);
    });

    it('rejects missing required fields', () => {
      const errors = validateArgs(scanTextTool, {});
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].field).toBe('text');
    });

    it('rejects null required fields', () => {
      const errors = validateArgs(scanTextTool, { text: null });
      expect(errors.some((e) => e.field === 'text')).toBe(true);
    });

    it('rejects undefined required fields', () => {
      const errors = validateArgs(scanTextTool, { text: undefined });
      expect(errors.some((e) => e.field === 'text')).toBe(true);
    });

    it('accepts optional fields alongside required', () => {
      const errors = validateArgs(scanTextTool, { text: 'hi', verbose: true });
      expect(errors).toHaveLength(0);
    });

    it('skips null optional fields (LLM null emission)', () => {
      const errors = validateArgs(scanTextTool, { text: 'hi', verbose: null });
      expect(errors).toHaveLength(0);
    });

    it('rejects unknown fields', () => {
      const errors = validateArgs(scanTextTool, { text: 'hi', unknown_field: 42 });
      expect(errors.some((e) => e.field === 'unknown_field')).toBe(true);
    });

    it('rejects wrong type — string expected but got number', () => {
      const errors = validateArgs(scanTextTool, { text: 123 });
      expect(errors.some((e) => e.field === 'text' && e.message.includes('string'))).toBe(true);
    });

    it('rejects wrong type — boolean expected but got string', () => {
      const errors = validateArgs(scanTextTool, { text: 'hi', verbose: 'yes' });
      expect(errors.some((e) => e.field === 'verbose')).toBe(true);
    });

    it('rejects wrong type — number expected but got string', () => {
      const errors = validateArgs(scanTextTool, { text: 'hi', limit: 'ten' });
      expect(errors.some((e) => e.field === 'limit')).toBe(true);
    });

    it('rejects wrong type — array expected but got string', () => {
      const errors = validateArgs(scanTextTool, { text: 'hi', tags: 'tag1' });
      expect(errors.some((e) => e.field === 'tags')).toBe(true);
    });

    it('validates enum — accepts valid value', () => {
      const errors = validateArgs(enumTool, { mode: 'samurai' });
      expect(errors).toHaveLength(0);
    });

    it('validates enum — rejects invalid value', () => {
      const errors = validateArgs(enumTool, { mode: 'invalid' });
      expect(errors.some((e) => e.field === 'mode')).toBe(true);
    });

    it('handles tool with no required fields', () => {
      const noReqTool: SenseiToolDefinition = {
        ...scanTextTool,
        parameters: {
          type: 'object',
          properties: { verbose: { type: 'boolean' } },
        },
      };
      const errors = validateArgs(noReqTool, {});
      expect(errors).toHaveLength(0);
    });

    it('handles tool with no properties', () => {
      const emptyTool: SenseiToolDefinition = {
        ...scanTextTool,
        parameters: { type: 'object' },
      };
      const errors = validateArgs(emptyTool, {});
      expect(errors).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // Tests — sanitizeResult
  // -------------------------------------------------------------------------

  describe('sanitizeResult', () => {
    it('returns plain objects unchanged', () => {
      const result = sanitizeResult({ count: 5, name: 'test' });
      expect(result).toEqual({ count: 5, name: 'test' });
    });

    it('redacts apiKey field', () => {
      const result = sanitizeResult({ data: 'ok', apiKey: 'secret-key-123' });
      expect((result as Record<string, unknown>).apiKey).toBe('***');
    });

    it('redacts password field', () => {
      const result = sanitizeResult({ password: 'hunter2' });
      expect((result as Record<string, unknown>).password).toBe('***');
    });

    it('redacts token field', () => {
      const result = sanitizeResult({ token: 'abc123', user: 'bob' });
      const r = result as Record<string, unknown>;
      expect(r.token).toBe('***');
      expect(r.user).toBe('bob');
    });

    it('redacts access_token and refresh_token', () => {
      const result = sanitizeResult({
        access_token: 'at_xxx',
        refresh_token: 'rt_xxx',
      }) as Record<string, unknown>;
      expect(result.access_token).toBe('***');
      expect(result.refresh_token).toBe('***');
    });

    it('redacts nested sensitive fields', () => {
      const result = sanitizeResult({
        config: { apiKey: 'nested-secret', host: 'localhost' },
      }) as Record<string, unknown>;
      const config = result.config as Record<string, unknown>;
      expect(config.apiKey).toBe('***');
      expect(config.host).toBe('localhost');
    });

    it('redacts sensitive fields in arrays', () => {
      const result = sanitizeResult([
        { name: 'a', token: 'tok1' },
        { name: 'b', token: 'tok2' },
      ]) as Array<Record<string, unknown>>;
      expect(result[0].token).toBe('***');
      expect(result[1].token).toBe('***');
    });

    it('strips HTML tags from strings', () => {
      const result = sanitizeResult({
        message: '<script>alert(1)</script>Hello',
      }) as Record<string, unknown>;
      expect(result.message).not.toContain('<script>');
      expect(result.message).toContain('Hello');
    });

    it('strips HTML from nested string values', () => {
      const result = sanitizeResult({
        items: [{ note: '<b>bold</b> text' }],
      }) as { items: Array<{ note: string }> };
      expect(result.items[0].note).not.toContain('<b>');
      expect(result.items[0].note).toContain('bold');
    });

    it('truncates large results', () => {
      const largeData = { content: 'x'.repeat(10000) };
      const result = sanitizeResult(largeData);
      expect(JSON.stringify(result).length).toBeLessThanOrEqual(5000);
    });

    it('passes through null and undefined', () => {
      expect(sanitizeResult(null)).toBeNull();
      expect(sanitizeResult(undefined)).toBeUndefined();
    });

    it('passes through primitive numbers', () => {
      expect(sanitizeResult(42)).toBe(42);
    });

    it('handles deeply nested objects', () => {
      const deep = { a: { b: { c: { password: 'deep-secret', ok: true } } } };
      const result = sanitizeResult(deep) as any;
      expect(result.a.b.c.password).toBe('***');
      expect(result.a.b.c.ok).toBe(true);
    });
  });
});
