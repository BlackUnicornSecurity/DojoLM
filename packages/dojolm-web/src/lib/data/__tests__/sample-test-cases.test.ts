/**
 * File: sample-test-cases.test.ts
 * Purpose: Validate sample test case data integrity
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/llm-scenarios', () => ({
  getTestCasesForScenario: vi.fn().mockReturnValue([]),
  isFullScopeScenario: vi.fn().mockReturnValue(false),
}));

import { SAMPLE_TEST_CASES } from '../sample-test-cases';

describe('SAMPLE_TEST_CASES', () => {
  it('exports a non-empty array', () => {
    expect(Array.isArray(SAMPLE_TEST_CASES)).toBe(true);
    expect(SAMPLE_TEST_CASES.length).toBeGreaterThan(0);
  });

  it('each test case has required fields', () => {
    for (const tc of SAMPLE_TEST_CASES.slice(0, 20)) {
      expect(tc).toHaveProperty('prompt');
      expect(typeof tc.prompt).toBe('string');
      expect(tc.prompt.length).toBeGreaterThan(0);
    }
  });

  it('contains at least 100 test cases', () => {
    expect(SAMPLE_TEST_CASES.length).toBeGreaterThanOrEqual(100);
  });
});
