/**
 * MUSUBI Phase 7.2: SARIF Reporter
 * Converts scanner findings to SARIF format for GitHub Security tab.
 */

import type { Finding, ScanResult } from '../types.js';

// ---------------------------------------------------------------------------
// SARIF Types (subset of SARIF 2.1.0)
// ---------------------------------------------------------------------------

export interface SarifReport {
  readonly $schema: string;
  readonly version: string;
  readonly runs: readonly SarifRun[];
}

export interface SarifRun {
  readonly tool: { readonly driver: SarifToolDriver };
  readonly results: readonly SarifResult[];
}

export interface SarifToolDriver {
  readonly name: string;
  readonly version: string;
  readonly informationUri: string;
  readonly rules: readonly SarifRule[];
}

export interface SarifRule {
  readonly id: string;
  readonly name: string;
  readonly shortDescription: { readonly text: string };
  readonly defaultConfiguration: { readonly level: 'error' | 'warning' | 'note' };
}

export interface SarifResult {
  readonly ruleId: string;
  readonly level: 'error' | 'warning' | 'note';
  readonly message: { readonly text: string };
  readonly locations: readonly SarifLocation[];
}

export interface SarifLocation {
  readonly physicalLocation: {
    readonly artifactLocation: { readonly uri: string };
    readonly region?: { readonly startLine: number };
  };
}

// ---------------------------------------------------------------------------
// Conversion
// ---------------------------------------------------------------------------

function severityToLevel(severity: string): 'error' | 'warning' | 'note' {
  switch (severity) {
    case 'CRITICAL': return 'error';
    case 'WARNING': return 'warning';
    default: return 'note';
  }
}

/** Extract unique rule definitions from findings */
export function extractRules(findings: readonly Finding[]): readonly SarifRule[] {
  const seen = new Set<string>();
  const rules: SarifRule[] = [];

  for (const f of findings) {
    const ruleId = f.pattern_name ?? f.category;
    if (seen.has(ruleId)) continue;
    seen.add(ruleId);

    rules.push({
      id: ruleId,
      name: f.category,
      shortDescription: { text: f.description },
      defaultConfiguration: { level: severityToLevel(f.severity) },
    });
  }

  return rules;
}

/** Convert findings to SARIF results */
export function findingsToSarifResults(
  findings: readonly Finding[],
  targetUri: string,
): readonly SarifResult[] {
  return findings.map((f) => ({
    ruleId: f.pattern_name ?? f.category,
    level: severityToLevel(f.severity),
    message: { text: `${f.description} — Match: ${f.match.slice(0, 100)}` },
    locations: [{
      physicalLocation: {
        artifactLocation: { uri: targetUri },
      },
    }],
  }));
}

/** Generate a complete SARIF report from scan results */
export function generateSarifReport(
  scanResult: ScanResult,
  targetUri: string = 'input.txt',
  toolVersion: string = '1.0.0',
): SarifReport {
  return {
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/main/sarif-2.1/schema/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [{
      tool: {
        driver: {
          name: 'DojoLM Scanner',
          version: toolVersion,
          informationUri: 'https://github.com/BlackUnicornSecurity/DojoLM',
          rules: extractRules(scanResult.findings),
        },
      },
      results: findingsToSarifResults(scanResult.findings, targetUri),
    }],
  };
}
