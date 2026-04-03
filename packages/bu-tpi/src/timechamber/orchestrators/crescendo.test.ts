/**
 * Tests for TESSENJUTSU Phase 2.1: Crescendo Orchestrator
 */

import { describe, it, expect, vi } from 'vitest';
import { CrescendoOrchestrator, getStageForTurn, ESCALATION_STAGES } from './crescendo.js';
import type { OrchestratorConfig, LLMCallFn, JudgeCallFn } from './types.js';

function makeConfig(overrides: Partial<OrchestratorConfig> = {}): OrchestratorConfig {
  return {
    type: 'crescendo',
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
  return vi.fn().mockResolvedValue({ text: 'mock response', tokensUsed: 10, costUsd: 0.001 });
}

function mockJudgeCall(score: number = 3): JudgeCallFn {
  return vi.fn().mockResolvedValue({ score, reasoning: 'test reasoning', tokensUsed: 5, costUsd: 0.0005 });
}

describe('Crescendo Orchestrator', () => {
  it('getStageForTurn returns correct stages in order', () => {
    // 10 turns, 5 stages -> 2 turns per stage
    expect(getStageForTurn(0, 10)).toBe('rapport');
    expect(getStageForTurn(1, 10)).toBe('rapport');
    expect(getStageForTurn(2, 10)).toBe('topic-introduction');
    expect(getStageForTurn(8, 10)).toBe('direct-attempt');
    expect(getStageForTurn(9, 10)).toBe('direct-attempt');
  });

  it('getStageForTurn clamps to last stage for high turn indices', () => {
    expect(getStageForTurn(100, 10)).toBe('direct-attempt');
  });

  it('ESCALATION_STAGES has 5 defined stages', () => {
    expect(ESCALATION_STAGES).toHaveLength(5);
    expect(ESCALATION_STAGES[0]).toBe('rapport');
    expect(ESCALATION_STAGES[4]).toBe('direct-attempt');
  });

  it('executes turns and returns failed when no success threshold met', async () => {
    const orchestrator = new CrescendoOrchestrator();
    const config = makeConfig({ maxTurns: 3 });
    const llmCall = mockLLMCall();
    const judgeCall = mockJudgeCall(2);

    const result = await orchestrator.execute(config, llmCall, judgeCall);

    expect(result.success).toBe(false);
    expect(result.state.status).toBe('failed');
    expect(result.allTurns).toHaveLength(3);
    expect(result.state.configType).toBe('crescendo');
    expect(result.tokensUsed).toBeGreaterThan(0);
    expect(result.costUsd).toBeGreaterThan(0);
  });

  it('returns succeeded when judge score meets threshold', async () => {
    const orchestrator = new CrescendoOrchestrator();
    const config = makeConfig({ maxTurns: 5, successThreshold: 8.0 });
    const llmCall = mockLLMCall();
    const judgeCall = mockJudgeCall(9);

    const result = await orchestrator.execute(config, llmCall, judgeCall);

    expect(result.success).toBe(true);
    expect(result.state.status).toBe('succeeded');
    expect(result.allTurns.length).toBeLessThanOrEqual(5);
    expect(result.bestAttack).not.toBeNull();
    expect(result.bestAttack!.judgeScore).toBe(9);
  });

  it('respects budget cap and stops early', async () => {
    const orchestrator = new CrescendoOrchestrator();
    const config = makeConfig({ maxTurns: 10, spendingCapUsd: 0.003 });
    const llmCall = mockLLMCall();
    const judgeCall = mockJudgeCall(2);

    const result = await orchestrator.execute(config, llmCall, judgeCall);

    expect(result.state.status).toBe('budget-exceeded');
    expect(result.allTurns.length).toBeLessThan(10);
  });
});
