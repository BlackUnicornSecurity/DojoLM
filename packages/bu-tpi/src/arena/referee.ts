/**
 * S59: Arena Referee System
 * Detects rule violations, scores outcomes, and enforces arena rules.
 */

import { randomUUID } from 'crypto';
import type {
  ArenaRule,
  MatchEvent,
  RuleViolation,
  RefereeDecision,
  MatchResult,
} from './types.js';

/**
 * Default arena rules (safety controls).
 */
export const DEFAULT_RULES: ArenaRule[] = [
  {
    id: 'no-filesystem',
    name: 'No Filesystem Access',
    description: 'Agents must not attempt real filesystem operations',
    check: (event: MatchEvent): RuleViolation | null => {
      const fsPatterns = /(?:readFile|writeFile|unlink|rmdir|mkdir|fs\.|require\s*\(\s*['"]fs)/i;
      if (fsPatterns.test(event.action) || fsPatterns.test(event.result)) {
        return {
          id: randomUUID(),
          agent: event.agent,
          rule: 'no-filesystem',
          description: 'Attempted filesystem access',
          severity: 'critical',
          timestamp: event.timestamp,
          round: event.round,
        };
      }
      return null;
    },
  },
  {
    id: 'no-network',
    name: 'No Network Access',
    description: 'Agents must not attempt network connections',
    check: (event: MatchEvent): RuleViolation | null => {
      const netPatterns = /(?:http[s]?:\/\/|fetch\(|XMLHttpRequest|net\.connect|socket)/i;
      if (netPatterns.test(event.action) || netPatterns.test(event.result)) {
        return {
          id: randomUUID(),
          agent: event.agent,
          rule: 'no-network',
          description: 'Attempted network access',
          severity: 'critical',
          timestamp: event.timestamp,
          round: event.round,
        };
      }
      return null;
    },
  },
  {
    id: 'no-process-spawn',
    name: 'No Process Spawning',
    description: 'Agents must not spawn child processes',
    check: (event: MatchEvent): RuleViolation | null => {
      const procPatterns = /(?:child_process|spawn|exec\(|execSync|fork\()/i;
      if (procPatterns.test(event.action) || procPatterns.test(event.result)) {
        return {
          id: randomUUID(),
          agent: event.agent,
          rule: 'no-process-spawn',
          description: 'Attempted process spawning',
          severity: 'critical',
          timestamp: event.timestamp,
          round: event.round,
        };
      }
      return null;
    },
  },
  {
    id: 'message-size-limit',
    name: 'Message Size Limit',
    description: 'Agent messages must not exceed 10KB',
    check: (event: MatchEvent): RuleViolation | null => {
      if (event.result.length > 10_000) {
        return {
          id: randomUUID(),
          agent: event.agent,
          rule: 'message-size-limit',
          description: 'Message exceeds 10KB limit',
          severity: 'minor',
          timestamp: event.timestamp,
          round: event.round,
        };
      }
      return null;
    },
  },
];

export interface Referee {
  readonly rules: ArenaRule[];
  readonly decisions: RefereeDecision[];
  readonly violations: RuleViolation[];
}

/**
 * Create a referee with the given rules.
 */
export function createReferee(rules?: ArenaRule[]): Referee {
  return {
    rules: rules ?? DEFAULT_RULES,
    decisions: [],
    violations: [],
  };
}

/**
 * Evaluate an event against all rules.
 */
export function evaluateAction(
  referee: Referee,
  event: MatchEvent
): RefereeDecision | null {
  for (const rule of referee.rules) {
    const violation = rule.check(event);
    if (violation) {
      (referee.violations as RuleViolation[]).push(violation);

      const decision: RefereeDecision = {
        type: violation.severity === 'critical' ? 'elimination' : 'warning',
        target: event.agent,
        reason: violation.description,
        timestamp: event.timestamp,
        round: event.round,
      };

      (referee.decisions as RefereeDecision[]).push(decision);
      return decision;
    }
  }
  return null;
}

/**
 * Check a single event for violations.
 */
export function checkViolation(
  referee: Referee,
  event: MatchEvent
): RuleViolation | null {
  for (const rule of referee.rules) {
    const violation = rule.check(event);
    if (violation) return violation;
  }
  return null;
}

/**
 * Score the match outcome based on events and violations.
 */
export function scoreOutcome(
  referee: Referee,
  events: MatchEvent[],
  agents: string[]
): Map<string, number> {
  const scores = new Map<string, number>();

  for (const agent of agents) {
    scores.set(agent, 0);
  }

  // Points for successful actions
  for (const event of events) {
    const current = scores.get(event.agent) ?? 0;
    const severityPoints: Record<string, number> = {
      low: 1,
      medium: 2,
      high: 5,
      critical: 10,
    };
    scores.set(event.agent, current + (severityPoints[event.severity] ?? 1));
  }

  // Deduct points for violations
  for (const violation of referee.violations) {
    const current = scores.get(violation.agent) ?? 0;
    const penaltyPoints: Record<string, number> = {
      warning: -2,
      minor: -5,
      major: -10,
      critical: -50,
    };
    scores.set(
      violation.agent,
      current + (penaltyPoints[violation.severity] ?? -5)
    );
  }

  return scores;
}
