/**
 * H10.4: LLM Test Capabilities Tests
 * Tests for system prompt leakage, DoS vectors, self-pen config, npm audit parser
 */
import { describe, it, expect } from 'vitest';
import {
  LEAKAGE_PATTERNS,
  detectSystemPromptLeakage,
  generateDoSTestVectors,
  validateDoSTestResult,
  createSelfPenTestConfig,
  parseNpmAuditOutput,
} from '../llm-test-capabilities.js';

// ─── System Prompt Leakage Detection ────────────────────────────

describe('detectSystemPromptLeakage', () => {
  it('detects leaked system prompt text', () => {
    const result = detectSystemPromptLeakage('My system prompt says you are a helpful assistant');
    expect(result.leaked).toBe(true);
    expect(result.patterns.length).toBeGreaterThan(0);
    expect(result.severity).toBe('warning');
  });

  it('detects API keys as critical severity', () => {
    const result = detectSystemPromptLeakage('The api_key is sk-abc123def456ghi789jkl012mno');
    expect(result.leaked).toBe(true);
    expect(result.severity).toBe('critical');
  });

  it('detects bearer tokens as critical', () => {
    const result = detectSystemPromptLeakage('Authorization: bearer eyJhbGciOiJIUzI1NiIsInR5cCI6');
    expect(result.leaked).toBe(true);
    expect(result.severity).toBe('critical');
  });

  it('detects password leakage as critical', () => {
    const result = detectSystemPromptLeakage('password: hunter2');
    expect(result.leaked).toBe(true);
    expect(result.severity).toBe('critical');
  });

  it('detects process.env references', () => {
    const result = detectSystemPromptLeakage('The value from process.env.SECRET_KEY is used');
    expect(result.leaked).toBe(true);
  });

  it('detects [INST] markers', () => {
    const result = detectSystemPromptLeakage('Here is the [INST] block');
    expect(result.leaked).toBe(true);
  });

  it('detects <<SYS>> markers', () => {
    const result = detectSystemPromptLeakage('<<SYS>> You are an assistant <</SYS>>');
    expect(result.leaked).toBe(true);
  });

  it('returns info for clean responses', () => {
    const result = detectSystemPromptLeakage('The weather today is sunny and warm.');
    expect(result.leaked).toBe(false);
    expect(result.patterns).toHaveLength(0);
    expect(result.severity).toBe('info');
  });

  it('detects secret leakage', () => {
    const result = detectSystemPromptLeakage('secret_token= abcd1234');
    expect(result.leaked).toBe(true);
    expect(result.severity).toBe('critical');
  });

  it('LEAKAGE_PATTERNS are all bounded (no unbounded quantifiers)', () => {
    for (const pattern of LEAKAGE_PATTERNS) {
      const source = pattern.source;
      const unbounded = /\{(\d+),\}/.exec(source);
      if (unbounded) {
        expect.fail('Pattern has unbounded quantifier: ' + source);
      }
    }
  });
});

// ─── DoS Test Vectors ───────────────────────────────────────────

describe('generateDoSTestVectors', () => {
  it('generates valid test vectors', () => {
    const vectors = generateDoSTestVectors();
    expect(vectors.length).toBeGreaterThanOrEqual(4);

    for (const v of vectors) {
      expect(v.name).toBeTruthy();
      expect(v.prompt.length).toBeGreaterThan(0);
      expect(['reject', 'truncate', 'timeout']).toContain(v.expectedBehavior);
      expect(v.maxInputLength).toBeGreaterThan(0);
    }
  });

  it('includes oversized input vector', () => {
    const vectors = generateDoSTestVectors();
    const oversized = vectors.find(v => v.name === 'Oversized input');
    expect(oversized).toBeDefined();
    expect(oversized!.prompt.length).toBe(100_000);
    expect(oversized!.expectedBehavior).toBe('reject');
  });

  it('includes token bomb vector', () => {
    const vectors = generateDoSTestVectors();
    const tokenBomb = vectors.find(v => v.name.includes('Token bomb'));
    expect(tokenBomb).toBeDefined();
    expect(tokenBomb!.expectedBehavior).toBe('reject');
  });

  it('includes unicode expansion vector', () => {
    const vectors = generateDoSTestVectors();
    const unicode = vectors.find(v => v.name.includes('Unicode'));
    expect(unicode).toBeDefined();
  });
});

describe('validateDoSTestResult', () => {
  it('passes when rejection is expected and received', () => {
    const vector = generateDoSTestVectors()[0]; // Oversized input expects reject
    const result = validateDoSTestResult(vector, { status: 413, duration_ms: 50 });
    expect(result.passed).toBe(true);
    expect(result.reason).toContain('rejected');
  });

  it('passes when truncation is expected and response is 200', () => {
    const vector = generateDoSTestVectors().find(v => v.expectedBehavior === 'truncate')!;
    const result = validateDoSTestResult(vector, { status: 200, duration_ms: 500 });
    expect(result.passed).toBe(true);
    expect(result.reason).toContain('truncated');
  });

  it('fails when timeout exceeded', () => {
    const vector = generateDoSTestVectors()[0];
    const result = validateDoSTestResult(vector, { status: 200, duration_ms: 60_000 }, 30_000);
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('timeout');
  });

  it('fails on unexpected behavior', () => {
    const vector = generateDoSTestVectors()[0]; // expects reject
    const result = validateDoSTestResult(vector, { status: 200, duration_ms: 100 });
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('Unexpected');
  });
});

// ─── Self-Penetration Test Config ───────────────────────────────

