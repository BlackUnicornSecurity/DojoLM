/**
 * File: providers/__tests__/errors.test.ts
 * Purpose: Unit tests for provider error classes and utilities
 *
 * Test IDs: PERR-001 through PERR-010
 *
 * Index:
 * - ProviderError base class tests (PERR-001..002)
 * - RateLimitError tests (PERR-003..004)
 * - AuthenticationError tests (PERR-005)
 * - NetworkError tests (PERR-006)
 * - ValidationError tests (PERR-007)
 * - TimeoutError tests (PERR-008)
 * - ContentFilterError / ProviderUnavailableError tests (PERR-009)
 * - parseApiError utility tests (PERR-010)
 */

import { describe, it, expect } from 'vitest';
import {
  ProviderError,
  RateLimitError,
  AuthenticationError,
  NetworkError,
  ValidationError,
  TimeoutError,
  ProviderUnavailableError,
  ContentFilterError,
  isRetryableError,
  getRetryDelay,
  parseApiError,
} from '../errors';

// ---------------------------------------------------------------------------
// ProviderError base class
// ---------------------------------------------------------------------------

describe('ProviderError', () => {
  it('PERR-001: sets message, code, provider, retryable, and name', () => {
    const err = new ProviderError('something broke', 'MY_CODE', 'openai', true);

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ProviderError);
    expect(err.message).toBe('something broke');
    expect(err.code).toBe('MY_CODE');
    expect(err.provider).toBe('openai');
    expect(err.retryable).toBe(true);
    expect(err.name).toBe('ProviderError');
  });

  it('PERR-002: defaults retryable to false and stores originalError', () => {
    const original = new Error('root cause');
    const err = new ProviderError('wrapped', 'WRAP', 'anthropic', false, original);

    expect(err.retryable).toBe(false);
    expect(err.originalError).toBe(original);
  });
});

// ---------------------------------------------------------------------------
// RateLimitError
// ---------------------------------------------------------------------------

