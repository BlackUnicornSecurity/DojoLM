/**
 * D7.9: Shingan Trust Score Calculator.
 *
 * Computes an overall trust score (0-100) for skill/agent definitions
 * by aggregating findings across all 6 detection layers.
 */

import type { Finding } from '../types.js';
import type { SkillFormat, SkillMetadata } from './skill-parser.js';
import { parseSkill } from './skill-parser.js';
import { scan } from '../scanner.js';

// Ensure shingan module is registered before we use it
import './shingan-scanner.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RiskLevel = 'safe' | 'low' | 'medium' | 'high' | 'critical';

export interface SkillTrustScore {
  readonly overall: number; // 0-100
  readonly layers: {
    readonly L1: number;
    readonly L2: number;
    readonly L3: number;
    readonly L4: number;
    readonly L5: number;
    readonly L6: number;
  };
  readonly riskLevel: RiskLevel;
  readonly findings: readonly Finding[];
  readonly format: SkillFormat;
  readonly parsedMetadata: SkillMetadata;
}

// ---------------------------------------------------------------------------
// Severity Deduction Map
// ---------------------------------------------------------------------------

const DEDUCTIONS: Readonly<Record<string, number>> = {
  CRITICAL: 25,
  WARNING: 15,
  INFO: 1,
};

// ---------------------------------------------------------------------------
// Layer-to-category mapping (based on pattern category prefixes)
// ---------------------------------------------------------------------------

const LAYER_CATEGORIES: Readonly<Record<string, string>> = {
  SKILL_METADATA_POISONING: 'L1',
  SKILL_PAYLOAD: 'L2',
  SKILL_CODE_PAYLOAD: 'L2',
  SKILL_EXFILTRATION: 'L3',
  SKILL_DATA_EXFILTRATION: 'L3',
  SKILL_SOCIAL_ENGINEERING: 'L4',
  SKILL_SOCIAL: 'L4',
  SKILL_SUPPLY_CHAIN: 'L5',
  SKILL_SUPPLY_CHAIN_IDENTITY: 'L5',
  SKILL_CONTEXT_POISONING: 'L6',
  SKILL_MEMORY_POISONING: 'L6',
};

function categorizeToLayer(finding: Finding): string {
  // Check category mapping first
  for (const [prefix, layer] of Object.entries(LAYER_CATEGORIES)) {
    if (finding.category.startsWith(prefix)) return layer;
  }

  // Fallback: check pattern name prefix
  const name = finding.pattern_name ?? '';
  if (name.startsWith('sg_provenance') || name.startsWith('sg_metadata') || name.startsWith('sg_rating') || name.startsWith('sg_category')) return 'L1';
  if (name.startsWith('sg_code') || name.startsWith('sg_payload') || name.startsWith('sg_shell') || name.startsWith('sg_eval')) return 'L2';
  if (name.startsWith('sg_exfil') || name.startsWith('sg_data') || name.startsWith('sg_dns') || name.startsWith('sg_webhook')) return 'L3';
  if (name.startsWith('sg_social') || name.startsWith('sg_urgency') || name.startsWith('sg_authority') || name.startsWith('sg_trust')) return 'L4';
  if (name.startsWith('sg_supply') || name.startsWith('sg_typosquat') || name.startsWith('sg_impersonat')) return 'L5';
  if (name.startsWith('sg_context') || name.startsWith('sg_memory') || name.startsWith('sg_persona') || name.startsWith('sg_inject')) return 'L6';

  return 'L1'; // Default bucket
}

function computeRiskLevel(score: number): RiskLevel {
  if (score >= 85) return 'safe';
  if (score >= 65) return 'low';
  if (score >= 40) return 'medium';
  if (score >= 15) return 'high';
  return 'critical';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function computeTrustScore(
  content: string,
  filename?: string,
): SkillTrustScore {
  const parsed = parseSkill(content, filename);
  const result = scan(content, { engines: ['shingan-scanner'] });
  const findings = result.findings;

  // Compute per-layer deductions
  const layerDeductions: Record<string, number> = {
    L1: 0, L2: 0, L3: 0, L4: 0, L5: 0, L6: 0,
  };

  let totalDeduction = 0;

  for (const finding of findings) {
    const deduction = DEDUCTIONS[finding.severity] ?? 0;
    const layer = categorizeToLayer(finding);
    layerDeductions[layer] = (layerDeductions[layer] ?? 0) + deduction;
    totalDeduction += deduction;
  }

  const overall = Math.max(0, 100 - totalDeduction);

  return {
    overall,
    layers: {
      L1: layerDeductions.L1,
      L2: layerDeductions.L2,
      L3: layerDeductions.L3,
      L4: layerDeductions.L4,
      L5: layerDeductions.L5,
      L6: layerDeductions.L6,
    },
    riskLevel: computeRiskLevel(overall),
    findings,
    format: parsed.format,
    parsedMetadata: parsed.metadata,
  };
}

export function batchTrustScore(
  skills: readonly { readonly content: string; readonly filename?: string }[],
): readonly SkillTrustScore[] {
  return skills.map((s) => computeTrustScore(s.content, s.filename));
}
