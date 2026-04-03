/**
 * MUSUBI Phase 7.3: Plugin Architecture Types
 * Extensible plugin system for adding custom scanners, transforms, and reporters.
 */

// ---------------------------------------------------------------------------
// Plugin Types
// ---------------------------------------------------------------------------

export const PLUGIN_TYPES = ['scanner', 'transform', 'reporter', 'orchestrator'] as const;
export type PluginType = (typeof PLUGIN_TYPES)[number];

export const PLUGIN_STATES = ['registered', 'loaded', 'active', 'error', 'disabled'] as const;
export type PluginState = (typeof PLUGIN_STATES)[number];

// ---------------------------------------------------------------------------
// Plugin Manifest
// ---------------------------------------------------------------------------

/** Metadata describing a plugin */
export interface PluginManifest {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly type: PluginType;
  readonly description: string;
  readonly author: string;
  readonly dependencies: readonly string[];
  readonly capabilities: readonly string[];
}

// ---------------------------------------------------------------------------
// Plugin Lifecycle
// ---------------------------------------------------------------------------

/** Lifecycle hooks a plugin can implement */
export interface PluginLifecycle {
  readonly onLoad?: () => Promise<void>;
  readonly onUnload?: () => Promise<void>;
  readonly onActivate?: () => Promise<void>;
  readonly onDeactivate?: () => Promise<void>;
}

/** A loaded plugin with manifest and lifecycle */
export interface LoadedPlugin {
  readonly manifest: PluginManifest;
  readonly lifecycle: PluginLifecycle;
  readonly state: PluginState;
  readonly loadedAt: string;
}

// ---------------------------------------------------------------------------
// Plugin Registry
// ---------------------------------------------------------------------------

/** Plugin validation errors */
export interface PluginValidationError {
  readonly field: string;
  readonly message: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const MAX_PLUGINS = 50;
export const MAX_PLUGIN_NAME_LENGTH = 100;
export const MAX_PLUGIN_VERSION_LENGTH = 20;
