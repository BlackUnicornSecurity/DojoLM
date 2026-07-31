// SPDX-License-Identifier: Apache-2.0
/**
 * useAdminFormDraft — F-8-009 (Wave 3hh).
 *
 * Reusable sessionStorage-backed draft hook for admin long-form
 * surfaces (ConceptReconPanel, ShinganClient, ScenarioRunner). Mirrors
 * the V5 W3w E9.S1 setup-wizard draft pattern (see
 * `components/setup/useSetupWizardDraft.ts`):
 *
 *   - sessionStorage scope (per-tab, cleared on tab close).
 *   - Versioned key (e.g. `dojolm.atemi-recon.draft.v1`) so a schema
 *     bump invalidates stale entries via the suffix rather than
 *     touching code.
 *   - Caller passes a Zod schema for safeParse on read.
 *   - SSR-safe via the `getStorage` guard in client-storage.ts.
 *   - Auto-save with debounce (default 600ms) on draft change after
 *     initial hydration completes.
 *
 * Status discriminator
 * --------------------
 *   - `idle`   : no pending write (post-hydration default).
 *   - `saving` : debounce timer is in flight.
 *   - `saved`  : last write succeeded (sticky for 2s, then back to idle).
 *   - `error`  : last write failed (quota / serialization). Caller
 *                may surface a "Draft save failed" affordance; the
 *                hook keeps the in-memory draft intact regardless.
 *
 * Caller contract
 * ---------------
 *   const { draft, updateDraft, clearDraft, status, savedAt, hydrated } =
 *     useAdminFormDraft({
 *       storageKey: 'dojolm.atemi-recon.draft.v1',
 *       schema: draftSchema,
 *       initialDraft: INITIAL_DRAFT,
 *     });
 *
 * Security (CRITICAL)
 * -------------------
 *   - The caller is responsible for ensuring `T` never contains a
 *     secret (API key, password, raw token, signed cookie). Mirrors
 *     the setup-wizard draft's `password`/`API key` exclusion.
 *   - Zod's `.strict()` at the schema level rejects unknown root
 *     keys so a tampered sessionStorage blob with an injected
 *     secret-shaped field can't slip through on read.
 *   - The status indicator surfaces ONLY a generic "Draft saved"
 *     timestamp — no field-level content reflection.
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { createStore } from '@/lib/client-storage';

export type AdminFormDraftStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface UseAdminFormDraftOptions<T> {
  /** Versioned storage key — bump suffix on incompatible schema changes. */
  readonly storageKey: string;
  /** Zod schema for safeParse on read. Should use `.strict()` at the root. */
  readonly schema: z.ZodType<T>;
  /** Starting value when no valid persisted draft exists. */
  readonly initialDraft: T;
  /**
   * Debounce window in ms between the last `updateDraft` call and the
   * sessionStorage write. Default 600 (matches keystroke cadence).
   */
  readonly debounceMs?: number;
  /**
   * How long (ms) to hold the `saved` state before flipping back to
   * idle. Default 2000.
   */
  readonly savedStickyMs?: number;
}

export interface UseAdminFormDraftResult<T> {
  readonly draft: T;
  /**
   * Patch the draft. Accepts either a partial patch (merged into the
   * current draft) or a producer function. Triggers the debounce
   * timer to persist.
   */
  readonly updateDraft: (patch: Partial<T> | ((prev: T) => T)) => void;
  /** Wipe sessionStorage AND reset in-memory state to `initialDraft`. */
  readonly clearDraft: () => void;
  /** True once the post-mount read of sessionStorage has finished. */
  readonly hydrated: boolean;
  /** Current save status (idle/saving/saved/error). */
  readonly status: AdminFormDraftStatus;
  /**
   * Millisecond timestamp of the last successful save. Null until the
   * first save lands. Caller can format with toLocaleTimeString().
   */
  readonly savedAt: number | null;
}

const DEFAULT_DEBOUNCE_MS = 600;
const DEFAULT_SAVED_STICKY_MS = 2_000;

