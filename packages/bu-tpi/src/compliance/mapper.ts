/**
 * S65: Compliance Engine Mapper
 * Auto-maps scanner modules and fixture categories to compliance controls.
 */

import type { ComplianceFramework, ControlMapping } from './types.js';

/**
 * Static mapping of scanner module names to compliance control IDs.
 */
export const MODULE_CONTROL_MAP: Record<string, string[]> = {
  // P1 Modules
  'mcp-parser': ['LLM07', 'AML.T0060', 'ISO-8.1'],
  'document-pdf': ['LLM02', 'NIST-SEC', 'EU-ART15'],
  'document-office': ['LLM02', 'NIST-SEC', 'EU-ART15'],
  'ssrf-detector': ['LLM02', 'NIST-SEC', 'AML.T0010'],
  'encoding-engine': ['LLM01', 'AML.T0060', 'NIST-ROBUST'],
  'email-webfetch': ['LLM01', 'NIST-SEC', 'ISO-6.1'],
  'enhanced-pi': ['LLM01', 'AML.T0060', 'AML.T0070', 'NIST-ROBUST'],
  'token-analyzer': ['LLM01', 'LLM04', 'AML.T0020'],
  'rag-analyzer': ['LLM01', 'LLM07', 'AML.T0060'],
  'vectordb-interface': ['LLM07', 'AML.T0030', 'NIST-SEC'],
  'xxe-protopollution': ['LLM02', 'NIST-SEC', 'EU-ART15'],

  // P2.6 Modules
  'dos-detector': ['LLM04', 'NIST-SAFE', 'EU-ART15'],
  'supply-chain-detector': ['LLM05', 'NIST-SEC', 'AML.T0030'],
  'bias-detector': ['NIST-BIAS', 'EU-ART10', 'ISO-8.4'],
  'env-detector': ['LLM06', 'NIST-PRIV', 'NIST-SEC'],
  'overreliance-detector': ['LLM09', 'NIST-ACCOUNT', 'EU-ART14'],
  'model-theft-detector': ['LLM10', 'AML.T0040', 'AML.T0050'],

  // P3 Modules
  'pii-detector': ['LLM06', 'NIST-PRIV', 'EU-ART10', 'ISO-8.4'],
  'data-provenance': ['LLM03', 'AML.T0030', 'EU-ART10'],
  'deepfake-detector': ['NIST-SEC', 'EU-ART52', 'ISO-6.1'],
  'session-bypass': ['LLM01', 'NIST-SEC', 'AML.T0060'],

  // Core
  'core-patterns': ['LLM01', 'LLM02', 'AML.T0060', 'NIST-ROBUST'],
};

/**
 * Static mapping of fixture categories to compliance control IDs.
 */
export const CATEGORY_CONTROL_MAP: Record<string, string[]> = {
  'prompt-injection': ['LLM01', 'AML.T0060', 'AML.T0070', 'NIST-ROBUST'],
  'agent': ['LLM07', 'LLM08', 'AML.T0060'],
  'mcp': ['LLM07', 'ISO-8.1'],
  'dos': ['LLM04', 'NIST-SAFE', 'EU-ART15'],
  'supply-chain': ['LLM05', 'AML.T0030', 'NIST-SEC'],
  'model-theft': ['LLM10', 'AML.T0040', 'AML.T0050'],
  'bias': ['NIST-BIAS', 'EU-ART10', 'ISO-8.4'],
  'web': ['LLM02', 'NIST-SEC'],
  'output': ['LLM02', 'LLM09', 'EU-ART13'],
  'social': ['LLM01', 'NIST-SAFE'],
  'multimodal': ['LLM01', 'NIST-ROBUST'],
  'encoded': ['LLM01', 'AML.T0020', 'NIST-ROBUST'],
  'vec': ['LLM07', 'AML.T0030'],
  'session': ['LLM01', 'NIST-SEC'],
  'environmental': ['LLM06', 'NIST-PRIV'],
  'document-attacks': ['LLM02', 'NIST-SEC'],
  'token-attacks': ['LLM01', 'LLM04', 'AML.T0020'],
  'or': ['LLM09', 'NIST-ACCOUNT', 'EU-ART14'],
  'search-results': ['LLM02', 'LLM09'],
  'delivery-vectors': ['LLM01', 'NIST-SEC'],
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
