/**
 * MUSUBI: Plugin Architecture — Public API
 */

export type {
  PluginType,
  PluginState,
  PluginManifest,
  PluginLifecycle,
  LoadedPlugin,
  PluginValidationError,
} from './types.js';

export {
  PLUGIN_TYPES,
  PLUGIN_STATES,
  MAX_PLUGINS,
} from './types.js';

export { validateManifest, PluginRegistry } from './loader.js';
