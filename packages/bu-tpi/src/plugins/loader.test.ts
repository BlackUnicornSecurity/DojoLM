/**
 * Tests for plugin loader (validateManifest + PluginRegistry)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { validateManifest, PluginRegistry } from './loader.js';
import type { PluginManifest, PluginLifecycle } from './types.js';

function makeManifest(overrides: Partial<PluginManifest> = {}): PluginManifest {
  return {
    id: 'test-plugin',
    name: 'Test Plugin',
    version: '1.0.0',
    type: 'scanner',
    description: 'A test plugin',
    author: 'Test Author',
    dependencies: [],
    capabilities: ['scan'],
    ...overrides,
  };
}

describe('validateManifest', () => {
  it('returns no errors for valid manifest', () => {
    expect(validateManifest(makeManifest())).toHaveLength(0);
  });

  it('rejects empty id', () => {
    const errors = validateManifest(makeManifest({ id: '' }));
    expect(errors.some(e => e.field === 'id')).toBe(true);
  });

  it('rejects invalid type', () => {
    const errors = validateManifest(makeManifest({ type: 'invalid' as any }));
    expect(errors.some(e => e.field === 'type')).toBe(true);
  });

  it('rejects name exceeding max length', () => {
    const errors = validateManifest(makeManifest({ name: 'x'.repeat(200) }));
    expect(errors.some(e => e.field === 'name')).toBe(true);
  });
});

describe('PluginRegistry', () => {
  let registry: PluginRegistry;

  beforeEach(() => {
    registry = new PluginRegistry();
  });

  it('registers and retrieves a plugin', async () => {
    const loaded = await registry.register(makeManifest());
    expect(loaded.state).toBe('loaded');
    expect(registry.get('test-plugin')).toBeDefined();
    expect(registry.size).toBe(1);
  });

  it('rejects duplicate registration', async () => {
    await registry.register(makeManifest());
    await expect(registry.register(makeManifest())).rejects.toThrow('already registered');
  });

  it('unregisters a plugin', async () => {
    await registry.register(makeManifest());
    const removed = await registry.unregister('test-plugin');
    expect(removed).toBe(true);
    expect(registry.size).toBe(0);
  });

  it('prevents unregistering a plugin with dependents', async () => {
    await registry.register(makeManifest({ id: 'base' }));
    await registry.register(makeManifest({ id: 'child', dependencies: ['base'] }));
    await expect(registry.unregister('base')).rejects.toThrow('required by');
  });

  it('lists plugins by type', async () => {
    await registry.register(makeManifest({ id: 'p1', type: 'scanner' }));
    await registry.register(makeManifest({ id: 'p2', type: 'reporter' }));
    const scanners = registry.listByType('scanner');
    expect(scanners).toHaveLength(1);
  });

  it('clears all plugins', async () => {
    await registry.register(makeManifest({ id: 'p1' }));
    await registry.register(makeManifest({ id: 'p2' }));
    await registry.clear();
    expect(registry.size).toBe(0);
  });
});
