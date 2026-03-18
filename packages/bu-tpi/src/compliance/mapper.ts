/**
 * S65: Compliance Engine Mapper
 * Auto-maps scanner modules and fixture categories to compliance controls.
 *
 * INDEX:
 * - MODULE_CONTROL_MAP: Scanner module -> control ID mappings
 * - MODULE_EVIDENCE_MAP: Scanner module -> test evidence file paths (H10.1)
 * - CATEGORY_CONTROL_MAP: Fixture category -> control ID mappings
 * - mapModuleToControls(): Map a module to framework controls
 * - mapFixturesToControls(): Map fixture categories to framework controls
 * - calculateCoverage(): Calculate overall framework coverage
 * - getAllMappings(): Get all mappings for a framework
 */

import type { ComplianceFramework, ControlMapping } from './types.js';

/**
 * Static mapping of scanner module names to compliance control IDs.
 * Covers all 27 frameworks.
 */
export const MODULE_CONTROL_MAP: Record<string, string[]> = {
  // P1 Modules
  'mcp-parser': [
    'LLM07', 'AML.T0060', 'ISO-8.1',
    'CISA-PH2-1', 'ISO27-ACCESS', 'OPENSSF-MCP-1',
  ],
  'document-pdf': [
    'LLM02', 'NIST-SEC', 'EU-ART15',
    'ASVS-V5', 'API-8', 'NIST-SI',
  ],
  'document-office': [
    'LLM02', 'NIST-SEC', 'EU-ART15',
    'ASVS-V5', 'API-8', 'NIST-SI',
  ],
  'ssrf-detector': [
    'LLM02', 'NIST-SEC', 'AML.T0010',
    'CISA-PH3-2', 'ISO27-ACCESS', 'ASVS-V5', 'ASVS-V9', 'API-7', 'ISO27-VULN', 'NIST-SI',
  ],
  'encoding-engine': [
    'LLM01', 'AML.T0060', 'NIST-ROBUST',
    'ASVS-V5', 'NIST-218A-PW.8',
  ],
  'email-webfetch': [
    'LLM01', 'NIST-SEC', 'ISO-6.1',
    'CISA-PH4-1', 'ISO27-ACCESS',
  ],
  'enhanced-pi': [
    'LLM01', 'AML.T0060', 'AML.T0070', 'NIST-ROBUST',
    'NIST-218A-PW.8', 'ISO-23894-6.4', 'ISO-24028-B3', 'SAIF-P2-1',
    'CISA-PH3-1', 'CSF2-DE-1', 'UK-CoP-P2', 'ASVS-V5', 'NIST-SI',
  ],
  'token-analyzer': [
    'LLM01', 'LLM04', 'AML.T0020',
    'NIST-SI',
  ],
  'rag-analyzer': [
    'LLM01', 'LLM07', 'AML.T0060',
    'CISA-PH2-1',
  ],
  'vectordb-interface': [
    'LLM07', 'AML.T0030', 'NIST-SEC',
    'CISA-PH2-1', 'ISO27-ACCESS',
  ],
  'xxe-protopollution': [
    'LLM01', 'LLM02', 'NIST-SEC', 'EU-ART15',
    'ASVS-V5', 'API-3', 'API-7', 'API-8', 'NIST-SI',
  ],

  // P2.6 Modules
  'dos-detector': [
    'LLM04', 'NIST-SAFE', 'EU-ART15',
    'CISA-PH4-1', 'ISO27-VULN', 'ASVS-V9', 'API-4', 'NIST-SI',
    'GPAI-55C',
  ],
  'supply-chain-detector': [
    'LLM05', 'NIST-SEC', 'AML.T0030',
    'NIST-218A-PS.2', 'NIST-218A-PW.4', 'SAIF-P1-1', 'CISA-PH2-1',
    'SLSA-VER-1', 'ML-BOM-8', 'OPENSSF-MLOPS-1',
    'CSF2-GV-2', 'ISO27-SC', 'NIST-SR',
    'GPAI-53A',
  ],
  'bias-detector': [
    'NIST-BIAS', 'EU-ART10', 'ISO-8.4',
    'ISO-23894-6.2', 'ISO-24027-B3', 'ISO-24027-B4', 'ISO-24028-B8',
    'CISA-PH3-1', 'UK-CoP-P9',
    'IEEE-7003-1', 'IEEE-7003-3', 'NIST100-4-4',
    'SG-DIM3', 'AU-P3',
    'GDPR-ADM',
  ],
  'env-detector': [
    'LLM06', 'NIST-PRIV', 'NIST-SEC',
    'ISO-23894-6.2', 'SAIF-P4-1', 'ISO27-LOG',
    'NIST-PT-AU', 'GDPR-PRIN',
  ],
  'overreliance-detector': [
    'LLM09', 'NIST-ACCOUNT', 'EU-ART14',
    'ISO-24028-B10', 'UK-CoP-P4',
    'IEEE-7001-3', 'SG-DIM4',
    'CA-HUMAN', 'AU-P6',
    'GDPR-ADM',
  ],
  'model-theft-detector': [
    'LLM10', 'AML.T0040', 'AML.T0050',
    'SAIF-P4-2', 'CISA-PH3-2', 'ISO27-ACCESS',
    'API-1', 'API-5', 'NIST-IR-AC',
  ],

  // P3 Modules
  'pii-detector': [
    'LLM06', 'NIST-PRIV', 'EU-ART10', 'ISO-8.4',
    'ISO-23894-6.2', 'ISO-24028-B5', 'SAIF-P4-1', 'CISA-PH2-3',
    'NIST100-4-4', 'SG-DIM2',
    'ISO27-LOG', 'NIST-PT-AU',
    'GDPR-PRIN', 'GDPR-SPECIAL',
  ],
  'data-provenance': [
    'LLM03', 'AML.T0030', 'EU-ART10',
    'NIST-218A-PS.3', 'NIST-218A-PW.3', 'ISO-24028-B4', 'SAIF-P4-1', 'CISA-PH2-2',
    'SLSA-ML-2', 'ML-BOM-6',
    'ISO27-LOG', 'NIST-SR',
    'GPAI-53B', 'GDPR-PRIN',
  ],
  'deepfake-detector': [
    'NIST-SEC', 'EU-ART52', 'ISO-6.1',
    'ISO-24028-B6', 'CISA-PH4-1',
    'NIST100-4-1', 'NIST100-4-4', 'NIST100-4-7',
    'SG-DIM7', 'GPAI-53A',
  ],
  'session-bypass': [
    'LLM01', 'NIST-SEC', 'AML.T0060',
    'NIST-218A-PW.8', 'ISO27-ACCESS', 'ASVS-V5', 'NIST-SI',
  ],

  // H10.1: Fuzzing infrastructure — BAISS-023, BAISS-001, BAISS-002, BAISS-003
  'fuzzing': [
    'LLM01', 'LLM02', 'AML.T0015', 'NIST-ROBUST',
    'ASVS-V5', 'NIST-SI', 'NIST-218A-PW.8',
  ],

  // H10.1: Credential sanitization / LLM security — BAISS-005, BAISS-016
  'llm-security': [
    'LLM06', 'NIST-PRIV', 'NIST-SEC',
    'ISO27-LOG', 'NIST-SI',
  ],

  // H16.5: WebMCP compliance mapping
  'webmcp-detector': [
    'LLM01',        // OWASP LLM01 - Prompt Injection (indirect via web)
    'LLM07',        // OWASP LLM07 - Insecure Plugin Design
    'AML.T0060',    // MITRE ATLAS - LLM Prompt Injection
    'NIST-SEC',     // NIST AI 600-1 - Security
    'EU-ART15',     // EU AI Act Art.15 - Robustness
    'ASVS-V5',      // OWASP ASVS V5 - Validation
    'ASVS-V9',      // OWASP ASVS V9 - Communications
    'API-7',        // OWASP API Security - SSRF
    'NIST-SI',      // NIST 800-53 SI - System Integrity
    'CISA-PH3-1',   // CISA/NCSC - Secure Development
    'CSF2-DE-1',    // NIST CSF 2.0 - Detect
  ],

  // Bushido Upgrade: LLM test capabilities — BAISS-005, BAISS-008, BAISS-023, BAISS-013
  'llm-test-capabilities': [
    'LLM06', 'LLM04', 'AML.T0015', 'AML.T0040',
    'NIST-PRIV', 'NIST-SEC', 'NIST-SI',
  ],

  // Bushido Upgrade: Threat intelligence pipeline — BAISS-010, BAISS-013
  'threatfeed': [
    'LLM03', 'AML.T0010', 'AML.T0030', 'NIST-SEC',
    'NIST-218A-PW.3', 'NIST-218A-PW.4', 'SAIF-P1-1', 'CISA-PH2-1',
    'SLSA-VER-1', 'ML-BOM-8', 'ISO27-SC', 'NIST-SR',
  ],

  // Core
  'core-patterns': [
    'LLM01', 'LLM02', 'AML.T0060', 'NIST-ROBUST',
    'NIST-218A-PW.8', 'ASVS-V5', 'NIST-SI',
  ],
};

