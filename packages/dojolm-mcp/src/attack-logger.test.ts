import { describe, it, expect, beforeEach } from 'vitest';
import { AttackLogger } from './attack-logger.js';

describe('AttackLogger', () => {
  let logger: AttackLogger;

  beforeEach(() => {
    logger = new AttackLogger();
  });

  describe('log', () => {
    it('creates events with unique IDs', () => {
      const e1 = logger.log('initialize', 'basic');
      const e2 = logger.log('tool_call', 'basic');
      expect(e1.id).not.toBe(e2.id);
    });

    it('records timestamp in ISO format', () => {
      const event = logger.log('initialize', 'basic');
      expect(event.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('stores attack type when provided', () => {
      const event = logger.log('tool_call', 'advanced', {
        attackType: 'tool-poisoning',
      });
      expect(event.attackType).toBe('tool-poisoning');
    });
  });

  describe('getEvents', () => {
    it('returns all logged events', () => {
      logger.log('initialize', 'basic');
      logger.log('tool_call', 'basic');
      logger.log('shutdown', 'basic');
      expect(logger.getEvents()).toHaveLength(3);
    });
  });

  describe('getEventsByType', () => {
    it('filters events by type', () => {
      logger.log('initialize', 'basic');
      logger.log('tool_call', 'basic');
      logger.log('tool_call', 'basic');
      expect(logger.getEventsByType('tool_call')).toHaveLength(2);
    });
  });

  describe('getEventsByAttack', () => {
    it('filters events by attack type', () => {
      logger.log('tool_call', 'basic', { attackType: 'tool-poisoning' });
      logger.log('tool_call', 'basic', { attackType: 'uri-traversal' });
      logger.log('tool_call', 'basic', { attackType: 'tool-poisoning' });
      expect(logger.getEventsByAttack('tool-poisoning')).toHaveLength(2);
    });
  });

  describe('auth redaction', () => {
    it('redacts authorization headers', () => {
      const event = logger.log('tool_call', 'basic', {
        params: {
          authorization: 'Bearer sk-secret-key-123',
          name: 'safe-tool',
        },
      });
      expect(event.params?.authorization).toBe('[REDACTED]');
      expect(event.params?.name).toBe('safe-tool');
    });

    it('redacts nested auth fields', () => {
      const event = logger.log('tool_call', 'basic', {
        params: {
          headers: {
            'x-api-key': 'my-key',
            'content-type': 'application/json',
          },
        },
      });
      const headers = event.params?.headers as Record<string, unknown>;
      expect(headers['x-api-key']).toBe('[REDACTED]');
      expect(headers['content-type']).toBe('application/json');
    });
  });

  describe('retention limit', () => {
    it('enforces max events limit', () => {
      const smallLogger = new AttackLogger(5);
      for (let i = 0; i < 10; i++) {
        smallLogger.log('tool_call', 'basic');
      }
      expect(smallLogger.getEventCount()).toBe(5);
    });
  });

  describe('clear', () => {
    it('removes all events', () => {
      logger.log('initialize', 'basic');
      logger.log('tool_call', 'basic');
      logger.clear();
      expect(logger.getEventCount()).toBe(0);
    });
  });

  describe('exportJSON', () => {
    it('exports valid JSON', () => {
      logger.log('initialize', 'basic');
      const json = logger.exportJSON();
      const parsed = JSON.parse(json);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(1);
    });
  });
});
