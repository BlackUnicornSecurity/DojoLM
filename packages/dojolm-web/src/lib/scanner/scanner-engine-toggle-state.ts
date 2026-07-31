// SPDX-License-Identifier: Apache-2.0
'use client';

/**
 * scanner-engine-toggle-state — TICKET-A-405 / Scanner Engine toggle grid.
 *
 * Per-user localStorage persistence for the operator's selected
 * scanner-engine subset on `/admin/scanner`. A-405 is a CONSUMER of the
 * S-301 shared primitive (`@/design/scanner/EngineStatusBar`); this file
 * owns ONLY the closed-enum localStorage shape + read/write/hook surface.
 *
 * Pattern parity with TICKET-D201 `training-scroll-state.ts`:
 *   - Closed-enum filtering on every read (`isScannerEngineId` guard so
 *     unknown ids dropped — no XSS via storage tampering).
 *   - Versioned shape `{ v: 1 }` for forward-compat.
 *   - `API_KEY_USER_ID` exclusion at the write path (T8.1 lesson).
 *   - Defensive try/catch around every storage call (Safari private + quota).
 *
 * Persisted shape stores ONLY the selected ids (not the full toggle
 * matrix). Engines absent from the persisted list render as deselected;
 * engines present render as selected. This keeps the on-disk payload tiny
 * (≤ ~140 bytes for the canonical 13-engine fleet) and the closed-enum
 * filter dead-simple.
 *
 * Block threshold:
 *   The `blockThreshold` numeric (0–1) is also persisted under the same
 *   per-user key. Server-side `GuardConfig.blockThreshold` is currently a
 *   string union ('CRITICAL' | 'WARNING') — A-405 is a UI-only consumer
 *   per ticket scope ("DO NOT add a new admin write route in this PR").
 *   When the future ticket lands the persistence write path, this lib's
 *   shape will be the canonical client mirror.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_ENGINES,
  isScannerEngineId,
  type ScannerEngineId,
} from './engines';
import { API_KEY_USER_ID, isSafeUserIdSegment } from '@/lib/api-session-client';

const STORAGE_KEY_PREFIX = 'tpi.scanner.engine-toggle.';
const FALLBACK_SCOPE = 'default';

/**
 * Numeric clamp bounds for the block-threshold input. The UI step is
 * 0.05 but the input is also keyboard-typeable; defensive clamping at
 * read + set guards against out-of-range payloads.
 */
export const BLOCK_THRESHOLD_MIN = 0;
export const BLOCK_THRESHOLD_MAX = 1;
export const BLOCK_THRESHOLD_STEP = 0.05;
/**
 * Default block threshold mirrors V1 (`0.7` = block on findings whose
 * confidence ≥ 70%). Aligns with the pre-A-405 read-only display the
 * platform has surfaced under `/admin/hattori`'s `blockThreshold` chip.
 */
export const BLOCK_THRESHOLD_DEFAULT = 0.7;

/**
 * Clamp a numeric block-threshold into the [0, 1] interval and round to
 * 2 decimal places. NaN/Infinity collapse to the canonical default so a
 * malformed persisted payload cannot poison the UI.
 */
export function clampBlockThreshold(v: unknown): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return BLOCK_THRESHOLD_DEFAULT;
  if (v < BLOCK_THRESHOLD_MIN) return BLOCK_THRESHOLD_MIN;
  if (v > BLOCK_THRESHOLD_MAX) return BLOCK_THRESHOLD_MAX;
  // Round to 2 decimal places — keeps step alignment + persisted size tight.
  return Math.round(v * 100) / 100;
}

/**
 * Closed-enum on-disk shape for the engine-toggle + block-threshold
 * subset. `selected` is a list (not a Set) so JSON.stringify roundtrips
 * cleanly; the hook builds a Set on read.
 */
export interface ScannerEngineTogglePersisted {
  readonly v: 1;
  readonly selected: readonly ScannerEngineId[];
  readonly blockThreshold: number;
}

/**
 * Snapshot returned by the hook. `selected` is a frozen ReadonlySet so
 * the consumer cannot mutate the live state by mistake.
 */
export interface ScannerEngineToggleState {
  readonly selected: ReadonlySet<ScannerEngineId>;
  readonly blockThreshold: number;
}

/**
 * Default selection mirrors `DEFAULT_ENGINES.filter(e => e.defaultEnabled)`
 * — the V1 ground-truth where every engine boots armed.
 */
export const DEFAULT_SELECTED_ENGINE_IDS: readonly ScannerEngineId[] =
  Object.freeze(
    DEFAULT_ENGINES.filter((e) => e.defaultEnabled).map((e) => e.id),
  );

/**
 * Frozen default snapshot. Every initial render uses this as the seed
 * before the localStorage hydration effect runs.
 */
export const DEFAULT_TOGGLE_STATE: ScannerEngineToggleState = Object.freeze({
  selected: Object.freeze(new Set<ScannerEngineId>(DEFAULT_SELECTED_ENGINE_IDS)),
  blockThreshold: BLOCK_THRESHOLD_DEFAULT,
});

function safeUserScope(userId: string | null | undefined): string {
  if (!userId) return FALLBACK_SCOPE;
  // T8.1 — the synthetic api-key user shares the default scope so two
  // operators authenticating via the same shared key don't stomp each
  // other's persisted toggle state.
  if (userId === API_KEY_USER_ID) return FALLBACK_SCOPE;
  if (!isSafeUserIdSegment(userId)) return FALLBACK_SCOPE;
  return userId;
}

function storageKey(userId: string | null | undefined): string {
  return `${STORAGE_KEY_PREFIX}${safeUserScope(userId)}`;
}