export function useAdminFormDraft<T>({
  storageKey,
  schema,
  initialDraft,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  savedStickyMs = DEFAULT_SAVED_STICKY_MS,
}: UseAdminFormDraftOptions<T>): UseAdminFormDraftResult<T> {
  const [draft, setDraft] = useState<T>(initialDraft);
  const [hydrated, setHydrated] = useState(false);
  const [status, setStatus] = useState<AdminFormDraftStatus>('idle');
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const hydratedRef = useRef(false);
  const skipNextPersistRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedStickyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Create the store once per storageKey/schema/initialDraft tuple.
  // The deps are stable (caller passes constants) so useRef + lazy init
  // avoids the per-render allocation cost.
  const storeRef = useRef(
    createStore<T>(storageKey, {
      scope: 'session',
      schema,
      defaultValue: initialDraft,
    }),
  );

  // Post-mount hydrate: read sessionStorage and replace state if a
  // valid persisted draft exists. Match useSetupWizardDraft's
  // identity-comparison trick — createStore returns the exact
  // `defaultValue` reference when nothing valid is stored.
  useEffect(() => {
    const stored = storeRef.current.get();
    if (stored !== initialDraft) {
      setDraft(stored);
    }
    hydratedRef.current = true;
    setHydrated(true);
    // Initial hydrated state is "saved" implicitly (we just read a
    // persisted draft) — but only flip the indicator if we actually
    // restored something, so first-paint forms don't briefly flash
    // "Draft saved" with no user input yet.
    if (stored !== initialDraft) {
      setStatus('saved');
      setSavedAt(Date.now());
    }
    // intentionally deps-empty — single boot-time hydrate
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced persist. Runs only after hydration so we never clobber
  // the persisted draft with `initialDraft` on first paint.
  useEffect(() => {
    if (!hydratedRef.current) return;
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }

    setStatus('saving');

    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      try {
        storeRef.current.set(draft);
        setStatus('saved');
        setSavedAt(Date.now());

        // Sticky timer: after `savedStickyMs`, flip back to idle so
        // the UI doesn't permanently advertise "Draft saved" once the
        // operator stops typing. clearDraft / next edit resets the
        // cycle.
        if (savedStickyTimerRef.current !== null) {
          clearTimeout(savedStickyTimerRef.current);
        }
        savedStickyTimerRef.current = setTimeout(() => {
          setStatus('idle');
        }, savedStickyMs);
      } catch {
        setStatus('error');
      }
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [draft, debounceMs, savedStickyMs]);

  // Clean up the sticky timer on unmount to avoid setState-after-unmount.
  useEffect(() => {
    return () => {
      if (savedStickyTimerRef.current !== null) {
        clearTimeout(savedStickyTimerRef.current);
      }
    };
  }, []);

  const updateDraft = useCallback<UseAdminFormDraftResult<T>['updateDraft']>(
    (patch) => {
      setDraft((prev) =>
        typeof patch === 'function'
          ? (patch as (p: T) => T)(prev)
          : { ...(prev as object), ...(patch as object) } as T,
      );
    },
    [],
  );

  const clearDraft = useCallback(() => {
    skipNextPersistRef.current = true;
    storeRef.current.remove();
    setDraft(initialDraft);
    setStatus('idle');
    setSavedAt(null);
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (savedStickyTimerRef.current !== null) {
      clearTimeout(savedStickyTimerRef.current);
      savedStickyTimerRef.current = null;
    }
  }, [initialDraft]);

  return { draft, updateDraft, clearDraft, hydrated, status, savedAt };
}

/**
 * Status indicator copy map — exported so the shared indicator
 * component (or per-surface inline indicator) can render closed
 * literals via lookup rather than inline string concatenation.
 */
export const ADMIN_FORM_DRAFT_STATUS_COPY: Readonly<Record<AdminFormDraftStatus, string>> = Object.freeze({
  idle: 'Draft idle',
  saving: 'Saving draft…',
  saved: 'Draft saved',
  error: 'Draft save failed',
});
