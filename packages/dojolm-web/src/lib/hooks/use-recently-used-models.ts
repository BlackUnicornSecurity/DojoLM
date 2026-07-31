// SPDX-License-Identifier: Apache-2.0
/**
 * useRecentlyUsedModels — E4.S9 (retires F-7-019 / F-9-009 / F-A04 part).
 *
 * localStorage-backed top-3 ring of recently-selected model ids, keyed
 * by the versioned key `dojolm.model-picker.recent.v1` (E9.S1 versioned-
 * storage convention — bump the suffix on schema break).
 *
 * Hook contract:
 *   - `recent`: readonly array of up-to-3 model ids, MRU-first.
 *   - `record(modelId)`: add/move-to-front; cap to MAX_RECENT (3); fail
 *     silently when storage is blocked (private browsing / SSR).
 *   - `clear()`: drop the entire history. Used by tests + the "Clear
 *     recently used" affordance the picker may render.
 *
 * SSR safety:
 *   - `getStorage('local')` returns `null` during SSR; `recent` seeds to
 *     `[]` and the post-hydration `useEffect` reconciles against the
 *     real localStorage value. This mirrors the `useOnlineStatus` SSR
 *     pattern (E8.S1) — `useState`'s lazy initializer never reads
 *     `localStorage` directly so the SSR HTML and the first client
 *     commit are byte-identical.
 *
 * Validation:
 *   - Parsed JSON is run through a closed `z.string().array()` schema
 *     via `client-storage.ts`, so corrupt / pollution-keyed entries
 *     return `[]` rather than crash.
 *   - Empty / whitespace-only ids are dropped at `record` time so a
 *     malformed entry can't enter the ring.
 *
 * Cap discipline:
 *   - `MAX_RECENT = 3` is the only knob. Bumping it requires a v2 key
 *     so existing v1 data doesn't accidentally surface a 4-deep ring.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';
import { createStore } from '@/lib/client-storage';

export const RECENTLY_USED_MODELS_STORAGE_KEY = 'dojolm.model-picker.recent.v1';
export const MAX_RECENT = 3;

const recentSchema = z.string().array();

const recentStore = createStore<readonly string[]>(
  RECENTLY_USED_MODELS_STORAGE_KEY,
  {
    scope: 'local',
    schema: recentSchema,
    defaultValue: [],
  },
);

export interface UseRecentlyUsedModelsResult {
  readonly recent: readonly string[];
  readonly record: (modelId: string) => void;
  readonly clear: () => void;
}

/**
 * Move-to-front a `modelId`, capping the ring at `MAX_RECENT`.
 * Pure helper extracted so unit tests can assert the closed-form
 * transition without reaching into hook plumbing.
 */
export function pushRecent(
  current: readonly string[],
  modelId: string,
): readonly string[] {
  const trimmed = modelId.trim();
  if (trimmed.length === 0) return current;
  const filtered = current.filter((id) => id !== trimmed);
  const next = [trimmed, ...filtered];
  return next.slice(0, MAX_RECENT);
}

export function useRecentlyUsedModels(): UseRecentlyUsedModelsResult {
  // SSR-safe: seed with `[]` so the first commit matches server output.
  // Reconcile against localStorage in the post-hydration effect below.
  const [recent, setRecent] = useState<readonly string[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setRecent(recentStore.get());
  }, []);

  const record = useCallback((modelId: string): void => {
    setRecent((prev) => {
      const next = pushRecent(prev, modelId);
      // Idempotency guard — don't write when nothing changed (e.g. the
      // already-at-front model is re-selected). Cuts gratuitous storage
      // traffic + avoids spurious StorageEvent dispatches in other tabs.
      if (next === prev || sameOrder(next, prev)) return prev;
      try {
        recentStore.set(next);
      } catch {
        // Storage blocked — keep the in-memory state but skip persistence.
      }
      return next;
    });
  }, []);

  const clear = useCallback((): void => {
    setRecent([]);
    try {
      recentStore.remove();
    } catch {
      // Storage blocked — in-memory state already cleared.
    }
  }, []);

  return { recent, record, clear };
}

function sameOrder(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
