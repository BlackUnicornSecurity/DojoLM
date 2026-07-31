// SPDX-License-Identifier: Apache-2.0
/**
 * File: feature-flags.ts
 * Purpose: Shared env-var-backed feature-flag primitive. Introduced in
 *          Wave 3 (ADR-0025) once the LLM-gated feature set reached
 *          two concrete callers (`kotoba.llm` / ADR-0022,
 *          `sengoku.llm` / ADR-0023) with a third about to land
 *          (INTEL-INGEST).
 *
 * Contract: `isEnabled(flag)` returns `true` iff every env var listed
 * in the flag's `requiredEnvVars` is set to a non-empty string. The
 * individual env vars still carry the configuration values — this
 * helper only answers "is the feature on?". Callers read the
 * feature-specific env vars themselves when they need them.
 *
 * Registry shape: every flag declares its human description + the
 * env-var list. Adding a new flag requires a registry entry, which
 * gives us a single surface that lists every gated feature in the
 * app.
 */

import { existsSync } from 'fs'
import { readFile, writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { getDataPath } from '@/lib/runtime-paths'

export type FeatureFlag = 'kotoba.llm' | 'sengoku.llm' | 'ronin.intel-ingest'

export interface FeatureFlagDefinition {
  readonly description: string
  readonly requiredEnvVars: readonly string[]
}

export const FEATURE_FLAG_REGISTRY: Readonly<Record<FeatureFlag, FeatureFlagDefinition>> = {
  'kotoba.llm': {
    description: 'LLM second-opinion insights layer on /api/kotoba/score (ADR-0022).',
    requiredEnvVars: ['KOTOBA_LLM_PROVIDER', 'KOTOBA_LLM_MODEL', 'KOTOBA_LLM_API_KEY'],
  },
  'sengoku.llm': {
    description: 'Multi-turn LLM executor for Sengoku Temporal runs (ADR-0023 + ADR-0024).',
    requiredEnvVars: ['SENGOKU_LLM_PROVIDER', 'SENGOKU_LLM_MODEL', 'SENGOKU_LLM_API_KEY'],
  },
  'ronin.intel-ingest': {
    description: 'CVE + AI Incident DB polling pipeline under /api/ronin/intelligence (ADR-0026).',
    requiredEnvVars: ['RONIN_INTEL_INGEST_ENABLED'],
  },
}

// ---------------------------------------------------------------------------
// Admin override layer (ADR-0041 / WAVE4-FLAG-ADMIN-TOGGLE)
// ---------------------------------------------------------------------------
//
// Flags can be toggled at runtime by writing a per-flag override to
// `<TPI_DATA_DIR>/feature-flags.json`. When an override is present
// for a flag, it wins over the env-var check — `true` forces the
// flag on, `false` forces it off, missing entries fall through to
// the env-var rules. Admin-only writes; audit emission lives in the
// admin route, not here.

export type FlagOverrideMap = Partial<Record<FeatureFlag, boolean>>

const OVERRIDE_FILE = (): string => getDataPath('feature-flags.json')

// Cached overlay synced with the on-disk file. The cache sidesteps
// `await` in the synchronous `isEnabled` hot path. Refresh runs on
// every successful `setFlagOverride` write so admin toggles take
// effect immediately within the same process.
let cachedOverrides: FlagOverrideMap = {}
let cacheLoaded = false

function isFeatureFlagId(value: string): value is FeatureFlag {
  return Object.prototype.hasOwnProperty.call(FEATURE_FLAG_REGISTRY, value)
}

function sanitiseOverrideMap(input: unknown): FlagOverrideMap {
  if (input === null || typeof input !== 'object') return {}
  const out: FlagOverrideMap = {}
  for (const [flag, value] of Object.entries(input as Record<string, unknown>)) {
    if (isFeatureFlagId(flag) && typeof value === 'boolean') {
      out[flag] = value
    }
  }
  return out
}

function readOverridesSync(): FlagOverrideMap {
  // Synchronous read so `isEnabled` stays sync. Failure (missing
  // file, parse error, etc.) returns the empty map — fall through
  // to env-var check for every flag.
  const file = OVERRIDE_FILE()
  if (!existsSync(file)) return {}
  try {
    // require/readFileSync is the only way to keep isEnabled sync;
    // we use the node:fs sync surface explicitly.
    const fs = require('fs') as typeof import('fs')
    const raw = fs.readFileSync(file, 'utf-8')
    const parsed = JSON.parse(raw, (key, value) =>
      key === '__proto__' || key === 'constructor' || key === 'prototype'
        ? undefined
        : value,
    ) as unknown
    return sanitiseOverrideMap(parsed)
  } catch {
    return {}
  }
}

function ensureCacheLoaded(): void {
  if (cacheLoaded) return
  cachedOverrides = readOverridesSync()
  cacheLoaded = true
}

export function isEnabled(flag: FeatureFlag): boolean {
  ensureCacheLoaded()
  const override = cachedOverrides[flag]
  if (override === true) return true
  if (override === false) return false
  const def = FEATURE_FLAG_REGISTRY[flag]
  for (const name of def.requiredEnvVars) {
    const value = process.env[name]
    if (value === undefined || value.length === 0) return false
  }
  return true
}

export function listFeatureFlags(): ReadonlyArray<{
  readonly flag: FeatureFlag
  readonly enabled: boolean
  readonly description: string
  readonly override: boolean | null
}> {
  ensureCacheLoaded()
  return (Object.keys(FEATURE_FLAG_REGISTRY) as FeatureFlag[]).map((flag) => ({
    flag,
    enabled: isEnabled(flag),
    description: FEATURE_FLAG_REGISTRY[flag].description,
    override: cachedOverrides[flag] ?? null,
  }))
}

export async function loadFlagOverrides(): Promise<FlagOverrideMap> {
  const file = OVERRIDE_FILE()
  if (!existsSync(file)) return {}
  try {
    const raw = await readFile(file, 'utf-8')
    const parsed = JSON.parse(raw, (key, value) =>
      key === '__proto__' || key === 'constructor' || key === 'prototype'
        ? undefined
        : value,
    ) as unknown
    return sanitiseOverrideMap(parsed)
  } catch {
    return {}
  }
}

/**
 * Writes a single override and refreshes the in-process cache. A
 * `null` value clears any prior override (revert to env-var rule).
 * Returns the post-write override state for the flag.
 */
export async function setFlagOverride(
  flag: FeatureFlag,
  enabled: boolean | null,
): Promise<{ readonly enabled: boolean; readonly override: boolean | null }> {
  if (!isFeatureFlagId(flag)) {
    throw new Error(`Unknown feature flag: ${flag}`)
  }
  const file = OVERRIDE_FILE()
  const dir = path.dirname(file)
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true })
  }
  const current = await loadFlagOverrides()
  if (enabled === null) {
    delete current[flag]
  } else {
    current[flag] = enabled
  }
  await writeFile(file, JSON.stringify(current, null, 2), 'utf-8')
  cachedOverrides = current
  cacheLoaded = true
  return {
    enabled: isEnabled(flag),
    override: current[flag] ?? null,
  }
}

/**
 * Test-only escape hatch — clears the in-process cache so the next
 * `isEnabled` call re-reads the override file.
 */
export function __resetFlagOverridesCacheForTests(): void {
  cachedOverrides = {}
  cacheLoaded = false
}
