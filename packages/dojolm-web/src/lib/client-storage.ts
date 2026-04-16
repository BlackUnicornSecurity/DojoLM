/**
 * client-storage.ts — H-03: Unified client-side storage module
 *
 * Single interface for all localStorage / sessionStorage access.
 * Features:
 *   - SSR-safe (typeof window guard)
 *   - Zod schema validation on read (invalid data returns defaultValue, never throws)
 *   - Quota/private-browsing errors silently handled
 *   - Prototype-pollution safe JSON.parse (strips __proto__, constructor, prototype keys)
 *   - Typed — zero any casts at call sites
 *   - createRawStringStore: migration-aware store for keys that store raw (non-JSON) strings
 *
 * Usage:
 *   const store = createStore('my-key', { scope: 'local', schema: z.string(), defaultValue: '' })
 *   store.get()     // → T (validated, or defaultValue)
 *   store.set(val)  // → void
 *   store.remove()  // → void
 *
 * For code that needs direct storage access (e.g. custom JSON reviver):
 *   const storage = getStorage('local') // null-safe, SSR-safe
 */

import { z } from 'zod'

export type StorageScope = 'local' | 'session'

export interface ClientStore<T> {
  get(): T
  set(value: T): void
  remove(): void
}

interface StoreOptions<T> {
  scope: StorageScope
  schema: z.ZodType<T>
  defaultValue: T
}

/** JSON reviver that strips prototype-pollution keys */
function safeReviver(_key: string, value: unknown): unknown {
  if (_key === '__proto__' || _key === 'constructor' || _key === 'prototype') return undefined
  return value
}

/**
 * Return the underlying Storage object for a given scope.
 * Returns null when called during SSR or when storage is blocked (private browsing).
 * Exported for consumers that need custom JSON parsing (e.g. dashboard config migration).
 */
export function getStorage(scope: StorageScope): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return scope === 'session' ? window.sessionStorage : window.localStorage
  } catch {
    // Private browsing can throw SecurityError on access
    return null
  }
}

export function createStore<T>(key: string, opts: StoreOptions<T>): ClientStore<T> {
  return {
    get(): T {
      const storage = getStorage(opts.scope)
      if (!storage) return opts.defaultValue
      try {
        const raw = storage.getItem(key)
        if (raw === null) return opts.defaultValue
        const parsed: unknown = JSON.parse(raw, safeReviver)
        const result = opts.schema.safeParse(parsed)
        return result.success ? result.data : opts.defaultValue
      } catch {
        return opts.defaultValue
      }
    },

    set(value: T): void {
      const storage = getStorage(opts.scope)
      if (!storage) return
      try {
        storage.setItem(key, JSON.stringify(value))
      } catch {
        // QuotaExceededError or SecurityError — silently degrade
      }
    },

    remove(): void {
      const storage = getStorage(opts.scope)
      if (!storage) return
      try {
        storage.removeItem(key)
      } catch {
        // ignore
      }
    },
  }
}

/**
 * Create a store for string values that may have been stored as raw strings
 * (not JSON-encoded) by legacy code.
 *
 * Read: tries JSON.parse first (new format), falls back to the raw value (legacy).
 * Write: always writes JSON-encoded strings.
 *
 * This enables transparent migration: existing raw-string data is readable
 * immediately; subsequent writes switch to JSON format.
 */
export function createRawStringStore(key: string, scope: StorageScope): ClientStore<string | null> {
  return {
    get(): string | null {
      const storage = getStorage(scope)
      if (!storage) return null
      try {
        const raw = storage.getItem(key)
        if (!raw) return null
        try {
          const parsed = JSON.parse(raw, safeReviver)
          return typeof parsed === 'string' ? parsed : null
        } catch {
          // Legacy raw string — readable as-is; next write will migrate to JSON
          return raw
        }
      } catch {
        return null
      }
    },

    set(value: string | null): void {
      const storage = getStorage(scope)
      if (!storage) return
      if (value === null) {
        try { storage.removeItem(key) } catch { /* ignore */ }
      } else {
        try { storage.setItem(key, JSON.stringify(value)) } catch { /* quota */ }
      }
    },

    remove(): void {
      const storage = getStorage(scope)
      if (!storage) return
      try { storage.removeItem(key) } catch { /* ignore */ }
    },
  }
}
