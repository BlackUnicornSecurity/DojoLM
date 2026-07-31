// SPDX-License-Identifier: Apache-2.0
'use client';

// B.4 anchor primitive — ModuleOnboarding persistence hook. Per-module
// localStorage state with SSR-safe hydration: the server render always
// returns `dismissed=false, completedSteps=[], currentPage=0` so the
// component renders identically on server + client first paint, then
// hydrates from localStorage inside an effect on the client only.
//
// Key namespace (spec B.4 / plan v4 §6 E-B5):
//   tpi.onboarding.<moduleId>.dismissed         → '1' once dismissed
//   tpi.onboarding.<moduleId>.completed-steps   → JSON string[] of step ids
//   tpi.onboarding.<moduleId>.last-page         → integer page index
//
// Module-scoped rather than user-scoped on purpose: onboarding is
// per-device + per-module ("I have seen this explainer once on this
// machine"). Cross-user dismiss bleed-through on shared machines is
// the right default — the cards are educational, not personalized.
//
// Defensive try/catch on every storage call (Safari private + quota
// exhaustion) — in-memory state still drives the current session if
// persistence fails.

import { useCallback, useEffect, useState } from 'react';

const KEY_PREFIX = 'tpi.onboarding.';

const SAFE_MODULE_ID = /^[a-z][a-z0-9-]*$/;

export interface ModuleOnboardingState {
  readonly dismissed: boolean;
  readonly completedSteps: readonly string[];
  readonly currentPage: number;
}

export interface ModuleOnboardingHook extends ModuleOnboardingState {
  readonly dismiss: () => void;
  readonly markStepComplete: (stepId: string) => void;
  readonly markStepIncomplete: (stepId: string) => void;
  readonly goToPage: (page: number) => void;
  readonly reset: () => void;
}

export const MODULE_ONBOARDING_DEFAULT_STATE: ModuleOnboardingState = {
  dismissed: false,
  completedSteps: [],
  currentPage: 0,
};

function keyFor(moduleId: string, aspect: 'dismissed' | 'completed-steps' | 'last-page'): string {
  return `${KEY_PREFIX}${moduleId}.${aspect}`;
}

function isSafeModuleId(moduleId: string): boolean {
  return SAFE_MODULE_ID.test(moduleId);
}

function readDismissed(moduleId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(keyFor(moduleId, 'dismissed')) === '1';
  } catch {
    return false;
  }
}

function readCompletedSteps(moduleId: string): readonly string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(keyFor(moduleId, 'completed-steps'));
    if (raw === null) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const safe: string[] = [];
    for (const item of parsed) {
      if (typeof item === 'string' && item.length > 0 && item.length <= 64) {
        safe.push(item);
      }
    }
    return safe;
  } catch {
    return [];
  }
}

function readCurrentPage(moduleId: string): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(keyFor(moduleId, 'last-page'));
    if (raw === null) return 0;
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 0 || n > 999) return 0;
    return n;
  } catch {
    return 0;
  }
}

function readAll(moduleId: string): ModuleOnboardingState {
  return {
    dismissed: readDismissed(moduleId),
    completedSteps: readCompletedSteps(moduleId),
    currentPage: readCurrentPage(moduleId),
  };
}

function writeKey(moduleId: string, aspect: 'dismissed' | 'completed-steps' | 'last-page', value: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(keyFor(moduleId, aspect), value);
  } catch {
    // Safari private + quota — fall through; in-memory state still works.
  }
}

function removeKey(moduleId: string, aspect: 'dismissed' | 'completed-steps' | 'last-page'): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(keyFor(moduleId, aspect));
  } catch {
    // ignore
  }
}

const warnedUnsafeIds = new Set<string>();

export const __useModuleOnboardingStateResetWarningsForTest = () => {
  warnedUnsafeIds.clear();
};

function warnUnsafeId(moduleId: string): void {
  if (typeof process === 'undefined' || process.env.NODE_ENV === 'production') return;
  if (warnedUnsafeIds.has(moduleId)) return;
  warnedUnsafeIds.add(moduleId);
  // eslint-disable-next-line no-console
  console.warn(
    `[useModuleOnboardingState] moduleId "${moduleId}" failed the safe-id regex /^[a-z][a-z0-9-]*$/. ` +
      'Falling back to the shared "unsafe" namespace — any other caller with an invalid id will share its localStorage keys. ' +
      'Fix the call site to use a kebab-case id like "atemi" or "amaterasu".',
  );
}

export function useModuleOnboardingState(moduleId: string): ModuleOnboardingHook {
  const idIsSafe = isSafeModuleId(moduleId);
  const safeId = idIsSafe ? moduleId : 'unsafe';
  if (!idIsSafe) warnUnsafeId(moduleId);
  const [state, setState] = useState<ModuleOnboardingState>(MODULE_ONBOARDING_DEFAULT_STATE);

  useEffect(() => {
    // Client-only hydration. SSR returns defaults so first paint matches
    // the server output; this effect upgrades to the persisted state.
    setState(readAll(safeId));
  }, [safeId]);

  const dismiss = useCallback(() => {
    setState((prev) => {
      if (prev.dismissed) return prev;
      writeKey(safeId, 'dismissed', '1');
      return { ...prev, dismissed: true };
    });
  }, [safeId]);

  const markStepComplete = useCallback(
    (stepId: string) => {
      if (typeof stepId !== 'string' || stepId.length === 0 || stepId.length > 64) return;
      setState((prev) => {
        if (prev.completedSteps.includes(stepId)) return prev;
        const next = [...prev.completedSteps, stepId];
        writeKey(safeId, 'completed-steps', JSON.stringify(next));
        return { ...prev, completedSteps: next };
      });
    },
    [safeId],
  );

  const markStepIncomplete = useCallback(
    (stepId: string) => {
      if (typeof stepId !== 'string' || stepId.length === 0) return;
      setState((prev) => {
        if (!prev.completedSteps.includes(stepId)) return prev;
        const next = prev.completedSteps.filter((id) => id !== stepId);
        writeKey(safeId, 'completed-steps', JSON.stringify(next));
        return { ...prev, completedSteps: next };
      });
    },
    [safeId],
  );

  const goToPage = useCallback(
    (page: number) => {
      if (!Number.isFinite(page) || page < 0 || page > 999) return;
      const intPage = Math.floor(page);
      setState((prev) => {
        if (prev.currentPage === intPage) return prev;
        writeKey(safeId, 'last-page', String(intPage));
        return { ...prev, currentPage: intPage };
      });
    },
    [safeId],
  );

  const reset = useCallback(() => {
    removeKey(safeId, 'dismissed');
    removeKey(safeId, 'completed-steps');
    removeKey(safeId, 'last-page');
    setState(MODULE_ONBOARDING_DEFAULT_STATE);
  }, [safeId]);

  return {
    dismissed: state.dismissed,
    completedSteps: state.completedSteps,
    currentPage: state.currentPage,
    dismiss,
    markStepComplete,
    markStepIncomplete,
    goToPage,
    reset,
  };
}

// Test-only readers — exported so the vitest suite can assert on persisted
// shape without re-implementing the key namespace. Not part of the public
// hook API; consumers should always go through `useModuleOnboardingState`.
export const __moduleOnboardingTestHelpers = {
  keyFor,
  readAll,
};
