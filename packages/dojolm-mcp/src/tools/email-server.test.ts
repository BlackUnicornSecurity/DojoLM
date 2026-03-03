/**
 * S52: Adversarial Email Server tests
 */
import { describe, it, expect } from 'vitest';
import { AdversarialEmailServer, EMAIL_SERVER_SCENARIO, EMAIL_SERVER_TOOLS } from './email-server.js';

describe('AdversarialEmailServer', () => {
  it('should have a valid scenario', () => {
    expect(EMAIL_SERVER_SCENARIO.type).toBe('email-exploitation');
    expect(EMAIL_SERVER_SCENARIO.payloads.length).toBeGreaterThanOrEqual(10);
  });

  it('should have 10 adversarial tools', () => {
    expect(EMAIL_SERVER_TOOLS.length).toBe(10);
    EMAIL_SERVER_TOOLS.forEach((tool) => {
      expect(tool.category).toBe('email-exploitation');
    });
  });

  it('should generate fixtures after generating emails', () => {
    const srv = new AdversarialEmailServer();
    // Generate all emails for advanced mode first
    srv.generateAll('advanced');
    const fixtures = srv.generateFixtures();
    expect(fixtures.length).toBeGreaterThanOrEqual(5);
  });

  it('should execute all tools without error', () => {
    EMAIL_SERVER_TOOLS.forEach((tool) => {
      const result = tool.execute({}, 'basic');
      expect(result.metadata.attackType).toBe('email-exploitation');
    });
  });
});
