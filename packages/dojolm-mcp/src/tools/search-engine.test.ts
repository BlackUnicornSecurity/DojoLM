/**
 * S55: Adversarial Search Engine tests
 */
import { describe, it, expect } from 'vitest';
import { AdversarialSearchEngine, SEARCH_ENGINE_SCENARIO, SEARCH_ENGINE_TOOLS } from './search-engine.js';

describe('AdversarialSearchEngine', () => {
  it('should have a valid scenario', () => {
    expect(SEARCH_ENGINE_SCENARIO.type).toBe('search-poisoning');
    expect(SEARCH_ENGINE_SCENARIO.payloads.length).toBeGreaterThanOrEqual(10);
  });

  it('should have 10 adversarial tools', () => {
    expect(SEARCH_ENGINE_TOOLS.length).toBe(10);
    SEARCH_ENGINE_TOOLS.forEach((tool) => {
      expect(tool.category).toBe('search-poisoning');
    });
  });

  it('should generate 10+ fixtures', () => {
    const se = new AdversarialSearchEngine();
    const fixtures = se.generateFixtures();
    expect(fixtures.length).toBeGreaterThanOrEqual(10);
  });

  it('should execute all tools without error', () => {
    SEARCH_ENGINE_TOOLS.forEach((tool) => {
      const result = tool.execute({ query: 'test' }, 'basic');
      expect(result.metadata.attackType).toBe('search-poisoning');
    });
  });
});
