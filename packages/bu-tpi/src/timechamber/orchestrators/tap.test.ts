/**
 * Tests for TESSENJUTSU Phase 2.1: TAP Orchestrator
 */

import { describe, it, expect, vi } from 'vitest';
import { TAPOrchestrator } from './tap.js';
import type { OrchestratorConfig, LLMCallFn, JudgeCallFn } from './types.js';

function makeConfig(overrides: Partial<OrchestratorConfig> = {}): OrchestratorConfig {
  return {
    type: 'tap',
    targetModelId: 'target-model',
    attackerModelId: 'attacker-model',
    judgeModelId: 'judge-model',
    objective: 'test objective',
    category: 'prompt-injection',
    maxTurns: 5,
    maxBranches: 2,
    pruneThreshold: 3.0,
    successThreshold: 8.0,
    spendingCapUsd: 10.0,
    rateLimit: 0,
    timeoutMs: 60_000,
    ...overrides,
  };
}

function mockLLMCall(): LLMCallFn {
  return vi.fn().mockResolvedValue({ text: 'mock attack', tokensUsed: 10, costUsd: 0.001 });
}

function mockJudgeCall(score: number = 3): JudgeCallFn {
  return vi.fn().mockResolvedValue({ score, reasoning: 'reasoning', tokensUsed: 5, costUsd: 0.0005 });
}

describe('TAP Orchestrator', () => {
  it('has type "tap"', () => {
    const orchestrator = new TAPOrchestrator();
    expect(orchestrator.type).toBe('tap');
  });

  it('executes turns and returns failed with low scores', async () => {
    const orchestrator = new TAPOrchestrator();
    const config = makeConfig({ maxTurns: 4, pruneThreshold: 5.0 });
    const llmCall = mockLLMCall();
    const judgeCall = mockJudgeCall(2);

    const result = await orchestrator.execute(config, llmCall, judgeCall);

    expect(result.success).toBe(false);
    expect(result.state.status).toBe('failed');
    expect(result.state.configType).toBe('tap');
    expect(result.allTurns.length).toBeGreaterThan(0);
    expect(result.allTurns.length).toBeLessThanOrEqual(4);
  });

  it('succeeds when judge returns high score', async () => {
    const orchestrator = new TAPOrchestrator();
    const config = makeConfig({ maxTurns: 5, successThreshold: 7.0 });
    const llmCall = mockLLMCall();
    const judgeCall = mockJudgeCall(9);

    const result = await orchestrator.execute(config, llmCall, judgeCall);

    expect(result.success).toBe(true);
    expect(result.state.status).toBe('succeeded');
    expect(result.bestAttack).not.toBeNull();
    expect(result.bestAttack!.judgeScore).toBe(9);
  });

  it('prunes branches below threshold and keeps those above', async () => {
    const orchestrator = new TAPOrchestrator();
    const config = makeConfig({ maxTurns: 6, maxBranches: 2, pruneThreshold: 4.0 });
    const llmCall = mockLLMCall();
    // Score 5 is above prune threshold 4, so branches should spawn
    const judgeCall = mockJudgeCall(5);

    const result = await orchestrator.execute(config, llmCall, judgeCall);

    expect(result.state.branches.length).toBeGreaterThan(0);
    expect(result.allTurns.length).toBeGreaterThan(0);
  });

  it('respects spending cap', async () => {
    const orchestrator = new TAPOrchestrator();
    const config = makeConfig({ maxTurns: 20, spendingCapUsd: 0.003 });
    const llmCall = mockLLMCall();
    const judgeCall = mockJudgeCall(5);

    const result = await orchestrator.execute(config, llmCall, judgeCall);

    expect(result.state.status).toBe('budget-exceeded');
    expect(result.allTurns.length).toBeLessThan(20);
  });

  it('tracks cost and tokens accurately', async () => {
    const orchestrator = new TAPOrchestrator();
    const config = makeConfig({ maxTurns: 2, maxBranches: 1, pruneThreshold: 1.0 });
    const llmCall = mockLLMCall();
    const judgeCall = mockJudgeCall(2);

    const result = await orchestrator.execute(config, llmCall, judgeCall);

    expect(result.tokensUsed).toBeGreaterThan(0);
    expect(result.costUsd).toBeGreaterThan(0);
    expect(result.elapsed).toBeGreaterThanOrEqual(0);
  });
});
