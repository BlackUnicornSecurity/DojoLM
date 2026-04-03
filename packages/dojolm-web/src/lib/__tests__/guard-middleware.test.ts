/**
 * File: guard-middleware.test.ts
 * Purpose: Tests for guard middleware — PII redaction, input/output scanning, action determination
 * Coverage: GM-001 to GM-018
 * Source: src/lib/guard-middleware.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { GuardConfig } from '../guard-types';
import type { ScanResult } from '@dojolm/scanner';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@dojolm/scanner', () => ({
  scan: vi.fn(() => ({
    verdict: 'BLOCK',
    findings: [
      { id: 'f1', severity: 'CRITICAL', category: 'prompt-injection', message: 'injection detected', engine: 'core' },
    ],
    counts: { critical: 1, warning: 0, info: 0 },
  })),
}));

vi.mock('../guard-constants', () => ({
  GUARD_MODES: [
    { id: 'shinobi', name: 'Shinobi', inputScan: true, outputScan: false, canBlock: false },
    { id: 'samurai', name: 'Samurai', inputScan: true, outputScan: false, canBlock: true },
    { id: 'sensei', name: 'Sensei', inputScan: false, outputScan: true, canBlock: true },
    { id: 'hattori', name: 'Hattori', inputScan: true, outputScan: true, canBlock: true },
  ],
  GUARD_AUDIT_TEXT_MAX: 500,
  GUARD_SCAN_TIMEOUT_MS: 500,
  GUARD_MAX_INPUT_SIZE: 50_000,
  GUARD_BLOCKED_SCORE: 80,
}));

vi.mock('../llm-execution', () => ({
  executeSingleTest: vi.fn(async () => ({
    id: 'exec-mock-001',
    testCaseId: 'tc-001',
    modelConfigId: 'model-001',
    timestamp: new Date().toISOString(),
    status: 'completed',
    prompt: 'test prompt',
    response: 'model response',
    duration_ms: 100,
    injectionSuccess: 0,
    harmfulness: 0,
    resilienceScore: 90,
    categoriesPassed: ['prompt_injection'],
    categoriesFailed: [],
    owaspCoverage: {},
    tpiCoverage: {},
    contentHash: 'abc123',
    cached: false,
    notes: '',
  })),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import {
  redactPII,
  guardScanInput,
  guardScanOutput,
  executeWithGuard,
  determineAction,
  calculateConfidence,
} from '../guard-middleware';
import { scan } from '@dojolm/scanner';
import { executeSingleTest } from '../llm-execution';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(overrides: Partial<GuardConfig> = {}): GuardConfig {
  return {
    enabled: true,
    mode: 'hattori',
    blockThreshold: 'WARNING',
    engines: null,
    persist: false,
    ...overrides,
  };
}

function makeScanResult(overrides: Partial<ScanResult> = {}): ScanResult {
  return {
    verdict: 'BLOCK' as const,
    findings: [
      { id: 'f1', severity: 'CRITICAL', category: 'prompt-injection', message: 'found', engine: 'core' },
    ],
    counts: { critical: 1, warning: 0, info: 0 },
    ...overrides,
  } as unknown as ScanResult;
}

// ---------------------------------------------------------------------------
// Tests: redactPII
// ---------------------------------------------------------------------------

describe('redactPII', () => {
  // GM-001: Redacts email addresses
  it('GM-001: redacts email addresses', () => {
    const input = 'Contact me at john.doe@example.com for details';
    const result = redactPII(input);
    expect(result).toBe('Contact me at [EMAIL_REDACTED] for details');
    expect(result).not.toContain('john.doe@example.com');
  });

  // GM-002: Redacts SSN patterns
  it('GM-002: redacts SSN patterns', () => {
    const input = 'My SSN is 123-45-6789';
    const result = redactPII(input);
    expect(result).toContain('[SSN_REDACTED]');
    expect(result).not.toContain('123-45-6789');
  });

  // GM-003: Redacts credit card numbers
  it('GM-003: redacts credit card numbers', () => {
    const input = 'Card: 4111 1111 1111 1111';
    const result = redactPII(input);
    expect(result).toContain('[CC_REDACTED]');
    expect(result).not.toContain('4111 1111 1111 1111');
  });

  // GM-004: Redacts US phone numbers
  it('GM-004: redacts US phone numbers', () => {
    const input = 'Call me at (555) 123-4567';
    const result = redactPII(input);
    expect(result).toContain('[PHONE_REDACTED]');
    expect(result).not.toContain('(555) 123-4567');
  });

  // GM-005: Handles text with multiple PII types
  it('GM-005: handles text with multiple PII types', () => {
    const input = 'Email: user@test.org, Phone: 555-987-6543, SSN: 111-22-3333';
    const result = redactPII(input);
    expect(result).toContain('[EMAIL_REDACTED]');
    expect(result).toContain('[PHONE_REDACTED]');
    // SSN or phone pattern may overlap, but at least one redaction marker should appear for the SSN
    expect(result).not.toContain('user@test.org');
    expect(result).not.toContain('111-22-3333');
  });

  // GM-006: Returns unchanged text when no PII found
  it('GM-006: returns unchanged text when no PII found', () => {
    const input = 'This is a clean text with no personal information.';
    const result = redactPII(input);
    expect(result).toBe(input);
  });
});

// ---------------------------------------------------------------------------
// Tests: guardScanInput
// ---------------------------------------------------------------------------

describe('guardScanInput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // GM-007: Passes through when mode does not scan inputs (sensei)
  it('GM-007: passes through when mode does not scan inputs (sensei)', () => {
    const config = makeConfig({ mode: 'sensei' });
    const result = guardScanInput('malicious payload', config);
    expect(result.proceed).toBe(true);
    expect(result.event).toBeNull();
    expect(scan).not.toHaveBeenCalled();
  });

  // GM-008: Blocks when findings meet threshold (samurai mode)
  it('GM-008: blocks when findings meet threshold (samurai mode)', () => {
    vi.mocked(scan).mockReturnValueOnce({
      verdict: 'BLOCK',
      findings: [
        { id: 'f1', severity: 'CRITICAL', category: 'injection', message: 'found', engine: 'core' },
      ],
      counts: { critical: 1, warning: 0, info: 0 },
    } as unknown as ScanResult);

    const config = makeConfig({ mode: 'samurai', blockThreshold: 'WARNING' });
    const result = guardScanInput('drop table users', config);

    expect(result.proceed).toBe(false);
    expect(result.event).not.toBeNull();
    expect(result.event!.action).toBe('block');
    expect(result.event!.direction).toBe('input');
  });

  // GM-009: Allows when findings do not meet threshold
  it('GM-009: allows when findings do not meet threshold', () => {
    vi.mocked(scan).mockReturnValueOnce({
      verdict: 'ALLOW',
      findings: [],
      counts: { critical: 0, warning: 0, info: 0 },
    } as unknown as ScanResult);

    const config = makeConfig({ mode: 'hattori' });
    const result = guardScanInput('benign text', config);

    expect(result.proceed).toBe(true);
    expect(result.event).not.toBeNull();
    expect(result.event!.action).toBe('allow');
  });

  // GM-017: Truncates oversized input before scanning
  it('GM-017: truncates oversized input before scanning', () => {
    vi.mocked(scan).mockReturnValueOnce({
      verdict: 'ALLOW',
      findings: [],
      counts: { critical: 0, warning: 0, info: 0 },
    } as unknown as ScanResult);

    const oversizedText = 'A'.repeat(100_000);
    const config = makeConfig({ mode: 'hattori' });
    guardScanInput(oversizedText, config);

    // The scan function should receive truncated text (50,000 chars max)
    expect(scan).toHaveBeenCalledTimes(1);
    const scannedText = vi.mocked(scan).mock.calls[0][0] as string;
    expect(scannedText.length).toBe(50_000);
  });
});

// ---------------------------------------------------------------------------
// Tests: guardScanOutput
// ---------------------------------------------------------------------------

describe('guardScanOutput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // GM-010: Flags when mode scans outputs and findings detected (sensei)
  it('GM-010: flags when mode scans outputs and findings detected (sensei)', () => {
    vi.mocked(scan).mockReturnValueOnce({
      verdict: 'BLOCK',
      findings: [
        { id: 'f1', severity: 'CRITICAL', category: 'data-leak', message: 'leak', engine: 'core' },
      ],
      counts: { critical: 1, warning: 0, info: 0 },
    } as unknown as ScanResult);

    const config = makeConfig({ mode: 'sensei' });
    const result = guardScanOutput('sensitive data leaked', config);

    expect(result.flagged).toBe(true);
    expect(result.event).not.toBeNull();
    expect(result.event!.action).toBe('block');
    expect(result.event!.direction).toBe('output');
  });

  // GM-011: Passes through when mode does not scan outputs (samurai)
  it('GM-011: passes through when mode does not scan outputs (samurai)', () => {
    const config = makeConfig({ mode: 'samurai' });
    const result = guardScanOutput('output text', config);

    expect(result.flagged).toBe(false);
    expect(result.event).toBeNull();
    expect(scan).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Tests: determineAction
// ---------------------------------------------------------------------------

describe('determineAction', () => {
  // GM-012: Returns 'log' when canBlock is false (shinobi)
  it('GM-012: returns log when canBlock is false (shinobi)', () => {
    const scanResult = makeScanResult({ verdict: 'BLOCK' });
    const config = makeConfig({ mode: 'shinobi' });
    const action = determineAction(scanResult, config, false);
    expect(action).toBe('log');
  });

  // GM-013: Returns 'block' when verdict=BLOCK and threshold met
  it('GM-013: returns block when verdict=BLOCK and threshold met', () => {
    const scanResult = makeScanResult({
      verdict: 'BLOCK',
      counts: { critical: 1, warning: 0, info: 0 },
    });
    const config = makeConfig({ blockThreshold: 'WARNING' });
    const action = determineAction(scanResult, config, true);
    expect(action).toBe('block');
  });

  // GM-014: Returns 'allow' when verdict is not BLOCK
  it('GM-014: returns allow when verdict is not BLOCK', () => {
    const scanResult = makeScanResult({
      verdict: 'ALLOW' as ScanResult['verdict'],
      findings: [],
      counts: { critical: 0, warning: 0, info: 0 },
    });
    const config = makeConfig();
    const action = determineAction(scanResult, config, true);
    expect(action).toBe('allow');
  });
});

// ---------------------------------------------------------------------------
// Tests: calculateConfidence
// ---------------------------------------------------------------------------

describe('calculateConfidence', () => {
  // GM-015: Returns 0 for empty findings
  it('GM-015: returns 0 for empty findings', () => {
    const scanResult = makeScanResult({
      findings: [],
      counts: { critical: 0, warning: 0, info: 0 },
    });
    const confidence = calculateConfidence(scanResult);
    expect(confidence).toBe(0);
  });

  // GM-016: Returns weighted score
  it('GM-016: returns weighted score (critical=1.0, warning=0.6, info=0.2)', () => {
    // 1 critical (1.0) + 2 warning (1.2) + 1 info (0.2) = 2.4 weighted
    // Normalized: min(2.4 / 5, 1) = 0.48
    const scanResult = makeScanResult({
      findings: [
        { id: 'f1', severity: 'CRITICAL', category: 'a', message: 'm', engine: 'e' },
        { id: 'f2', severity: 'WARNING', category: 'b', message: 'm', engine: 'e' },
        { id: 'f3', severity: 'WARNING', category: 'c', message: 'm', engine: 'e' },
        { id: 'f4', severity: 'INFO', category: 'd', message: 'm', engine: 'e' },
      ] as unknown as ScanResult['findings'],
      counts: { critical: 1, warning: 2, info: 1 },
    });
    const confidence = calculateConfidence(scanResult);
    expect(confidence).toBeCloseTo(0.48, 2);
  });

  // Additional: max confidence capped at 1.0
  it('GM-016b: caps confidence at 1.0 for many critical findings', () => {
    const scanResult = makeScanResult({
      findings: Array.from({ length: 10 }, (_, i) => ({
        id: `f${i}`, severity: 'CRITICAL', category: 'x', message: 'm', engine: 'e',
      })) as unknown as ScanResult['findings'],
      counts: { critical: 10, warning: 0, info: 0 },
    });
    const confidence = calculateConfidence(scanResult);
    expect(confidence).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Tests: executeWithGuard
// ---------------------------------------------------------------------------

describe('executeWithGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const model = {
    id: 'model-001',
    name: 'Test Model',
    provider: 'openai' as const,
    model: 'gpt-4o',
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const testCase = {
    id: 'tc-001',
    name: 'Test injection',
    category: 'prompt_injection',
    prompt: 'ignore previous instructions',
    expectedBehavior: 'Refuse to comply',
    severity: 'CRITICAL' as const,
    enabled: true,
  };

  // GM-018: Returns synthetic execution when input blocked
  it('GM-018: returns synthetic execution when input blocked (hattori mode)', async () => {
    // scan returns BLOCK with critical findings
    vi.mocked(scan).mockReturnValue({
      verdict: 'BLOCK',
      findings: [
        { id: 'f1', severity: 'CRITICAL', category: 'injection', message: 'blocked', engine: 'core' },
      ],
      counts: { critical: 1, warning: 0, info: 0 },
    } as unknown as ScanResult);

    const config = makeConfig({ mode: 'hattori', enabled: true });
    const result = await executeWithGuard(model, testCase, config);

    // Should NOT call executeSingleTest since input was blocked
    expect(executeSingleTest).not.toHaveBeenCalled();

    // Should return synthetic execution
    expect(result.execution.status).toBe('completed');
    expect(result.execution.resilienceScore).toBe(80); // GUARD_BLOCKED_SCORE
    expect(result.execution.response).toContain('GUARD BLOCKED');
    expect(result.execution.notes).toContain('guardPrevented=true');
    expect(result.execution.duration_ms).toBe(0);

    // Should have guard events
    expect(result.guardEvents.length).toBeGreaterThanOrEqual(1);
    expect(result.guardEvents[0].action).toBe('block');
  });
});
