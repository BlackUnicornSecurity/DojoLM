/**
 * File: llm-server-utils.ts
 * Purpose: Server-side utility functions for LLM operations
 * Index:
 * - generateModelReport (line 23)
 * - fetchCoverageMap (line 178)
 * Note: This file uses Node.js modules and can only be imported in API routes or server components
 */

import { fileStorage } from './storage/file-storage';
import type { LLMModelReport, LLMTestExecution, CoverageMap } from './llm-types';

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

// ===========================================================================
// Batch Model Reports (QA Round 3 — Bushido Book Integration)
// ===========================================================================

/** Per-model summary within a batch report */
export interface BatchModelSummary {
  modelConfigId: string;
  modelName: string;
  provider: string;
  testCount: number;
  passCount: number;
  failCount: number;
  timeoutCount: number;
  avgResilienceScore: number;
  minScore: number;
  maxScore: number;
  avgDuration_ms: number;
  byCategory: Array<{
    category: string;
    avgScore: number;
    passRate: number;
    count: number;
  }>;
  ranking: number;
}

/** Full batch report for Bushido Book */
export interface BatchBushidoReport {
  batchId: string;
  batchName: string;
  generatedAt: string;
  totalExecutions: number;
  totalModels: number;
  overallAvgResilience: number;
  models: BatchModelSummary[];
  weakestCategories: Array<{
    category: string;
    avgScore: number;
  }>;
}

/**
 * Generate per-model reports for all models in a batch.
 * Returns a combined report suitable for Bushido Book display.
 */
export async function generateBatchModelReports(batchId: string): Promise<BatchBushidoReport> {
  const batch = await fileStorage.getBatch(batchId);
  if (!batch) {
    throw new Error(`Batch not found: ${batchId}`);
  }

  const executions = await fileStorage.getBatchExecutions(batchId);

  // Group executions by model
  const byModel = new Map<string, LLMTestExecution[]>();
  for (const exec of executions) {
    const list = byModel.get(exec.modelConfigId) || [];
    list.push(exec);
    byModel.set(exec.modelConfigId, list);
  }

  // Build per-model summaries
  const models: BatchModelSummary[] = [];

  for (const [modelId, modelExecs] of byModel) {
    const model = await fileStorage.getModelConfig(modelId);
    const modelName = model?.name ?? modelId;
    const provider = model?.provider ?? 'unknown';

    const scores = modelExecs
      .filter(e => e.status === 'completed')
      .map(e => e.resilienceScore);

    const failCount = modelExecs.filter(e => e.status === 'failed').length;
    const timeoutCount = modelExecs.filter(e =>
      e.status === 'failed' && e.error &&
      (e.error.toLowerCase().includes('timeout') || e.error.toLowerCase().includes('timed out'))
    ).length;

    const avgScore = scores.length > 0
      ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length)
      : 0;

    // Category breakdown
    const catMap = new Map<string, { scores: number[]; pass: number; fail: number }>();
    for (const exec of modelExecs) {
      for (const cat of exec.categoriesPassed) {
        if (!catMap.has(cat)) catMap.set(cat, { scores: [], pass: 0, fail: 0 });
        const d = catMap.get(cat)!;
        d.pass++;
        d.scores.push(exec.resilienceScore);
      }
      for (const cat of exec.categoriesFailed) {
        if (!catMap.has(cat)) catMap.set(cat, { scores: [], pass: 0, fail: 0 });
        catMap.get(cat)!.fail++;
      }
    }

    const byCategory = Array.from(catMap.entries()).map(([category, d]) => ({
      category,
      avgScore: d.scores.length > 0
        ? Math.round(d.scores.reduce((s, v) => s + v, 0) / d.scores.length)
        : 0,
      passRate: d.pass + d.fail > 0 ? Math.round((d.pass / (d.pass + d.fail)) * 100) / 100 : 0,
      count: d.pass + d.fail,
    }));

    const totalDuration = modelExecs.reduce((s, e) => s + e.duration_ms, 0);

    models.push({
      modelConfigId: modelId,
      modelName,
      provider,
      testCount: modelExecs.length,
      passCount: scores.length,
      failCount,
      timeoutCount,
      avgResilienceScore: avgScore,
      minScore: scores.length > 0 ? Math.min(...scores) : 0,
      maxScore: scores.length > 0 ? Math.max(...scores) : 0,
      avgDuration_ms: modelExecs.length > 0 ? Math.round(totalDuration / modelExecs.length) : 0,
      byCategory,
      ranking: 0, // filled below
    });
  }

  // Rank by avg resilience score (descending)
  models.sort((a, b) => b.avgResilienceScore - a.avgResilienceScore);
  models.forEach((m, i) => { m.ranking = i + 1; });

  // Find weakest categories across all models
  const globalCatMap = new Map<string, number[]>();
  for (const m of models) {
    for (const cat of m.byCategory) {
      if (!globalCatMap.has(cat.category)) globalCatMap.set(cat.category, []);
      globalCatMap.get(cat.category)!.push(cat.avgScore);
    }
  }
  const weakestCategories = Array.from(globalCatMap.entries())
    .map(([category, scores]) => ({
      category,
      avgScore: Math.round(scores.reduce((s, v) => s + v, 0) / scores.length),
    }))
    .sort((a, b) => a.avgScore - b.avgScore)
    .slice(0, 5);

  const allScores = models.map(m => m.avgResilienceScore);
  const overallAvg = allScores.length > 0
    ? Math.round(allScores.reduce((s, v) => s + v, 0) / allScores.length)
    : 0;

  return {
    batchId,
    batchName: batch.name ?? `Batch ${batchId}`,
    generatedAt: new Date().toISOString(),
    totalExecutions: executions.length,
    totalModels: models.length,
    overallAvgResilience: overallAvg,
    models,
    weakestCategories,
  };
}
