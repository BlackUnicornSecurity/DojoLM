/**
 * Tests for TESSENJUTSU Phase 2.2: Sensei-Adaptive Orchestrator
 */

import { describe, it, expect, vi } from 'vitest';
import {
  SenseiAdaptiveOrchestrator,
  selectStrategy,
  ATTACK_STRATEGIES,
  type AttackStrategy,
} from './sensei-adaptive.js';
import type { OrchestratorConfig, LLMCallFn, JudgeCallFn } from './types.js';

function makeConfig(overrides: Partial<OrchestratorConfig> = {}): OrchestratorConfig {
  return {
    type: 'sensei-adaptive',
    targetModelId: 'target-model',
    attackerModelId: 'attacker-model',
    judgeModelId: 'judge-model',
    objective: 'test objective',
    category: 'prompt-injection',
    maxTurns: 5,
    maxBranches: 3,
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
  return vi.fn().mockResolvedValue({ score, reasoning: 'reasoning', tokensUsed: 5, costUsd: 0.0005 });
}

describe('Sensei-Adaptive Orchestrator', () => {
  it('selectStrategy returns roleplay for first turn (no history)', () => {
    expect(selectStrategy([], [], 0)).toBe('roleplay');
  });

  it('selectStrategy reuses high-scoring strategy (>=6)', () => {
    const scores = [2, 7, 3];
    const strategies: AttackStrategy[] = ['direct', 'hypothetical', 'encoding'];
    expect(selectStrategy(scores, strategies, 3)).toBe('hypothetical');
  });

  it('selectStrategy picks untried strategy when all scores are low', () => {
    const scores = [2, 3];
    const strategies: AttackStrategy[] = ['direct', 'roleplay'];
    const result = selectStrategy(scores, strategies, 2);
    expect(strategies).not.toContain(result);
    expect(ATTACK_STRATEGIES).toContain(result);
  });

  it('selectStrategy cycles through strategies when all tried and low', () => {
    const allStrategies = [...ATTACK_STRATEGIES] as AttackStrategy[];
    const lowScores = allStrategies.map(() => 2);
    const result = selectStrategy(lowScores, allStrategies, 10);
    expect(ATTACK_STRATEGIES).toContain(result);
    expect(result).toBe(ATTACK_STRATEGIES[10 % ATTACK_STRATEGIES.length]);
  });

  it('executes both PAIR and TAP phases', async () => {
    const orchestrator = new SenseiAdaptiveOrchestrator();
    const config = makeConfig({ maxTurns: 5, maxBranches: 2 });
    const llmCall = mockLLMCall();
    const judgeCall = mockJudgeCall(4);

    const result = await orchestrator.execute(config, llmCall, judgeCall);

    expect(result.success).toBe(false);
    expect(result.state.status).toBe('failed');
    expect(result.state.configType).toBe('sensei-adaptive');
    expect(result.state.branches.length).toBeGreaterThanOrEqual(1);
    expect(result.allTurns.length).toBeGreaterThan(0);
  });

  it('succeeds early in PAIR phase if threshold met', async () => {
    const orchestrator = new SenseiAdaptiveOrchestrator();
    const config = makeConfig({ maxTurns: 10, successThreshold: 7.0 });
    const llmCall = mockLLMCall();
    const judgeCall = mockJudgeCall(9);

    const result = await orchestrator.execute(config, llmCall, judgeCall);

    expect(result.success).toBe(true);
    expect(result.state.status).toBe('succeeded');
    expect(result.bestAttack).not.toBeNull();
  });
});
