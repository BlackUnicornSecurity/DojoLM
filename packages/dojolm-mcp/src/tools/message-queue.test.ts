/**
 * S54: Adversarial Message Queue tests
 */
import { describe, it, expect } from 'vitest';
import { AdversarialMessageQueue, MESSAGE_QUEUE_SCENARIO, MESSAGE_QUEUE_TOOLS } from './message-queue.js';

describe('AdversarialMessageQueue', () => {
  it('should have a valid scenario', () => {
    expect(MESSAGE_QUEUE_SCENARIO.type).toBe('message-queue-exploitation');
    expect(MESSAGE_QUEUE_SCENARIO.payloads.length).toBeGreaterThanOrEqual(10);
  });

  it('should have 10 adversarial tools', () => {
    expect(MESSAGE_QUEUE_TOOLS.length).toBe(10);
    MESSAGE_QUEUE_TOOLS.forEach((tool) => {
      expect(tool.category).toBe('message-queue-exploitation');
    });
  });

  it('should generate 10+ fixtures', () => {
    const mq = new AdversarialMessageQueue();
    const fixtures = mq.generateFixtures('advanced');
    expect(fixtures.length).toBeGreaterThanOrEqual(10);
  });

  it('should execute all tools without error', () => {
    MESSAGE_QUEUE_TOOLS.forEach((tool) => {
      const result = tool.execute({}, 'basic');
      expect(result.metadata.attackType).toBe('message-queue-exploitation');
    });
  });
});
