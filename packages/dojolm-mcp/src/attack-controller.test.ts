import { describe, it, expect, beforeEach } from 'vitest';
import { AttackController, ATTACK_MODES } from './attack-controller.js';
import { AttackLogger } from './attack-logger.js';
import type { AttackScenario } from './types.js';

describe('AttackController', () => {
  let controller: AttackController;
  let logger: AttackLogger;

  beforeEach(() => {
    logger = new AttackLogger();
    controller = new AttackController('basic', logger);
  });

  describe('mode management', () => {
    it('starts with the configured mode', () => {
      expect(controller.getMode()).toBe('basic');
    });

    it('switches mode', () => {
      controller.setMode('aggressive');
      expect(controller.getMode()).toBe('aggressive');
    });

    it('logs mode changes', () => {
      controller.setMode('advanced');
      const events = logger.getEventsByType('mode_change');
      expect(events).toHaveLength(1);
      expect(events[0].metadata?.previousMode).toBe('basic');
      expect(events[0].metadata?.newMode).toBe('advanced');
    });

    it('returns correct mode config', () => {
      const config = controller.getModeConfig();
      expect(config.id).toBe('basic');
      expect(config.enabledAttacks).toContain('tool-poisoning');
    });
  });

  describe('ATTACK_MODES', () => {
    it('defines 4 modes', () => {
      expect(ATTACK_MODES).toHaveLength(4);
    });

    it('passive has no attacks', () => {
      const passive = ATTACK_MODES.find((m) => m.id === 'passive');
      expect(passive?.enabledAttacks).toHaveLength(0);
    });

    it('aggressive has all 17 attacks (8 P4 + 9 P5)', () => {
      const aggressive = ATTACK_MODES.find((m) => m.id === 'aggressive');
      expect(aggressive?.enabledAttacks).toHaveLength(17);
    });
  });

  describe('isAttackEnabled', () => {
    it('returns true for enabled attacks in current mode', () => {
      expect(controller.isAttackEnabled('tool-poisoning')).toBe(true);
    });

    it('returns false for disabled attacks', () => {
      expect(controller.isAttackEnabled('sampling-loop')).toBe(false);
    });

    it('returns false for all attacks in passive mode', () => {
      controller.setMode('passive');
      expect(controller.isAttackEnabled('tool-poisoning')).toBe(false);
    });
  });

  describe('scenario management', () => {
    const scenario: AttackScenario = {
      id: 'sc-1',
      name: 'Test Scenario',
      type: 'tool-poisoning',
      description: 'A test',
      payloads: [],
    };

    it('registers and retrieves scenarios', () => {
      controller.registerScenario(scenario);
      expect(controller.getScenario('sc-1')).toBe(scenario);
    });

    it('filters scenarios by type', () => {
      controller.registerScenario(scenario);
      controller.registerScenario({
        ...scenario,
        id: 'sc-2',
        type: 'uri-traversal',
      });
      expect(controller.getScenariosByType('tool-poisoning')).toHaveLength(1);
    });

    it('returns active scenarios based on current mode', () => {
      controller.registerScenario(scenario);
      controller.registerScenario({
        ...scenario,
        id: 'sc-2',
        type: 'sampling-loop',
      });
      // basic mode: only tool-poisoning enabled
      expect(controller.getActiveScenarios()).toHaveLength(1);
      expect(controller.getActiveScenarios()[0].id).toBe('sc-1');
    });
  });

  describe('detection metrics', () => {
    it('records and retrieves metrics', () => {
      controller.recordMetric({
        scenarioId: 'sc-1',
        attackType: 'tool-poisoning',
        payloadDelivered: true,
        instructionsFollowed: null,
        detectedByClient: null,
        responseCategory: 'unknown',
        timestamp: new Date().toISOString(),
      });
      expect(controller.getMetrics()).toHaveLength(1);
    });

    it('filters metrics by scenario', () => {
      controller.recordMetric({
        scenarioId: 'sc-1',
        attackType: 'tool-poisoning',
        payloadDelivered: true,
        instructionsFollowed: null,
        detectedByClient: null,
        responseCategory: 'unknown',
        timestamp: new Date().toISOString(),
      });
      controller.recordMetric({
        scenarioId: 'sc-2',
        attackType: 'uri-traversal',
        payloadDelivered: true,
        instructionsFollowed: null,
        detectedByClient: null,
        responseCategory: 'unknown',
        timestamp: new Date().toISOString(),
      });
      expect(controller.getMetricsByScenario('sc-1')).toHaveLength(1);
    });

    it('clears metrics', () => {
      controller.recordMetric({
        scenarioId: 'sc-1',
        attackType: 'tool-poisoning',
        payloadDelivered: true,
        instructionsFollowed: null,
        detectedByClient: null,
        responseCategory: 'unknown',
        timestamp: new Date().toISOString(),
      });
      controller.clearMetrics();
      expect(controller.getMetrics()).toHaveLength(0);
    });
  });
});
