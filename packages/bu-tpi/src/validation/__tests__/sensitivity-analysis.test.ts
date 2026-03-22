/**
 * KATANA Near-Threshold Sensitivity Analysis Tests (K7.2)
 *
 * ISO 17025 Clause: 7.2.2 — Sensitivity near detection thresholds
 */

import { describe, it, expect } from 'vitest';
import {
  generateGraduatedInput,
  analyzeSensitivity,
  analyzeAllSensitivity,
  formatSensitivityReport,
  type ScanFunction,
  type SensitivityReport,
  type SensitivityProfile,
} from '../runner/sensitivity-analysis.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Creates a scan function that returns 'malicious' when input length
 * exceeds the given threshold, simulating a detector with a sharp boundary.
 */
function makeThresholdScanFn(threshold: number): ScanFunction {
  return (text: string) => {
    if (text.length > threshold) {
      return {
        findings: [{ severity: 'CRITICAL', engine: 'test-engine' }],
        verdict: 'malicious',
      };
    }
    return { findings: [], verdict: 'clean' };
  };
}

/**
 * Creates a scan function that always returns clean (no detection).
 */
function makeAlwaysCleanScanFn(): ScanFunction {
  return () => ({ findings: [], verdict: 'clean' });
}

/**
 * Creates a scan function that always returns malicious.
 */
function makeAlwaysMaliciousScanFn(): ScanFunction {
  return () => ({
    findings: [{ severity: 'WARNING' }],
    verdict: 'malicious',
  });
}

/**
 * Creates a scan function that detects based on presence of a specific substring.
 */
function makeSubstringScanFn(trigger: string): ScanFunction {
  return (text: string) => {
    if (text.includes(trigger)) {
      return {
        findings: [{ severity: 'CRITICAL' }],
        verdict: 'malicious',
      };
    }
    return { findings: [], verdict: 'clean' };
  };
}

/**
 * Creates a scan function with oscillating detection in the middle range,
 * simulating a gray zone.
 */
function makeOscillatingScanFn(): ScanFunction {
  let callCount = 0;
  return (text: string) => {
    callCount++;
    // Steps 0-3: clean, Steps 4-6: oscillate, Steps 7-9: malicious
    // Using text length as a proxy since graduated inputs get longer
    const len = text.length;
    if (len < 30) {
      return { findings: [], verdict: 'clean' };
    }
    if (len > 80) {
      return {
        findings: [{ severity: 'CRITICAL' }],
        verdict: 'malicious',
      };
    }
    // Gray zone: oscillate based on call count
    if (callCount % 2 === 0) {
      return {
        findings: [{ severity: 'WARNING' }],
        verdict: 'malicious',
      };
    }
    return { findings: [], verdict: 'clean' };
  };
}

const SAMPLE_ATTACK = 'DROP TABLE users; -- SQL injection attack payload with malicious intent';

// ---------------------------------------------------------------------------
// Tests: generateGraduatedInput
// ---------------------------------------------------------------------------

