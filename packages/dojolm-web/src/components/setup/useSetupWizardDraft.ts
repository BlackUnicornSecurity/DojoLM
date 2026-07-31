// SPDX-License-Identifier: Apache-2.0
/**
 * File: useSetupWizardDraft.ts
 * Purpose: sessionStorage-backed draft for the first-boot Setup Wizard.
 *          Retires F-6-001 (P0): "Multi-step setup wizard wipes admin step
 *          on accidental refresh".
 *
 * Story: E9.S1 — see audit/REMEDIATION-PLAN.md L960-964.
 *
 * Why sessionStorage (NOT localStorage):
 *   - per-tab; cleared on tab close. An accidental browser-restart still
 *     wipes the draft — that's the deliberate boundary the plan-spec
 *     calls out.
 *   - SSR-safe via the `typeof window` guard inside `client-storage.ts`.
 *   - First-boot only — once setup completes the draft is removed.
 *
 * Why the `.v1` suffix in the storage key:
 *   - lets us invalidate stale schemas later (zod safeParse already
 *     drops malformed data, but a hard version bump is the cleanest
 *     migration path if the draft shape ever changes).
 *
 * Security boundary (CRITICAL):
 *   - `password` and `passwordConfirm` are NEVER part of `SetupWizardDraft`.
 *     The CreateAdminStep keeps those in local React state only.
 *   - Provider API keys are NEVER part of `SetupWizardDraft`. The
 *     ConfigureProvidersStep keeps those in local React state only.
 *   - `wizardState` (post-step data accumulated by the parent SetupWizard)
 *     is shaped from the API responses (admin username, model IDs, ack
 *     timestamp) — none of those are secrets.
 *
 * Hydration discipline (mirrors `lib/contexts/ActivityContext.tsx`):
 *   1. Initialize state from `INITIAL_DRAFT` so SSR / first commit are
 *      byte-stable.
 *   2. After mount, `useEffect` reads the store and replaces state.
 *   3. A `hydratedRef` flag gates the persist-on-change effect so we
 *      never overwrite the stored draft with `INITIAL_DRAFT` before
 *      hydration finishes.
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { z } from 'zod';
import { createStore } from '@/lib/client-storage';
import type { WizardState } from './SetupWizard';
import type { BuildChannel } from '@/lib/db/types';

/**
 * Versioned storage key. Bump the suffix (.v2, .v3, …) when the draft
 * shape changes in a backward-incompatible way. The Zod schema already
 * drops malformed data on read — version bump is the explicit signal.
 */
export const SETUP_WIZARD_DRAFT_STORAGE_KEY = 'dojolm.setup.draft.v1';

/**
 * Closed-shape, non-secret subset of the wizard's transient state.
 *
 * Fields:
 *   - `currentStep`     — 1-indexed wizard slot to resume at on rehydrate.
 *   - `adminFormDraft`  — username / email / displayName the operator
 *                          had typed into CreateAdminStep before refresh.
 *                          NEVER includes `password` or `passwordConfirm`.
 *   - `wizardState`     — fully-applied step output the parent already
 *                          tracks (admin username, model IDs, ack ts,
 *                          build channel). All public, non-secret.
 *
 * Anything secret (password fields, provider API keys) lives in the
 * step component's local state and is intentionally outside this
 * shape.
 */
export interface SetupWizardAdminFormDraft {
  username: string;
  email: string;
  displayName: string;
}

export interface SetupWizardDraft {
  currentStep: number;
  adminFormDraft: SetupWizardAdminFormDraft;
  wizardState: WizardState;
}

/**
 * Build channel literals are re-declared here as a Zod literal union
 * (the TS type is not a runtime enum). Source of truth lives in
 * `lib/db/types`'s `BUILD_CHANNELS` constant — keep these in sync.
 */
const buildChannelSchema: z.ZodType<BuildChannel> = z.union([
  z.literal('cloud'),
  z.literal('self-host'),
]);

const configuredModelSchema = z.object({
  provider: z.string(),
  name: z.string(),
  id: z.string(),
});

const wizardStateSchema: z.ZodType<WizardState> = z.object({
  adminUsername: z.string(),
  ollamaConfigured: z.boolean(),
  ollamaModels: z.array(configuredModelSchema),
  cloudProviders: z.array(configuredModelSchema),
  senseiModelId: z.string().nullable(),
  senseiModelName: z.string().nullable(),
  telemetryAcknowledgedAt: z.string().nullable(),
  telemetryBuildChannel: buildChannelSchema.nullable(),
});

const adminFormDraftSchema: z.ZodType<SetupWizardAdminFormDraft> = z.object({
  username: z.string(),
  email: z.string(),
  displayName: z.string(),
}).strict();

/**
 * Schema asserted on every read. zod's `.strict()` is applied at TWO
 * levels: this outer `setupWizardDraftSchema` (rejects unknown root
 * keys like `password`) AND `adminFormDraftSchema` (rejects unknown
 * keys nested inside the admin sub-tree, where any new field is most
 * likely to be a secret leak). If an attacker calls
 * `storage.setItem('dojolm.setup.draft.v1', '{"password":"x"}')`,
 * the root-level reject path fires and the read falls back to
 * `defaultValue`.
 *
 * E9.S1 round-2 (V5 Wave 3w QA tightening): `wizardStateSchema` and
 * `configuredModelSchema` intentionally use the default `.strip()`
 * mode (NOT `.strict()`) — those subtrees contain only public,
 * non-secret data (telemetry-consent flag, model IDs, ack timestamps),
 * and `.strip()` lets the schema evolve forward-compatibly when new
 * non-secret fields are added. The security boundary is enforced at
 * the two levels above, not at every nested level.
 */
