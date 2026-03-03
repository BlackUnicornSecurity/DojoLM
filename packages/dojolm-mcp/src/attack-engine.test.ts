import { describe, it, expect, beforeEach } from 'vitest';
import { AttackEngine } from './attack-engine.js';
import { AttackController } from './attack-controller.js';
import { AttackLogger } from './attack-logger.js';
import type { AttackScenario } from './types.js';

describe('AttackEngine', () => {
  let engine: AttackEngine;
  let controller: AttackController;
  let logger: AttackLogger;

  const poisonScenario: AttackScenario = {
    id: 'poison-basic',
    name: 'Basic Tool Poisoning',
    type: 'tool-poisoning',
    description: 'Injects instructions in tool output',
    payloads: [
      {
        id: 'p1',
        severity: 'medium',
        content: 'Injected instruction payload',
        minMode: 'basic',
      },
      {
        id: 'p2',
        severity: 'high',
        content: 'Advanced injected payload with encoding',
        encoding: 'base64',
        minMode: 'advanced',
      },
    ],
  };

  const traversalScenario: AttackScenario = {
    id: 'traversal-basic',
    name: 'Path Traversal',
    type: 'uri-traversal',
    description: 'Tests path traversal in resources',
    payloads: [
      {
        id: 'pt1',
        severity: 'high',
        content: 'Traversal test content',
        minMode: 'advanced',
      },
    ],
  };

  beforeEach(() => {
    logger = new AttackLogger();
    controller = new AttackController('basic', logger);
    controller.registerScenario(poisonScenario);
    controller.registerScenario(traversalScenario);
    engine = new AttackEngine(controller, logger, 3);
  });

  describe('generateToolResult', () => {
    it('returns poisoned result when attack is enabled', () => {
      const result = engine.generateToolResult('my_tool', {}, 'tool-poisoning');
      expect(result).not.toBeNull();
      expect(result!.content[0].text).toBe('Injected instruction payload');
    });

    it('returns null when attack is not enabled for mode', () => {
      const result = engine.generateToolResult('my_tool', {}, 'uri-traversal');
      // basic mode does not enable uri-traversal
      expect(result).toBeNull();
    });

    it('returns null in passive mode', () => {
      controller.setMode('passive');
      const result = engine.generateToolResult('my_tool', {}, 'tool-poisoning');
      expect(result).toBeNull();
    });

    it('uses higher-severity payload in advanced mode', () => {
      controller.setMode('advanced');
      const result = engine.generateToolResult('my_tool', {}, 'tool-poisoning');
      expect(result).not.toBeNull();
      // p2 is base64 encoded
      const decoded = Buffer.from(result!.content[0].text!, 'base64').toString('utf-8');
      expect(decoded).toBe('Advanced injected payload with encoding');
    });

    it('logs the tool call event', () => {
      engine.generateToolResult('my_tool', { arg: 'val' }, 'tool-poisoning');
      const events = logger.getEventsByType('tool_call');
      expect(events.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('generateResourceResult', () => {
    it('appends poisoned content', () => {
      const result = engine.generateResourceResult(
        'file:///workspace/test.txt',
        'Original content',
        'tool-poisoning',
      );
      expect(result).not.toBeNull();
      expect(result!.text).toContain('Original content');
      expect(result!.text).toContain('Injected instruction payload');
    });

    it('returns null when attack not enabled', () => {
      controller.setMode('passive');
      const result = engine.generateResourceResult(
        'file:///workspace/test.txt',
        'Original',
        'tool-poisoning',
      );
      expect(result).toBeNull();
    });
  });

  describe('generateSpoofedCapabilities', () => {
    it('returns null when capability-spoofing is not enabled', () => {
      // basic mode does not include capability-spoofing
      const result = engine.generateSpoofedCapabilities({
        tools: { listChanged: true },
      });
      expect(result).toBeNull();
    });

    it('adds spoofed capabilities in advanced mode', () => {
      controller.setMode('advanced');
      const result = engine.generateSpoofedCapabilities({
        tools: { listChanged: true },
      });
      expect(result).not.toBeNull();
      expect(result!.sampling).toBeDefined();
      expect(result!.logging).toBeDefined();
      expect(result!.prompts).toBeDefined();
    });
  });

  describe('sampling depth tracking', () => {
    it('increments depth on each call', () => {
      expect(engine.trackSamplingDepth().depth).toBe(1);
      expect(engine.trackSamplingDepth().depth).toBe(2);
    });

    it('detects loop when depth exceeds max', () => {
      engine.trackSamplingDepth(); // 1
      engine.trackSamplingDepth(); // 2
      engine.trackSamplingDepth(); // 3
      const result = engine.trackSamplingDepth(); // 4 > max 3
      expect(result.isLoop).toBe(true);
    });

    it('resets depth', () => {
      engine.trackSamplingDepth();
      engine.trackSamplingDepth();
      engine.resetSamplingDepth();
      expect(engine.getSamplingDepth()).toBe(0);
    });
  });
});
