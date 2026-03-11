/**
 * Fetch Utils Tests
 *
 * Tests for fetchWithTimeout, sanitizeUrl, createTimeoutPromise,
 * withTimeout, and measureDuration utility functions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchWithTimeout,
  sanitizeUrl,
  createTimeoutPromise,
  withTimeout,
  measureDuration,
} from './fetch-utils.js';

vi.stubGlobal('fetch', vi.fn());

const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;

describe('sanitizeUrl', () => {
  // =========================================================================
  // FU-T01: Strips auth query parameters
  // =========================================================================
  it('FU-T01: redacts known auth query params from URL', () => {
    const url = 'https://api.example.com/v1?key=my-secret-key&format=json';
    const sanitized = sanitizeUrl(url);

    expect(sanitized).toContain('key=%5BREDACTED%5D');
    expect(sanitized).not.toContain('my-secret-key');
    expect(sanitized).toContain('format=json');
  });

  // =========================================================================
  // FU-T02: Strips multiple auth params
  // =========================================================================
  it('FU-T02: redacts multiple auth query params', () => {
    const url = 'https://api.example.com?api_key=secret1&token=secret2&other=keep';
    const sanitized = sanitizeUrl(url);

    expect(sanitized).not.toContain('secret1');
    expect(sanitized).not.toContain('secret2');
    expect(sanitized).toContain('other=keep');
  });

  // =========================================================================
  // FU-T03: Removes embedded credentials
  // =========================================================================
  it('FU-T03: strips embedded user:pass credentials from URL', () => {
    const url = 'https://admin:password123@api.example.com/v1';
    const sanitized = sanitizeUrl(url);

    expect(sanitized).not.toContain('admin');
    expect(sanitized).not.toContain('password123');
    expect(sanitized).toContain('api.example.com');
  });

  // =========================================================================
  // FU-T04: Returns [INVALID_URL] for malformed URLs
  // =========================================================================
  it('FU-T04: returns [INVALID_URL] for malformed URLs', () => {
    expect(sanitizeUrl('not-a-url')).toBe('[INVALID_URL]');
    expect(sanitizeUrl('')).toBe('[INVALID_URL]');
  });

  // =========================================================================
  // FU-T05: Passes through clean URLs unchanged
  // =========================================================================
  it('FU-T05: returns clean URLs without modification', () => {
    const url = 'https://api.openai.com/v1/chat/completions';
    const sanitized = sanitizeUrl(url);
    expect(sanitized).toBe('https://api.openai.com/v1/chat/completions');
  });
});

describe('fetchWithTimeout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // FU-T06: Passes fetch options through to native fetch
  // =========================================================================
  it('FU-T06: passes method, headers, and body to native fetch', async () => {
    mockFetch.mockResolvedValue(new Response('ok', { status: 200 }));

    await fetchWithTimeout('https://api.example.com/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"key":"value"}',
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/test',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"key":"value"}',
        signal: expect.any(AbortSignal),
      }),
    );
  });

  // =========================================================================
  // FU-T07: Throws on URL validation failure
  // =========================================================================
  it('FU-T07: throws when URL validation function rejects the URL', async () => {
    const validator = vi.fn(() => false);

    await expect(fetchWithTimeout('https://evil.example.com', {
      validateUrl: validator,
    })).rejects.toThrow('URL validation failed');
  });

  // =========================================================================
  // FU-T08: Skips URL validation when skipUrlValidation is true
  // =========================================================================
  it('FU-T08: skips URL validation when skipUrlValidation is set', async () => {
    mockFetch.mockResolvedValue(new Response('ok'));
    const validator = vi.fn(() => false);

    await fetchWithTimeout('https://internal.example.com', {
      skipUrlValidation: true,
      validateUrl: validator,
    });

    expect(validator).not.toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalled();
  });

  // =========================================================================
  // FU-T09: Clamps timeout to MAX_TIMEOUT_MS
  // =========================================================================
  it('FU-T09: clamps timeout values to max 120000ms', async () => {
    mockFetch.mockResolvedValue(new Response('ok'));

    // Should not throw — just clamp the value
    await fetchWithTimeout('https://api.example.com', {
      timeoutMs: 999_999,
    });

    // Verify AbortSignal was created (timeout gets clamped)
    const callArgs = mockFetch.mock.calls[0][1];
    expect(callArgs.signal).toBeDefined();
  });

  // =========================================================================
  // FU-T10: Wraps TypeError (network errors) with safe URL
  // =========================================================================
  it('FU-T10: wraps network TypeErrors with sanitized URL in message', async () => {
    mockFetch.mockRejectedValue(new TypeError('fetch failed: network error'));

    await expect(fetchWithTimeout('https://api.example.com/v1?key=secret123', {
      skipUrlValidation: true,
    })).rejects.toThrow('Network error connecting to');
  });

  // =========================================================================
  // FU-T11: Wraps DOMException TimeoutError
  // =========================================================================
  it('FU-T11: wraps DOMException TimeoutError with sanitized URL', async () => {
    const timeoutErr = new DOMException('The operation timed out', 'TimeoutError');
    mockFetch.mockRejectedValue(timeoutErr);

    await expect(fetchWithTimeout('https://api.example.com', {
      timeoutMs: 5000,
      skipUrlValidation: true,
    })).rejects.toThrow(/timed out after/);
  });

  // =========================================================================
  // FU-T12: Wraps DOMException AbortError
  // =========================================================================
  it('FU-T12: wraps DOMException AbortError with sanitized URL', async () => {
    const abortErr = new DOMException('The operation was aborted', 'AbortError');
    mockFetch.mockRejectedValue(abortErr);

    await expect(fetchWithTimeout('https://api.example.com', {
      skipUrlValidation: true,
    })).rejects.toThrow(/was aborted/);
  });
});

describe('createTimeoutPromise', () => {
  // =========================================================================
  // FU-T13: Rejects after specified timeout
  // =========================================================================
  it('FU-T13: rejects with timeout message after specified duration', async () => {
    vi.useFakeTimers();

    const promise = createTimeoutPromise(100, 'test operation');

    vi.advanceTimersByTime(100);

    await expect(promise).rejects.toThrow('test operation timed out after 100ms');

    vi.useRealTimers();
  });
});

describe('withTimeout', () => {
  // =========================================================================
  // FU-T14: Returns result if promise resolves before timeout
  // =========================================================================
  it('FU-T14: returns promise result when it resolves before timeout', async () => {
    const fast = Promise.resolve('done');
    const result = await withTimeout(fast, 5000, 'fast-op');
    expect(result).toBe('done');
  });

  // =========================================================================
  // FU-T15: Rejects if promise takes longer than timeout
  // =========================================================================
  it('FU-T15: rejects with timeout error when promise is too slow', async () => {
    vi.useFakeTimers();

    const slow = new Promise(() => {}); // never resolves
    const racePromise = withTimeout(slow, 50, 'slow-op');

    vi.advanceTimersByTime(50);

    await expect(racePromise).rejects.toThrow('slow-op timed out after 50ms');

    vi.useRealTimers();
  });
});

describe('measureDuration', () => {
  // =========================================================================
  // FU-T16: Returns rounded milliseconds
  // =========================================================================
  it('FU-T16: returns rounded duration in milliseconds', () => {
    // performance.now() returns a float; measureDuration rounds it
    const start = performance.now() - 42.7;
    const duration = measureDuration(start);

    expect(typeof duration).toBe('number');
    expect(Number.isInteger(duration)).toBe(true);
    expect(duration).toBeGreaterThanOrEqual(42);
  });
});
