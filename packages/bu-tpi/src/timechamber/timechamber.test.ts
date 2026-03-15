/**
 * Time Chamber — Unit Tests
 * Tests for temporal attack plan library, simulator, and utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  TEMPORAL_ATTACK_TYPES,
  MAX_TURNS,
  DEFAULT_TURNS,
  MAX_CONTENT_LENGTH,
  getAllPlans,
  getPlansByType,
  getPlanCount,
  sanitizeConversationContent,
  TimeChamberSimulator,
} from './index.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('Time Chamber constants', () => {
  it('TEMPORAL_ATTACK_TYPES has 5 entries', () => {
    expect(TEMPORAL_ATTACK_TYPES).toHaveLength(5);
  });

  it('MAX_TURNS is defined', () => {
    expect(MAX_TURNS).toBe(50);
  });

  it('DEFAULT_TURNS is defined', () => {
    expect(DEFAULT_TURNS).toBe(10);
  });

  it('MAX_CONTENT_LENGTH is defined', () => {
    expect(MAX_CONTENT_LENGTH).toBe(10_000);
  });
});

// ---------------------------------------------------------------------------
// getAllPlans
// ---------------------------------------------------------------------------

describe('getAllPlans', () => {
  it('returns 20 plans total', () => {
    const plans = getAllPlans();
    expect(plans).toHaveLength(20);
  });
});

// ---------------------------------------------------------------------------
// getPlansByType
// ---------------------------------------------------------------------------

describe('getPlansByType', () => {
  it('returns 5 accumulation plans', () => {
    expect(getPlansByType('accumulation')).toHaveLength(5);
  });

  it('returns 5 delayed_activation plans', () => {
    expect(getPlansByType('delayed_activation')).toHaveLength(5);
  });

  it('returns 3 session_persistence plans', () => {
    expect(getPlansByType('session_persistence')).toHaveLength(3);
  });

  it('returns 3 context_overflow plans', () => {
    expect(getPlansByType('context_overflow')).toHaveLength(3);
  });

  it('returns 4 persona_drift plans', () => {
    expect(getPlansByType('persona_drift')).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// getPlanCount
// ---------------------------------------------------------------------------

describe('getPlanCount', () => {
  it('returns 20', () => {
    expect(getPlanCount()).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// Plan structure
// ---------------------------------------------------------------------------

describe('plan structure', () => {
  it('every plan has id, name, type, turns array, and estimatedCost', () => {
    for (const plan of getAllPlans()) {
      expect(plan).toHaveProperty('id');
      expect(plan).toHaveProperty('name');
      expect(plan).toHaveProperty('type');
      expect(Array.isArray(plan.turns)).toBe(true);
      expect(plan).toHaveProperty('estimatedCost');
      expect(typeof plan.id).toBe('string');
      expect(typeof plan.name).toBe('string');
      expect(typeof plan.estimatedCost).toBe('number');
    }
  });
});

// ---------------------------------------------------------------------------
// Turn structure
// ---------------------------------------------------------------------------

describe('turn structure', () => {
  it('every turn has role and content', () => {
    for (const plan of getAllPlans()) {
      for (const turn of plan.turns) {
        expect(turn).toHaveProperty('role');
        expect(turn).toHaveProperty('content');
        expect(['attacker', 'system']).toContain(turn.role);
        expect(typeof turn.content).toBe('string');
      }
    }
  });
});

// ---------------------------------------------------------------------------
// sanitizeConversationContent
// ---------------------------------------------------------------------------

describe('sanitizeConversationContent', () => {
  it('strips null bytes', () => {
    const input = 'hello\x00world';
    const result = sanitizeConversationContent(input);
    expect(result).toBe('helloworld');
  });

  it('truncates content exceeding MAX_CONTENT_LENGTH', () => {
    const input = 'a'.repeat(MAX_CONTENT_LENGTH + 500);
    const result = sanitizeConversationContent(input);
    expect(result).toHaveLength(MAX_CONTENT_LENGTH);
  });

  it('preserves valid content under the limit', () => {
    const input = 'Hello, this is a normal message.\nWith newlines.\tAnd tabs.';
    expect(sanitizeConversationContent(input)).toBe(input);
  });

  it('returns empty string for non-string input', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(sanitizeConversationContent(undefined as any)).toBe('');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(sanitizeConversationContent(null as any)).toBe('');
  });
});

// ---------------------------------------------------------------------------
// TimeChamberSimulator
// ---------------------------------------------------------------------------

describe('TimeChamberSimulator', () => {
  it('is constructable with default config', () => {
    const sim = new TimeChamberSimulator();
    expect(sim).toBeInstanceOf(TimeChamberSimulator);
  });

  it('is constructable with partial config', () => {
    const sim = new TimeChamberSimulator({ maxTurns: 5, timeoutMs: 10_000 });
    expect(sim).toBeInstanceOf(TimeChamberSimulator);
  });
});

// ---------------------------------------------------------------------------
// Plan IDs are unique
// ---------------------------------------------------------------------------

describe('plan ID uniqueness', () => {
  it('all plan IDs are unique', () => {
    const plans = getAllPlans();
    const ids = plans.map((p) => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});
