/**
 * File: plugins/store.ts
 * Purpose: File-backed plugin registry store (manifests + enable/disable state)
 * Story: Plugin Registry (Train 3)
 *
 * Responsibilities:
 * - Read/write plugin manifests to a JSON file at `data/plugins.json`.
 * - Delegate manifest validation to bu-tpi/plugins (shape + security + deps).
 * - Enforce max-plugin and duplicate-id invariants.
 * - Track an `enabled` flag per plugin (decoupled from manifest validity).
 *
 * Scope limitations (v1):
 * - No plugin code execution. This store curates manifests; consumers wire
 *   runtime behavior separately in a later phase. Lifecycle hooks (onLoad,
 *   onUnload) are intentionally NOT invoked here.
 * - Single-process store. Safe for the current single-replica deploy;
 *   multi-replica deployments would need a shared store (DB or Redis).
 */

import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync } from 'fs'
import { dirname } from 'path'
import crypto from 'node:crypto'
import {
  validateManifest,
  validatePluginSecurity,
  validatePluginDependencies,
  MAX_PLUGINS,
  PLUGIN_STATES,
  type PluginManifest,
  type PluginState,
  type PluginType,
  type PluginValidationError,
} from 'bu-tpi/plugins'
import { getDataPath } from '@/lib/runtime-paths'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Plugin record as persisted in the store. */
export interface StoredPlugin {
  readonly manifest: PluginManifest
  readonly enabled: boolean
  readonly registeredAt: string
  readonly state: PluginState
  readonly lastError: string | null
}

/** Thrown when manifest validation fails — carries field-level errors. */
export class PluginValidationException extends Error {
  readonly errors: readonly PluginValidationError[]
  constructor(errors: readonly PluginValidationError[]) {
    super(`Plugin validation failed: ${errors.map(e => `${e.field}: ${e.message}`).join('; ')}`)
    this.name = 'PluginValidationException'
    this.errors = errors
  }
}

/** Thrown when attempting to register a duplicate id. */
export class PluginDuplicateException extends Error {
  constructor(id: string) {
    super(`Plugin '${id}' is already registered`)
    this.name = 'PluginDuplicateException'
  }
}

/** Thrown when MAX_PLUGINS is exceeded. */
export class PluginLimitException extends Error {
  constructor() {
    super(`Plugin limit reached (${MAX_PLUGINS})`)
    this.name = 'PluginLimitException'
  }
}

/** Thrown when unregistering a plugin that has dependents. */
export class PluginDependentException extends Error {
  readonly dependents: readonly string[]
  constructor(id: string, dependents: readonly string[]) {
    super(`Cannot unregister '${id}' — required by: ${dependents.join(', ')}`)
    this.name = 'PluginDependentException'
    this.dependents = dependents
  }
}

/** Thrown when an operation targets a plugin that does not exist. */
export class PluginNotFoundException extends Error {
  constructor(id: string) {
    super(`Plugin '${id}' not found`)
    this.name = 'PluginNotFoundException'
  }
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

const STORE_PATH = () => getDataPath('plugins.json')

interface StoreFile {
  readonly plugins: readonly StoredPlugin[]
}

/**
 * Reject prototype-polluting keys when parsing untrusted JSON from disk.
 * An attacker with filesystem access could otherwise craft a manifest with
 * `__proto__` / `constructor` / `prototype` keys that poison the global
 * object prototype when the parsed value is spread or accessed.
 */
function safeJsonReviver(key: string, value: unknown): unknown {
  if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
    return undefined
  }
  return value
}

/** Source of truth is `bu-tpi/plugins`. Re-deriving here would drift. */
const VALID_PLUGIN_STATES = new Set<string>(PLUGIN_STATES)

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && (value as unknown[]).every(v => typeof v === 'string')
}

function isValidStoredShape(p: unknown): p is StoredPlugin {
  if (!p || typeof p !== 'object') return false
  const obj = p as Record<string, unknown>
  const m = obj.manifest as Record<string, unknown> | undefined
  if (!m || typeof m !== 'object') return false
  return (
    typeof m.id === 'string' &&
    typeof m.name === 'string' &&
    typeof m.version === 'string' &&
    typeof m.type === 'string' &&
    typeof m.description === 'string' &&
    typeof m.author === 'string' &&
    isStringArray(m.dependencies) &&
    isStringArray(m.capabilities) &&
    typeof obj.enabled === 'boolean' &&
    typeof obj.registeredAt === 'string' &&
    typeof obj.state === 'string' &&
    VALID_PLUGIN_STATES.has(obj.state as string) &&
    (obj.lastError === null || typeof obj.lastError === 'string')
  )
}

function readStore(): StoreFile {
  const path = STORE_PATH()
  try {
    if (!existsSync(path)) {
      return { plugins: [] }
    }
    const raw = readFileSync(path, 'utf8')
    const parsed = JSON.parse(raw, safeJsonReviver) as unknown
    if (
      parsed &&
      typeof parsed === 'object' &&
      'plugins' in parsed &&
      Array.isArray((parsed as { plugins: unknown }).plugins)
    ) {
      const rawPlugins = (parsed as { plugins: unknown[] }).plugins
      const filtered = rawPlugins.filter(isValidStoredShape)
      return { plugins: filtered }
    }
    return { plugins: [] }
  } catch {
    return { plugins: [] }
  }
}

