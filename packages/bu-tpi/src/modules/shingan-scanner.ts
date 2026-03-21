/**
 * D7.8: Shingan Scanner Module — assembles all 6 attack layers into
 * a ScannerModule that self-registers with the scanner registry.
 *
 * Zero runtime dependencies. Pure TypeScript.
 */

import type { Finding, RegexPattern, ScannerModule } from '../types.js';
import { scannerRegistry } from './registry.js';
import { detectFormat } from './skill-parser.js';

import { ALL_METADATA_PATTERNS } from './shingan-metadata.js';
import { ALL_PAYLOAD_PATTERNS } from './shingan-payloads.js';
import { ALL_EXFILTRATION_PATTERNS } from './shingan-exfiltration.js';
import { ALL_SOCIAL_PATTERNS } from './shingan-social.js';
import { ALL_SUPPLY_CHAIN_PATTERNS } from './shingan-supply-chain.js';
import { ALL_CONTEXT_PATTERNS } from './shingan-context.js';

// ---------------------------------------------------------------------------
// Layer Registry
// ---------------------------------------------------------------------------

interface PatternLayer {
  readonly name: string;
  readonly label: string;
  readonly patterns: readonly RegexPattern[];
}

const LAYERS: readonly PatternLayer[] = [
  { name: 'L1', label: 'Metadata Poisoning', patterns: ALL_METADATA_PATTERNS },
  { name: 'L2', label: 'Code-Level Payloads', patterns: ALL_PAYLOAD_PATTERNS },
  { name: 'L3', label: 'Data Exfiltration', patterns: ALL_EXFILTRATION_PATTERNS },
  { name: 'L4', label: 'Social Engineering', patterns: ALL_SOCIAL_PATTERNS },
  { name: 'L5', label: 'Supply Chain Identity', patterns: ALL_SUPPLY_CHAIN_PATTERNS },
  { name: 'L6', label: 'Memory & Context Poisoning', patterns: ALL_CONTEXT_PATTERNS },
] as const;

const ALL_SHINGAN_PATTERNS: readonly RegexPattern[] = LAYERS.flatMap(
  (l) => l.patterns,
);

// ---------------------------------------------------------------------------
// Module Implementation
// ---------------------------------------------------------------------------

const MODULE_NAME = 'shingan-scanner';

const shinganModule: ScannerModule = {
  name: MODULE_NAME,
  version: '1.0.0',
  description:
    'Universal skill/agent definition scanner — detects attacks across 6 layers',
  supportedContentTypes: [
    'text/plain',
    'text/markdown',
    'application/json',
    'application/yaml',
  ],

  scan(text: string, normalized: string): Finding[] {
    const findings: Finding[] = [];
    const format = detectFormat(text);
    const isKnownFormat = format !== 'unknown';

    for (const pattern of ALL_SHINGAN_PATTERNS) {
      // Reset lastIndex for stateful regex (global flag)
      if (pattern.re.global) {
        pattern.re.lastIndex = 0;
      }

      if (!pattern.re.test(normalized)) continue;

      // Reset again for match extraction
      if (pattern.re.global) {
        pattern.re.lastIndex = 0;
      }

      const match = normalized.match(pattern.re);
      const matchText = match?.[0] ?? '';

      // Format-aware severity boosting: only escalate executable/payload patterns
      const ESCALATABLE_CATEGORIES = new Set([
        'SKILL_PAYLOAD', 'SKILL_CODE_PAYLOAD',
        'SKILL_EXFILTRATION', 'SKILL_DATA_EXFILTRATION',
      ]);
      let severity = pattern.sev;
      if (isKnownFormat && severity === 'WARNING' && ESCALATABLE_CATEGORIES.has(pattern.cat)) {
        severity = 'CRITICAL';
      }

      findings.push({
        category: pattern.cat,
        severity,
        description: pattern.desc,
        match: matchText.slice(0, 200),
        source: pattern.source ?? MODULE_NAME,
        engine: MODULE_NAME,
        pattern_name: pattern.name,
        weight: pattern.weight,
      });
    }

    return findings;
  },

  getPatternCount(): number {
    return ALL_SHINGAN_PATTERNS.length;
  },

  getPatternGroups(): { name: string; count: number; source: string }[] {
    return LAYERS.map((layer) => ({
      name: `${layer.name}: ${layer.label}`,
      count: layer.patterns.length,
      source: MODULE_NAME,
    }));
  },
};

// ---------------------------------------------------------------------------
// Self-Registration
// ---------------------------------------------------------------------------

if (!scannerRegistry.hasModule(MODULE_NAME)) {
  scannerRegistry.register(shinganModule);
}

export { shinganModule, ALL_SHINGAN_PATTERNS, LAYERS };
