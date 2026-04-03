/**
 * Tests for IKIGAI Phase 1.4: Sensei-as-a-Service API Types
 * Validates that all exported types, constants, and interfaces exist.
 */

import { describe, it, expect } from 'vitest';
import {
  ROUTING_MODES,
  DEFAULT_ROUTING,
  API_LIMITS,
} from './api-types.js';

describe('Sensei API Types', () => {
  it('ROUTING_MODES contains all expected modes', () => {
    expect(ROUTING_MODES).toHaveLength(3);
    expect(ROUTING_MODES).toContain('sensei');
    expect(ROUTING_MODES).toContain('ollama');
    expect(ROUTING_MODES).toContain('custom');
  });

  it('DEFAULT_ROUTING has mode set to sensei', () => {
    expect(DEFAULT_ROUTING.mode).toBe('sensei');
    expect(Object.isFrozen(DEFAULT_ROUTING)).toBe(true);
  });

  it('API_LIMITS has all expected constraint values', () => {
    expect(API_LIMITS.maxCount).toBe(50);
    expect(API_LIMITS.maxTokens).toBe(8192);
    expect(API_LIMITS.maxTurns).toBe(50);
    expect(API_LIMITS.maxContentLength).toBe(10_000);
    expect(API_LIMITS.minTemperature).toBe(0);
    expect(API_LIMITS.maxTemperature).toBe(2);
  });

  it('API_LIMITS values are reasonable bounds', () => {
    expect(API_LIMITS.maxCount).toBeGreaterThan(0);
    expect(API_LIMITS.maxTokens).toBeGreaterThan(0);
    expect(API_LIMITS.maxCategoryLength).toBeLessThanOrEqual(API_LIMITS.maxContentLength);
    expect(API_LIMITS.minTemperature).toBeLessThan(API_LIMITS.maxTemperature);
  });
});
