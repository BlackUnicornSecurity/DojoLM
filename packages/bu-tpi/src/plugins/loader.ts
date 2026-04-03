/**
 * MUSUBI Phase 7.3: Plugin Loader
 * Validates, loads, and manages plugin lifecycle.
 */

import type {
  PluginManifest,
  PluginLifecycle,
  LoadedPlugin,
  PluginState,
  PluginValidationError,
} from './types.js';
import { PLUGIN_TYPES, MAX_PLUGINS, MAX_PLUGIN_NAME_LENGTH, MAX_PLUGIN_VERSION_LENGTH } from './types.js';

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** Validate a plugin manifest */
export function validateManifest(manifest: PluginManifest): readonly PluginValidationError[] {
  const errors: PluginValidationError[] = [];

  if (!manifest.id?.trim()) {
    errors.push({ field: 'id', message: 'Plugin ID is required' });
  }
  if (!manifest.name?.trim() || manifest.name.length > MAX_PLUGIN_NAME_LENGTH) {
    errors.push({ field: 'name', message: `Plugin name is required and must be under ${MAX_PLUGIN_NAME_LENGTH} chars` });
  }
  if (!manifest.version?.trim() || manifest.version.length > MAX_PLUGIN_VERSION_LENGTH) {
    errors.push({ field: 'version', message: `Version is required and must be under ${MAX_PLUGIN_VERSION_LENGTH} chars` });
  }
  if (!PLUGIN_TYPES.includes(manifest.type as typeof PLUGIN_TYPES[number])) {
    errors.push({ field: 'type', message: `Invalid plugin type. Must be one of: ${PLUGIN_TYPES.join(', ')}` });
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Plugin Registry
// ---------------------------------------------------------------------------

export class PluginRegistry {
  private readonly plugins = new Map<string, LoadedPlugin>();

  /** Register and load a plugin */
  async register(manifest: PluginManifest, lifecycle: PluginLifecycle = {}): Promise<LoadedPlugin> {
    const errors = validateManifest(manifest);
    if (errors.length > 0) {
      throw new Error(`Plugin validation failed: ${errors.map((e) => `${e.field}: ${e.message}`).join('; ')}`);
    }

    if (this.plugins.has(manifest.id)) {
      throw new Error(`Plugin '${manifest.id}' is already registered`);
    }

    if (this.plugins.size >= MAX_PLUGINS) {
      throw new Error(`Plugin limit reached (${MAX_PLUGINS})`);
    }

    // Check dependencies
    for (const dep of manifest.dependencies) {
      if (!this.plugins.has(dep)) {
        throw new Error(`Missing dependency: '${dep}' required by '${manifest.id}'`);
      }
    }

    const plugin: LoadedPlugin = {
      manifest,
      lifecycle,
      state: 'registered',
      loadedAt: new Date().toISOString(),
    };

    this.plugins.set(manifest.id, plugin);

    // Run onLoad lifecycle hook
    if (lifecycle.onLoad) {
      try {
        await lifecycle.onLoad();
        this.plugins.set(manifest.id, { ...plugin, state: 'loaded' });
      } catch {
        this.plugins.set(manifest.id, { ...plugin, state: 'error' });
        throw new Error(`Plugin '${manifest.id}' failed to load`);
      }
    } else {
      this.plugins.set(manifest.id, { ...plugin, state: 'loaded' });
    }

    return this.plugins.get(manifest.id)!;
  }

  /** Unregister a plugin */
  async unregister(id: string): Promise<boolean> {
    const plugin = this.plugins.get(id);
    if (!plugin) return false;

    // Check for dependents
    for (const [otherId, other] of this.plugins) {
      if (otherId !== id && other.manifest.dependencies.includes(id)) {
        throw new Error(`Cannot unregister '${id}' — required by '${otherId}'`);
      }
    }

    if (plugin.lifecycle.onUnload) {
      await plugin.lifecycle.onUnload();
    }

    return this.plugins.delete(id);
  }

  /** Get a registered plugin */
  get(id: string): LoadedPlugin | undefined {
    return this.plugins.get(id);
  }

  /** List all registered plugins */
  list(): readonly LoadedPlugin[] {
    return [...this.plugins.values()];
  }

  /** Get plugins by type */
  listByType(type: string): readonly LoadedPlugin[] {
    return [...this.plugins.values()].filter((p) => p.manifest.type === type);
  }

  /** Get total plugin count */
  get size(): number {
    return this.plugins.size;
  }

  /** Clear all plugins */
  async clear(): Promise<void> {
    for (const plugin of this.plugins.values()) {
      if (plugin.lifecycle.onUnload) {
        await plugin.lifecycle.onUnload();
      }
    }
    this.plugins.clear();
  }
}
