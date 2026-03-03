import { describe, it, expect, beforeEach } from 'vitest';
import { MCPObserver } from './observer.js';
import { AttackLogger } from './attack-logger.js';

describe('MCPObserver', () => {
  let observer: MCPObserver;
  let logger: AttackLogger;

  beforeEach(() => {
    logger = new AttackLogger();
    observer = new MCPObserver(logger);
  });

  describe('recording lifecycle', () => {
    it('starts not recording', () => {
      expect(observer.isRecording()).toBe(false);
    });

    it('starts recording', () => {
      observer.startRecording();
      expect(observer.isRecording()).toBe(true);
    });

    it('stops recording and returns snapshot', () => {
      observer.startRecording();
      logger.log('initialize', 'basic', { method: 'initialize' });
      logger.log('tool_call', 'basic', { method: 'tools/call', attackType: 'tool-poisoning' });

      const snapshot = observer.stopRecording();
      expect(observer.isRecording()).toBe(false);
      expect(snapshot.events).toHaveLength(2);
      expect(snapshot.stats.totalEvents).toBe(2);
    });
  });

  describe('captureSnapshot', () => {
    it('captures current state', () => {
      logger.log('initialize', 'basic');
      logger.log('tool_call', 'advanced', { attackType: 'tool-poisoning' });

      const snapshot = observer.captureSnapshot();
      expect(snapshot.events).toHaveLength(2);
      expect(snapshot.stats.eventsByType.initialize).toBe(1);
      expect(snapshot.stats.eventsByType.tool_call).toBe(1);
    });

    it('computes attack stats', () => {
      logger.log('tool_call', 'basic', { attackType: 'tool-poisoning' });
      logger.log('tool_call', 'basic', { attackType: 'tool-poisoning' });
      logger.log('resource_read', 'advanced', { attackType: 'uri-traversal' });

      const snapshot = observer.captureSnapshot();
      expect(snapshot.stats.eventsByAttack['tool-poisoning']).toBe(2);
      expect(snapshot.stats.eventsByAttack['uri-traversal']).toBe(1);
    });

    it('tracks modes used', () => {
      logger.log('initialize', 'basic');
      logger.log('tool_call', 'advanced');

      const snapshot = observer.captureSnapshot();
      expect(snapshot.stats.modes).toContain('basic');
      expect(snapshot.stats.modes).toContain('advanced');
    });
  });

  describe('getSnapshots', () => {
    it('returns empty initially', () => {
      expect(observer.getSnapshots()).toHaveLength(0);
    });

    it('accumulates snapshots after stop', () => {
      observer.startRecording();
      observer.stopRecording();
      observer.startRecording();
      observer.stopRecording();
      expect(observer.getSnapshots()).toHaveLength(2);
    });
  });

  describe('replay', () => {
    it('returns events in chronological order', () => {
      logger.log('initialize', 'basic');
      logger.log('tool_call', 'basic');
      logger.log('shutdown', 'basic');

      const events = observer.replay();
      expect(events).toHaveLength(3);
      // Already in order since logged sequentially
      expect(events[0].type).toBe('initialize');
      expect(events[2].type).toBe('shutdown');
    });
  });
});