/**
 * H10.1: Static mapping of scanner module names to test evidence file paths.
 * Each entry maps a module to test files that serve as compliance evidence.
 */
export const MODULE_EVIDENCE_MAP: Record<string, string[]> = {
  // --- Pre-existing evidence mappings ---
  'fuzzing': [
    'src/fuzzing/fuzzing.test.ts',
    'src/fuzzing/fuzzer.test.ts',
    'src/fuzzing/grammar.test.ts',
  ],
  'ssrf-detector': [
    'src/modules/ssrf-detector.test.ts',
  ],
  'llm-security': [
    'src/llm/security.test.ts',
  ],
  'xxe-protopollution': [
    'src/modules/xxe-protopollution.test.ts',
  ],
  'webmcp-detector': [
    'src/modules/webmcp-detector.test.ts',
  ],

  // --- Bushido Upgrade: Part 1 — Manual->Hybrid evidence (BAISS-031, 038, 042) ---
  'deepfake-detector': [
    'src/modules/deepfake-detector.test.ts',
    'src/compliance/__tests__/baiss-manual-h102.test.ts',
  ],
  'pii-detector': [
    'src/modules/pii-detector.test.ts',
    'src/compliance/__tests__/baiss-manual-h102.test.ts',
  ],

  // --- Bushido Upgrade: Part 2 — Semi-Auto->Automated evidence (BAISS-009, 012, 029, 033, 034, 043) ---
  'bias-detector': [
    'src/modules/bias-detector.test.ts',
    'src/compliance/__tests__/evidence-automation-h103.test.ts',
  ],
  'dos-detector': [
    'src/modules/dos-detector.test.ts',
  ],
  'supply-chain-detector': [
    'src/modules/supply-chain-detector.test.ts',
  ],
  'data-provenance': [
    'src/modules/data-provenance.test.ts',
    'src/attackdna/lineage-engine.test.ts',
  ],

  // --- Bushido Upgrade: Part 3 — Unmapped evidence (#11 threatfeed) ---
  'threatfeed': [
    'src/threatfeed/threatfeed.test.ts',
    'src/threatfeed/content-sanitizer.test.ts',
    'src/threatfeed/classifier.test.ts',
    'src/threatfeed/url-validator.test.ts',
    'src/threatfeed/deduplicator.test.ts',
    'src/threatfeed/source-pipeline.test.ts',
  ],

  // --- Bushido Upgrade: Part 4 — New LLM test capabilities (BAISS-005, 008, 023, 013) ---
  'llm-test-capabilities': [
    'src/compliance/__tests__/llm-test-capabilities-h104.test.ts',
  ],

  // --- Additional scanner module evidence ---
  'enhanced-pi': [
    'src/modules/enhanced-pi.test.ts',
  ],
  'encoding-engine': [
    'src/modules/encoding-engine.test.ts',
  ],
  'mcp-parser': [
    'src/modules/mcp-parser.test.ts',
  ],
  'token-analyzer': [
    'src/modules/token-analyzer.test.ts',
  ],
  'rag-analyzer': [
    'src/modules/rag-analyzer.test.ts',
  ],
  'vectordb-interface': [
    'src/modules/vectordb-interface.test.ts',
  ],
  'env-detector': [
    'src/modules/env-detector.test.ts',
  ],
  'overreliance-detector': [
    'src/modules/overreliance-detector.test.ts',
  ],
  'model-theft-detector': [
    'src/modules/model-theft-detector.test.ts',
  ],
  'session-bypass': [
    'src/modules/session-bypass.test.ts',
  ],
};

