/**
 * MUSUBI Phase 7.3: Plugin Architecture Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PLUGIN_TYPES, MAX_PLUGINS } from './types.js';
import type { PluginManifest, PluginLifecycle } from './types.js';
import { validateManifest, PluginRegistry } from './loader.js';

// ============================================================================
// Helpers
// ============================================================================

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

// ============================================================================
// Types Tests
// ============================================================================

describe('Plugin Types', () => {
  it('defines 4 plugin types', () => {
    expect(PLUGIN_TYPES).toHaveLength(4);
    expect(PLUGIN_TYPES).toContain('scanner');
    expect(PLUGIN_TYPES).toContain('transform');
    expect(PLUGIN_TYPES).toContain('reporter');
    expect(PLUGIN_TYPES).toContain('orchestrator');
  });
});

// ============================================================================
// Validation Tests
// ============================================================================

describe('validateManifest', () => {
  it('accepts valid manifest', () => {
    expect(validateManifest(makeManifest())).toHaveLength(0);
  });

  it('rejects empty id', () => {
    const errors = validateManifest(makeManifest({ id: '' }));
    expect(errors.some((e) => e.field === 'id')).toBe(true);
  });

  it('rejects empty name', () => {
    const errors = validateManifest(makeManifest({ name: '' }));
    expect(errors.some((e) => e.field === 'name')).toBe(true);
  });

  it('rejects name over limit', () => {
    const errors = validateManifest(makeManifest({ name: 'x'.repeat(101) }));
    expect(errors.some((e) => e.field === 'name')).toBe(true);
  });

  it('rejects invalid type', () => {
    const errors = validateManifest(makeManifest({ type: 'invalid' as 'scanner' }));
    expect(errors.some((e) => e.field === 'type')).toBe(true);
  });

  it('rejects empty version', () => {
    const errors = validateManifest(makeManifest({ version: '' }));
    expect(errors.some((e) => e.field === 'version')).toBe(true);
  });
});

// ============================================================================
// Plugin Registry Tests
// ============================================================================

describe('PluginRegistry', () => {
  let registry: PluginRegistry;

  beforeEach(() => {
    registry = new PluginRegistry();
  });

  it('registers a plugin', async () => {
    const plugin = await registry.register(makeManifest());
    expect(plugin.state).toBe('loaded');
    expect(registry.size).toBe(1);
  });

  it('rejects duplicate registration', async () => {
    await registry.register(makeManifest());
    await expect(registry.register(makeManifest())).rejects.toThrow('already registered');
  });

  it('rejects invalid manifest', async () => {
    await expect(registry.register(makeManifest({ id: '' }))).rejects.toThrow('validation failed');
  });

  it('runs onLoad lifecycle hook', async () => {
    const onLoad = vi.fn();
    await registry.register(makeManifest(), { onLoad });
    expect(onLoad).toHaveBeenCalledTimes(1);
  });

  it('sets error state on failed onLoad', async () => {
    const onLoad = vi.fn().mockRejectedValue(new Error('Load failed'));
    await expect(
      registry.register(makeManifest(), { onLoad }),
    ).rejects.toThrow('failed to load');
  });

  it('unregisters a plugin', async () => {
    await registry.register(makeManifest());
    const result = await registry.unregister('test-plugin');
    expect(result).toBe(true);
    expect(registry.size).toBe(0);
  });

  it('returns false for unregistering non-existent plugin', async () => {
    const result = await registry.unregister('nonexistent');
    expect(result).toBe(false);
  });

  it('runs onUnload lifecycle hook', async () => {
    const onUnload = vi.fn();
    await registry.register(makeManifest(), { onUnload });
    await registry.unregister('test-plugin');
    expect(onUnload).toHaveBeenCalledTimes(1);
  });

  it('prevents unregistering with dependents', async () => {
    await registry.register(makeManifest({ id: 'base', name: 'Base' }));
    await registry.register(makeManifest({ id: 'dependent', name: 'Dep', dependencies: ['base'] }));
    await expect(registry.unregister('base')).rejects.toThrow('required by');
  });

  it('checks dependencies on registration', async () => {
    await expect(
      registry.register(makeManifest({ dependencies: ['missing-dep'] })),
    ).rejects.toThrow('Missing dependency');
  });

  it('gets a plugin by id', async () => {
    await registry.register(makeManifest());
    const plugin = registry.get('test-plugin');
    expect(plugin).toBeDefined();
    expect(plugin!.manifest.id).toBe('test-plugin');
  });

  it('lists all plugins', async () => {
    await registry.register(makeManifest({ id: 'p1', name: 'P1' }));
    await registry.register(makeManifest({ id: 'p2', name: 'P2', type: 'transform' }));
    expect(registry.list()).toHaveLength(2);
  });

  it('lists plugins by type', async () => {
    await registry.register(makeManifest({ id: 'p1', name: 'P1', type: 'scanner' }));
    await registry.register(makeManifest({ id: 'p2', name: 'P2', type: 'transform' }));
    expect(registry.listByType('scanner')).toHaveLength(1);
    expect(registry.listByType('transform')).toHaveLength(1);
  });

  it('clears all plugins', async () => {
    const onUnload = vi.fn();
    await registry.register(makeManifest({ id: 'p1', name: 'P1' }), { onUnload });
    await registry.register(makeManifest({ id: 'p2', name: 'P2' }));
    await registry.clear();
    expect(registry.size).toBe(0);
    expect(onUnload).toHaveBeenCalledTimes(1);
  });
});

// ============================================================================
// Security Validator Tests
// ============================================================================

import {
  validatePluginSecurity,
  validatePluginDependencies,
  CAPABILITY_ALLOWLIST,
  BLOCKED_PATTERNS,
} from './validator.js';

describe('validatePluginSecurity', () => {
  it('accepts a valid plugin', () => {
    const errors = validatePluginSecurity(makeManifest());
    expect(errors).toHaveLength(0);
  });

  it('detects blocked patterns in id field', () => {
    // Test that each blocked pattern is detected when present raw in the id
    for (const pattern of BLOCKED_PATTERNS) {
      const testId = `test-${pattern}-plugin`;
      const errors = validatePluginSecurity(makeManifest({ id: testId, name: 'Safe' }));
      expect(errors.length).toBeGreaterThan(0);
    }
  });

  it('detects blocked patterns in description field', () => {
    for (const pattern of BLOCKED_PATTERNS) {
      const errors = validatePluginSecurity(makeManifest({ description: `Uses ${pattern} internally` }));
      expect(errors.some((e) => e.field === 'description' && e.message.includes('blocked pattern'))).toBe(true);
    }
  });

  it('rejects invalid capability', () => {
    const errors = validatePluginSecurity(makeManifest({ capabilities: ['scan', 'execute_code'] }));
    expect(errors.some((e) => e.field === 'capabilities' && e.message.includes('execute_code'))).toBe(true);
  });

  it('accepts valid capabilities', () => {
    for (const cap of CAPABILITY_ALLOWLIST) {
      const errors = validatePluginSecurity(makeManifest({ capabilities: [cap] }));
      const capErrors = errors.filter((e) => e.field === 'capabilities');
      expect(capErrors).toHaveLength(0);
    }
  });
});

describe('validatePluginDependencies', () => {
  it('passes when all dependencies exist', () => {
    const registry = { 'dep-a': makeManifest({ id: 'dep-a', name: 'Dep A' }) };
    const errors = validatePluginDependencies(makeManifest({ dependencies: ['dep-a'] }), registry);
    expect(errors).toHaveLength(0);
  });

  it('detects missing dependency', () => {
    const errors = validatePluginDependencies(makeManifest({ dependencies: ['missing'] }), {});
    expect(errors.some((e) => e.message.includes('missing'))).toBe(true);
  });

  it('detects self-dependency', () => {
    const errors = validatePluginDependencies(
      makeManifest({ id: 'self-ref', dependencies: ['self-ref'] }),
      { 'self-ref': makeManifest({ id: 'self-ref' }) },
    );
    expect(errors.some((e) => e.message.includes('cannot depend on itself'))).toBe(true);
  });

  it('detects circular dependency', () => {
    const registry = {
      'a': makeManifest({ id: 'a', name: 'A', dependencies: ['b'] }),
      'b': makeManifest({ id: 'b', name: 'B', dependencies: ['test-plugin'] }),
    };
    const errors = validatePluginDependencies(makeManifest({ dependencies: ['a'] }), registry);
    expect(errors.some((e) => e.message.includes('Circular'))).toBe(true);
  });

  it('detects duplicate dependencies', () => {
    const registry = { 'dep-a': makeManifest({ id: 'dep-a', name: 'Dep A' }) };
    const errors = validatePluginDependencies(makeManifest({ dependencies: ['dep-a', 'dep-a'] }), registry);
    expect(errors.some((e) => e.message.includes('Duplicate'))).toBe(true);
  });
});
