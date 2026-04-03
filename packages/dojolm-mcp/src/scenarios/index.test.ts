import { describe, it, expect } from 'vitest';
import {
  ALL_SCENARIOS,
  ALL_TOOLS,
  CAPABILITY_SPOOFING_SCENARIO,
  CAPABILITY_SPOOFING_TOOLS,
  TOOL_POISONING_SCENARIO,
  TOOL_POISONING_TOOLS,
  URI_TRAVERSAL_SCENARIO,
  TRAVERSAL_TEST_URIS,
  SAMPLING_LOOP_SCENARIO,
  TYPOSQUATTING_SCENARIO,
  TYPOSQUATTING_TOOLS,
  CROSS_SERVER_LEAK_SCENARIO,
  CROSS_SERVER_LEAK_TOOLS,
  NOTIFICATION_FLOOD_SCENARIO,
  DEFAULT_FLOOD_CONFIG,
  generateLogFlood,
  generateProgressFlood,
  PROMPT_INJECTION_SCENARIO,
  PROMPT_INJECTION_TOOLS,
  levenshtein,
  isConfusable,
} from './index.js';

describe('scenarios barrel export (scenarios/index.ts)', () => {
  it('exports ALL_SCENARIOS with 17 unique attack types', () => {
    const types = new Set(ALL_SCENARIOS.map((s) => s.type));
    expect(types.size).toBe(17);
  });

  it('ALL_SCENARIOS includes all P4 scenarios', () => {
    expect(ALL_SCENARIOS).toContain(CAPABILITY_SPOOFING_SCENARIO);
    expect(ALL_SCENARIOS).toContain(TOOL_POISONING_SCENARIO);
    expect(ALL_SCENARIOS).toContain(URI_TRAVERSAL_SCENARIO);
    expect(ALL_SCENARIOS).toContain(SAMPLING_LOOP_SCENARIO);
    expect(ALL_SCENARIOS).toContain(TYPOSQUATTING_SCENARIO);
    expect(ALL_SCENARIOS).toContain(CROSS_SERVER_LEAK_SCENARIO);
    expect(ALL_SCENARIOS).toContain(NOTIFICATION_FLOOD_SCENARIO);
    expect(ALL_SCENARIOS).toContain(PROMPT_INJECTION_SCENARIO);
  });

  it('ALL_TOOLS has 15+ tools from P4 and P5', () => {
    expect(ALL_TOOLS.length).toBeGreaterThanOrEqual(15);
  });

  it('ALL_TOOLS includes tools from all P4 categories', () => {
    const categories = new Set(ALL_TOOLS.map((t) => t.category));
    expect(categories.has('capability-spoofing')).toBe(true);
    expect(categories.has('tool-poisoning')).toBe(true);
    expect(categories.has('name-typosquatting')).toBe(true);
    expect(categories.has('cross-server-leak')).toBe(true);
    expect(categories.has('prompt-injection')).toBe(true);
  });

  it('re-exports utility functions', () => {
    expect(typeof levenshtein).toBe('function');
    expect(typeof isConfusable).toBe('function');
    expect(typeof generateLogFlood).toBe('function');
    expect(typeof generateProgressFlood).toBe('function');
  });

  it('re-exports constants', () => {
    expect(TRAVERSAL_TEST_URIS.length).toBeGreaterThan(0);
    expect(DEFAULT_FLOOD_CONFIG.rate).toBe(100);
  });
});