/**
 * Static mapping of fixture categories to compliance control IDs.
 * Covers all 27 frameworks.
 */
export const CATEGORY_CONTROL_MAP: Record<string, string[]> = {
  'prompt-injection': [
    'LLM01', 'AML.T0060', 'AML.T0070', 'NIST-ROBUST',
    'NIST-218A-PW.8', 'CISA-PH3-1', 'ISO27-VULN', 'ASVS-V5', 'NIST-SI',
  ],
  'agent': [
    'LLM07', 'LLM08', 'AML.T0060',
    'CISA-PH2-1', 'OPENSSF-MCP-1',
  ],
  'mcp': [
    'LLM07', 'ISO-8.1',
    'CISA-PH2-1', 'OPENSSF-MCP-1',
  ],
  'dos': [
    'LLM04', 'NIST-SAFE', 'EU-ART15',
    'CISA-PH4-1', 'ISO27-VULN', 'ASVS-V9', 'API-4', 'NIST-SI',
    'GPAI-55C',
  ],
  'supply-chain': [
    'LLM05', 'AML.T0030', 'NIST-SEC',
    'NIST-218A-PW.4', 'SAIF-P1-1', 'CISA-PH2-1',
    'SLSA-VER-1', 'ML-BOM-8', 'OPENSSF-MLOPS-1',
    'CSF2-GV-2', 'ISO27-SC', 'NIST-SR',
    'GPAI-53A',
  ],
  'model-theft': [
    'LLM10', 'AML.T0040', 'AML.T0050',
    'SAIF-P4-2', 'CISA-PH3-2', 'ISO27-ACCESS',
    'API-1', 'API-5', 'NIST-IR-AC',
  ],
  'bias': [
    'NIST-BIAS', 'EU-ART10', 'ISO-8.4',
    'ISO-23894-6.2', 'ISO-24027-B3', 'ISO-24027-B4', 'ISO-24028-B8',
    'CISA-PH3-1', 'UK-CoP-P9',
    'IEEE-7003-1', 'IEEE-7003-3', 'NIST100-4-4',
    'SG-DIM3', 'AU-P3',
    'GDPR-ADM',
  ],
  'web': [
    'LLM02', 'NIST-SEC',
    'ASVS-V5', 'API-8', 'NIST-SI',
  ],
  'output': [
    'LLM02', 'LLM09', 'EU-ART13',
    'ASVS-V5', 'API-3', 'NIST-SI',
  ],
  'social': [
    'LLM01', 'NIST-SAFE',
    'NIST-218A-PW.8', 'ASVS-V5', 'NIST-SI',
  ],
  'multimodal': [
    'LLM01', 'NIST-ROBUST',
    'NIST-218A-PW.8', 'ASVS-V5', 'NIST-SI',
  ],
  'encoded': [
    'LLM01', 'AML.T0020', 'NIST-ROBUST',
    'NIST-218A-PW.8', 'ASVS-V5', 'NIST-SI',
  ],
  'vec': [
    'LLM07', 'AML.T0030',
    'CISA-PH2-1', 'SLSA-ML-2', 'ML-BOM-6', 'ISO27-ACCESS',
    'GPAI-53B',
  ],
  'session': [
    'LLM01', 'NIST-SEC',
    'NIST-218A-PW.8', 'ISO27-ACCESS', 'ASVS-V5', 'NIST-SI',
  ],
  'environmental': [
    'LLM06', 'NIST-PRIV',
    'ISO-23894-6.2', 'SAIF-P4-1', 'ISO27-LOG',
    'NIST-PT-AU', 'GDPR-PRIN',
  ],
  'document-attacks': [
    'LLM02', 'NIST-SEC',
    'ASVS-V5', 'API-8', 'NIST-SI',
    'GPAI-55C',
  ],
  'token-attacks': [
    'LLM01', 'LLM04', 'AML.T0020',
    'NIST-SI',
  ],
  'or': [
    'LLM09', 'NIST-ACCOUNT', 'EU-ART14',
    'UK-CoP-P4', 'IEEE-7001-3', 'SG-DIM4',
    'CA-HUMAN', 'AU-P6',
    'GDPR-ADM',
  ],
  'search-results': [
    'LLM02', 'LLM09',
    'GDPR-TRANS',
  ],
  'delivery-vectors': [
    'LLM01', 'NIST-SEC',
    'NIST-218A-PW.8', 'ISO27-ACCESS', 'ASVS-V5', 'API-8', 'NIST-SI',
  ],
  'webmcp': [
    'LLM01', 'LLM07', 'AML.T0060', 'NIST-SEC',
    'EU-ART15', 'ASVS-V5', 'API-7', 'NIST-SI',
  ],
};

