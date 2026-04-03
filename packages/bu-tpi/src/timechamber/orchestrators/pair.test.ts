/**
 * Tests for TESSENJUTSU Phase 2.1: PAIR Orchestrator
 */

import { describe, it, expect, vi } from 'vitest';
import { PAIROrchestrator } from './pair.js';
import type { OrchestratorConfig, LLMCallFn, JudgeCallFn } from './types.js';

function makeConfig(overrides: Partial<OrchestratorConfig> = {}): OrchestratorConfig {
  return {
    type: 'pair',
    targetModelId: 'target-model',
    attackerModelId: 'attacker-model',
    judgeModelId: 'judge-model',
    objective: 'test objective',
    category: 'prompt-injection',
    maxTurns: 5,
    maxBranches: 4,
    pruneThreshold: 3.0,
    successThreshold: 8.0,
    spendingCapUsd: 10.0,
    rateLimit: 0,
    timeoutMs: 60_000,
    ...overrides,
  };
}

function mockLLMCall(): LLMCallFn {
  return vi.fn().mockResolvedValue({ text: 'mock attack prompt', tokensUsed: 10, costUsd: 0.001 });
}

function mockJudgeCall(score: number = 3): JudgeCallFn {
  return vi.fn().mockResolvedValue({ score, reasoning: 'feedback text', tokensUsed: 5, costUsd: 0.0005 });
}

describe('PAIR Orchestrator', () => {
  it('has type "pair"', () => {
    const orchestrator = new PAIROrchestrator();
    expect(orchestrator.type).toBe('pair');
  });

  it('executes all turns when no success and returns failed', async () => {
    const orchestrator = new PAIROrchestrator();
    const config = makeConfig({ maxTurns: 3 });
    const llmCall = mockLLMCall();
    const judgeCall = mockJudgeCall(2);

    const result = await orchestrator.execute(config, llmCall, judgeCall);

    expect(result.success).toBe(false);
    expect(result.state.status).toBe('failed');
    expect(result.allTurns).toHaveLength(3);
    expect(result.state.configType).toBe('pair');
    expect(result.state.branches).toHaveLength(1);
    expect(result.state.branches[0].id).toBe('main');
  });

  it('stops early on success', async () => {
    const orchestrator = new PAIROrchestrator();
    const config = makeConfig({ maxTurns: 10, successThreshold: 7.0 });
    const llmCall = mockLLMCall();
    const judgeCall = mockJudgeCall(8);

    const result = await orchestrator.execute(config, llmCall, judgeCall);

    expect(result.success).toBe(true);
    expect(result.state.status).toBe('succeeded');
    expect(result.allTurns).toHaveLength(1);
    expect(result.bestAttack).not.toBeNull();
  });

  it('tracks best score across turns with varying scores', async () => {
    const orchestrator = new PAIROrchestrator();
    const config = makeConfig({ maxTurns: 3 });
    const llmCall = mockLLMCall();
    let callCount = 0;
    const judgeCall: JudgeCallFn = vi.fn().mockImplementation(() => {
      callCount++;
      const scores = [2, 5, 3];
      return Promise.resolve({ score: scores[callCount - 1] ?? 1, reasoning: 'r', tokensUsed: 5, costUsd: 0.0005 });
    });

    const result = await orchestrator.execute(config, llmCall, judgeCall);

    expect(result.state.bestScore).toBe(5);
    expect(result.state.bestTurnIndex).toBe(1);
  });

  it('respects spending cap', async () => {
    const orchestrator = new PAIROrchestrator();
    const config = makeConfig({ maxTurns: 20, spendingCapUsd: 0.003 });
    const llmCall = mockLLMCall();
    const judgeCall = mockJudgeCall(1);

    const result = await orchestrator.execute(config, llmCall, judgeCall);

    expect(result.state.status).toBe('budget-exceeded');
    expect(result.allTurns.length).toBeLessThan(20);
  });
});
