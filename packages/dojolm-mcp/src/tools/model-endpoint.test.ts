/**
 * S51: Adversarial Model Endpoint tests
 */
import { describe, it, expect } from 'vitest';
import { AdversarialModelEndpoint, MODEL_ENDPOINT_SCENARIO, MODEL_ENDPOINT_TOOLS } from './model-endpoint.js';

describe('AdversarialModelEndpoint', () => {
  it('should have a valid scenario', () => {
    expect(MODEL_ENDPOINT_SCENARIO.type).toBe('model-exploitation');
    expect(MODEL_ENDPOINT_SCENARIO.payloads.length).toBeGreaterThanOrEqual(8);
  });

  it('should have 8 adversarial tools', () => {
    expect(MODEL_ENDPOINT_TOOLS.length).toBe(8);
    MODEL_ENDPOINT_TOOLS.forEach((tool) => {
      expect(tool.category).toBe('model-exploitation');
    });
  });

  it('should generate 19+ fixtures in advanced mode', () => {
    const ep = new AdversarialModelEndpoint();
    const fixtures = ep.generateFixtures('advanced');
    expect(fixtures.length).toBeGreaterThanOrEqual(19);
  });

  it('should generate more fixtures in aggressive mode', () => {
    const ep = new AdversarialModelEndpoint();
    const fixtures = ep.generateFixtures('aggressive');
    expect(fixtures.length).toBeGreaterThanOrEqual(20);
  });

  it('should execute all tools without error', () => {
    MODEL_ENDPOINT_TOOLS.forEach((tool) => {
      const result = tool.execute({}, 'basic');
      expect(result.metadata.attackType).toBe('model-exploitation');
      expect(result.content.length).toBeGreaterThan(0);
    });
  });
});
