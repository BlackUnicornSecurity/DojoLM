/**
 * MUSUBI Phase 7.3: Plugin Security Validator
 * Security validation for plugins: capability checks, blocked patterns,
 * and dependency verification.
 */

import type { PluginManifest, PluginValidationError } from './types.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Allowed plugin capabilities */
export const CAPABILITY_ALLOWLIST: readonly string[] = [
  'scan',
  'transform',
  'report',
  'detect',
] as const;

/** Blocked code patterns that indicate dangerous behavior */
export const BLOCKED_PATTERNS: readonly string[] = [
  'eval(',
  'Function(',
  'require(',
  'import(',
  '__proto__',
  'constructor.constructor',
] as const;

// ---------------------------------------------------------------------------
// Security Validation
// ---------------------------------------------------------------------------

/**
 * Validate a plugin manifest for security concerns.
 * Checks for dangerous capabilities and blocked code patterns.
 * @param manifest - The plugin manifest to validate
 * @returns An array of validation errors (empty if valid)
 */
export function validatePluginSecurity(
  manifest: PluginManifest,
): readonly PluginValidationError[] {
  const errors: PluginValidationError[] = [];

  // Check capabilities against allowlist
  for (const capability of manifest.capabilities) {
    if (!CAPABILITY_ALLOWLIST.includes(capability)) {
      errors.push({
        field: 'capabilities',
        message: `Capability '${capability}' is not in the allowlist. Allowed: ${CAPABILITY_ALLOWLIST.join(', ')}`,
      });
    }
  }

  // Check plugin ID for suspicious patterns
  for (const pattern of BLOCKED_PATTERNS) {
    if (manifest.id.includes(pattern)) {
      errors.push({
        field: 'id',
        message: `Plugin ID contains blocked pattern: '${pattern}'`,
      });
    }
    if (manifest.name.includes(pattern)) {
      errors.push({
        field: 'name',
        message: `Plugin name contains blocked pattern: '${pattern}'`,
      });
    }
    if (manifest.description.includes(pattern)) {
      errors.push({
        field: 'description',
        message: `Plugin description contains blocked pattern: '${pattern}'`,
      });
    }
  }

  // Validate version format (semver-like)
  const semverPattern = /^\d+\.\d+\.\d+(-[\w.]+)?$/;
  if (!semverPattern.test(manifest.version)) {
    errors.push({
      field: 'version',
      message: `Invalid version format '${manifest.version}'. Expected semver (e.g., 1.0.0)`,
    });
  }

  // Validate ID format (alphanumeric with hyphens)
  const idPattern = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
  if (!idPattern.test(manifest.id)) {
    errors.push({
      field: 'id',
      message: `Invalid plugin ID '${manifest.id}'. Must be lowercase alphanumeric with hyphens.`,
    });
  }

  // Check for empty required fields
  if (!manifest.name.trim()) {
    errors.push({ field: 'name', message: 'Plugin name cannot be empty' });
  }
  if (!manifest.description.trim()) {
    errors.push({ field: 'description', message: 'Plugin description cannot be empty' });
  }
  if (!manifest.author.trim()) {
    errors.push({ field: 'author', message: 'Plugin author cannot be empty' });
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Dependency Validation
// ---------------------------------------------------------------------------

/**
 * Validate plugin dependencies against a registry of known plugins.
 * Checks for circular dependencies and missing dependencies.
 * @param manifest - The plugin manifest to validate
 * @param registry - Map of plugin IDs to their manifests
 * @returns An array of validation errors (empty if valid)
 */
export function validatePluginDependencies(
  manifest: PluginManifest,
  registry: Readonly<Record<string, PluginManifest>>,
): readonly PluginValidationError[] {
  const errors: PluginValidationError[] = [];

  // Check that all dependencies exist in registry
  for (const depId of manifest.dependencies) {
    if (!registry[depId]) {
      errors.push({
        field: 'dependencies',
        message: `Dependency '${depId}' not found in registry`,
      });
    }
  }

  // Check for self-dependency
  if (manifest.dependencies.includes(manifest.id)) {
    errors.push({
      field: 'dependencies',
      message: `Plugin '${manifest.id}' cannot depend on itself`,
    });
  }

  // Check for circular dependencies (BFS)
  const visited = new Set<string>();
  const queue = [...manifest.dependencies];

  while (queue.length > 0) {
    const depId = queue.shift()!;

    if (depId === manifest.id) {
      errors.push({
        field: 'dependencies',
        message: `Circular dependency detected: '${manifest.id}' -> ... -> '${depId}'`,
      });
      break;
    }

    if (visited.has(depId)) continue;
    visited.add(depId);

    const dep = registry[depId];
    if (dep) {
      for (const transitiveDep of dep.dependencies) {
        if (!visited.has(transitiveDep)) {
          queue.push(transitiveDep);
        }
      }
    }
  }

  // Check for duplicate dependencies
  const seen = new Set<string>();
  for (const depId of manifest.dependencies) {
    if (seen.has(depId)) {
      errors.push({
        field: 'dependencies',
        message: `Duplicate dependency: '${depId}'`,
      });
    }
    seen.add(depId);
  }

  return errors;
}
