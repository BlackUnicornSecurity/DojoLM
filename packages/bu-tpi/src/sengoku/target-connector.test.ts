import { describe, it, expect } from 'vitest';
import { validateTargetUrl, sanitizeCredentials } from './target-connector.js';

describe('validateTargetUrl', () => {
  it('accepts valid HTTPS URLs', () => {
    const result = validateTargetUrl('https://example.com/api/v1');
    expect(result.valid).toBe(true);
  });

  it('accepts valid HTTP URLs', () => {
    const result = validateTargetUrl('http://example.com');
    expect(result.valid).toBe(true);
  });

  it('rejects invalid URL format', () => {
    const result = validateTargetUrl('not-a-url');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Invalid URL');
  });

  it('blocks file:// scheme', () => {
    const result = validateTargetUrl('file:///etc/passwd');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Blocked scheme');
  });

  it('blocks localhost by default', () => {
    const result = validateTargetUrl('http://localhost:3000');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Localhost');
  });

  it('allows localhost when allowLocalhost is true', () => {
    const result = validateTargetUrl('http://localhost:3000', true);
    expect(result.valid).toBe(true);
  });

  it('blocks RFC1918 private IPs', () => {
    expect(validateTargetUrl('http://192.168.1.1').valid).toBe(false);
    expect(validateTargetUrl('http://10.0.0.1').valid).toBe(false);
    expect(validateTargetUrl('http://172.16.0.1').valid).toBe(false);
  });

  it('blocks cloud metadata endpoints', () => {
    const result = validateTargetUrl('http://169.254.169.254/latest/meta-data');
    expect(result.valid).toBe(false);
  });

  it('blocks embedded credentials', () => {
    const result = validateTargetUrl('http://user:pass@example.com');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Embedded credentials');
  });
});

describe('sanitizeCredentials', () => {
  it('redacts keys matching credential patterns', () => {
    const result = sanitizeCredentials({
      api_key: 'sk-12345',
      token: 'bearer-xyz',
      name: 'test',
    });
    expect(result.api_key).toBe('[REDACTED]');
    expect(result.token).toBe('[REDACTED]');
    expect(result.name).toBe('test');
  });

  it('handles nested objects', () => {
    const result = sanitizeCredentials({
      config: { secret: 'abc', host: 'localhost' },
    });
    const config = result.config as Record<string, unknown>;
    expect(config.secret).toBe('[REDACTED]');
    expect(config.host).toBe('localhost');
  });

  it('handles arrays', () => {
    const result = sanitizeCredentials({
      items: [{ password: '123', label: 'test' }],
    });
    const items = result.items as Array<Record<string, unknown>>;
    expect(items[0].password).toBe('[REDACTED]');
    expect(items[0].label).toBe('test');
  });

  it('preserves null and primitive values', () => {
    const result = sanitizeCredentials({
      count: 42,
      active: true,
      empty: null,
    });
    expect(result.count).toBe(42);
    expect(result.active).toBe(true);
    expect(result.empty).toBeNull();
  });
});
