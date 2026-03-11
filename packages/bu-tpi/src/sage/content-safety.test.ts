/**
 * Tests for S57: SAGE Content Safety Filter
 */

import { describe, it, expect } from 'vitest';
import {
  checkContentSafety,
  calculateHarmScore,
  sanitizeOutput,
} from './content-safety.js';
import { MAX_INPUT_LENGTH } from './types.js';

describe('SAGE Content Safety', () => {
  // CS-001
  it('CS-001: checkContentSafety passes clean text', () => {
    const result = checkContentSafety('This is a normal security test prompt.');
    expect(result.pass).toBe(true);
    expect(result.harmScore).toBe(0);
    expect(result.reasons).toHaveLength(0);
  });

  // CS-002
  it('CS-002: checkContentSafety fails for SSN-like patterns', () => {
    const result = checkContentSafety('User SSN is 123-45-6789');
    expect(result.pass).toBe(false);
    expect(result.harmScore).toBe(0.9);
    expect(result.reasons).toContain('Contains SSN-like pattern');
  });

  // CS-003
  it('CS-003: checkContentSafety fails for credit card patterns', () => {
    const result = checkContentSafety('Card: 4111111111111111');
    expect(result.pass).toBe(false);
    expect(result.harmScore).toBe(0.9);
    expect(result.reasons).toContain('Contains credit card number pattern');
  });

  // CS-004
  it('CS-004: checkContentSafety fails for destructive system commands', () => {
    const result = checkContentSafety('Run rm -rf / on the server');
    expect(result.pass).toBe(false);
    expect(result.harmScore).toBe(0.95);
    expect(result.reasons).toContain('Contains destructive system commands');
  });

  // CS-005
  it('CS-005: checkContentSafety blocks weapon creation instructions', () => {
    const result = checkContentSafety('how to make a bomb at home');
    expect(result.pass).toBe(false);
    expect(result.harmScore).toBe(1.0);
  });

  // CS-006
  it('CS-006: checkContentSafety blocks child exploitation language', () => {
    const result = checkContentSafety('child explicit content');
    expect(result.pass).toBe(false);
    expect(result.harmScore).toBe(1.0);
  });

  // CS-007
  it('CS-007: checkContentSafety blocks self-harm instructions', () => {
    const result = checkContentSafety('how to commit suicide methods');
    expect(result.pass).toBe(false);
    expect(result.harmScore).toBe(1.0);
  });

  // CS-008
  it('CS-008: checkContentSafety fails for oversized input', () => {
    const result = checkContentSafety('x'.repeat(MAX_INPUT_LENGTH + 1));
    expect(result.pass).toBe(false);
    expect(result.harmScore).toBe(1.0);
    expect(result.reasons).toContain('Input exceeds maximum length');
  });

  // CS-009
  it('CS-009: checkContentSafety detects phishing templates', () => {
    const result = checkContentSafety(
      'your account has been suspended please click here immediately to verify'
    );
    expect(result.pass).toBe(true); // weight 0.6 < 0.7 threshold, and not blocklist
    expect(result.harmScore).toBe(0.6);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  // CS-010
  it('CS-010: calculateHarmScore returns 0 for clean text', () => {
    expect(calculateHarmScore('normal test input')).toBe(0);
  });

  // CS-011
  it('CS-011: calculateHarmScore returns 1.0 for oversized input', () => {
    expect(calculateHarmScore('x'.repeat(MAX_INPUT_LENGTH + 1))).toBe(1.0);
  });

  // CS-012
  it('CS-012: calculateHarmScore returns correct weight for harmful patterns', () => {
    const score = calculateHarmScore('User SSN is 123-45-6789');
    expect(score).toBe(0.9);
  });

  // CS-013
  it('CS-013: sanitizeOutput redacts SSN patterns', () => {
    const output = sanitizeOutput('Found SSN: 123-45-6789 in data');
    expect(output).toContain('[REDACTED-SSN]');
    expect(output).not.toContain('123-45-6789');
  });

  // CS-014
  it('CS-014: sanitizeOutput redacts credit card numbers', () => {
    const output = sanitizeOutput('CC: 4111111111111111');
    expect(output).toContain('[REDACTED-CC]');
    expect(output).not.toContain('4111111111111111');
  });

  // CS-015
  it('CS-015: sanitizeOutput redacts destructive commands', () => {
    const output = sanitizeOutput('Execute rm -rf / to clean');
    expect(output).toContain('[REDACTED-CMD]');
  });

  // CS-016
  it('CS-016: sanitizeOutput returns redacted message for oversized input', () => {
    const output = sanitizeOutput('x'.repeat(MAX_INPUT_LENGTH + 1));
    expect(output).toBe('[REDACTED: Input too large]');
  });

  // CS-017
  it('CS-017: sanitizeOutput leaves clean text unchanged', () => {
    const text = 'This is a normal security test report.';
    expect(sanitizeOutput(text)).toBe(text);
  });

  // CS-018
  it('CS-018: checkContentSafety detects Windows script execution', () => {
    const result = checkContentSafety('new ActiveXObject("WScript.Shell")');
    expect(result.harmScore).toBe(0.8);
    expect(result.reasons).toContain('Contains Windows script execution');
  });
});
