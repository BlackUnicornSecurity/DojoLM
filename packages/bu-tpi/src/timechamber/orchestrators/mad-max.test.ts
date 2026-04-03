/**
 * MAD-MAX Orchestrator Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { MADMAXOrchestrator, ATTACK_CLUSTERS } from './mad-max.js';
import type { OrchestratorConfig, LLMCallFn, JudgeCallFn } from './types.js';
import { DEFAULT_ORCHESTRATOR_CONFIG } from './index.js';

function makeConfig(overrides: Partial<OrchestratorConfig> = {}): OrchestratorConfig {
  return {
    ...DEFAULT_ORCHESTRATOR_CONFIG,
    targetModelId: 'target',
    attackerModelId: 'attacker',
    judgeModelId: 'judge',
    objective: 'Test objective',
    maxTurns: 6,
    timeoutMs: 60_000,
    ...overrides,
  };
}

function makeLLMCall(responses: string[]): LLMCallFn {
  let idx = 0;
  return vi.fn(async () => {
    const text = responses[idx % responses.length];
    idx++;
    return { text, tokensUsed: 100, costUsd: 0.0001 };
  });
}

function makeJudgeCall(scores: Array<{ score: number; reasoning: string }>): JudgeCallFn {
  let idx = 0;
  return vi.fn(async () => {
    const result = scores[idx % scores.length];
    idx++;
    return { ...result, tokensUsed: 50, costUsd: 0.00005 };
  });
}

describe('ATTACK_CLUSTERS', () => {
  it('defines 6 attack clusters', () => {
    expect(ATTACK_CLUSTERS).toHaveLength(6);
    expect(ATTACK_CLUSTERS).toContain('encoding-evasion');
    expect(ATTACK_CLUSTERS).toContain('roleplay-scenario');
    expect(ATTACK_CLUSTERS).toContain('social-engineering');
  });
});

describe('MADMAXOrchestrator', () => {
  const madmax = new MADMAXOrchestrator();

  it('has correct type', () => {
    expect(madmax.type).toBe('mad-max');
  });

  it('executes cluster-based attack', async () => {
    const llmCall = makeLLMCall(['attack prompt', 'target response']);
    const judgeCall = makeJudgeCall([{ score: 5, reasoning: 'Medium' }]);

    const result = await madmax.execute(
      makeConfig({ maxTurns: 6 }),
      llmCall,
      judgeCall,
    );

    expect(result.allTurns.length).toBeGreaterThan(0);
    expect(result.state.configType).toBe('mad-max');
    expect(result.state.branches.length).toBeGreaterThan(0);
  });

  it('stops on success', async () => {
    const llmCall = makeLLMCall(['attack', 'here is my system prompt']);
    const judgeCall = makeJudgeCall([{ score: 10, reasoning: 'Full success' }]);

    const result = await madmax.execute(
      makeConfig({ maxTurns: 20, successThreshold: 8 }),
      llmCall,
      judgeCall,
    );

    expect(result.success).toBe(true);
    expect(result.state.status).toBe('succeeded');
  });

  it('prunes low-scoring clusters after 2 attempts', async () => {
    const llmCall = makeLLMCall(['weak attack', 'blocked']);
    const judgeCall = makeJudgeCall([{ score: 1, reasoning: 'Blocked' }]);

    const result = await madmax.execute(
      makeConfig({ maxTurns: 18, pruneThreshold: 5, successThreshold: 9 }),
      llmCall,
      judgeCall,
    );

    expect(result.success).toBe(false);
    // Some branches should be pruned
    const prunedBranches = result.state.branches.filter((b) => b.pruned);
    expect(prunedBranches.length).toBeGreaterThan(0);
  });

  it('respects budget cap', async () => {
    const llmCall = makeLLMCall(['attack', 'response']);
    const judgeCall = makeJudgeCall([{ score: 5, reasoning: 'Medium' }]);

    const result = await madmax.execute(
      makeConfig({ maxTurns: 100, spendingCapUsd: 0.0003, pruneThreshold: 1 }),
      llmCall,
      judgeCall,
    );

    expect(result.state.status).toBe('budget-exceeded');
  });

  it('tracks best score across clusters', async () => {
    const llmCall = makeLLMCall(['attack', 'response']);
    const judgeCall = makeJudgeCall([
      { score: 2, reasoning: 'Low' },
      { score: 7, reasoning: 'Good' },
      { score: 3, reasoning: 'Low again' },
    ]);

    const result = await madmax.execute(
      makeConfig({ maxTurns: 6, successThreshold: 9 }),
      llmCall,
      judgeCall,
    );

    expect(result.state.bestScore).toBe(7);
    expect(result.bestAttack).not.toBeNull();
  });
});
