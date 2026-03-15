/**
 * H22.2: Defense Recommendation Engine
 * Accepts scanner findings, returns ranked defense template recommendations.
 */

import type { DefenseTemplate, DefenseRecommendation } from './types.js';
import { DEFENSE_TEMPLATES } from './templates/index.js';

// ---------------------------------------------------------------------------
// Category Family Mapping (for partial matching)
// ---------------------------------------------------------------------------

const CATEGORY_FAMILIES: Record<string, string[]> = {
  PROMPT_INJECTION: ['PROMPT_INJECTION', 'ENHANCED_PI', 'INDIRECT_PI', 'CONTEXT_INJECTION'],
  JAILBREAK: ['JAILBREAK', 'PERSONA_HIJACK', 'HYPOTHETICAL_BYPASS', 'DAN_ATTEMPT'],
  OUTPUT: ['OUTPUT_MANIPULATION', 'OUTPUT_INJECTION', 'HARMFUL_OUTPUT', 'PII_OUTPUT'],
  ENCODING: ['ENCODING', 'BASE64', 'UNICODE', 'HOMOGLYPH', 'ZERO_WIDTH'],
  MCP: ['MCP', 'TOOL_POISONING', 'CAPABILITY_SPOOFING', 'TOOL_RESULT_INJECTION'],
  SOCIAL: ['SOCIAL_ENGINEERING', 'FLATTERY', 'URGENCY', 'AUTHORITY_SPOOFING'],
  EXFILTRATION: ['DATA_EXFILTRATION', 'PII_SSN', 'PII_EMAIL', 'PII_PHONE', 'INDIRECT_DISCLOSURE'],
  SUPPLY_CHAIN: ['SUPPLY_CHAIN', 'MODEL_THEFT', 'DEPENDENCY', 'PROVENANCE'],
};

function getFamilyForCategory(cat: string): string | null {
  const upper = cat.toUpperCase();
  for (const [family, members] of Object.entries(CATEGORY_FAMILIES)) {
    if (members.some((m) => upper.includes(m) || m.includes(upper))) {
      return family;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Recommendation Engine
// ---------------------------------------------------------------------------

const SEVERITY_WEIGHT: Record<string, number> = {
  CRITICAL: 10,
  WARNING: 7,
  INFO: 3,
};

/**
 * Recommend defense templates based on scanner findings.
 * Returns ranked, deduplicated recommendations.
 */
export function recommendDefenses(
  findings: { category: string; severity: string }[],
): DefenseRecommendation[] {
  const recommendations: DefenseRecommendation[] = [];
  const seenTemplateIds = new Set<string>();

  for (const finding of findings) {
    const upperCat = finding.category.toUpperCase();
    const sevWeight = SEVERITY_WEIGHT[finding.severity.toUpperCase()] ?? 3;

    for (const template of DEFENSE_TEMPLATES) {
      if (seenTemplateIds.has(template.id)) continue;

      const matchQuality = calculateMatchQuality(upperCat, template.findingCategory.toUpperCase());
      if (matchQuality <= 0) continue;

      const priority = sevWeight * matchQuality;
      seenTemplateIds.add(template.id);

      recommendations.push({
        template,
        matchQuality,
        relevance: `Addresses ${finding.category} (${finding.severity})`,
        priority,
      });
    }
  }

  // Sort by priority descending
  recommendations.sort((a, b) => b.priority - a.priority);
  return recommendations;
}

function calculateMatchQuality(findingCat: string, templateCat: string): number {
  // Exact match
  if (findingCat === templateCat) return 1.0;

  // Prefix match (e.g., PROMPT_INJECTION matches PROMPT_INJECTION_DELIMITER)
  if (findingCat.startsWith(templateCat) || templateCat.startsWith(findingCat)) return 0.7;

  // Category family match
  const findingFamily = getFamilyForCategory(findingCat);
  const templateFamily = getFamilyForCategory(templateCat);
  if (findingFamily && templateFamily && findingFamily === templateFamily) return 0.5;

  return 0;
}
