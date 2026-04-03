/**
 * Tests for plugin security validator
 */

import { describe, it, expect } from 'vitest';
import {
  validatePluginSecurity,
  validatePluginDependencies,
  CAPABILITY_ALLOWLIST,
  BLOCKED_PATTERNS,
} from './validator.js';
import type { PluginManifest } from './types.js';

function makeManifest(overrides: Partial<PluginManifest> = {}): PluginManifest {
  return {
    id: 'test-plugin',
    name: 'Test Plugin',
    version: '1.0.0',
    type: 'scanner',
    description: 'A test plugin for validation',
    author: 'Test Author',
    dependencies: [],
    capabilities: ['scan'],
    ...overrides,
  };
}

describe('validatePluginSecurity', () => {
  it('passes for a valid manifest', () => {
    const errors = validatePluginSecurity(makeManifest());
    expect(errors).toHaveLength(0);
  });

  it('rejects capabilities not in allowlist', () => {
    const errors = validatePluginSecurity(makeManifest({ capabilities: ['execute-code'] }));
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.field === 'capabilities')).toBe(true);
  });

  it('rejects blocked patterns in plugin fields', () => {
    // Test that dangerous code patterns like Function() are caught
    const errors = validatePluginSecurity(makeManifest({ id: 'Function(-plugin' }));
    expect(errors.some(e => e.message.includes('blocked'))).toBe(true);
  });

  it('rejects invalid version format', () => {
    const errors = validatePluginSecurity(makeManifest({ version: 'not-semver' }));
    expect(errors.some(e => e.field === 'version')).toBe(true);
  });

  it('rejects invalid ID format (uppercase)', () => {
    const errors = validatePluginSecurity(makeManifest({ id: 'Invalid-ID' }));
    expect(errors.some(e => e.field === 'id')).toBe(true);
  });

  it('rejects empty required fields', () => {
    const errors = validatePluginSecurity(makeManifest({ name: '', description: '', author: '' }));
    expect(errors.some(e => e.field === 'name')).toBe(true);
    expect(errors.some(e => e.field === 'description')).toBe(true);
    expect(errors.some(e => e.field === 'author')).toBe(true);
  });
});

describe('validatePluginDependencies', () => {
  it('passes when all dependencies exist', () => {
    const manifest = makeManifest({ dependencies: ['dep-a'] });
    const registry = { 'dep-a': makeManifest({ id: 'dep-a', dependencies: [] }) };
    const errors = validatePluginDependencies(manifest, registry);
    expect(errors).toHaveLength(0);
  });

  it('detects missing dependencies', () => {
    const manifest = makeManifest({ dependencies: ['missing-dep'] });
    const errors = validatePluginDependencies(manifest, {});
    expect(errors.some(e => e.message.includes('missing-dep'))).toBe(true);
  });

  it('detects self-dependency', () => {
    const manifest = makeManifest({ id: 'self-dep', dependencies: ['self-dep'] });
    const registry = { 'self-dep': manifest };
    const errors = validatePluginDependencies(manifest, registry);
    expect(errors.some(e => e.message.includes('cannot depend on itself'))).toBe(true);
  });

  it('detects circular dependencies', () => {
    const a = makeManifest({ id: 'plugin-a', dependencies: ['plugin-b'] });
    const b = makeManifest({ id: 'plugin-b', dependencies: ['plugin-a'] });
    const registry = { 'plugin-a': a, 'plugin-b': b };
    const errors = validatePluginDependencies(a, registry);
    expect(errors.some(e => e.message.includes('Circular'))).toBe(true);
  });

  it('detects duplicate dependencies', () => {
    const manifest = makeManifest({ dependencies: ['dep-a', 'dep-a'] });
    const registry = { 'dep-a': makeManifest({ id: 'dep-a', dependencies: [] }) };
    const errors = validatePluginDependencies(manifest, registry);
    expect(errors.some(e => e.message.includes('Duplicate'))).toBe(true);
  });
});

describe('constants', () => {
  it('CAPABILITY_ALLOWLIST has expected values', () => {
    expect(CAPABILITY_ALLOWLIST).toContain('scan');
    expect(CAPABILITY_ALLOWLIST).toContain('detect');
  });

  it('BLOCKED_PATTERNS contains dangerous code patterns', () => {
    expect(BLOCKED_PATTERNS.length).toBeGreaterThan(3);
    expect(BLOCKED_PATTERNS).toContain('require(');
    expect(BLOCKED_PATTERNS).toContain('__proto__');
  });
});