/**
 * Read the persisted toggle state for a user. Returns the canonical
 * default snapshot when:
 *   - `window` is undefined (SSR).
 *   - The storage key is absent.
 *   - The persisted JSON is malformed / wrong version / mistyped.
 *   - `localStorage.getItem` throws (Safari private mode).
 */
export function readScannerEngineToggleState(
  userId: string | null | undefined,
): ScannerEngineToggleState {
  if (typeof window === 'undefined') return DEFAULT_TOGGLE_STATE;
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (raw === null) return DEFAULT_TOGGLE_STATE;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return DEFAULT_TOGGLE_STATE;
    }
    const candidate = parsed as Record<string, unknown>;
    if (candidate.v !== 1) return DEFAULT_TOGGLE_STATE;
    const rawSelected = Array.isArray(candidate.selected) ? candidate.selected : [];
    const seed = new Set<ScannerEngineId>();
    for (const c of rawSelected) {
      if (isScannerEngineId(c)) seed.add(c);
    }
    // Object.freeze on the Set wrapper is cosmetic — JS prototype
    // methods (add/delete/clear) bypass it. Real immutability protection
    // is the `ReadonlySet<>` TS type plus the "always create new Set in
    // mutators" discipline below. Freeze applied here for consistency
    // with `DEFAULT_TOGGLE_STATE` so a future contributor inspecting the
    // returned shape sees the same invariant at every construction site.
    const blockThreshold = clampBlockThreshold(candidate.blockThreshold);
    return {
      selected: Object.freeze(seed),
      blockThreshold,
    };
  } catch {
    return DEFAULT_TOGGLE_STATE;
  }
}

/**
 * Write the persisted toggle state for a user. Closed-enum filter on
 * the selection list ensures only canonical ids reach disk — never
 * persists arbitrary strings even if a future bug lets unknown ids
 * into the in-memory Set.
 */
export function writeScannerEngineToggleState(
  userId: string | null | undefined,
  next: ScannerEngineToggleState,
): void {
  if (typeof window === 'undefined') return;
  try {
    const selected: ScannerEngineId[] = [];
    for (const id of next.selected) {
      if (isScannerEngineId(id)) selected.push(id);
    }
    const safe: ScannerEngineTogglePersisted = {
      v: 1,
      selected,
      blockThreshold: clampBlockThreshold(next.blockThreshold),
    };
    window.localStorage.setItem(storageKey(userId), JSON.stringify(safe));
  } catch {
    // Safari private mode + quota errors swallowed — caller still sees
    // in-memory updates take effect for the rest of the session.
  }
}

/**
 * Hook contract. Returns the current snapshot + four mutators:
 *   - `toggleEngine(id)` — flip one engine in the selection set
 *   - `selectAll()` — select every canonical id
 *   - `deselectAll()` — clear the selection set
 *   - `setBlockThreshold(value)` — update the numeric threshold (clamped)
 *
 * Every mutator updates in-memory state AND persists to localStorage.
 */
export interface ScannerEngineToggleHook {
  readonly state: ScannerEngineToggleState;
  readonly toggleEngine: (id: ScannerEngineId) => void;
  readonly selectAll: () => void;
  readonly deselectAll: () => void;
  readonly setBlockThreshold: (value: number) => void;
}

export function useScannerEngineToggleState(
  userId: string | null | undefined,
): ScannerEngineToggleHook {
  const [state, setState] = useState<ScannerEngineToggleState>(
    () => DEFAULT_TOGGLE_STATE,
  );

  // Hydrate from localStorage on mount + whenever userId changes.
  useEffect(() => {
    setState(readScannerEngineToggleState(userId));
  }, [userId]);

  const toggleEngine = useCallback(
    (id: ScannerEngineId) => {
      if (!isScannerEngineId(id)) return;
      setState((prev) => {
        const nextSelected = new Set<ScannerEngineId>(prev.selected);
        if (nextSelected.has(id)) {
          nextSelected.delete(id);
        } else {
          nextSelected.add(id);
        }
        const next: ScannerEngineToggleState = {
          selected: Object.freeze(nextSelected),
          blockThreshold: prev.blockThreshold,
        };
        writeScannerEngineToggleState(userId, next);
        return next;
      });
    },
    [userId],
  );

  const selectAll = useCallback(() => {
    setState((prev) => {
      const next: ScannerEngineToggleState = {
        selected: Object.freeze(
          new Set<ScannerEngineId>(DEFAULT_ENGINES.map((e) => e.id)),
        ),
        blockThreshold: prev.blockThreshold,
      };
      writeScannerEngineToggleState(userId, next);
      return next;
    });
  }, [userId]);

  const deselectAll = useCallback(() => {
    setState((prev) => {
      const next: ScannerEngineToggleState = {
        selected: Object.freeze(new Set<ScannerEngineId>()),
        blockThreshold: prev.blockThreshold,
      };
      writeScannerEngineToggleState(userId, next);
      return next;
    });
  }, [userId]);

  const setBlockThreshold = useCallback(
    (value: number) => {
      setState((prev) => {
        const next: ScannerEngineToggleState = {
          selected: prev.selected,
          blockThreshold: clampBlockThreshold(value),
        };
        writeScannerEngineToggleState(userId, next);
        return next;
      });
    },
    [userId],
  );

  return useMemo<ScannerEngineToggleHook>(
    () => ({
      state,
      toggleEngine,
      selectAll,
      deselectAll,
      setBlockThreshold,
    }),
    [state, toggleEngine, selectAll, deselectAll, setBlockThreshold],
  );
}
