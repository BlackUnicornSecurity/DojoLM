/**
 * File: transfer-analyzer.ts
 * Purpose: Cross-model vulnerability transfer analysis via Jaccard similarity
 * Epic: OBLITERATUS (OBL) — T1.2 (Module 4)
 * Index:
 * - computeTransferScores() (line 10)
 */

import type { TransferScore } from './types.js';

interface ModelCategoryReport {
  readonly modelConfigId: string;
  readonly byCategory: readonly { readonly category: string; readonly passRate: number }[];
}

/**
 * Compute transfer scores between model pairs using Jaccard similarity
 * on categories where passRate < 0.5 (failed categories).
 *
 * Pure computation — no LLM calls, no API route needed.
 * Data source: LLMModelReport.byCategory from existing test results.
 */
export function computeTransferScores(reports: readonly ModelCategoryReport[]): TransferScore[] {
  if (reports.length < 2) return [];

  const scores: TransferScore[] = [];

  // Extract failed categories per model
  const failedCategories = new Map<string, Set<string>>();
  for (const report of reports) {
    const failed = new Set(
      report.byCategory
        .filter(c => c.passRate < 0.5)
        .map(c => c.category)
    );
    failedCategories.set(report.modelConfigId, failed);
  }

  // Compute pairwise Jaccard index
  for (let i = 0; i < reports.length; i++) {
    for (let j = i + 1; j < reports.length; j++) {
      const sourceId = reports[i].modelConfigId;
      const targetId = reports[j].modelConfigId;
      const sourceSet = failedCategories.get(sourceId)!;
      const targetSet = failedCategories.get(targetId)!;

      const intersection = new Set([...sourceSet].filter(c => targetSet.has(c)));
      const union = new Set([...sourceSet, ...targetSet]);

      const correlation = union.size > 0 ? intersection.size / union.size : 0;

      const sharedVulnerabilities = [...intersection].sort();
      const divergentSource = [...sourceSet].filter(c => !targetSet.has(c)).sort();
      const divergentTarget = [...targetSet].filter(c => !sourceSet.has(c)).sort();
      const divergentVulnerabilities = [...divergentSource, ...divergentTarget];

      scores.push({
        sourceModelId: sourceId,
        targetModelId: targetId,
        correlation,
        sharedVulnerabilities,
        divergentVulnerabilities,
      });
    }
  }

  return scores;
}