/**
 * Map a scanner module to compliance controls.
 */
export function mapModuleToControls(
  moduleName: string,
  framework: ComplianceFramework
): ControlMapping[] {
  const controlIds = MODULE_CONTROL_MAP[moduleName] ?? [];
  const mappings: ControlMapping[] = [];

  for (const controlId of controlIds) {
    const control = framework.controls.find((c) => c.id === controlId);
    if (control) {
      mappings.push({
        controlId,
        frameworkId: framework.id,
        moduleNames: [moduleName],
        fixtureCategories: [],
        coveragePercent: 100,
        evidence: [`Scanner module '${moduleName}' detects patterns related to ${control.name}`],
      });
    }
  }

  return mappings;
}

/**
 * Map fixture categories to compliance controls.
 */
export function mapFixturesToControls(
  category: string,
  fixtureCount: number,
  framework: ComplianceFramework
): ControlMapping[] {
  const controlIds = CATEGORY_CONTROL_MAP[category] ?? [];
  const mappings: ControlMapping[] = [];

  for (const controlId of controlIds) {
    const control = framework.controls.find((c) => c.id === controlId);
    if (control) {
      mappings.push({
        controlId,
        frameworkId: framework.id,
        moduleNames: [],
        fixtureCategories: [category],
        coveragePercent: Math.min(100, fixtureCount * 5),
        evidence: [`${fixtureCount} test fixtures in category '${category}' cover ${control.name}`],
      });
    }
  }

  return mappings;
}

