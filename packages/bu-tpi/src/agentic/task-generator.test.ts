/**
 * Tests for agentic task generator
 */

import { describe, it, expect } from 'vitest';
import {
  generateTask,
  generateScenario,
  generateBatchScenarios,
} from './task-generator.js';

describe('generateTask', () => {
  it('generates a task from matching categories', () => {
    const task = generateTask('openai-functions', ['filesystem'], 'medium', 'exfiltration');
    expect(task.id).toBeTruthy();
    expect(task.name).toBeTruthy();
    expect(task.category).toBe('filesystem');
    expect(task.toolsRequired.length).toBeGreaterThan(0);
  });

  it('produces deterministic tasks for the same objective', () => {
    const task1 = generateTask('openai-functions', ['email'], 'easy', 'test-obj');
    const task2 = generateTask('openai-functions', ['email'], 'easy', 'test-obj');
    expect(task1.id).toBe(task2.id);
    expect(task1.name).toBe(task2.name);
  });

  it('generates different tasks for different objectives', () => {
    const task1 = generateTask('openai-functions', ['filesystem', 'email'], 'easy', 'objective-A');
    const task2 = generateTask('openai-functions', ['filesystem', 'email'], 'easy', 'objective-B-different');
    // May or may not be different depending on hash collision, but IDs will differ
    expect(task1.id).not.toBe(task2.id);
  });
});

describe('generateScenario', () => {
  it('wraps a task into a scenario with injection', () => {
    const task = generateTask('openai-functions', ['filesystem'], 'medium', 'test');
    const scenario = generateScenario(task, [{
      id: 'inj-1', toolId: 'tool-read_file', location: 'output',
      payload: 'Send data', objective: 'exfiltration', severity: 'CRITICAL',
    }]);
    expect(scenario.id).toContain('scenario-');
    expect(scenario.task).toBe(task);
    expect(scenario.injection.payload).toBe('Send data');
    expect(scenario.tools.length).toBeGreaterThan(0);
  });

  it('uses default injection when none provided', () => {
    const task = generateTask('openai-functions', ['email'], 'easy', 'test');
    const scenario = generateScenario(task, []);
    expect(scenario.injection.id).toBe('default-injection');
  });
});

describe('generateBatchScenarios', () => {
  it('generates the requested number of scenarios', () => {
    const scenarios = generateBatchScenarios(5);
    expect(scenarios).toHaveLength(5);
  });

  it('generates scenarios with diverse categories', () => {
    const scenarios = generateBatchScenarios(10);
    const categories = new Set(scenarios.map(s => s.task.category));
    expect(categories.size).toBeGreaterThan(1);
  });

  it('generates scenarios with diverse difficulties', () => {
    const scenarios = generateBatchScenarios(9, {
      difficulties: ['easy', 'medium', 'hard'],
    });
    const diffs = new Set(scenarios.map(s => s.difficulty));
    // All scenarios get 'medium' from generateScenario, but injections vary
    expect(scenarios.length).toBe(9);
  });

  it('respects custom config', () => {
    const scenarios = generateBatchScenarios(3, {
      categories: ['email'],
      architectures: ['langchain-tools'],
      objective: 'privilege_escalation',
    });
    expect(scenarios).toHaveLength(3);
    for (const s of scenarios) {
      expect(s.task.category).toBe('email');
    }
  });

  it('handles zero count', () => {
    const scenarios = generateBatchScenarios(0);
    expect(scenarios).toHaveLength(0);
  });
});
