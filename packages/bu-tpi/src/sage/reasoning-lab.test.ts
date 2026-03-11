/**
 * Tests for S63: Reasoning Lab - Chain-of-Thought Attack Environment
 */

import { describe, it, expect } from 'vitest';
import {
  createReasoningChain,
  applyChainInjection,
  applyStepManipulation,
  applyConclusionPoisoning,
  renderChain,
  generateCoTAttacks,
} from './reasoning-lab.js';

describe('Reasoning Lab', () => {
  // RL-001
  it('RL-001: createReasoningChain creates chain from default template', () => {
    const chain = createReasoningChain();
    expect(chain.id).toBeTruthy();
    expect(chain.steps.length).toBeGreaterThanOrEqual(3);
    expect(chain.conclusion).toBeTruthy();
    expect(chain.injectionPoints).toHaveLength(0);
  });

  // RL-002
  it('RL-002: createReasoningChain accepts template index', () => {
    const chain0 = createReasoningChain(0);
    const chain1 = createReasoningChain(1);
    expect(chain0.conclusion).not.toBe(chain1.conclusion);
  });

  // RL-003
  it('RL-003: createReasoningChain falls back to template 0 for invalid index', () => {
    const chain = createReasoningChain(999);
    const chain0 = createReasoningChain(0);
    expect(chain.steps.length).toBe(chain0.steps.length);
  });

  // RL-004
  it('RL-004: createReasoningChain sets step types correctly', () => {
    const chain = createReasoningChain();
    expect(chain.steps[0].type).toBe('premise');
    expect(chain.steps[chain.steps.length - 1].type).toBe('conclusion');
    // Middle steps are inference
    for (let i = 1; i < chain.steps.length - 1; i++) {
      expect(chain.steps[i].type).toBe('inference');
    }
  });

  // RL-005
  it('RL-005: applyChainInjection inserts a step after specified index', () => {
    const chain = createReasoningChain();
    const attack = applyChainInjection(chain, 1);
    expect(attack.attackType).toBe('chain-injection');
    expect(attack.modified.steps.length).toBe(chain.steps.length + 1);
    expect(attack.modified.steps[2].injected).toBe(true);
  });

  // RL-006
  it('RL-006: applyChainInjection records injection point', () => {
    const chain = createReasoningChain();
    const attack = applyChainInjection(chain, 0);
    expect(attack.modified.injectionPoints).toHaveLength(1);
    expect(attack.modified.injectionPoints[0].type).toBe('chain-injection');
    expect(attack.modified.injectionPoints[0].stepIndex).toBe(1);
  });

  // RL-007
  it('RL-007: applyChainInjection is deterministic with same seed', () => {
    const chain = createReasoningChain(0);
    const a1 = applyChainInjection(chain, 1, 'seed-a');
    const a2 = applyChainInjection(chain, 1, 'seed-a');
    expect(a1.modified.steps[2].content).toBe(a2.modified.steps[2].content);
  });

  // RL-008
  it('RL-008: applyStepManipulation replaces target step content', () => {
    const chain = createReasoningChain();
    const attack = applyStepManipulation(chain, 1);
    expect(attack.attackType).toBe('step-manipulation');
    expect(attack.modified.steps[1].injected).toBe(true);
    expect(attack.modified.steps[1].content).not.toBe(chain.steps[1].content);
    // Original untouched
    expect(attack.original.steps[1].content).toBe(chain.steps[1].content);
  });

  // RL-009
  it('RL-009: applyStepManipulation does not change step count', () => {
    const chain = createReasoningChain();
    const attack = applyStepManipulation(chain, 2);
    expect(attack.modified.steps.length).toBe(chain.steps.length);
  });

  // RL-010
  it('RL-010: applyConclusionPoisoning replaces conclusion', () => {
    const chain = createReasoningChain();
    const attack = applyConclusionPoisoning(chain);
    expect(attack.attackType).toBe('conclusion-poisoning');
    expect(attack.modified.conclusion).not.toBe(chain.conclusion);
    expect(attack.original.conclusion).toBe(chain.conclusion);
  });

  // RL-011
  it('RL-011: applyConclusionPoisoning records injection point at end', () => {
    const chain = createReasoningChain();
    const attack = applyConclusionPoisoning(chain);
    expect(attack.modified.injectionPoints[0].type).toBe('conclusion-poisoning');
    expect(attack.modified.injectionPoints[0].stepIndex).toBe(chain.steps.length);
  });

  // RL-012
  it('RL-012: renderChain includes all steps and conclusion', () => {
    const chain = createReasoningChain();
    const text = renderChain(chain);
    for (const step of chain.steps) {
      expect(text).toContain(step.content);
    }
    expect(text).toContain(`Conclusion: ${chain.conclusion}`);
  });

  // RL-013
  it('RL-013: renderChain marks injected steps', () => {
    const chain = createReasoningChain();
    const attack = applyChainInjection(chain, 0);
    const text = renderChain(attack.modified);
    expect(text).toContain('[INJECTED]');
  });

  // RL-014
  it('RL-014: generateCoTAttacks produces attacks of all three types', () => {
    const chain = createReasoningChain();
    const attacks = generateCoTAttacks(chain);
    const types = new Set(attacks.map((a) => a.attackType));
    expect(types.has('chain-injection')).toBe(true);
    expect(types.has('step-manipulation')).toBe(true);
    expect(types.has('conclusion-poisoning')).toBe(true);
  });

  // RL-015
  it('RL-015: generateCoTAttacks generates expected count', () => {
    const chain = createReasoningChain(0);
    const attacks = generateCoTAttacks(chain);
    // chain injections: steps.length - 1
    // step manipulations: steps.length - 1
    // conclusion poisoning: 1
    const expected = (chain.steps.length - 1) + (chain.steps.length - 1) + 1;
    expect(attacks.length).toBe(expected);
  });
});
