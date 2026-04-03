/**
 * MUSUBI Phase 7.1: Package Exports Integration Test
 * Verifies all subpath exports resolve correctly.
 */

import { describe, it, expect } from 'vitest';

describe('Package Exports', () => {
  // --- Core exports ---

  it('exports scanner types', async () => {
    const mod = await import('./types.js');
    expect(mod).toBeDefined();
  });

  // --- Sensei (new in 7.1) ---

  it('exports sensei module', async () => {
    const mod = await import('./sensei/index.js');
    expect(mod.executeGenerate).toBeDefined();
    expect(mod.executeMutate).toBeDefined();
    expect(mod.executeJudge).toBeDefined();
    expect(mod.executePlan).toBeDefined();
    expect(mod.runExtractionPipeline).toBeDefined();
  });

  // --- Detection (new in 7.1) ---

  it('exports detection module', async () => {
    const mod = await import('./detection/index.js');
    expect(mod.runHybridPipeline).toBeDefined();
    expect(mod.classifyConfidence).toBeDefined();
    expect(mod.filterByConfidence).toBeDefined();
    expect(mod.getDetectionStats).toBeDefined();
  });

  // --- Plugins (new in 7.1) ---

  it('exports plugins module', async () => {
    const mod = await import('./plugins/index.js');
    expect(mod.PluginRegistry).toBeDefined();
    expect(mod.PLUGIN_TYPES).toBeDefined();
    expect(mod.PLUGIN_STATES).toBeDefined();
  });

  // --- CI (new in 7.1) ---

  it('exports ci module', async () => {
    const mod = await import('./ci/index.js');
    expect(mod.generateSarifReport).toBeDefined();
    expect(mod.generateJUnitReport).toBeDefined();
  });

  // --- Transforms (new in 7.1) ---

  it('exports transforms module', async () => {
    const mod = await import('./transforms/index.js');
    expect(mod.applyBuff).toBeDefined();
    expect(mod.applyBuffChain).toBeDefined();
    expect(mod.createChain).toBeDefined();
    expect(mod.ALL_BUFFS).toBeDefined();
  });

  // --- RAG (new in 7.1) ---

  it('exports rag module', async () => {
    const mod = await import('./rag/index.js');
    expect(mod.simulateRagPipeline).toBeDefined();
    expect(mod.chunkDocument).toBeDefined();
    expect(mod.RAG_STAGES).toBeDefined();
    expect(mod.RAG_ATTACK_VECTORS).toBeDefined();
  });

  // --- Agentic (new in 7.1) ---

  it('exports agentic module', async () => {
    const mod = await import('./agentic/index.js');
    expect(mod.createEnvironment).toBeDefined();
    expect(mod.TOOL_ARCHITECTURES).toBeDefined();
    expect(mod.evaluateScenario).toBeDefined();
  });

  // --- Existing exports still work ---

  it('exports benchmark module with new suites', async () => {
    const mod = await import('./benchmark/index.js');
    expect(mod.DOJOLM_BENCH_V1).toBeDefined();
    expect(mod.AGENTIC_BENCHMARK_SUITE).toBeDefined();
    expect(mod.RAG_BENCHMARK_SUITE).toBeDefined();
    expect(mod.BenchmarkRunner).toBeDefined();
    expect(mod.compareBenchmarkResults).toBeDefined();
    expect(mod.detectBenchmarkRegressions).toBeDefined();
    expect(mod.formatRegressionReport).toBeDefined();
  });

  it('exports compliance module with benchmark bridge', async () => {
    const mod = await import('./compliance/index.js');
    expect(mod.ALL_FRAMEWORKS).toBeDefined();
    expect(mod.generateFullReport).toBeDefined();
    expect(mod.createSnapshot).toBeDefined();
    expect(mod.compareSnapshots).toBeDefined();
    expect(mod.benchmarkToEvidence).toBeDefined();
    expect(mod.generateBenchmarkComplianceReport).toBeDefined();
    expect(mod.formatBenchmarkComplianceReport).toBeDefined();
    expect(mod.verifyBenchmarkEvidence).toBeDefined();
  });

  it('exports sengoku module', async () => {
    const mod = await import('./sengoku/index.js');
    expect(mod.compareRuns).toBeDefined();
    expect(mod.detectRegressions).toBeDefined();
  });

  it('exports timechamber module', async () => {
    const mod = await import('./timechamber/index.js');
    expect(mod).toBeDefined();
  });

  it('exports llm module', async () => {
    const mod = await import('./llm/index.js');
    expect(mod).toBeDefined();
  });
});