describe('RateLimitError', () => {
  it('PERR-003: sets retryable=true, code=RATE_LIMIT_EXCEEDED, and defaults', () => {
    const err = new RateLimitError('openai', 'Too many requests');

    expect(err).toBeInstanceOf(ProviderError);
    expect(err).toBeInstanceOf(RateLimitError);
    expect(err.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(err.retryable).toBe(true);
    expect(err.name).toBe('RateLimitError');
    expect(err.retryAfter).toBe(60);
    expect(err.limit).toBe(0);
    expect(err.remaining).toBe(0);
    expect(err.resetAt).toBe('');
  });

  it('PERR-004: getSuggestedRetryDelay returns retryAfter * 1000', () => {
    const err = new RateLimitError('openai', 'Rate limited', { retryAfter: 30 });

    expect(err.retryAfter).toBe(30);
    expect(err.getSuggestedRetryDelay()).toBe(30_000);
  });
});

// ---------------------------------------------------------------------------
// AuthenticationError
// ---------------------------------------------------------------------------

describe('AuthenticationError', () => {
  it('PERR-005: sets code=AUTHENTICATION_FAILED, retryable=false, and authType', () => {
    const err = new AuthenticationError('moonshot', 'Invalid API key', 'apiKey');

    expect(err).toBeInstanceOf(ProviderError);
    expect(err.code).toBe('AUTHENTICATION_FAILED');
    expect(err.retryable).toBe(false);
    expect(err.authType).toBe('apiKey');
    expect(err.name).toBe('AuthenticationError');
    expect(err.provider).toBe('moonshot');
  });

  it('PERR-005b: defaults authType to unknown', () => {
    const err = new AuthenticationError('zai', 'Auth failed');
    expect(err.authType).toBe('unknown');
  });
});

// ---------------------------------------------------------------------------
// NetworkError
// ---------------------------------------------------------------------------

describe('NetworkError', () => {
  it('PERR-006: sets code=NETWORK_ERROR, retryable=true, and optional hostname/statusCode', () => {
    const err = new NetworkError('ollama', 'Connection refused', {
      hostname: 'localhost',
      statusCode: 503,
    });

    expect(err).toBeInstanceOf(ProviderError);
    expect(err.code).toBe('NETWORK_ERROR');
    expect(err.retryable).toBe(true);
    expect(err.hostname).toBe('localhost');
    expect(err.statusCode).toBe(503);
    expect(err.name).toBe('NetworkError');
  });

  it('PERR-006b: works without optional fields', () => {
    const err = new NetworkError('openai', 'Network failure');
    expect(err.hostname).toBeUndefined();
    expect(err.statusCode).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// ValidationError
// ---------------------------------------------------------------------------

describe('ValidationError', () => {
  it('PERR-007: sets code=VALIDATION_ERROR, retryable=false, and field/constraint', () => {
    const err = new ValidationError('anthropic', 'Invalid model name', {
      field: 'model',
      constraint: 'must start with claude-',
    });

    expect(err).toBeInstanceOf(ProviderError);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.retryable).toBe(false);
    expect(err.field).toBe('model');
    expect(err.constraint).toBe('must start with claude-');
    expect(err.name).toBe('ValidationError');
  });

  it('PERR-007b: works without optional fields', () => {
    const err = new ValidationError('openai', 'Config invalid');
    expect(err.field).toBeUndefined();
    expect(err.constraint).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// TimeoutError
// ---------------------------------------------------------------------------

describe('TimeoutError', () => {
  it('PERR-008: sets code=REQUEST_TIMEOUT, retryable=true, timeout, and operation', () => {
    const err = new TimeoutError('moonshot', 'Request timed out', 30000, 'execute');

    expect(err).toBeInstanceOf(ProviderError);
    expect(err.code).toBe('REQUEST_TIMEOUT');
    expect(err.retryable).toBe(true);
    expect(err.timeout).toBe(30000);
    expect(err.operation).toBe('execute');
    expect(err.name).toBe('TimeoutError');
  });

  it('PERR-008b: defaults operation to request', () => {
    const err = new TimeoutError('zai', 'Timed out', 15000);
    expect(err.operation).toBe('request');
  });
});

// ---------------------------------------------------------------------------
// ProviderUnavailableError and ContentFilterError
// ---------------------------------------------------------------------------

describe('ProviderUnavailableError', () => {
  it('PERR-009: sets code=PROVIDER_UNAVAILABLE, retryable=true, and optional region', () => {
    const err = new ProviderUnavailableError('google', 'Service down', { region: 'us-east1' });

    expect(err).toBeInstanceOf(ProviderError);
    expect(err.code).toBe('PROVIDER_UNAVAILABLE');
    expect(err.retryable).toBe(true);
    expect(err.region).toBe('us-east1');
    expect(err.name).toBe('ProviderUnavailableError');
  });
});

describe('ContentFilterError', () => {
  it('PERR-009b: sets code=CONTENT_FILTERED, retryable=false, and category', () => {
    const err = new ContentFilterError('openai', 'Content blocked', 'violence');

    expect(err).toBeInstanceOf(ProviderError);
    expect(err.code).toBe('CONTENT_FILTERED');
    expect(err.retryable).toBe(false);
    expect(err.category).toBe('violence');
    expect(err.name).toBe('ContentFilterError');
  });

  it('PERR-009c: defaults category to unknown', () => {
    const err = new ContentFilterError('anthropic', 'Blocked');
    expect(err.category).toBe('unknown');
  });
});

// ---------------------------------------------------------------------------
// isRetryableError utility
// ---------------------------------------------------------------------------

describe('isRetryableError', () => {
  it('PERR-009d: returns true for retryable ProviderError subclasses', () => {
    expect(isRetryableError(new RateLimitError('openai', 'Throttled'))).toBe(true);
    expect(isRetryableError(new NetworkError('openai', 'Network down'))).toBe(true);
    expect(isRetryableError(new TimeoutError('openai', 'Timeout', 5000))).toBe(true);
  });

  it('PERR-009e: returns false for non-retryable ProviderError subclasses', () => {
    expect(isRetryableError(new AuthenticationError('openai', 'Bad key'))).toBe(false);
    expect(isRetryableError(new ValidationError('openai', 'Invalid'))).toBe(false);
    expect(isRetryableError(new ContentFilterError('openai', 'Blocked'))).toBe(false);
  });

  it('PERR-009f: returns true for generic Error with network-like message', () => {
    expect(isRetryableError(new Error('network failure'))).toBe(true);
    expect(isRetryableError(new Error('request timeout'))).toBe(true);
    expect(isRetryableError(new Error('ECONNREFUSED'))).toBe(true);
  });

  it('PERR-009g: returns false for non-Error values', () => {
    expect(isRetryableError(null)).toBe(false);
    expect(isRetryableError(undefined)).toBe(false);
    expect(isRetryableError('some string')).toBe(false);
    expect(isRetryableError(42)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getRetryDelay utility
// ---------------------------------------------------------------------------

describe('getRetryDelay', () => {
  it('PERR-009h: returns retryAfter*1000 for RateLimitError', () => {
    const err = new RateLimitError('openai', 'Rate limited', { retryAfter: 45 });
    expect(getRetryDelay(err)).toBe(45_000);
  });

  it('PERR-009i: returns min(baseDelay*2, 30000) for TimeoutError', () => {
    const err = new TimeoutError('openai', 'Timeout', 5000);
    expect(getRetryDelay(err, 1000)).toBe(2000);
    expect(getRetryDelay(err, 20000)).toBe(30000);
  });

  it('PERR-009j: returns baseDelay for generic errors', () => {
    const err = new NetworkError('openai', 'Network error');
    expect(getRetryDelay(err, 1500)).toBe(1500);
  });
});

// ---------------------------------------------------------------------------
// parseApiError utility
// ---------------------------------------------------------------------------

describe('parseApiError', () => {
  it('PERR-010: maps 401 to AuthenticationError', () => {
    const err = parseApiError('openai', 401, 'Unauthorized');
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.provider).toBe('openai');
    expect(err.message).toBe('Unauthorized');
  });

  it('PERR-010b: maps 403 to AuthenticationError', () => {
    const err = parseApiError('anthropic', 403, 'Forbidden');
    expect(err).toBeInstanceOf(AuthenticationError);
  });

  it('PERR-010c: maps 429 to RateLimitError', () => {
    const err = parseApiError('moonshot', 429, 'Rate limit exceeded');
    expect(err).toBeInstanceOf(RateLimitError);
    expect(err.retryable).toBe(true);
  });

  it('PERR-010d: maps 400 to ValidationError', () => {
    const err = parseApiError('zai', 400, 'Bad request');
    expect(err).toBeInstanceOf(ValidationError);
  });

  it('PERR-010e: maps 404 to ProviderUnavailableError', () => {
    const err = parseApiError('openai', 404, 'Not found');
    expect(err).toBeInstanceOf(ProviderUnavailableError);
  });

  it('PERR-010f: maps 503 to ProviderUnavailableError', () => {
    const err = parseApiError('openai', 503, 'Service unavailable');
    expect(err).toBeInstanceOf(ProviderUnavailableError);
  });

  it('PERR-010g: maps 408 to TimeoutError', () => {
    const err = parseApiError('openai', 408, 'Request timeout');
    expect(err).toBeInstanceOf(TimeoutError);
  });

  it('PERR-010h: maps 504 to TimeoutError', () => {
    const err = parseApiError('openai', 504, 'Gateway timeout');
    expect(err).toBeInstanceOf(TimeoutError);
  });

  it('PERR-010i: maps 500+ to NetworkError', () => {
    const err = parseApiError('openai', 500, 'Internal server error');
    expect(err).toBeInstanceOf(NetworkError);
    expect((err as NetworkError).statusCode).toBe(500);
  });

  it('PERR-010j: returns base ProviderError for unrecognised status codes', () => {
    const err = parseApiError('openai', 418, "I'm a teapot");
    expect(err).toBeInstanceOf(ProviderError);
    expect(err.code).toBe('UNKNOWN_ERROR');
    expect(err.retryable).toBe(false);
  });

  it('PERR-010k: uses fallback message when responseText is empty', () => {
    const err = parseApiError('openai', 500, '');
    expect(err.message).toBe('API error (500)');
  });
});
