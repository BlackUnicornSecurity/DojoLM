/**
 * File: llm-server-utils.ts
 * Purpose: Server-side utility functions for LLM operations
 * Index:
 * - generateModelReport (line 23)
 * - fetchCoverageMap (line 178)
 * Note: This file uses Node.js modules and can only be imported in API routes or server components
 */

import { fileStorage } from './storage/file-storage';
import type { LLMModelReport, CoverageMap } from './llm-types';

// ===========================================================================
// Report Generation (Server-side)
// ===========================================================================

/**
 * Generate a model report (server-side function for API routes)
 */
export async function generateModelReport(modelId: string): Promise<LLMModelReport> {
  const { executions } = await fileStorage.queryExecutions({
    modelConfigId: modelId,
    limit: 10000,
  });

  const model = await fileStorage.getModelConfig(modelId);
  if (!model) {
    throw new Error(`Model not found: ${modelId}`);
  }

  // Calculate statistics
  const testCount = executions.length;
  const avgResilienceScore = testCount > 0
    ? Math.round(executions.reduce((sum: number, e) => sum + e.resilienceScore, 0) / testCount)
    : 0;

  const injectionSuccessRate = testCount > 0
    ? executions.reduce((sum: number, e) => sum + e.injectionSuccess, 0) / testCount
    : 0;

  const harmfulnessRate = testCount > 0
    ? executions.reduce((sum: number, e) => sum + e.harmfulness, 0) / testCount
    : 0;

  // Category breakdown
  const categoryMap = new Map<string, { pass: number; fail: number; scores: number[] }>();

  for (const exec of executions) {
    for (const category of exec.categoriesPassed) {
      if (!categoryMap.has(category)) {
        categoryMap.set(category, { pass: 0, fail: 0, scores: [] });
      }
      const data = categoryMap.get(category)!;
      data.pass++;
      data.scores.push(exec.resilienceScore);
    }

    for (const category of exec.categoriesFailed) {
      if (!categoryMap.has(category)) {
        categoryMap.set(category, { pass: 0, fail: 0, scores: [] });
      }
      categoryMap.get(category)!.fail++;
    }
  }

  const byCategory = Array.from(categoryMap.entries()).map(([category, data]) => ({
    category,
    passRate: data.pass + data.fail > 0 ? data.pass / (data.pass + data.fail) : 0,
    avgScore: data.scores.length > 0
      ? Math.round(data.scores.reduce((sum: number, s) => sum + s, 0) / data.scores.length)
      : 0,
    count: data.pass + data.fail,
  }));

  // OWASP coverage
  const owaspMap = new Map<string, { tested: number; passed: number }>();
  for (const exec of executions) {
    for (const [category, passed] of Object.entries(exec.owaspCoverage)) {
      if (!owaspMap.has(category)) {
        owaspMap.set(category, { tested: 0, passed: 0 });
      }
      const data = owaspMap.get(category)!;
      data.tested++;
      if (passed) data.passed++;
    }
  }

  const owaspCoverage = Array.from(owaspMap.entries()).map(([category, data]) => ({
    category,
    passRate: data.tested > 0 ? data.passed / data.tested : 0,
    tested: data.tested,
  }));

  // TPI coverage
  const tpiMap = new Map<string, { tested: number; passed: number }>();
  for (const exec of executions) {
    for (const [story, passed] of Object.entries(exec.tpiCoverage)) {
      if (!tpiMap.has(story)) {
        tpiMap.set(story, { tested: 0, passed: 0 });
      }
      const data = tpiMap.get(story)!;
      data.tested++;
      if (passed) data.passed++;
    }
  }

  const tpiCoverage = Array.from(tpiMap.entries()).map(([story, data]) => ({
    story,
    passRate: data.tested > 0 ? data.passed / data.tested : 0,
    tested: data.tested,
  }));

  // Overall coverage
  const overallCategories = new Set([
    ...Object.keys(owaspCoverage.reduce((acc, c) => ({ ...acc, [c.category]: true }), {})),
    ...Object.keys(tpiCoverage.reduce((acc, t) => ({ ...acc, [t.story]: true }), {})),
  ]);
  const overallCoveragePercent = overallCategories.size > 0
    ? Math.round(
        (owaspCoverage.filter(c => c.passRate > 0).length +
         tpiCoverage.filter(t => t.passRate > 0).length) /
        overallCategories.size * 100
      )
    : 0;

  // Total duration
  const totalDuration_ms = executions.reduce((sum: number, e) => sum + e.duration_ms, 0);
  const avgDuration_ms = testCount > 0 ? totalDuration_ms / testCount : 0;

  return {
    modelConfigId: modelId,
    modelName: model.name,
    provider: model.provider,
    testCount,
    avgResilienceScore,
    injectionSuccessRate,
    harmfulnessRate,
    byCategory,
    owaspCoverage,
    tpiCoverage,
    overallCoveragePercent,
    totalDuration_ms,
    avgDuration_ms,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Get coverage map (server-side function for API routes)
 */
export async function fetchCoverageMap(modelId?: string): Promise<CoverageMap> {
  const { executions } = await fileStorage.queryExecutions({
    limit: 10000,
  });

  const filtered = modelId
    ? executions.filter((e) => e.modelConfigId === modelId)
    : executions;

  const owasp: Record<string, { tested: number; passed: number; percentage: number }> = {};
  const tpi: Record<string, { tested: number; passed: number; percentage: number }> = {};
  const custom: Record<string, { tested: number; passed: number; percentage: number }> = {};

  for (const exec of filtered) {
    // OWASP coverage
    for (const [category, passed] of Object.entries(exec.owaspCoverage)) {
      if (!owasp[category]) {
        owasp[category] = { tested: 0, passed: 0, percentage: 0 };
      }
      owasp[category].tested++;
      if (passed) owasp[category].passed++;
    }

    // TPI coverage
    for (const [story, passed] of Object.entries(exec.tpiCoverage)) {
      if (!tpi[story]) {
        tpi[story] = { tested: 0, passed: 0, percentage: 0 };
      }
      tpi[story].tested++;
      if (passed) tpi[story].passed++;
    }
  }

  // Calculate percentages
  for (const data of Object.values(owasp)) {
    data.percentage = data.tested > 0 ? Math.round((data.passed / data.tested) * 100) : 0;
  }
  for (const data of Object.values(tpi)) {
    data.percentage = data.tested > 0 ? Math.round((data.passed / data.tested) * 100) : 0;
  }

  return { owasp, tpi, custom };
}
