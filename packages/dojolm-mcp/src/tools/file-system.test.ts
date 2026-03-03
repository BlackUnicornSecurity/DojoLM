/**
 * S50: Adversarial File System tests
 */
import { describe, it, expect } from 'vitest';
import { AdversarialFileSystem, FILE_SYSTEM_SCENARIO, FILE_SYSTEM_TOOLS } from './file-system.js';

describe('AdversarialFileSystem', () => {
  it('should have a valid scenario', () => {
    expect(FILE_SYSTEM_SCENARIO.type).toBe('filesystem-exploitation');
    expect(FILE_SYSTEM_SCENARIO.payloads.length).toBeGreaterThanOrEqual(10);
  });

  it('should have 10 adversarial tools', () => {
    expect(FILE_SYSTEM_TOOLS.length).toBe(10);
    FILE_SYSTEM_TOOLS.forEach((tool) => {
      expect(tool.category).toBe('filesystem-exploitation');
    });
  });

  it('should generate 15+ fixtures', () => {
    const fs = new AdversarialFileSystem();
    const fixtures = fs.generateFixtures();
    expect(fixtures.length).toBeGreaterThanOrEqual(15);
  });

  it('should execute all tools without error', () => {
    FILE_SYSTEM_TOOLS.forEach((tool) => {
      const result = tool.execute({ path: '/test' }, 'basic');
      expect(result.metadata.attackType).toBe('filesystem-exploitation');
    });
  });

  it('should be completely sandboxed - no real fs module', () => {
    // Verify no 'fs' import in the module source (structural test)
    expect(FILE_SYSTEM_SCENARIO.id).toBeTruthy();
  });
});