function writeStoreAtomic(data: StoreFile): void {
  const path = STORE_PATH()
  mkdirSync(dirname(path), { recursive: true })
  const suffix = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
  const tmp = `${path}.${suffix}.tmp`
  writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8')
  renameSync(tmp, path)
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function runAllValidators(
  manifest: PluginManifest,
  others: readonly StoredPlugin[],
): readonly PluginValidationError[] {
  const errors: PluginValidationError[] = []
  errors.push(...validateManifest(manifest))
  errors.push(...validatePluginSecurity(manifest))

  const registry: Record<string, PluginManifest> = {}
  for (const p of others) registry[p.manifest.id] = p.manifest
  errors.push(...validatePluginDependencies(manifest, registry))

  return errors
}

// ---------------------------------------------------------------------------
// Write serialization — prevents read-modify-write races between concurrent
// POST/PATCH/DELETE requests. Without this, two concurrent registrations can
// both pass the duplicate-id check and one will silently overwrite the other.
// A single process-wide promise chain is sufficient here because the store
// is intentionally single-process (see file header).
// ---------------------------------------------------------------------------

let writeChain: Promise<unknown> = Promise.resolve()

function serializeWrite<T>(op: () => T): Promise<T> {
  // Chain both success and rejection recovery onto a wrapper that invokes `op`
  // with no arguments. Passing `op` directly as the onRejected handler would
  // mis-signature it as `(reason) => T` and silently leak the prior rejection
  // reason into `op`'s argument list if a future refactor ever gave `op` a
  // parameter. The explicit lambda pins the no-argument contract.
  const run = () => op()
  const next = writeChain.then(run, run)
  writeChain = next.catch(() => undefined)
  return next
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function listPlugins(): readonly StoredPlugin[] {
  return readStore().plugins
}

export function getPlugin(id: string): StoredPlugin | null {
  return readStore().plugins.find(p => p.manifest.id === id) ?? null
}

export function listPluginsByType(type: PluginType): readonly StoredPlugin[] {
  return readStore().plugins.filter(p => p.enabled && p.manifest.type === type)
}

export function registerPlugin(manifest: PluginManifest): Promise<StoredPlugin> {
  return serializeWrite(() => {
    const store = readStore()

    if (store.plugins.some(p => p.manifest.id === manifest.id)) {
      throw new PluginDuplicateException(manifest.id)
    }
    if (store.plugins.length >= MAX_PLUGINS) {
      throw new PluginLimitException()
    }

    const errors = runAllValidators(manifest, store.plugins)
    if (errors.length > 0) {
      throw new PluginValidationException(errors)
    }

    const record: StoredPlugin = {
      manifest,
      enabled: true,
      registeredAt: new Date().toISOString(),
      state: 'loaded',
      lastError: null,
    }

    writeStoreAtomic({ plugins: [...store.plugins, record] })
    return record
  })
}

/**
 * Unregister a plugin by id. Returns the removed record on success, or `null`
 * if no plugin with that id existed. Throws `PluginDependentException` if
 * other plugins depend on it.
 */
export function unregisterPlugin(id: string): Promise<StoredPlugin | null> {
  return serializeWrite(() => {
    const store = readStore()
    const target = store.plugins.find(p => p.manifest.id === id)
    if (!target) return null

    const dependents = store.plugins
      .filter(p => p.manifest.id !== id && p.manifest.dependencies.includes(id))
      .map(p => p.manifest.id)
    if (dependents.length > 0) {
      throw new PluginDependentException(id, dependents)
    }

    writeStoreAtomic({ plugins: store.plugins.filter(p => p.manifest.id !== id) })
    return target
  })
}

/** Result of a setPluginEnabled call: the prior record and the updated record. */
export interface SetPluginEnabledResult {
  readonly previous: StoredPlugin
  readonly updated: StoredPlugin
}

export function setPluginEnabled(id: string, enabled: boolean): Promise<SetPluginEnabledResult> {
  return serializeWrite(() => {
    const store = readStore()
    const target = store.plugins.find(p => p.manifest.id === id)
    if (!target) {
      throw new PluginNotFoundException(id)
    }
    // Preserve state='error' when re-enabling an errored plugin. Clearing it
    // would silently mask a failure without any re-validation or lifecycle
    // call. Operators must delete + re-register to clear the error state.
    const nextState: PluginState = enabled
      ? (target.state === 'error' ? 'error' : 'loaded')
      : 'disabled'
    const updated: StoredPlugin = {
      ...target,
      enabled,
      state: nextState,
    }
    writeStoreAtomic({
      plugins: store.plugins.map(p => (p.manifest.id === id ? updated : p)),
    })
    return { previous: target, updated }
  })
}

/** Count plugins grouped by type. Used by the admin UI summary tiles. */
export function countByType(): Record<PluginType, number> {
  const counts: Record<PluginType, number> = {
    scanner: 0,
    transform: 0,
    reporter: 0,
    orchestrator: 0,
  }
  for (const p of readStore().plugins) {
    counts[p.manifest.type] = (counts[p.manifest.type] ?? 0) + 1
  }
  return counts
}