describe('createSelfPenTestConfig', () => {
  it('rejects non-local URLs', () => {
    expect(() => createSelfPenTestConfig('https://example.com/api')).toThrow(
      'Self-penetration test must target localhost only',
    );
  });

  it('rejects malformed URLs', () => {
    expect(() => createSelfPenTestConfig('not-a-url')).toThrow('Invalid URL');
  });

  it('creates valid config for localhost', () => {
    const config = createSelfPenTestConfig('http://localhost:42001/api');
    expect(config.targetUrl).toBe('http://localhost:42001/api');
    expect(config.testMode).toBe(true);
    expect(config.bypassGuard).toBe(true);
    expect(config.logResults).toBe(true);
    expect(config.maxTestDuration).toBe(300_000);
  });

  it('accepts 127.0.0.1', () => {
    const config = createSelfPenTestConfig('http://127.0.0.1:42001');
    expect(config.targetUrl).toBe('http://127.0.0.1:42001');
    expect(config.testMode).toBe(true);
  });

  it('accepts IPv6 loopback ::1', () => {
    const config = createSelfPenTestConfig('http://[::1]:42001');
    expect(config.targetUrl).toBe('http://[::1]:42001');
    expect(config.testMode).toBe(true);
  });

  it('testMode is always true (type-enforced)', () => {
    const config = createSelfPenTestConfig('http://localhost:8080');
    expect(config.testMode).toBe(true);
  });
});

// ─── NPM Audit Parser ──────────────────────────────────────────

describe('parseNpmAuditOutput', () => {
  const sampleAudit = JSON.stringify({
    vulnerabilities: {
      lodash: {
        severity: 'high',
        fixAvailable: true,
        via: ['Prototype Pollution'],
      },
      express: {
        severity: 'critical',
        fixAvailable: false,
        via: ['Open Redirect'],
      },
      'some-pkg': {
        severity: 'moderate',
        fixAvailable: true,
        via: [{ name: 'nested-issue', severity: 'moderate' }],
      },
    },
  });

  it('parses real audit output format', () => {
    const result = parseNpmAuditOutput(sampleAudit);
    expect(result.vulnerabilities).toHaveLength(3);
    expect(result.summary.total).toBe(3);
    expect(result.summary.critical).toBe(1);
    expect(result.summary.high).toBe(1);
    expect(result.summary.moderate).toBe(1);
  });

  it('extracts string via as title', () => {
    const result = parseNpmAuditOutput(sampleAudit);
    const lodash = result.vulnerabilities.find(v => v.package === 'lodash');
    expect(lodash).toBeDefined();
    expect(lodash!.title).toBe('Prototype Pollution');
    expect(lodash!.fixAvailable).toBe(true);
  });

  it('falls back to generic title for non-string via', () => {
    const result = parseNpmAuditOutput(sampleAudit);
    const somePkg = result.vulnerabilities.find(v => v.package === 'some-pkg');
    expect(somePkg).toBeDefined();
    expect(somePkg!.title).toBe('Vulnerability in some-pkg');
  });

  it('handles malformed JSON gracefully', () => {
    const result = parseNpmAuditOutput('not valid json {{{');
    expect(result.vulnerabilities).toHaveLength(0);
    expect(result.summary.total).toBe(0);
  });

  it('handles empty audit output', () => {
    const result = parseNpmAuditOutput('{}');
    expect(result.vulnerabilities).toHaveLength(0);
    expect(result.summary.total).toBe(0);
  });

  it('handles unknown severity as low', () => {
    const audit = JSON.stringify({
      vulnerabilities: {
        'weird-pkg': { severity: 'unknown-level', fixAvailable: false, via: ['test'] },
      },
    });
    const result = parseNpmAuditOutput(audit);
    expect(result.vulnerabilities[0].severity).toBe('low');
    expect(result.summary.low).toBe(1);
  });

  it('handles empty string input', () => {
    const result = parseNpmAuditOutput('');
    expect(result.vulnerabilities).toHaveLength(0);
    expect(result.summary.total).toBe(0);
  });
});

// ─── Evidence Record Structure ──────────────────────────────────

describe('evidence record production', () => {
  it('leakage detection produces structured evidence', () => {
    const evidence = detectSystemPromptLeakage('sk-testkey12345678901234567890');
    expect(evidence).toHaveProperty('leaked');
    expect(evidence).toHaveProperty('patterns');
    expect(evidence).toHaveProperty('severity');
    expect(typeof evidence.leaked).toBe('boolean');
    expect(Array.isArray(evidence.patterns)).toBe(true);
    expect(['critical', 'warning', 'info']).toContain(evidence.severity);
  });

  it('DoS validation produces structured evidence', () => {
    const vectors = generateDoSTestVectors();
    const evidence = validateDoSTestResult(vectors[0], { status: 413, duration_ms: 50 });
    expect(evidence).toHaveProperty('passed');
    expect(evidence).toHaveProperty('reason');
    expect(typeof evidence.passed).toBe('boolean');
    expect(typeof evidence.reason).toBe('string');
  });

  it('self-pen config produces structured evidence', () => {
    const evidence = createSelfPenTestConfig('http://localhost:42001');
    expect(evidence).toHaveProperty('targetUrl');
    expect(evidence).toHaveProperty('testMode');
    expect(evidence).toHaveProperty('bypassGuard');
    expect(evidence).toHaveProperty('logResults');
    expect(evidence).toHaveProperty('maxTestDuration');
  });

  it('npm audit parser produces structured evidence', () => {
    const evidence = parseNpmAuditOutput('{}');
    expect(evidence).toHaveProperty('vulnerabilities');
    expect(evidence).toHaveProperty('summary');
    expect(evidence.summary).toHaveProperty('critical');
    expect(evidence.summary).toHaveProperty('high');
    expect(evidence.summary).toHaveProperty('moderate');
    expect(evidence.summary).toHaveProperty('low');
    expect(evidence.summary).toHaveProperty('total');
  });
});
