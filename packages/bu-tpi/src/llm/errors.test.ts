/**
 * LLM Errors Tests
 *
 * Tests for all error classes and utility functions in errors.ts.
 * Covers ProviderError, RateLimitError, AuthenticationError, NetworkError,
 * ValidationError, TimeoutError, ProviderUnavailableError, ContentFilterError,
 * isRetryableError, getRetryDelay, and parseApiError.
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
} from './errors.js';

describe('LLM Errors', () => {
  // =========================================================================
  // ERR-T01: ProviderError base class
  // =========================================================================
  it('ERR-T01: ProviderError stores code, provider, retryable, and originalError', () => {
    const original = new Error('original');
    const err = new ProviderError('test message', 'TEST_CODE', 'openai', true, original);

    expect(err.message).toBe('test message');
    expect(err.code).toBe('TEST_CODE');
    expect(err.provider).toBe('openai');
    expect(err.retryable).toBe(true);
    expect(err.originalError).toBe(original);
    expect(err.name).toBe('ProviderError');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ProviderError);
  });

  it('ERR-T02: ProviderError defaults retryable to false', () => {
    const err = new ProviderError('msg', 'CODE', 'test');
    expect(err.retryable).toBe(false);
  });

  // =========================================================================
  // ERR-T03: RateLimitError
  // =========================================================================
  it('ERR-T03: RateLimitError stores rate limit details and is retryable', () => {
    const err = new RateLimitError('openai', 'Rate limited', {
      retryAfter: 30,
      limit: 100,
      remaining: 0,
      resetAt: '2025-01-01T00:01:00Z',
    });

    expect(err.name).toBe('RateLimitError');
    expect(err.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(err.retryable).toBe(true);
    expect(err.retryAfter).toBe(30);
    expect(err.limit).toBe(100);
    expect(err.remaining).toBe(0);
    expect(err.resetAt).toBe('2025-01-01T00:01:00Z');
    expect(err).toBeInstanceOf(ProviderError);
  });

  it('ERR-T04: RateLimitError.getSuggestedRetryDelay returns retryAfter * 1000', () => {
    const err = new RateLimitError('openai', 'Rate limited', { retryAfter: 15 });
    expect(err.getSuggestedRetryDelay()).toBe(15000);
  });

  it('ERR-T05: RateLimitError defaults retryAfter to 60', () => {
    const err = new RateLimitError('openai', 'Rate limited');
    expect(err.retryAfter).toBe(60);
    expect(err.limit).toBe(0);
    expect(err.remaining).toBe(0);
    expect(err.resetAt).toBe('');
  });

  // =========================================================================
  // ERR-T06: AuthenticationError
  // =========================================================================
  it('ERR-T06: AuthenticationError stores authType and is not retryable', () => {
    const err = new AuthenticationError('anthropic', 'Invalid key', 'apiKey');

    expect(err.name).toBe('AuthenticationError');
    expect(err.code).toBe('AUTHENTICATION_FAILED');
    expect(err.provider).toBe('anthropic');
    expect(err.authType).toBe('apiKey');
    expect(err.retryable).toBe(false);
    expect(err).toBeInstanceOf(ProviderError);
  });

  it('ERR-T07: AuthenticationError defaults authType to unknown', () => {
    const err = new AuthenticationError('openai', 'bad key');
    expect(err.authType).toBe('unknown');
  });

  // =========================================================================
  // ERR-T08: NetworkError
  // =========================================================================
  it('ERR-T08: NetworkError stores hostname and statusCode and is retryable', () => {
    const err = new NetworkError('google', 'Connection refused', {
      hostname: 'api.google.com',
      statusCode: 502,
    });

    expect(err.name).toBe('NetworkError');
    expect(err.code).toBe('NETWORK_ERROR');
    expect(err.retryable).toBe(true);
    expect(err.hostname).toBe('api.google.com');
    expect(err.statusCode).toBe(502);
  });

  // =========================================================================
  // ERR-T09: ValidationError
  // =========================================================================
  it('ERR-T09: ValidationError stores field and constraint and is not retryable', () => {
    const err = new ValidationError('openai', 'Invalid model', {
      field: 'model',
      constraint: 'must be a valid model name',
    });

    expect(err.name).toBe('ValidationError');
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.retryable).toBe(false);
    expect(err.field).toBe('model');
    expect(err.constraint).toBe('must be a valid model name');
  });

  // =========================================================================
  // ERR-T10: TimeoutError
  // =========================================================================
  it('ERR-T10: TimeoutError stores timeout and operation and is retryable', () => {
    const err = new TimeoutError('anthropic', 'Request timed out', 30000, 'completion');

    expect(err.name).toBe('TimeoutError');
    expect(err.code).toBe('REQUEST_TIMEOUT');
    expect(err.retryable).toBe(true);
    expect(err.timeout).toBe(30000);
    expect(err.operation).toBe('completion');
  });

  it('ERR-T11: TimeoutError defaults operation to request', () => {
    const err = new TimeoutError('openai', 'timeout', 5000);
    expect(err.operation).toBe('request');
  });

  // =========================================================================
  // ERR-T12: ProviderUnavailableError
  // =========================================================================
  it('ERR-T12: ProviderUnavailableError stores region and is retryable', () => {
    const err = new ProviderUnavailableError('aws', 'Service down', { region: 'us-east-1' });

    expect(err.name).toBe('ProviderUnavailableError');
    expect(err.code).toBe('PROVIDER_UNAVAILABLE');
    expect(err.retryable).toBe(true);
    expect(err.region).toBe('us-east-1');
  });

  // =========================================================================
  // ERR-T13: ContentFilterError
  // =========================================================================
  it('ERR-T13: ContentFilterError stores category and is not retryable', () => {
    const err = new ContentFilterError('openai', 'Content blocked', 'violence');

    expect(err.name).toBe('ContentFilterError');
    expect(err.code).toBe('CONTENT_FILTERED');
    expect(err.retryable).toBe(false);
    expect(err.category).toBe('violence');
  });

  it('ERR-T14: ContentFilterError defaults category to unknown', () => {
    const err = new ContentFilterError('openai', 'blocked');
    expect(err.category).toBe('unknown');
  });

  // =========================================================================
  // ERR-T15: isRetryableError
  // =========================================================================
  it('ERR-T15: isRetryableError returns true for retryable ProviderErrors', () => {
    expect(isRetryableError(new RateLimitError('openai', 'rate limited'))).toBe(true);
    expect(isRetryableError(new NetworkError('openai', 'network fail'))).toBe(true);
    expect(isRetryableError(new TimeoutError('openai', 'timeout', 5000))).toBe(true);
    expect(isRetryableError(new ProviderUnavailableError('openai', 'down'))).toBe(true);
  });

  it('ERR-T16: isRetryableError returns false for non-retryable ProviderErrors', () => {
    expect(isRetryableError(new AuthenticationError('openai', 'bad key'))).toBe(false);
    expect(isRetryableError(new ValidationError('openai', 'invalid'))).toBe(false);
    expect(isRetryableError(new ContentFilterError('openai', 'blocked'))).toBe(false);
  });

  it('ERR-T17: isRetryableError checks message keywords for plain Errors', () => {
    expect(isRetryableError(new Error('network failure'))).toBe(true);
    expect(isRetryableError(new Error('request timeout'))).toBe(true);
    expect(isRetryableError(new Error('ECONNREFUSED'))).toBe(true);
    expect(isRetryableError(new Error('some random error'))).toBe(false);
  });

  it('ERR-T18: isRetryableError returns false for non-Error values', () => {
    expect(isRetryableError(null)).toBe(false);
    expect(isRetryableError('string error')).toBe(false);
    expect(isRetryableError(42)).toBe(false);
  });

  // =========================================================================
  // ERR-T19: getRetryDelay
  // =========================================================================
  it('ERR-T19: getRetryDelay uses RateLimitError suggested delay', () => {
    const err = new RateLimitError('openai', 'limited', { retryAfter: 10 });
    expect(getRetryDelay(err)).toBe(10000);
  });

  it('ERR-T20: getRetryDelay doubles base for TimeoutError capped at 30s', () => {
    const err = new TimeoutError('openai', 'timeout', 5000);
    expect(getRetryDelay(err, 1000)).toBe(2000);
    expect(getRetryDelay(err, 20000)).toBe(30000);
  });

  it('ERR-T21: getRetryDelay returns baseDelay for other errors', () => {
    const err = new NetworkError('openai', 'fail');
    expect(getRetryDelay(err, 2000)).toBe(2000);
    expect(getRetryDelay(err)).toBe(1000);
  });

  // =========================================================================
  // ERR-T22: parseApiError
  // =========================================================================
  it('ERR-T22: parseApiError returns AuthenticationError for 401', () => {
    const err = parseApiError('openai', 401, 'Unauthorized');
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.message).toBe('Unauthorized');
  });

  it('ERR-T23: parseApiError returns AuthenticationError for 403', () => {
    const err = parseApiError('openai', 403, 'Forbidden');
    expect(err).toBeInstanceOf(AuthenticationError);
  });

  it('ERR-T24: parseApiError returns RateLimitError for 429', () => {
    const err = parseApiError('openai', 429, 'Too many requests');
    expect(err).toBeInstanceOf(RateLimitError);
    expect((err as RateLimitError).retryAfter).toBe(60);
  });

  it('ERR-T25: parseApiError reads Retry-After header for 429', () => {
    const headers = new Headers({ 'retry-after': '30' });
    const err = parseApiError('openai', 429, 'Too many', headers) as RateLimitError;
    expect(err.retryAfter).toBe(30);
  });

  it('ERR-T26: parseApiError returns ValidationError for 400', () => {
    const err = parseApiError('openai', 400, 'Bad request');
    expect(err).toBeInstanceOf(ValidationError);
  });

  it('ERR-T27: parseApiError returns ProviderUnavailableError for 404 and 503', () => {
    expect(parseApiError('openai', 404, 'Not found')).toBeInstanceOf(ProviderUnavailableError);
    expect(parseApiError('openai', 503, 'Unavailable')).toBeInstanceOf(ProviderUnavailableError);
  });

  it('ERR-T28: parseApiError returns TimeoutError for 408 and 504', () => {
    expect(parseApiError('openai', 408, 'Timeout')).toBeInstanceOf(TimeoutError);
    expect(parseApiError('openai', 504, 'Gateway timeout')).toBeInstanceOf(TimeoutError);
  });

  it('ERR-T29: parseApiError returns NetworkError for other 5xx', () => {
    const err = parseApiError('openai', 500, 'Internal error');
    expect(err).toBeInstanceOf(NetworkError);
    expect((err as NetworkError).statusCode).toBe(500);
  });

  it('ERR-T30: parseApiError returns generic ProviderError for unknown status', () => {
    const err = parseApiError('openai', 418, 'I am a teapot');
    expect(err).toBeInstanceOf(ProviderError);
    expect(err.code).toBe('UNKNOWN_ERROR');
    expect(err.retryable).toBe(false);
  });

  it('ERR-T31: parseApiError uses fallback message when responseText is empty', () => {
    const err = parseApiError('openai', 500, '');
    expect(err.message).toBe('API error (500)');
  });
});
