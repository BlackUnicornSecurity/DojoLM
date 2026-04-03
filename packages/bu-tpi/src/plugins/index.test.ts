import { describe, it, expect } from 'vitest';
import * as mod from '../plugins/index.js';

describe('plugins exports', () => {
  it('exports at least one symbol', () => {
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });

  it('exports plugin constants', () => {
    expect(mod.PLUGIN_TYPES).toBeDefined();
    expect(mod.PLUGIN_STATES).toBeDefined();
    expect(mod.MAX_PLUGINS).toBeDefined();
  });

  it('exports loader functions', () => {
    expect(mod.validateManifest).toBeTypeOf('function');
    expect(mod.PluginRegistry).toBeTypeOf('function');
  });
});