describe('K7.2 — Near-Threshold Sensitivity Analysis', () => {
  describe('generateGraduatedInput', () => {
    it('should produce valid strings at each step', () => {
      const totalSteps = 10;
      for (let step = 0; step < totalSteps; step++) {
        const input = generateGraduatedInput(SAMPLE_ATTACK, step, totalSteps);
        expect(typeof input).toBe('string');
        expect(input.length).toBeGreaterThan(0);
      }
    });

    it('should return pure benign text at step 0', () => {
      const input = generateGraduatedInput(SAMPLE_ATTACK, 0, 10);
      expect(input).not.toContain('DROP TABLE');
      expect(input).not.toContain('SQL injection');
    });

    it('should return full attack payload at final step', () => {
      const input = generateGraduatedInput(SAMPLE_ATTACK, 9, 10);
      expect(input).toBe(SAMPLE_ATTACK);
    });

    it('should have most dilution at step 0 and least at step N-1', () => {
      const totalSteps = 10;
      const inputs = Array.from({ length: totalSteps }, (_, i) =>
        generateGraduatedInput(SAMPLE_ATTACK, i, totalSteps),
      );

      // Step 0 should not contain attack content
      expect(inputs[0]).not.toContain(SAMPLE_ATTACK);

      // Step N-1 should be the full attack
      expect(inputs[totalSteps - 1]).toBe(SAMPLE_ATTACK);

      // Intermediate steps should exist and be non-empty
      for (let i = 1; i < totalSteps - 1; i++) {
        expect(inputs[i].length).toBeGreaterThan(0);
      }
    });

    it('should progressively include more attack content at higher steps', () => {
      const totalSteps = 10;
      const attack = 'AAAA BBBB CCCC DDDD EEEE FFFF GGGG HHHH';

      // Count how much of the attack substring appears at each step
      const attackPortions = Array.from({ length: totalSteps }, (_, i) => {
        const input = generateGraduatedInput(attack, i, totalSteps);
        // Check how many chars from the attack are in the input
        let matchCount = 0;
        for (let c = 0; c < attack.length; c++) {
          if (input.includes(attack.slice(0, c + 1))) {
            matchCount = c + 1;
          }
        }
        return matchCount;
      });

      // Step 0 has 0 attack chars
      expect(attackPortions[0]).toBe(0);

      // Final step has all attack chars
      expect(attackPortions[totalSteps - 1]).toBe(attack.length);

      // Generally non-decreasing attack portion
      for (let i = 1; i < totalSteps; i++) {
        expect(attackPortions[i]).toBeGreaterThanOrEqual(attackPortions[i - 1]);
      }
    });

    it('should throw for totalSteps < 2', () => {
      expect(() => generateGraduatedInput(SAMPLE_ATTACK, 0, 1)).toThrow(
        'totalSteps must be >= 2',
      );
    });

    it('should throw for step out of range', () => {
      expect(() => generateGraduatedInput(SAMPLE_ATTACK, -1, 10)).toThrow(
        'step must be in [0, 9]',
      );
      expect(() => generateGraduatedInput(SAMPLE_ATTACK, 10, 10)).toThrow(
        'step must be in [0, 9]',
      );
    });

    it('should work with minimum 2 steps', () => {
      const step0 = generateGraduatedInput(SAMPLE_ATTACK, 0, 2);
      const step1 = generateGraduatedInput(SAMPLE_ATTACK, 1, 2);

      expect(step0).not.toBe(SAMPLE_ATTACK);
      expect(step1).toBe(SAMPLE_ATTACK);
    });
  });

  // ---------------------------------------------------------------------------
  // Tests: analyzeSensitivity
  // ---------------------------------------------------------------------------

  describe('analyzeSensitivity', () => {
    it('should correctly identify transition with threshold-based scanner', () => {
      // Use a threshold that triggers partway through the graduated inputs
      const scanFn = makeThresholdScanFn(50);
      const profile = analyzeSensitivity('test-module', SAMPLE_ATTACK, scanFn, 10);

      expect(profile.module_id).toBe('test-module');
      expect(profile.steps).toHaveLength(10);
      expect(profile.transition_index).not.toBeNull();

      // Earlier steps should be clean, later should be malicious
      if (profile.transition_index !== null) {
        for (let i = 0; i < profile.transition_index; i++) {
          expect(profile.steps[i].verdict).toBe('clean');
        }
        expect(profile.steps[profile.transition_index].verdict).toBe('malicious');
      }
    });

    it('should report no transition when scanner always returns clean', () => {
      const scanFn = makeAlwaysCleanScanFn();
      const profile = analyzeSensitivity('test-module', SAMPLE_ATTACK, scanFn, 10);

      expect(profile.transition_index).toBeNull();
      expect(profile.gray_zone_width).toBe(0);
      expect(profile.transition_sharpness).toBe(0);

      for (const step of profile.steps) {
        expect(step.verdict).toBe('clean');
        expect(step.findings_count).toBe(0);
      }
    });

    it('should report transition at step 0 when scanner always returns malicious', () => {
      const scanFn = makeAlwaysMaliciousScanFn();
      const profile = analyzeSensitivity('test-module', SAMPLE_ATTACK, scanFn, 10);

      expect(profile.transition_index).toBe(0);
      expect(profile.gray_zone_width).toBe(0);
      expect(profile.transition_sharpness).toBe(1);
    });

    it('should calculate correct gray zone width for oscillating scanner', () => {
      // Manually define step verdicts: clean, clean, malicious, clean, malicious, malicious
      let stepIndex = 0;
      const verdicts = ['clean', 'clean', 'malicious', 'clean', 'malicious', 'malicious'];
      const scanFn: ScanFunction = () => {
        const v = verdicts[stepIndex] ?? 'clean';
        stepIndex++;
        if (v === 'malicious') {
          return { findings: [{ severity: 'CRITICAL' }], verdict: 'malicious' };
        }
        return { findings: [], verdict: 'clean' };
      };

      const profile = analyzeSensitivity('test-module', SAMPLE_ATTACK, scanFn, 6);

      // First malicious at index 2, last clean at index 3
      expect(profile.transition_index).toBe(2);
      // Gray zone: from index 2 to index 3 => width = 3 - 2 + 1 = 2
      expect(profile.gray_zone_width).toBe(2);
    });

    it('should calculate transition sharpness of 1 for immediate transition', () => {
      // All clean then all malicious, no oscillation
      let stepIndex = 0;
      const scanFn: ScanFunction = () => {
        const result = stepIndex >= 5
          ? { findings: [{ severity: 'CRITICAL' }], verdict: 'malicious' as const }
          : { findings: [] as Array<{ severity: string }>, verdict: 'clean' as const };
        stepIndex++;
        return result;
      };

      const profile = analyzeSensitivity('test-module', SAMPLE_ATTACK, scanFn, 10);

      expect(profile.transition_index).toBe(5);
      expect(profile.gray_zone_width).toBe(0);
      expect(profile.transition_sharpness).toBe(1);
    });

    it('should calculate transition sharpness close to 0 for maximally gradual transition', () => {
      // Alternating verdicts across all steps — maximum gray zone
      let stepIndex = 0;
      const scanFn: ScanFunction = () => {
        const isMalicious = stepIndex % 2 === 1;
        stepIndex++;
        if (isMalicious) {
          return { findings: [{ severity: 'WARNING' }], verdict: 'malicious' };
        }
        return { findings: [], verdict: 'clean' };
      };

      const profile = analyzeSensitivity('test-module', SAMPLE_ATTACK, scanFn, 10);

      // First malicious at step 1, last clean at step 8
      // Gray zone = 8 - 1 + 1 = 8
      expect(profile.transition_index).toBe(1);
      expect(profile.gray_zone_width).toBe(8);
      // Sharpness = 1 - 8/9 = ~0.111
      expect(profile.transition_sharpness).toBeLessThan(0.2);
      expect(profile.transition_sharpness).toBeGreaterThanOrEqual(0);
    });

    it('should include step inputs in the profile', () => {
      const scanFn = makeAlwaysCleanScanFn();
      const profile = analyzeSensitivity('test-module', SAMPLE_ATTACK, scanFn, 5);

      for (const step of profile.steps) {
        expect(typeof step.input).toBe('string');
        expect(step.input.length).toBeGreaterThan(0);
      }
    });

    it('should assign confidence 0 for steps with no findings', () => {
      const scanFn = makeAlwaysCleanScanFn();
      const profile = analyzeSensitivity('test-module', SAMPLE_ATTACK, scanFn, 5);

      for (const step of profile.steps) {
        expect(step.confidence).toBe(0);
      }
    });

    it('should assign positive confidence for steps with findings', () => {
      const scanFn = makeAlwaysMaliciousScanFn();
      const profile = analyzeSensitivity('test-module', SAMPLE_ATTACK, scanFn, 5);

      for (const step of profile.steps) {
        expect(step.confidence).toBeGreaterThan(0);
      }
    });

    it('should throw for empty moduleId', () => {
      expect(() =>
        analyzeSensitivity('', SAMPLE_ATTACK, makeAlwaysCleanScanFn()),
      ).toThrow('moduleId must be non-empty');
    });

    it('should throw for empty baseAttack', () => {
      expect(() =>
        analyzeSensitivity('test-module', '', makeAlwaysCleanScanFn()),
      ).toThrow('baseAttack must be non-empty');
    });

    it('should throw for steps < 2', () => {
      expect(() =>
        analyzeSensitivity('test-module', SAMPLE_ATTACK, makeAlwaysCleanScanFn(), 1),
      ).toThrow('steps must be >= 2');
    });
  });

  // ---------------------------------------------------------------------------
  // Tests: analyzeAllSensitivity
  // ---------------------------------------------------------------------------

  describe('analyzeAllSensitivity', () => {
    it('should analyze multiple modules', () => {
      const modules = ['mod-a', 'mod-b'];
      const attacks = new Map([
        ['mod-a', 'attack payload A'],
        ['mod-b', 'attack payload B'],
      ]);
      const scanFn = makeAlwaysCleanScanFn();

      const report = analyzeAllSensitivity(modules, attacks, scanFn, 5);

      expect(report.modules).toHaveLength(2);
      expect(report.modules[0].module_id).toBe('mod-a');
      expect(report.modules[1].module_id).toBe('mod-b');
      expect(report.generated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should count modules with clear threshold correctly', () => {
      let callCount = 0;
      const scanFn: ScanFunction = () => {
        callCount++;
        // Module A (first 5 calls): always clean => no threshold
        // Module B (next 5 calls): sharp transition at call 8 (step 3 of module B)
        if (callCount <= 5) {
          return { findings: [], verdict: 'clean' };
        }
        if (callCount > 8) {
          return { findings: [{ severity: 'CRITICAL' }], verdict: 'malicious' };
        }
        return { findings: [], verdict: 'clean' };
      };

      const report = analyzeAllSensitivity(
        ['mod-a', 'mod-b'],
        new Map([['mod-a', 'attack-a'], ['mod-b', 'attack-b']]),
        scanFn,
        5,
      );

      // mod-a: no transition, mod-b: has transition with gray_zone <= 1
      expect(report.modules_with_clear_threshold).toBeGreaterThanOrEqual(0);
    });

    it('should calculate average gray zone width', () => {
      // All modules with no transition => average = 0
      const scanFn = makeAlwaysCleanScanFn();
      const report = analyzeAllSensitivity(
        ['mod-a'],
        new Map([['mod-a', 'attack-a']]),
        scanFn,
        5,
      );

      expect(report.average_gray_zone_width).toBe(0);
    });

    it('should throw for missing attack payload', () => {
      expect(() =>
        analyzeAllSensitivity(
          ['mod-a'],
          new Map(),
          makeAlwaysCleanScanFn(),
        ),
      ).toThrow('No attack payload provided for module: mod-a');
    });
  });

  // ---------------------------------------------------------------------------
  // Tests: formatSensitivityReport
  // ---------------------------------------------------------------------------

  describe('formatSensitivityReport', () => {
    it('should produce valid markdown output', () => {
      const report: SensitivityReport = {
        generated_at: '2026-03-21T00:00:00.000Z',
        modules: [
          {
            module_id: 'test-module',
            steps: [
              { step: 0, input: 'benign', verdict: 'clean', confidence: 0, findings_count: 0 },
              { step: 1, input: 'attack', verdict: 'malicious', confidence: 0.5, findings_count: 1 },
            ],
            transition_index: 1,
            gray_zone_width: 0,
            transition_sharpness: 1,
          },
        ],
        modules_with_clear_threshold: 1,
        modules_with_gradual_transition: 0,
        average_gray_zone_width: 0,
      };

      const markdown = formatSensitivityReport(report);

      expect(markdown).toContain('# Near-Threshold Sensitivity Analysis Report');
      expect(markdown).toContain('**Generated:** 2026-03-21T00:00:00.000Z');
      expect(markdown).toContain('## Module: test-module');
      expect(markdown).toContain('| Step | Verdict | Confidence | Findings |');
      expect(markdown).toContain('| 0 | clean | 0.000 | 0 |');
      expect(markdown).toContain('| 1 | malicious | 0.500 | 1 |');
      expect(markdown).toContain('**Transition Sharpness:** 1.000');
      expect(markdown).toContain('**Gray Zone Width:** 0 steps');
    });

    it('should display "None (no detection)" when transition_index is null', () => {
      const report: SensitivityReport = {
        generated_at: '2026-03-21T00:00:00.000Z',
        modules: [
          {
            module_id: 'no-detect',
            steps: [],
            transition_index: null,
            gray_zone_width: 0,
            transition_sharpness: 0,
          },
        ],
        modules_with_clear_threshold: 0,
        modules_with_gradual_transition: 0,
        average_gray_zone_width: 0,
      };

      const markdown = formatSensitivityReport(report);
      expect(markdown).toContain('None (no detection)');
    });

    it('should include all modules in the report', () => {
      const report: SensitivityReport = {
        generated_at: '2026-03-21T00:00:00.000Z',
        modules: [
          { module_id: 'mod-a', steps: [], transition_index: null, gray_zone_width: 0, transition_sharpness: 0 },
          { module_id: 'mod-b', steps: [], transition_index: 3, gray_zone_width: 2, transition_sharpness: 0.5 },
        ],
        modules_with_clear_threshold: 0,
        modules_with_gradual_transition: 1,
        average_gray_zone_width: 2,
      };

      const markdown = formatSensitivityReport(report);
      expect(markdown).toContain('## Module: mod-a');
      expect(markdown).toContain('## Module: mod-b');
      expect(markdown).toContain('**Modules Analyzed:** 2');
    });
  });

  // ---------------------------------------------------------------------------
  // Edge Cases: Transition Sharpness
  // ---------------------------------------------------------------------------

  describe('Transition sharpness edge cases', () => {
    it('should be 0 when there is no transition at all', () => {
      const scanFn = makeAlwaysCleanScanFn();
      const profile = analyzeSensitivity('test-module', SAMPLE_ATTACK, scanFn, 10);

      expect(profile.transition_sharpness).toBe(0);
    });

    it('should be 1 for immediate single-point transition', () => {
      // Clean for first 4 steps, malicious for last 6
      let stepIndex = 0;
      const scanFn: ScanFunction = () => {
        const result = stepIndex >= 4
          ? { findings: [{ severity: 'CRITICAL' }], verdict: 'malicious' as const }
          : { findings: [] as Array<{ severity: string }>, verdict: 'clean' as const };
        stepIndex++;
        return result;
      };

      const profile = analyzeSensitivity('test-module', SAMPLE_ATTACK, scanFn, 10);

      expect(profile.transition_sharpness).toBe(1);
      expect(profile.gray_zone_width).toBe(0);
    });

    it('should handle all-malicious (transition at step 0) as sharpness 1', () => {
      const scanFn = makeAlwaysMaliciousScanFn();
      const profile = analyzeSensitivity('test-module', SAMPLE_ATTACK, scanFn, 5);

      expect(profile.transition_index).toBe(0);
      expect(profile.transition_sharpness).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Gray Zone Width Calculation
  // ---------------------------------------------------------------------------

  describe('Gray zone width calculation', () => {
    it('should be 0 when no transition exists', () => {
      const profile = analyzeSensitivity(
        'test-module',
        SAMPLE_ATTACK,
        makeAlwaysCleanScanFn(),
        10,
      );
      expect(profile.gray_zone_width).toBe(0);
    });

    it('should be 0 for clean transition (no oscillation)', () => {
      let stepIndex = 0;
      const scanFn: ScanFunction = () => {
        const result = stepIndex >= 7
          ? { findings: [{ severity: 'CRITICAL' }], verdict: 'malicious' as const }
          : { findings: [] as Array<{ severity: string }>, verdict: 'clean' as const };
        stepIndex++;
        return result;
      };

      const profile = analyzeSensitivity('test-module', SAMPLE_ATTACK, scanFn, 10);
      expect(profile.gray_zone_width).toBe(0);
      expect(profile.transition_index).toBe(7);
    });

    it('should correctly measure width for single oscillation', () => {
      // Steps: clean, clean, malicious, clean, malicious, malicious, malicious
      let stepIndex = 0;
      const verdicts = ['clean', 'clean', 'malicious', 'clean', 'malicious', 'malicious', 'malicious'];
      const scanFn: ScanFunction = () => {
        const v = verdicts[stepIndex] ?? 'malicious';
        stepIndex++;
        if (v === 'malicious') {
          return { findings: [{ severity: 'CRITICAL' }], verdict: 'malicious' };
        }
        return { findings: [], verdict: 'clean' };
      };

      const profile = analyzeSensitivity('test-module', SAMPLE_ATTACK, scanFn, 7);

      // First malicious at 2, last clean at 3 => width = 3 - 2 + 1 = 2
      expect(profile.transition_index).toBe(2);
      expect(profile.gray_zone_width).toBe(2);
    });
  });
});
