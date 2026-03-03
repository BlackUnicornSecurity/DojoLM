/**
 * S47: Adversarial Vector Database tests
 */
import { describe, it, expect } from 'vitest';
import { AdversarialVectorDB, VECTOR_DB_SCENARIO, VECTOR_DB_TOOLS } from './vector-db.js';

describe('AdversarialVectorDB', () => {
  it('should have a valid scenario', () => {
    expect(VECTOR_DB_SCENARIO.id).toBe('vector-db-poisoning-01');
    expect(VECTOR_DB_SCENARIO.type).toBe('vector-db-poisoning');
    expect(VECTOR_DB_SCENARIO.payloads.length).toBeGreaterThanOrEqual(8);
  });

  it('should export adversarial tools', () => {
    expect(VECTOR_DB_TOOLS.length).toBeGreaterThanOrEqual(3);
    VECTOR_DB_TOOLS.forEach((tool) => {
      expect(tool.category).toBe('vector-db-poisoning');
      expect(tool.mcpDefinition.name).toBeDefined();
    });
  });

  it('should generate 30+ fixtures', () => {
    const db = new AdversarialVectorDB();
    const fixtures = db.generateFixtures();
    expect(fixtures.length).toBeGreaterThanOrEqual(30);
  });

  it('should execute all tools without error', () => {
    VECTOR_DB_TOOLS.forEach((tool) => {
      const result = tool.execute({ query: 'test', namespace: 'default' }, 'basic');
      expect(result.metadata.attackType).toBe('vector-db-poisoning');
      expect(result.content.length).toBeGreaterThan(0);
    });
  });
});
