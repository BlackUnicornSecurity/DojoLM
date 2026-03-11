/**
 * Tests for modules/registry.ts — ScannerRegistry class
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScannerRegistry, scannerRegistry } from './registry.js';
import type { ScannerModule, Finding } from '../types.js';

// ---------- helpers ----------

function makeMockModule(name: string, overrides: Partial<ScannerModule> = {}): ScannerModule {
  return {
    name,
    version: '1.0.0',
    description: `Mock module: ${name}`,
    scan: vi.fn((_text: string, _normalized: string): Finding[] => []),
    getPatternCount: vi.fn(() => 5),
    getPatternGroups: vi.fn(() => [{ name: `${name}-group`, count: 5, source: name }]),
    ...overrides,
  };
}

// ---------- tests ----------

describe('registry.ts', () => {
  let registry: ScannerRegistry;

  beforeEach(() => {
    registry = new ScannerRegistry();
  });

  // REG-001
  it('REG-001: new registry has size 0', () => {
    expect(registry.size).toBe(0);
  });

  // REG-002
  it('REG-002: register adds a module and increments size', () => {
    const mod = makeMockModule('test-mod');
    registry.register(mod);
    expect(registry.size).toBe(1);
    expect(registry.hasModule('test-mod')).toBe(true);
  });

  // REG-003
  it('REG-003: register throws on duplicate module name', () => {
    const mod = makeMockModule('dup');
    registry.register(mod);
    expect(() => registry.register(makeMockModule('dup'))).toThrowError(
      "Scanner module 'dup' is already registered"
    );
  });

  // REG-004
  it('REG-004: unregister removes module and returns true', () => {
    registry.register(makeMockModule('removable'));
    expect(registry.unregister('removable')).toBe(true);
    expect(registry.hasModule('removable')).toBe(false);
    expect(registry.size).toBe(0);
  });

  // REG-005
  it('REG-005: unregister returns false for nonexistent module', () => {
    expect(registry.unregister('ghost')).toBe(false);
  });

  // REG-006
  it('REG-006: getModule returns the registered module', () => {
    const mod = makeMockModule('lookup');
    registry.register(mod);
    expect(registry.getModule('lookup')).toBe(mod);
  });

  // REG-007
  it('REG-007: getModule returns undefined for missing module', () => {
    expect(registry.getModule('missing')).toBeUndefined();
  });

  // REG-008
  it('REG-008: hasModule returns correct boolean', () => {
    registry.register(makeMockModule('present'));
    expect(registry.hasModule('present')).toBe(true);
    expect(registry.hasModule('absent')).toBe(false);
  });

  // REG-009
  it('REG-009: scan calls all registered modules and aggregates findings', () => {
    const findingA: Finding = {
      category: 'TEST_A', severity: 'WARNING', description: 'A',
      match: 'a', source: 'mod-a', engine: 'mod-a',
    };
    const findingB: Finding = {
      category: 'TEST_B', severity: 'CRITICAL', description: 'B',
      match: 'b', source: 'mod-b', engine: 'mod-b',
    };

    registry.register(makeMockModule('mod-a', {
      scan: vi.fn(() => [findingA]),
    }));
    registry.register(makeMockModule('mod-b', {
      scan: vi.fn(() => [findingB]),
    }));

    const findings = registry.scan('input', 'input');
    expect(findings).toHaveLength(2);
    expect(findings).toContainEqual(findingA);
    expect(findings).toContainEqual(findingB);
  });

  // REG-010
  it('REG-010: scan catches module errors and emits error finding', () => {
    registry.register(makeMockModule('crasher', {
      scan: vi.fn(() => { throw new Error('kaboom'); }),
    }));

    const findings = registry.scan('text', 'text');
    expect(findings).toHaveLength(1);
    expect(findings[0].category).toBe('SCANNER_MODULE_ERROR');
    expect(findings[0].severity).toBe('WARNING');
    expect(findings[0].description).toContain('kaboom');
    expect(findings[0].source).toBe('crasher');
  });

  // REG-011
  it('REG-011: scan handles non-Error thrown values', () => {
    registry.register(makeMockModule('string-thrower', {
      scan: vi.fn(() => { throw 'oops'; }),
    }));

    const findings = registry.scan('text', 'text');
    expect(findings[0].description).toContain('oops');
  });

  // REG-012
  it('REG-012: scan returns empty array when no modules registered', () => {
    expect(registry.scan('anything', 'anything')).toEqual([]);
  });

  // REG-013
  it('REG-013: listModules returns metadata for all registered modules', () => {
    registry.register(makeMockModule('alpha', { version: '2.0.0', description: 'Alpha module' }));
    registry.register(makeMockModule('beta', { version: '3.0.0' }));

    const list = registry.listModules();
    expect(list).toHaveLength(2);
    expect(list[0]).toEqual({
      name: 'alpha', version: '2.0.0', description: 'Alpha module', patternCount: 5,
    });
    expect(list[1].name).toBe('beta');
  });

  // REG-014
  it('REG-014: getPatternCount sums across all modules', () => {
    registry.register(makeMockModule('a', { getPatternCount: vi.fn(() => 10) }));
    registry.register(makeMockModule('b', { getPatternCount: vi.fn(() => 20) }));
    expect(registry.getPatternCount()).toBe(30);
  });

  // REG-015
  it('REG-015: getPatternCount returns 0 when empty', () => {
    expect(registry.getPatternCount()).toBe(0);
  });

  // REG-016
  it('REG-016: getPatternGroups aggregates groups from all modules', () => {
    registry.register(makeMockModule('x', {
      getPatternGroups: vi.fn(() => [
        { name: 'g1', count: 3, source: 'x' },
        { name: 'g2', count: 7, source: 'x' },
      ]),
    }));
    registry.register(makeMockModule('y', {
      getPatternGroups: vi.fn(() => [
        { name: 'g3', count: 2, source: 'y' },
      ]),
    }));

    const groups = registry.getPatternGroups();
    expect(groups).toHaveLength(3);
    expect(groups.map((g) => g.name)).toEqual(['g1', 'g2', 'g3']);
  });

  // REG-017
  it('REG-017: scannerRegistry singleton is a ScannerRegistry instance', () => {
    expect(scannerRegistry).toBeInstanceOf(ScannerRegistry);
  });

  // REG-018
  it('REG-018: scan passes both text and normalized to each module', () => {
    const scanFn = vi.fn(() => [] as Finding[]);
    registry.register(makeMockModule('spy', { scan: scanFn }));
    registry.scan('original text', 'normalized text');
    expect(scanFn).toHaveBeenCalledWith('original text', 'normalized text');
  });
});
