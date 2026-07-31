// SPDX-License-Identifier: Apache-2.0
'use client'

/**
 * File: hook-utils.ts
 * Purpose: Shared primitives for the Wave 2 fetch-hook family. Every
 *          Wave 2 hook (`useMitsukeData`, `useSageData`, `useRoninData`,
 *          `useGuardData`, `useTemporalData`) imports from here so the
 *          error-classification ladder, the JSON fetch wrapper, and the
 *          `HookState<T>` contract stay in lockstep across modules.
 *
 * Story: Wave 2 consolidated audit — 2026-04-18.
 */

import type { FeatureErrorClass } from '@/lib/telemetry'

export interface HookState<T> {
  items: T
  loading: boolean
  error: string | null
  refresh: () => void
}

export interface ClassifiedError {
  class: FeatureErrorClass
  message: string
}

/**
 * Classify an unknown caught error for error-state UI + telemetry.
 *
 * - TypeError → 'network' (fetch failed before response — DNS, offline,
 *   CORS preflight reject, AbortError after unmount).
 * - `HTTP <code>` messages thrown by `fetchJson` + many manual catch
 *   branches are further classified by status family:
 *     401 / 403 → 'auth' — prompts sign-in.
 *     400 / 422 → 'validation' — input / schema rejected.
 *     404       → 'precondition' — resource not present.
 *     409       → 'precondition' — state conflict.
 *     429       → 'precondition' — rate-limited.
 *     5xx       → 'internal'.
 * - Any other `Error` → 'internal' with the raw message.
 * - Anything else → 'internal' + 'Unknown error'.
 *
 * Wave 9.2 (ADR-0083) — every onRetry path now funnels catches through
 * this helper so the ErrorState surface is uniform and telemetry
 * `error_class` is accurate.
 */
export function classifyError(err: unknown): ClassifiedError {
  if (err instanceof TypeError) return { class: 'network', message: 'Network error' }
  if (err instanceof Error) {
    const match = err.message.match(/^HTTP (\d{3})\b/)
    if (match) {
      const code = Number(match[1])
      if (code === 401 || code === 403) return { class: 'auth', message: 'Not authorized' }
      if (code === 400 || code === 422) return { class: 'validation', message: err.message }
      if (code === 404) return { class: 'precondition', message: 'Not found' }
      if (code === 409) return { class: 'precondition', message: 'Conflict — refresh and retry' }
      if (code === 429) return { class: 'precondition', message: 'Rate limited — wait and retry' }
      if (code >= 500) return { class: 'internal', message: 'Server error' }
    }
    return { class: 'internal', message: err.message }
  }
  return { class: 'internal', message: 'Unknown error' }
}

export async function fetchJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal, credentials: 'same-origin' })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  return response.json() as Promise<T>
}