/**
 * Calculate overall coverage for a framework.
 */
export function calculateCoverage(
  framework: ComplianceFramework,
  mappings: ControlMapping[]
): number {
  if (framework.controls.length === 0) return 0;

  const coveredControlIds = new Set(mappings.map((m) => m.controlId));
  const frameworkControlIds = new Set(framework.controls.map((c) => c.id));

  let covered = 0;
  for (const controlId of frameworkControlIds) {
    if (coveredControlIds.has(controlId)) covered++;
  }

  return Math.round((covered / frameworkControlIds.size) * 100);
}

/**
 * Get all mappings for a framework from current scanner modules and fixture categories.
 */
export function getAllMappings(
  framework: ComplianceFramework,
  moduleNames: string[],
  fixtureCategories: Record<string, number>
): ControlMapping[] {
  const allMappings: ControlMapping[] = [];

  for (const moduleName of moduleNames) {
    allMappings.push(...mapModuleToControls(moduleName, framework));
  }

  for (const [category, count] of Object.entries(fixtureCategories)) {
    allMappings.push(...mapFixturesToControls(category, count, framework));
  }

  // Deduplicate by controlId, merging evidence
  const merged = new Map<string, ControlMapping>();
  for (const mapping of allMappings) {
    const key = `${mapping.frameworkId}:${mapping.controlId}`;
    const existing = merged.get(key);
    if (existing) {
      merged.set(key, {
        ...existing,
        moduleNames: [...new Set([...existing.moduleNames, ...mapping.moduleNames])],
        fixtureCategories: [...new Set([...existing.fixtureCategories, ...mapping.fixtureCategories])],
        coveragePercent: Math.max(existing.coveragePercent, mapping.coveragePercent),
        evidence: [...existing.evidence, ...mapping.evidence],
      });
    } else {
      merged.set(key, mapping);
    }
  }

  return Array.from(merged.values());
}
