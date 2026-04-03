/**
 * Tests for LLM test capabilities
 */

import { describe, it, expect } from 'vitest';
import {
  detectSystemPromptLeakage,
  generateDoSTestVectors,
  validateDoSTestResult,
  createSelfPenTestConfig,
  parseNpmAuditOutput,
  LEAKAGE_PATTERNS,
} from './llm-test-capabilities.js';

describe('detectSystemPromptLeakage', () => {
  it('detects system prompt phrases', () => {
    const result = detectSystemPromptLeakage('My system prompt says you are a helpful assistant');
    expect(result.leaked).toBe(true);
    expect(result.patterns.length).toBeGreaterThan(0);
  });

  it('detects credential leakage as critical', () => {
    const result = detectSystemPromptLeakage('The api_key is sk-abc123def456789012345');
    expect(result.leaked).toBe(true);
    expect(result.severity).toBe('critical');
  });

  it('returns info severity for clean responses', () => {
    const result = detectSystemPromptLeakage('This is a perfectly clean response about weather.');
    expect(result.leaked).toBe(false);
    expect(result.severity).toBe('info');
  });

  it('detects process.env references', () => {
    const result = detectSystemPromptLeakage('The value is stored in process.env.SECRET');
    expect(result.leaked).toBe(true);
  });
});

describe('generateDoSTestVectors', () => {
  it('returns 4 test vectors', () => {
    const vectors = generateDoSTestVectors();
    expect(vectors).toHaveLength(4);
  });

  it('each vector has required fields', () => {
    for (const v of generateDoSTestVectors()) {
      expect(v.name).toBeTruthy();
      expect(v.prompt.length).toBeGreaterThan(0);
      expect(['reject', 'truncate', 'timeout']).toContain(v.expectedBehavior);
      expect(v.maxInputLength).toBeGreaterThan(0);
    }
  });
});

describe('validateDoSTestResult', () => {
  it('passes when reject behavior matches 4xx status', () => {
    const vector = generateDoSTestVectors()[0]; // 'reject' expected
    const result = validateDoSTestResult(vector, { status: 413, duration_ms: 100 });
    expect(result.passed).toBe(true);
  });

  it('fails when timeout is exceeded', () => {
    const vector = generateDoSTestVectors()[0];
    const result = validateDoSTestResult(vector, { status: 200, duration_ms: 50000 }, 30000);
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('timeout');
  });

  it('reports unexpected behavior', () => {
    const vector = generateDoSTestVectors()[0]; // expects 'reject'
    const result = validateDoSTestResult(vector, { status: 200, duration_ms: 100 });
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('Unexpected');
  });
});

describe('createSelfPenTestConfig', () => {
  it('creates config for localhost', () => {
    const config = createSelfPenTestConfig('http://localhost:3000');
    expect(config.testMode).toBe(true);
    expect(config.targetUrl).toBe('http://localhost:3000');
  });

  it('accepts 127.0.0.1', () => {
    const config = createSelfPenTestConfig('http://127.0.0.1:8080');
    expect(config.targetUrl).toBe('http://127.0.0.1:8080');
  });

  it('rejects non-localhost URLs', () => {
    expect(() => createSelfPenTestConfig('http://example.com')).toThrow('localhost only');
  });

  it('rejects invalid URLs', () => {
    expect(() => createSelfPenTestConfig('not-a-url')).toThrow('Invalid URL');
  });
});

describe('parseNpmAuditOutput', () => {
  it('parses valid audit JSON', () => {
    const auditJson = JSON.stringify({
      vulnerabilities: {
        'lodash': { severity: 'high', fixAvailable: true, via: ['Prototype Pollution'] },
        'express': { severity: 'moderate', fixAvailable: false, via: ['Open Redirect'] },
      },
    });
    const result = parseNpmAuditOutput(auditJson);
    expect(result.vulnerabilities).toHaveLength(2);
    expect(result.summary.high).toBe(1);
    expect(result.summary.moderate).toBe(1);
    expect(result.summary.total).toBe(2);
  });

  it('returns empty for invalid JSON', () => {
    const result = parseNpmAuditOutput('not json');
    expect(result.vulnerabilities).toHaveLength(0);
    expect(result.summary.total).toBe(0);
  });
});
