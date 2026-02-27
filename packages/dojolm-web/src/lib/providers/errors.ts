/**
 * File: errors.ts
 * Purpose: Provider error types for LLM API interactions
 */

// ===========================================================================
// Error Types
// ===========================================================================

/**
 * Base error class for all provider-related errors
 */
export class ProviderError extends Error {
  public readonly code: string;
  public readonly provider: string;
  public readonly retryable: boolean;
  public readonly originalError?: unknown;

  constructor(
    message: string,
    code: string,
    provider: string,
    retryable: boolean = false,
    originalError?: unknown
  ) {
    super(message);
    this.name = 'ProviderError';
    this.code = code;
    this.provider = provider;
    this.retryable = retryable;
    this.originalError = originalError;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Rate limit exceeded error
 */
export class RateLimitError extends ProviderError {
  public readonly retryAfter: number;
  public readonly limit: number;
  public readonly remaining: number;
  public readonly resetAt: string;

  constructor(
    provider: string,
    message: string,
    options?: {
      retryAfter?: number;
      limit?: number;
      remaining?: number;
      resetAt?: string;
      originalError?: unknown;
    }
  ) {
    super(
      message,
      'RATE_LIMIT_EXCEEDED',
      provider,
      true,
      options?.originalError
    );
    this.name = 'RateLimitError';
    this.retryAfter = options?.retryAfter || 60;
    this.limit = options?.limit || 0;
    this.remaining = options?.remaining || 0;
    this.resetAt = options?.resetAt || '';
  }

  getSuggestedRetryDelay(): number {
    return this.retryAfter * 1000;
  }
}

/**
 * Authentication/Authorization error
 */
export class AuthenticationError extends ProviderError {
  public readonly authType: 'apiKey' | 'oauth' | 'basic' | 'unknown';

  constructor(
    provider: string,
    message: string,
    authType: AuthenticationError['authType'] = 'unknown',
    originalError?: unknown
  ) {
    super(
      message,
      'AUTHENTICATION_FAILED',
      provider,
      false,
      originalError
    );
    this.name = 'AuthenticationError';
    this.authType = authType;
  }
}

/**
 * Network-related error
 */
export class NetworkError extends ProviderError {
  public readonly hostname?: string;
  public readonly statusCode?: number;

  constructor(
    provider: string,
    message: string,
    options?: {
      hostname?: string;
      statusCode?: number;
      originalError?: unknown;
    }
  ) {
    super(
      message,
      'NETWORK_ERROR',
      provider,
      true,
      options?.originalError
    );
    this.name = 'NetworkError';
    this.hostname = options?.hostname;
    this.statusCode = options?.statusCode;
  }
}

/**
 * Validation error
 */
export class ValidationError extends ProviderError {
  public readonly field?: string;
  public readonly constraint?: string;

  constructor(
    provider: string,
    message: string,
    options?: {
      field?: string;
      constraint?: string;
      originalError?: unknown;
    }
  ) {
    super(
      message,
      'VALIDATION_ERROR',
      provider,
      false,
      options?.originalError
    );
    this.name = 'ValidationError';
    this.field = options?.field;
    this.constraint = options?.constraint;
  }
}

/**
 * Timeout error
 */
export class TimeoutError extends ProviderError {
  public readonly timeout: number;
  public readonly operation: string;

  constructor(
    provider: string,
    message: string,
    timeout: number,
    operation: string = 'request'
  ) {
    super(
      message,
      'REQUEST_TIMEOUT',
      provider,
      true,
      { timeout, operation }
    );
    this.name = 'TimeoutError';
    this.timeout = timeout;
    this.operation = operation;
  }
}

/**
 * Provider unavailable error
 */
export class ProviderUnavailableError extends ProviderError {
  public readonly region?: string;

  constructor(
    provider: string,
    message: string,
    options?: {
      region?: string;
      originalError?: unknown;
    }
  ) {
    super(
      message,
      'PROVIDER_UNAVAILABLE',
      provider,
      true,
      options?.originalError
    );
    this.name = 'ProviderUnavailableError';
    this.region = options?.region;
  }
}

/**
 * Content filtering error
 */
export class ContentFilterError extends ProviderError {
  public readonly category: string;

  constructor(
    provider: string,
    message: string,
    category: string = 'unknown',
    originalError?: unknown
  ) {
    super(
      message,
      'CONTENT_FILTERED',
      provider,
      false,
      originalError
    );
    this.name = 'ContentFilterError';
    this.category = category;
  }
}

// ===========================================================================
// Error Utilities
// ===========================================================================

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof ProviderError) {
    return error.retryable;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('econnrefused') ||
      message.includes('etimed out')
    );
  }

  return false;
}

/**
 * Get suggested delay before retry
 */
export function getRetryDelay(error: unknown, baseDelay: number = 1000): number {
  if (error instanceof RateLimitError) {
    return error.getSuggestedRetryDelay();
  }

  if (error instanceof TimeoutError) {
    return Math.min(baseDelay * 2, 30000);
  }

  return baseDelay;
}

/**
 * Parse API error response
 */
export function parseApiError(
  provider: string,
  status: number,
  responseText: string
): ProviderError {
  const message = responseText || `API error (${status})`;

  if (status === 401 || status === 403) {
    return new AuthenticationError(provider, message);
  }

  if (status === 429) {
    const retryAfter = parseInt(responseText.match(/retry-after:\s*(\d+)/i)?.[1] || '60');
    return new RateLimitError(provider, message, {
      retryAfter,
      limit: 0,
      remaining: 0,
    });
  }

  if (status === 400) {
    return new ValidationError(provider, message);
  }

  if (status === 404 || status === 503) {
    return new ProviderUnavailableError(provider, message);
  }

  if (status === 408 || status === 504) {
    return new TimeoutError(provider, message, 30000);
  }

  if (status >= 500) {
    return new NetworkError(provider, message, { statusCode: status });
  }

  return new ProviderError(message, 'UNKNOWN_ERROR', provider, false);
}
