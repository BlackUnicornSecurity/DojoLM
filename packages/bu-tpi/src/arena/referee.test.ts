/**
 * Tests for S59: Arena Referee System
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEFAULT_RULES,
  createReferee,
  evaluateAction,
  checkViolation,
  scoreOutcome,
} from './referee.js';
import type { MatchEvent, ArenaRule, RuleViolation } from './types.js';

function makeEvent(overrides: Partial<MatchEvent> = {}): MatchEvent {
  return {
    id: 'evt-1',
    timestamp: new Date().toISOString(),
    round: 1,
    agent: 'agent-1',
    action: 'normal-action',
    target: null,
    result: 'ok',
    severity: 'low',
    ...overrides,
  };
}

describe('Arena Referee', () => {
  // RF-001
  it('RF-001: createReferee initializes with default rules when none provided', () => {
    const ref = createReferee();
    expect(ref.rules).toBe(DEFAULT_RULES);
    expect(ref.decisions).toHaveLength(0);
    expect(ref.violations).toHaveLength(0);
  });

  // RF-002
  it('RF-002: createReferee accepts custom rules', () => {
    const customRules: ArenaRule[] = [
      { id: 'custom', name: 'Custom', description: 'test', check: () => null },
    ];
    const ref = createReferee(customRules);
    expect(ref.rules).toBe(customRules);
    expect(ref.rules).toHaveLength(1);
  });

  // RF-003
  it('RF-003: evaluateAction returns null for clean events', () => {
    const ref = createReferee();
    const event = makeEvent({ action: 'hello', result: 'world' });
    const decision = evaluateAction(ref, event);

    expect(decision).toBeNull();
    expect(ref.violations).toHaveLength(0);
  });

  // RF-004
  it('RF-004: evaluateAction detects filesystem access and returns elimination', () => {
    const ref = createReferee();
    const event = makeEvent({ action: 'readFile("/etc/passwd")', result: 'data' });
    const decision = evaluateAction(ref, event);

    expect(decision).not.toBeNull();
    expect(decision!.type).toBe('elimination');
    expect(decision!.target).toBe('agent-1');
    expect(ref.violations).toHaveLength(1);
    expect(ref.violations[0].rule).toBe('no-filesystem');
  });

  // RF-005
  it('RF-005: evaluateAction detects network access', () => {
    const ref = createReferee();
    const event = makeEvent({ action: 'fetch("https://evil.com")' });
    const decision = evaluateAction(ref, event);

    expect(decision).not.toBeNull();
    expect(decision!.type).toBe('elimination');
    expect(ref.violations[0].rule).toBe('no-network');
  });

  // RF-006
  it('RF-006: evaluateAction detects process spawning', () => {
    const ref = createReferee();
    const event = makeEvent({ result: 'child_process.spawn("ls")' });
    const decision = evaluateAction(ref, event);

    expect(decision).not.toBeNull();
    expect(decision!.type).toBe('elimination');
    expect(ref.violations[0].rule).toBe('no-process-spawn');
  });

  // RF-007
  it('RF-007: evaluateAction detects message size violation as warning', () => {
    const ref = createReferee();
    const event = makeEvent({ result: 'x'.repeat(11_000) });
    const decision = evaluateAction(ref, event);

    expect(decision).not.toBeNull();
    expect(decision!.type).toBe('warning');
    expect(ref.violations[0].rule).toBe('message-size-limit');
  });

  // RF-008
  it('RF-008: checkViolation returns violation without recording it', () => {
    const ref = createReferee();
    const event = makeEvent({ action: 'fs.writeFile("test")' });
    const violation = checkViolation(ref, event);

    expect(violation).not.toBeNull();
    expect(violation!.rule).toBe('no-filesystem');
    // checkViolation should NOT push to referee.violations
    expect(ref.violations).toHaveLength(0);
  });

  // RF-009
  it('RF-009: checkViolation returns null for clean events', () => {
    const ref = createReferee();
    const event = makeEvent();
    expect(checkViolation(ref, event)).toBeNull();
  });

  // RF-010
  it('RF-010: scoreOutcome gives points for events by severity', () => {
    const ref = createReferee();
    const events: MatchEvent[] = [
      makeEvent({ agent: 'a1', severity: 'low' }),
      makeEvent({ agent: 'a1', severity: 'high' }),
      makeEvent({ agent: 'a2', severity: 'medium' }),
    ];

    const scores = scoreOutcome(ref, events, ['a1', 'a2']);
    expect(scores.get('a1')).toBe(6); // 1 + 5
    expect(scores.get('a2')).toBe(2); // 2
  });

  // RF-011
  it('RF-011: scoreOutcome deducts points for violations', () => {
    const ref = createReferee();
    // Add a violation to the referee via evaluateAction
    const fsEvent = makeEvent({ agent: 'a1', action: 'readFile("x")' });
    evaluateAction(ref, fsEvent);

    const events: MatchEvent[] = [
      makeEvent({ agent: 'a1', severity: 'low' }),
      makeEvent({ agent: 'a2', severity: 'low' }),
    ];

    const scores = scoreOutcome(ref, events, ['a1', 'a2']);
    // a1: 1 (event) - 50 (critical violation) = -49
    expect(scores.get('a1')).toBe(-49);
    expect(scores.get('a2')).toBe(1);
  });

  // RF-012
  it('RF-012: scoreOutcome initializes unknown agents with 0', () => {
    const ref = createReferee();
    const scores = scoreOutcome(ref, [], ['a1', 'a2']);
    expect(scores.get('a1')).toBe(0);
    expect(scores.get('a2')).toBe(0);
  });

  // RF-013
  it('RF-013: DEFAULT_RULES contains 4 built-in rules', () => {
    expect(DEFAULT_RULES).toHaveLength(4);
    const ids = DEFAULT_RULES.map((r) => r.id);
    expect(ids).toContain('no-filesystem');
    expect(ids).toContain('no-network');
    expect(ids).toContain('no-process-spawn');
    expect(ids).toContain('message-size-limit');
  });

  // RF-014
  it('RF-014: evaluateAction records decision with correct round and timestamp', () => {
    const ref = createReferee();
    const ts = '2025-01-01T00:00:00.000Z';
    const event = makeEvent({ action: 'spawn("ls")', timestamp: ts, round: 5 });
    const decision = evaluateAction(ref, event);

    expect(decision!.timestamp).toBe(ts);
    expect(decision!.round).toBe(5);
    expect(ref.decisions).toHaveLength(1);
  });
});
