/**
 * S49: Adversarial API Gateway tests
 */
import { describe, it, expect } from 'vitest';
import { AdversarialAPIGateway, API_GATEWAY_SCENARIO, API_GATEWAY_TOOLS } from './api-gateway.js';

describe('AdversarialAPIGateway', () => {
  it('should have a valid scenario', () => {
    expect(API_GATEWAY_SCENARIO.type).toBe('api-exploitation');
    expect(API_GATEWAY_SCENARIO.payloads.length).toBeGreaterThanOrEqual(10);
  });

  it('should have 10 adversarial tools', () => {
    expect(API_GATEWAY_TOOLS.length).toBe(10);
    API_GATEWAY_TOOLS.forEach((tool) => {
      expect(tool.category).toBe('api-exploitation');
      expect(tool.mcpDefinition).toBeDefined();
    });
  });

  it('should generate 25+ fixtures', () => {
    const gw = new AdversarialAPIGateway();
    const fixtures = gw.generateFixtures();
    expect(fixtures.length).toBeGreaterThanOrEqual(25);
  });

  it('should execute all tools without error', () => {
    API_GATEWAY_TOOLS.forEach((tool) => {
      const result = tool.execute({}, 'basic');
      expect(result.metadata.attackType).toBe('api-exploitation');
      expect(result.content.length).toBeGreaterThan(0);
    });
  });
});