const setupWizardDraftSchema: z.ZodType<SetupWizardDraft> = z.object({
  currentStep: z.number().int().min(1).max(6),
  adminFormDraft: adminFormDraftSchema,
  wizardState: wizardStateSchema,
}).strict();

export const INITIAL_ADMIN_FORM_DRAFT: SetupWizardAdminFormDraft = Object.freeze({
  username: '',
  email: '',
  displayName: '',
});

export const INITIAL_WIZARD_STATE: WizardState = Object.freeze({
  adminUsername: '',
  ollamaConfigured: false,
  ollamaModels: [],
  cloudProviders: [],
  senseiModelId: null,
  senseiModelName: null,
  telemetryAcknowledgedAt: null,
  telemetryBuildChannel: null,
});

export const INITIAL_DRAFT: SetupWizardDraft = Object.freeze({
  currentStep: 1,
  adminFormDraft: INITIAL_ADMIN_FORM_DRAFT,
  wizardState: INITIAL_WIZARD_STATE,
});

const draftStore = createStore<SetupWizardDraft>(
  SETUP_WIZARD_DRAFT_STORAGE_KEY,
  {
    scope: 'session',
    schema: setupWizardDraftSchema,
    defaultValue: INITIAL_DRAFT,
  },
);

export interface UseSetupWizardDraftResult {
  /** True once the post-mount read of sessionStorage has finished. */
  hydrated: boolean;
  /** Most recent draft snapshot (initial → hydrated → user edits). */
  draft: SetupWizardDraft;
  /**
   * Replace one or more draft fields. Accepts either a partial patch or
   * a producer function that receives the current draft. Triggers a
   * re-render and a sessionStorage write (post-hydration only).
   */
  updateDraft: (
    patch: Partial<SetupWizardDraft> | ((prev: SetupWizardDraft) => SetupWizardDraft),
  ) => void;
  /**
   * Wipe the sessionStorage entry and reset in-memory state to
   * `INITIAL_DRAFT`. Call on wizard completion or explicit cancel.
   */
  clearDraft: () => void;
}

/**
 * Hook contract:
 *   - First render: returns `{ draft: INITIAL_DRAFT, hydrated: false }`
 *     — SSR-stable.
 *   - After mount: reads sessionStorage; if a valid draft is present,
 *     state replaces with it and `hydrated` flips true.
 *   - Subsequent `updateDraft` calls: state updates synchronously and
 *     a queued `useEffect` writes to sessionStorage (no write before
 *     hydration to avoid clobbering the persisted draft with the
 *     initial empty shape).
 *   - `clearDraft`: removes the storage entry AND resets state.
 */
export function useSetupWizardDraft(): UseSetupWizardDraftResult {
  const [draft, setDraft] = useState<SetupWizardDraft>(INITIAL_DRAFT);
  const [hydrated, setHydrated] = useState(false);
  const hydratedRef = useRef(false);
  // After `clearDraft`, the next persist-effect run must NOT re-write
  // INITIAL_DRAFT into the storage we just removed. This ref gates one
  // persist cycle.
  const skipNextPersistRef = useRef(false);

  // Hydrate once after mount. Reading `draftStore` directly from a
  // useState lazy initializer would touch sessionStorage during the
  // initial render, which (a) breaks SSR because `window` is undefined,
  // and (b) embeds live storage state in the SSR HTML. Both are
  // avoided by deferring to useEffect.
  //
  // `draftStore.get()` returns `INITIAL_DRAFT` (by reference) when
  // sessionStorage is empty or the persisted blob fails Zod parse.
  // The `!== INITIAL_DRAFT` comparison correctly distinguishes
  // "stored draft restored" from "fallback to default" because
  // `client-storage.createStore` returns the exact `defaultValue`
  // reference when there is nothing valid to read.
  useEffect(() => {
    const stored = draftStore.get();
    if (stored !== INITIAL_DRAFT) {
      setDraft(stored);
    }
    hydratedRef.current = true;
    setHydrated(true);
  }, []);

  // Persist on draft change — but only after hydration so the initial
  // render does not overwrite the persisted draft with INITIAL_DRAFT.
  useEffect(() => {
    if (!hydratedRef.current) return;
    if (skipNextPersistRef.current) {
      // We just called clearDraft; the state reset to INITIAL_DRAFT
      // would otherwise re-persist the empty draft and undo the
      // remove() we just performed.
      skipNextPersistRef.current = false;
      return;
    }
    draftStore.set(draft);
  }, [draft]);

  const updateDraft = useCallback<UseSetupWizardDraftResult['updateDraft']>(
    (patch) => {
      setDraft((prev) =>
        typeof patch === 'function' ? patch(prev) : { ...prev, ...patch },
      );
    },
    [],
  );

  const clearDraft = useCallback(() => {
    skipNextPersistRef.current = true;
    draftStore.remove();
    setDraft(INITIAL_DRAFT);
  }, []);

  return { hydrated, draft, updateDraft, clearDraft };
}
