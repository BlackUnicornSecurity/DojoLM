/**
 * File: test-case-presets.ts
 * Purpose: Curated test case presets for Quick, Bushido, and Full Suite modes
 * Story: TPI-UIP-11
 * Index:
 * - QUICK_TEST_IDS (line 14)
 * - COMPLIANCE_TEST_IDS (line 40)
 * - getPresetTestCases() (line 55)
 * - getPresetInfo() (line 80)
 */

import type { LLMPromptTestCase, TestSuitePreset } from '../llm-types';
import { SAMPLE_TEST_CASES } from './sample-test-cases';

/**
 * Quick preset: 20 best-of-breed tests — 2 per category
 * One direct attack + one evasion variant per category
 */
const QUICK_TEST_IDS: ReadonlySet<string> = new Set([
  // Prompt Injection: direct + role-play
  'tc-pi-001', 'tc-pi-003',
  // Jailbreak: DAN + hypothetical
  'tc-jb-001', 'tc-jb-003',
  // Data Exfiltration: training data + system prompt
  'tc-de-001', 'tc-de-002',
  // Harmful Content: weapons + self-harm
  'tc-hc-001', 'tc-hc-003',
  // Privacy: PII extraction + profiling
  'tc-pv-001', 'tc-pv-003',
  // Bias & Fairness: gender + racial
  'tc-bf-001', 'tc-bf-002',
  // Misinformation: medical + scientific
  'tc-mi-001', 'tc-mi-003',
  // Indirect Injection: document + web
  'tc-ipi-001', 'tc-ipi-002',
  // Tool Abuse: code execution + file access
  'tc-tua-001', 'tc-tua-002',
  // Context Confusion: multi-turn + distraction
  'tc-cc-001', 'tc-cc-003',
]);

/**
 * Compliance preset: 8 representative tests — 1 per framework
 * Each covers the framework's top concern
 */
const COMPLIANCE_TEST_IDS: ReadonlySet<string> = new Set([
  'tc-pi-001',  // OWASP LLM Top 10 — LLM01: Prompt Injection
  'tc-jb-001',  // ENISA AI Threat Landscape — Adversarial manipulation
  'tc-de-001',  // ISO/IEC 42001 — Data governance violation
  'tc-bf-001',  // NIST AI RMF — Bias/fairness probe
  'tc-hc-001',  // EU AI Act — Transparency obligation bypass
  'tc-ipi-001',  // MITRE ATLAS — Model evasion
  'tc-pi-003',  // CrowdStrike TPI — Multi-vector injection
  'tc-de-002',  // SOC 2 Type II — Confidentiality boundary test
]);

/**
 * Get test cases for a given preset.
 * Quick: 20 curated tests
 * Compliance: 8 framework-representative tests
 * Full: All 132 test cases (+ fixture scanning handled at UI level)
 */
export function getPresetTestCases(preset: TestSuitePreset): LLMPromptTestCase[] {
  switch (preset) {
    case 'quick':
      return SAMPLE_TEST_CASES.filter((tc) => QUICK_TEST_IDS.has(tc.id));

    case 'compliance':
      return SAMPLE_TEST_CASES.filter((tc) => COMPLIANCE_TEST_IDS.has(tc.id));

    case 'full':
      return [...SAMPLE_TEST_CASES];
  }
}

/**
 * Metadata for each preset (for UI display)
 */
export interface PresetInfo {
  id: TestSuitePreset;
  label: string;
  count: number;
  description: string;
}

export function getPresetInfo(): PresetInfo[] {
  return [
    {
      id: 'quick',
      label: 'Quick',
      count: QUICK_TEST_IDS.size,
      description: '2 best-of-breed per category: direct attack + evasion variant',
    },
    {
      id: 'compliance',
      label: 'Bushido',
      count: COMPLIANCE_TEST_IDS.size,
      description: '1 representative test per framework: OWASP, ENISA, ISO, NIST, EU AI Act, MITRE, CrowdStrike, SOC 2',
    },
    {
      id: 'full',
      label: 'Full Suite',
      count: SAMPLE_TEST_CASES.length,
      description: 'All test cases + fixture scanning for thorough assessment',
    },
  ];
}

/**
 * Check if a test case belongs to the quick preset
 */
export function isQuickPreset(testCaseId: string): boolean {
  return QUICK_TEST_IDS.has(testCaseId);
}

/**
 * Check if a test case belongs to the compliance preset
 */
export function isCompliancePreset(testCaseId: string): boolean {
  return COMPLIANCE_TEST_IDS.has(testCaseId);
}
