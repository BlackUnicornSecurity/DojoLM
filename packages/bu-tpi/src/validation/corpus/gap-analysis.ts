/**
 * KATANA Coverage Gap Analysis (K1.4)
 *
 * Counts samples per module per category and compares against
 * tier-based minimums to identify under-covered modules.
 *
 * Tier requirements (from config):
 * - Tier 1: 150 positive + 150 negative per module
 * - Tier 2: 100 positive + 100 negative per module
 * - Tier 3: 50 positive + 50 negative per module
 *
 * ISO 17025 Clause 7.2.1
 */

import { CORPUS_CONFIG } from '../config.js';
import type { GroundTruthSample, ModuleTaxonomyEntry } from '../types.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ModuleCoverage {
  module_id: string;
  tier: number;
  positive_count: number;   // Malicious samples expected for this module
  negative_count: number;   // Clean samples (all clean samples count as negatives)
  positive_required: number;
  negative_required: number;
  positive_gap: number;     // How many more positive samples needed (0 = met)
  negative_gap: number;     // How many more negative samples needed (0 = met)
  coverage_met: boolean;
  categories_covered: string[];
}

export interface GapAnalysisReport {
  generated_at: string;
  total_samples: number;
  total_clean: number;
  total_malicious: number;
  modules_total: number;
  modules_covered: number;
  modules_with_gaps: number;
  modules_missing: number;    // Modules with 0 samples
  total_positive_gap: number; // Sum of all positive gaps
  total_negative_gap: number; // Sum of all negative gaps
  per_module: ModuleCoverage[];
}

// ---------------------------------------------------------------------------
// Gap Analysis
// ---------------------------------------------------------------------------

/**
 * Analyze coverage gaps across all modules.
 *
 * @param samples - All ground truth samples
 * @param taxonomy - Module taxonomy entries
 * @returns Gap analysis report
 */
export function analyzeGaps(
  samples: readonly GroundTruthSample[],
  taxonomy: readonly ModuleTaxonomyEntry[],
): GapAnalysisReport {
  // Count clean samples (universal negatives for all modules)
  const cleanCount = samples.filter(s => s.expected_verdict === 'clean').length;
  const maliciousCount = samples.length - cleanCount;

  // Count positive samples per module
  const positiveByModule = new Map<string, number>();
  const categoriesByModule = new Map<string, Set<string>>();

  for (const sample of samples) {
    if (sample.expected_verdict === 'malicious') {
      for (const moduleId of sample.expected_modules) {
        positiveByModule.set(moduleId, (positiveByModule.get(moduleId) ?? 0) + 1);
        if (!categoriesByModule.has(moduleId)) {
          categoriesByModule.set(moduleId, new Set());
        }
        for (const cat of sample.expected_categories) {
          categoriesByModule.get(moduleId)!.add(cat);
        }
      }
    }
  }

  // Build per-module coverage
  const perModule: ModuleCoverage[] = [];
  let modulesCovered = 0;
  let modulesWithGaps = 0;
  let modulesMissing = 0;
  let totalPositiveGap = 0;
  let totalNegativeGap = 0;

  for (const mod of taxonomy) {
    const { positiveRequired, negativeRequired } = getRequirements(mod.tier);
    const positiveCount = positiveByModule.get(mod.module_id) ?? 0;
    // All clean samples serve as negatives for every module
    const negativeCount = cleanCount;

    const positiveGap = Math.max(0, positiveRequired - positiveCount);
    const negativeGap = Math.max(0, negativeRequired - negativeCount);
    const coverageMet = positiveGap === 0 && negativeGap === 0;

    if (positiveCount === 0) {
      modulesMissing++;
    } else if (coverageMet) {
      modulesCovered++;
    } else {
      modulesWithGaps++;
    }

    totalPositiveGap += positiveGap;
    totalNegativeGap += negativeGap;

    perModule.push({
      module_id: mod.module_id,
      tier: mod.tier,
      positive_count: positiveCount,
      negative_count: negativeCount,
      positive_required: positiveRequired,
      negative_required: negativeRequired,
      positive_gap: positiveGap,
      negative_gap: negativeGap,
      coverage_met: coverageMet,
      categories_covered: [...(categoriesByModule.get(mod.module_id) ?? [])],
    });
  }

  return {
    generated_at: new Date().toISOString(),
    total_samples: samples.length,
    total_clean: cleanCount,
    total_malicious: maliciousCount,
    modules_total: taxonomy.length,
    modules_covered: modulesCovered,
    modules_with_gaps: modulesWithGaps,
    modules_missing: modulesMissing,
    total_positive_gap: totalPositiveGap,
    total_negative_gap: totalNegativeGap,
    per_module: perModule,
  };
}

/**
 * Get tier-based sample requirements.
 */
function getRequirements(tier: number): { positiveRequired: number; negativeRequired: number } {
  switch (tier) {
    case 1:
      return {
        positiveRequired: CORPUS_CONFIG.TIER_1_MIN_POSITIVE,
        negativeRequired: CORPUS_CONFIG.TIER_1_MIN_NEGATIVE,
      };
    case 2:
      return {
        positiveRequired: CORPUS_CONFIG.TIER_2_MIN_POSITIVE,
        negativeRequired: CORPUS_CONFIG.TIER_2_MIN_NEGATIVE,
      };
    case 3:
      return {
        positiveRequired: CORPUS_CONFIG.TIER_3_MIN_POSITIVE,
        negativeRequired: CORPUS_CONFIG.TIER_3_MIN_NEGATIVE,
      };
    default:
      return {
        positiveRequired: CORPUS_CONFIG.TIER_1_MIN_POSITIVE,
        negativeRequired: CORPUS_CONFIG.TIER_1_MIN_NEGATIVE,
      };
  }
}

/**
 * Format gap analysis as a human-readable summary string.
 */
export function formatGapSummary(report: GapAnalysisReport): string {
  const lines: string[] = [
    '# KATANA Corpus Gap Analysis',
    '',
    `Generated: ${report.generated_at}`,
    `Total samples: ${report.total_samples} (${report.total_clean} clean, ${report.total_malicious} malicious)`,
    '',
    `## Module Coverage Summary`,
    `- Total modules: ${report.modules_total}`,
    `- Fully covered: ${report.modules_covered}`,
    `- Partial coverage: ${report.modules_with_gaps}`,
    `- Missing (0 samples): ${report.modules_missing}`,
    `- Total positive gap: ${report.total_positive_gap} samples needed`,
    `- Total negative gap: ${report.total_negative_gap} samples needed`,
    '',
    '## Per-Module Detail',
    '',
    '| Module | Tier | Positive | Required | Gap | Negative | Required | Gap | Status |',
    '|--------|------|----------|----------|-----|----------|----------|-----|--------|',
  ];

  // Sort: gaps first (largest gap first), then covered
  const sorted = [...report.per_module].sort((a, b) => {
    if (a.coverage_met !== b.coverage_met) return a.coverage_met ? 1 : -1;
    return (b.positive_gap + b.negative_gap) - (a.positive_gap + a.negative_gap);
  });

  for (const m of sorted) {
    const status = m.coverage_met ? 'OK' : (m.positive_count === 0 ? 'MISSING' : 'GAP');
    lines.push(
      `| ${m.module_id} | ${m.tier} | ${m.positive_count} | ${m.positive_required} | ${m.positive_gap} | ${m.negative_count} | ${m.negative_required} | ${m.negative_gap} | ${status} |`,
    );
  }

  return lines.join('\n');
}
