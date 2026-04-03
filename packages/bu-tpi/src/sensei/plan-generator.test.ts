import { describe, it, expect } from 'vitest';
import { parsePlanResponse, isValidAttackType } from './plan-generator.js';

describe('plan-generator', () => {
  describe('isValidAttackType', () => {
    it('accepts valid attack types', () => {
      expect(isValidAttackType('accumulation')).toBe(true);
      expect(isValidAttackType('delayed_activation')).toBe(true);
      expect(isValidAttackType('session_persistence')).toBe(true);
      expect(isValidAttackType('context_overflow')).toBe(true);
      expect(isValidAttackType('persona_drift')).toBe(true);
    });

    it('rejects invalid types', () => {
      expect(isValidAttackType('not_a_type')).toBe(false);
      expect(isValidAttackType('')).toBe(false);
    });

    it('rejects null-ish values', () => {
      expect(isValidAttackType('undefined')).toBe(false);
      expect(isValidAttackType('null')).toBe(false);
    });
  });

  describe('parsePlanResponse', () => {
    it('parses well-structured response', () => {
      const response = [
        'Name: Test Plan',
        'Description: A test plan for accumulation attacks',
        'Expected Activation Turn: 5',
        'Estimated Cost: 0.05',
        '[TURN 0]',
        'Role: attacker',
        'Content: Hello this is a test turn content for the attacker',
        'Purpose: Establish rapport with the target',
        '[TURN 1]',
        'Role: system',
        'Content: Response from the system model in conversation',
        'Purpose: Expected response from the model',
      ].join('\n');
      const result = parsePlanResponse(response, 'accumulation');
      expect(result).not.toBeNull();
      if (result) {
        expect(result.name).toBe('Test Plan');
        expect(result.type).toBe('accumulation');
        expect(result.turns.length).toBeGreaterThan(0);
      }
    });

    it('returns null for empty response', () => {
      expect(parsePlanResponse('', 'accumulation')).toBeNull();
    });

    it('returns null when no turns parsed', () => {
      expect(
        parsePlanResponse('Name: Test\nDescription: Test', 'accumulation'),
      ).toBeNull();
    });

    it('preserves attack type from argument', () => {
      const response = [
        'Name: Drift Plan',
        'Description: Test persona drift',
        '[TURN 0]',
        'Role: attacker',
        'Content: Starting conversation to drift persona gradually',
        'Purpose: Begin subtle drift',
      ].join('\n');
      const result = parsePlanResponse(response, 'persona_drift');
      if (result) {
        expect(result.type).toBe('persona_drift');
      }
    });
  });
});
