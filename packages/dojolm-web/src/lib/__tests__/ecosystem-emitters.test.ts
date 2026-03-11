/**
 * File: ecosystem-emitters.test.ts
 * Tests for: src/lib/ecosystem-emitters.ts
 * Coverage: emitScannerFindings, emitExecutionFinding, emitGuardFinding, emitAnalyzeFinding
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

// Mock the dynamic import of ecosystem-storage
const mockSaveFinding = vi.fn().mockResolvedValue(undefined);
vi.mock('../storage/ecosystem-storage', () => ({
  saveFinding: mockSaveFinding,
}));

// Stable UUID for assertions
vi.mock('node:crypto', () => ({
  default: { randomUUID: () => '00000000-0000-0000-0000-000000000000' },
  randomUUID: () => '00000000-0000-0000-0000-000000000000',
}));

import {
  emitScannerFindings,
  emitExecutionFinding,
  emitGuardFinding,
  emitAnalyzeFinding,
} from '../ecosystem-emitters';

describe('ecosystem-emitters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper to flush fire-and-forget promises
  const flush = () => new Promise(r => setTimeout(r, 200));

  // =========================================================================
  // emitScannerFindings
  // =========================================================================
  describe('emitScannerFindings', () => {
    it('EE-001: emits findings for CRITICAL scanner results', async () => {
      emitScannerFindings(
        [
          {
            category: 'sql-injection',
            severity: 'CRITICAL',
            description: 'SQL injection detected',
            match: 'DROP TABLE users',
            engine: 'regex',
            pattern_name: 'sqli-drop',
          },
        ],
        'test input',
      );
      await flush();

      expect(mockSaveFinding).toHaveBeenCalledTimes(1);
      const saved = mockSaveFinding.mock.calls[0][0];
      expect(saved).toMatchObject({
        sourceModule: 'scanner',
        findingType: 'vulnerability',
        severity: 'CRITICAL',
        title: 'Scanner: sql-injection',
        metadata: {
          engine: 'regex',
          patternName: 'sqli-drop',
          category: 'sql-injection',
        },
        evidence: 'DROP TABLE users',
      });
    });

    it('EE-002: emits findings for WARNING scanner results (mapped via toEcosystemSeverity)', async () => {
      emitScannerFindings(
        [
          {
            category: 'xss',
            severity: 'WARNING',
            description: 'Possible XSS',
            match: '<script>alert(1)</script>',
            engine: 'heuristic',
          },
        ],
        'test',
      );
      await flush();

      expect(mockSaveFinding).toHaveBeenCalledTimes(1);
      const saved = mockSaveFinding.mock.calls[0][0];
      // toEcosystemSeverity maps 'warning' to INFO (only 'high'/'medium' map to WARNING)
      expect(saved.severity).toBe('INFO');
      expect(saved.sourceModule).toBe('scanner');
      expect(saved.title).toContain('xss');
    });

    it('EE-003: skips INFO-level scanner findings', async () => {
      emitScannerFindings(
        [
          {
            category: 'info-leak',
            severity: 'INFO',
            description: 'Information disclosure',
            match: 'version header',
            engine: 'regex',
          },
        ],
        'test',
      );
      await flush();

      expect(mockSaveFinding).not.toHaveBeenCalled();
    });

    it('EE-004: filters out non-significant findings from mixed severity list', async () => {
      emitScannerFindings(
        [
          { category: 'a', severity: 'CRITICAL', description: 'd1', match: 'm1', engine: 'e1' },
          { category: 'b', severity: 'INFO', description: 'd2', match: 'm2', engine: 'e2' },
          { category: 'c', severity: 'LOW', description: 'd3', match: 'm3', engine: 'e3' },
        ],
        'text',
      );
      await flush();

      // Only CRITICAL and WARNING pass the filter; INFO and LOW are excluded
      // Only 1 finding (CRITICAL) should be emitted
      expect(mockSaveFinding).toHaveBeenCalledTimes(1);
      const saved = mockSaveFinding.mock.calls[0][0];
      expect(saved.title).toContain('a');
      expect(saved.severity).toBe('CRITICAL');
    });

    it('EE-005: truncates evidence to 2000 characters', async () => {
      const longMatch = 'X'.repeat(5000);
      emitScannerFindings(
        [
          {
            category: 'overflow',
            severity: 'CRITICAL',
            description: 'Test',
            match: longMatch,
            engine: 'regex',
          },
        ],
        'text',
      );
      await flush();

      const saved = mockSaveFinding.mock.calls[0][0];
      expect(saved.evidence.length).toBe(2000);
    });
  });

  // =========================================================================
  // emitExecutionFinding
  // =========================================================================
  describe('emitExecutionFinding', () => {
    it('EE-006: emits CRITICAL finding when injection success >= 0.8', async () => {
      emitExecutionFinding({
        modelId: 'gpt-4',
        testCaseId: 'tc-1',
        injectionSuccess: 0.95,
        resilienceScore: 0.1,
        category: 'jailbreak',
        prompt: 'bypass system prompt',
      });
      await flush();

      expect(mockSaveFinding).toHaveBeenCalledTimes(1);
      const saved = mockSaveFinding.mock.calls[0][0];
      expect(saved).toMatchObject({
        sourceModule: 'jutsu',
        findingType: 'attack_variant',
        severity: 'CRITICAL',
        metadata: {
          modelId: 'gpt-4',
          testCaseId: 'tc-1',
          injectionSuccess: 0.95,
          resilienceScore: 0.1,
        },
      });
      expect(saved.title).toContain('jailbreak');
      expect(saved.title).toContain('gpt-4');
      expect(saved.description).toContain('95%');
    });

    it('EE-007: emits WARNING finding when injection success is 0.5-0.79', async () => {
      emitExecutionFinding({
        modelId: 'claude-3',
        testCaseId: 'tc-2',
        injectionSuccess: 0.6,
      });
      await flush();

      expect(mockSaveFinding).toHaveBeenCalledTimes(1);
      const saved = mockSaveFinding.mock.calls[0][0];
      expect(saved.severity).toBe('WARNING');
      expect(saved.title).toContain('prompt-injection'); // default category
    });

    it('EE-008: does NOT emit when injection success < 0.5', async () => {
      emitExecutionFinding({
        modelId: 'gpt-4',
        testCaseId: 'tc-3',
        injectionSuccess: 0.3,
      });
      await flush();

      expect(mockSaveFinding).not.toHaveBeenCalled();
    });

    it('EE-009: does NOT emit when injectionSuccess is undefined (defaults to 0)', async () => {
      emitExecutionFinding({
        modelId: 'gpt-4',
        testCaseId: 'tc-4',
      });
      await flush();

      expect(mockSaveFinding).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // emitGuardFinding
  // =========================================================================
  describe('emitGuardFinding', () => {
    it('EE-010: emits finding when action is block', async () => {
      emitGuardFinding({
        mode: 'hattori',
        direction: 'input',
        action: 'block',
        findings: [
          { category: 'prompt-injection', severity: 'CRITICAL' },
        ],
        content: 'malicious input',
      });
      await flush();

      expect(mockSaveFinding).toHaveBeenCalledTimes(1);
      const saved = mockSaveFinding.mock.calls[0][0];
      expect(saved).toMatchObject({
        sourceModule: 'guard',
        findingType: 'vulnerability',
        severity: 'CRITICAL',
        metadata: {
          mode: 'hattori',
          direction: 'input',
          findingCount: 1,
          category: 'prompt-injection',
        },
        evidence: 'malicious input',
      });
      expect(saved.title).toContain('Guard Block');
      expect(saved.title).toContain('hattori/input');
    });

    it('EE-011: does NOT emit when action is not block', async () => {
      emitGuardFinding({
        mode: 'shinobi',
        direction: 'input',
        action: 'log',
      });
      await flush();

      expect(mockSaveFinding).not.toHaveBeenCalled();
    });

    it('EE-012: resolves highest severity from multiple findings', async () => {
      emitGuardFinding({
        mode: 'samurai',
        direction: 'output',
        action: 'block',
        findings: [
          { category: 'data-leak', severity: 'INFO' },
          { category: 'injection', severity: 'CRITICAL' },
        ],
      });
      await flush();

      const saved = mockSaveFinding.mock.calls[0][0];
      // The reducer picks CRITICAL as the highest severity
      expect(saved.severity).toBe('CRITICAL');
      expect(saved.metadata.findingCount).toBe(2);
    });

    it('EE-013: handles block event with no findings array', async () => {
      emitGuardFinding({
        mode: 'sensei',
        direction: 'output',
        action: 'block',
      });
      await flush();

      expect(mockSaveFinding).toHaveBeenCalledTimes(1);
      const saved = mockSaveFinding.mock.calls[0][0];
      expect(saved.severity).toBe('INFO'); // default when no findings
      expect(saved.metadata.findingCount).toBe(0);
      expect(saved.title).toContain('guard-block'); // fallback category
    });
  });

  // =========================================================================
  // emitAnalyzeFinding
  // =========================================================================
  describe('emitAnalyzeFinding', () => {
    it('EE-014: emits WARNING when criticalComponents > 0', async () => {
      emitAnalyzeFinding({
        payload: 'ignore previous instructions',
        modelId: 'gpt-4',
        components: 5,
        criticalComponents: 2,
      });
      await flush();

      expect(mockSaveFinding).toHaveBeenCalledTimes(1);
      const saved = mockSaveFinding.mock.calls[0][0];
      expect(saved).toMatchObject({
        sourceModule: 'attackdna',
        findingType: 'attack_variant',
        severity: 'WARNING',
        metadata: {
          modelId: 'gpt-4',
          components: 5,
          criticalComponents: 2,
        },
      });
      expect(saved.title).toContain('5 components');
      expect(saved.evidence).toBe('ignore previous instructions');
    });

    it('EE-015: emits INFO when criticalComponents is 0', async () => {
      emitAnalyzeFinding({
        payload: 'benign payload',
        modelId: 'claude-3',
        components: 3,
        criticalComponents: 0,
      });
      await flush();

      const saved = mockSaveFinding.mock.calls[0][0];
      expect(saved.severity).toBe('INFO');
    });

    it('EE-016: emits INFO when criticalComponents is undefined', async () => {
      emitAnalyzeFinding({
        payload: 'test payload',
        modelId: 'model-x',
      });
      await flush();

      const saved = mockSaveFinding.mock.calls[0][0];
      expect(saved.severity).toBe('INFO');
      expect(saved.title).toContain('0 components');
    });

    it('EE-017: truncates long payload evidence to 2000 characters', async () => {
      const longPayload = 'A'.repeat(5000);
      emitAnalyzeFinding({
        payload: longPayload,
        modelId: 'model-y',
        components: 1,
      });
      await flush();

      const saved = mockSaveFinding.mock.calls[0][0];
      expect(saved.evidence.length).toBe(2000);
    });
  });

  // =========================================================================
  // Error handling (fire-and-forget resilience)
  // =========================================================================
  describe('error handling', () => {
    it('EE-018: logs error but does not throw when saveFinding fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockSaveFinding.mockRejectedValueOnce(new Error('disk full'));

      emitAnalyzeFinding({
        payload: 'test',
        modelId: 'model-z',
      });
      await flush();

      expect(consoleSpy).toHaveBeenCalledWith(
        '[ecosystem-emitter] Failed to save finding:',
        expect.any(Error),
      );
      consoleSpy.mockRestore();
    });
  });
});
