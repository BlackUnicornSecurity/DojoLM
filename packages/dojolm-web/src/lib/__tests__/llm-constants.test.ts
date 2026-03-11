/**
 * File: __tests__/llm-constants.test.ts
 * Purpose: Tests for LLM constants and helper functions
 * Source: src/lib/llm-constants.ts
 *
 * Index:
 * - Constants validation (line 22)
 * - isOpenAICompatible (line 52)
 * - requiresNativeSDK (line 72)
 * - getProviderDisplayName (line 88)
 * - getRateLimit (line 102)
 * - validateApiKey (line 118)
 * - estimateCost (line 155)
 * - getConcurrentLimit (line 175)
 * - getMaxBatchSize (line 195)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  PROVIDER_BASE_URLS,
  DEFAULT_MODELS,
  PROVIDER_INFO,
  OPENAI_COMPATIBLE_PROVIDERS,
  NATIVE_SDK_PROVIDERS,
  DEFAULT_RATE_LIMITS,
  TOKEN_COSTS,
  isOpenAICompatible,
  requiresNativeSDK,
  getProviderDisplayName,
  getRateLimit,
  validateApiKey,
  estimateCost,
  getConcurrentLimit,
  getMaxBatchSize,
  DEFAULT_CONCURRENT_LIMIT,
  TEMPERATURE_RANGE,
  TOP_P_RANGE,
} from '../llm-constants';

describe('Constants validation', () => {
  it('CON-001: PROVIDER_BASE_URLS has entries for known providers', () => {
    expect(PROVIDER_BASE_URLS.openai).toBeDefined();
    expect(PROVIDER_BASE_URLS.anthropic).toBeDefined();
    expect(PROVIDER_BASE_URLS.ollama).toBeDefined();
  });

  it('CON-002: DEFAULT_MODELS has entries for known providers', () => {
    expect(DEFAULT_MODELS.openai?.length).toBeGreaterThan(0);
    expect(DEFAULT_MODELS.anthropic?.length).toBeGreaterThan(0);
  });

  it('CON-003: PROVIDER_INFO has name and description for each provider', () => {
    for (const [key, info] of Object.entries(PROVIDER_INFO)) {
      expect(info?.name).toBeTruthy();
      expect(info?.description).toBeTruthy();
    }
  });

  it('CON-004: TEMPERATURE_RANGE is 0-2', () => {
    expect(TEMPERATURE_RANGE.min).toBe(0);
    expect(TEMPERATURE_RANGE.max).toBe(2);
  });

  it('CON-005: TOP_P_RANGE is 0-1', () => {
    expect(TOP_P_RANGE.min).toBe(0);
    expect(TOP_P_RANGE.max).toBe(1);
  });
});

describe('isOpenAICompatible', () => {
  it('CON-006: openai is compatible', () => {
    expect(isOpenAICompatible('openai')).toBe(true);
  });

  it('CON-007: anthropic is NOT compatible', () => {
    expect(isOpenAICompatible('anthropic')).toBe(false);
  });

  it('CON-008: ollama is compatible', () => {
    expect(isOpenAICompatible('ollama')).toBe(true);
  });

  it('CON-009: google is NOT compatible', () => {
    expect(isOpenAICompatible('google')).toBe(false);
  });
});

describe('requiresNativeSDK', () => {
  it('CON-010: anthropic requires native SDK', () => {
    expect(requiresNativeSDK('anthropic')).toBe(true);
  });

  it('CON-011: openai does not require native SDK', () => {
    expect(requiresNativeSDK('openai')).toBe(false);
  });

  it('CON-012: google requires native SDK', () => {
    expect(requiresNativeSDK('google')).toBe(true);
  });
});

describe('getProviderDisplayName', () => {
  it('CON-013: returns display name for known providers', () => {
    expect(getProviderDisplayName('openai')).toBe('OpenAI');
    expect(getProviderDisplayName('anthropic')).toBe('Anthropic');
  });

  it('CON-014: returns provider ID for unknown providers', () => {
    expect(getProviderDisplayName('unknown_provider' as any)).toBe('unknown_provider');
  });
});

describe('getRateLimit', () => {
  it('CON-015: returns rate limits for known providers', () => {
    const limit = getRateLimit('openai');
    expect(limit.rpm).toBeGreaterThan(0);
    expect(limit.tpm).toBeGreaterThan(0);
  });

  it('CON-016: returns default for unknown providers', () => {
    const limit = getRateLimit('unknown' as any);
    expect(limit.rpm).toBe(100);
    expect(limit.tpm).toBe(0);
  });

  it('CON-017: local providers have high limits', () => {
    const limit = getRateLimit('ollama');
    expect(limit.rpm).toBeGreaterThan(1000);
  });
});

describe('validateApiKey', () => {
  it('CON-018: valid OpenAI key passes', () => {
    expect(validateApiKey('openai', 'sk-' + 'a'.repeat(48))).toBe(true);
  });

  it('CON-019: invalid OpenAI key fails', () => {
    expect(validateApiKey('openai', 'bad-key')).toBe(false);
  });

  it('CON-020: empty key fails', () => {
    expect(validateApiKey('openai', '')).toBe(false);
  });

  it('CON-021: key exceeding max length fails', () => {
    expect(validateApiKey('openai', 'sk-' + 'a'.repeat(300))).toBe(false);
  });

  it('CON-022: ollama accepts any key (local provider)', () => {
    expect(validateApiKey('ollama', 'anything')).toBe(true);
  });

  it('CON-023: valid Anthropic key passes', () => {
    expect(validateApiKey('anthropic', 'sk-ant-' + 'a'.repeat(40))).toBe(true);
  });

  it('CON-024: custom provider accepts any key', () => {
    expect(validateApiKey('custom', 'any-key-format')).toBe(true);
  });
});

describe('estimateCost', () => {
  it('CON-025: OpenAI cost calculated correctly', () => {
    const cost = estimateCost('openai', 1_000_000, 1_000_000);
    expect(cost).toBeGreaterThan(0);
    // input: 2.50, output: 10.00 => 12.50
    expect(cost).toBeCloseTo(12.50, 1);
  });

  it('CON-026: local providers cost 0', () => {
    expect(estimateCost('ollama', 1_000_000, 1_000_000)).toBe(0);
  });

  it('CON-027: zero tokens returns 0', () => {
    expect(estimateCost('openai', 0, 0)).toBe(0);
  });
});

describe('getConcurrentLimit', () => {
  // In jsdom env, window is defined, so these functions return defaults
  it('CON-028: returns default concurrent limit', () => {
    expect(getConcurrentLimit()).toBe(DEFAULT_CONCURRENT_LIMIT);
  });

  it('CON-029: default is 5', () => {
    expect(DEFAULT_CONCURRENT_LIMIT).toBe(5);
  });

  it('CON-030: returns a positive integer', () => {
    const limit = getConcurrentLimit();
    expect(limit).toBeGreaterThan(0);
    expect(Number.isInteger(limit)).toBe(true);
  });
});

describe('getMaxBatchSize', () => {
  it('CON-031: returns default batch size', () => {
    expect(getMaxBatchSize()).toBe(10000);
  });

  it('CON-032: returns a positive integer', () => {
    const size = getMaxBatchSize();
    expect(size).toBeGreaterThan(0);
    expect(Number.isInteger(size)).toBe(true);
  });
});
