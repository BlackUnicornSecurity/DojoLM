/**
 * S53: Adversarial Code Repository tests
 */
import { describe, it, expect } from 'vitest';
import { AdversarialCodeRepo, CODE_REPO_SCENARIO, CODE_REPO_TOOLS } from './code-repo.js';

describe('AdversarialCodeRepo', () => {
  it('should have a valid scenario', () => {
    expect(CODE_REPO_SCENARIO.type).toBe('code-repository-poisoning');
    expect(CODE_REPO_SCENARIO.payloads.length).toBeGreaterThanOrEqual(6);
  });

  it('should have 7 adversarial tools', () => {
    expect(CODE_REPO_TOOLS.length).toBe(7);
    CODE_REPO_TOOLS.forEach((tool) => {
      expect(tool.category).toBe('code-repository-poisoning');
    });
  });

  it('should generate 10+ fixtures', () => {
    const repo = new AdversarialCodeRepo();
    const fixtures = repo.generateFixtures();
    expect(fixtures.length).toBeGreaterThanOrEqual(10);
  });

  it('should list files from repository', () => {
    const repo = new AdversarialCodeRepo();
    const files = repo.listFiles();
    expect(files.length).toBeGreaterThan(0);
  });

  it('should execute all tools without error', () => {
    CODE_REPO_TOOLS.forEach((tool) => {
      const result = tool.execute({}, 'basic');
      expect(result.metadata.attackType).toBe('code-repository-poisoning');
    });
  });
});
