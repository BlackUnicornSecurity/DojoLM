// SPDX-License-Identifier: Apache-2.0
/**
 * useBeforeUnloadGuard — E4.S9 (retires F-7-022 P1 — "no beforeunload —
 * form state lost on accidental nav").
 *
 * Attaches a `beforeunload` listener while `dirty === true`. The browser
 * surfaces its native "leave site?" confirm prompt; we cannot customize
 * the wording because every modern browser strips per-page strings to
 * prevent prompt-spoofing (Chrome, Firefox, Safari behaviour matches).
 * Setting `event.returnValue = ''` is the cross-browser opt-in.
 *
 * Listener-attach correctness (V4/V5 round-2 lesson):
 *   - When `dirty === false` we do NOT register the listener at all.
 *     Refusing to attach is the discipline test-suite assertion (V4/V5
 *     round-2 lesson #2 — "test that the listener attaches when
 *     dirty=true AND detaches when dirty=false").
 *   - When `dirty` flips `true → false` mid-form (e.g. after submit),
 *     the effect cleanup tears down the listener so the next nav is
 *     unconfirmed. Without this, every successful submit would leave
 *     a stale guard the user has to dismiss.
 *
 * SSR safety:
 *   - The effect's `if (typeof window === 'undefined') return;` is
 *     defensive. React's `useEffect` already only runs client-side,
 *     but Node 21+ ships a stub `window` that confuses some test
 *     runners; this gate keeps the contract explicit.
 *
 * What this hook deliberately does NOT do:
 *   - In-app navigation (Next.js `router.push`, anchor clicks): the
 *     `beforeunload` event does NOT fire for client-side route changes.
 *     A separate App-Router `usePathname`-watcher would be required to
 *     guard SPA navigation; that's E4.S9-followup territory.
 *   - Any custom UI confirm: browsers ignore custom strings. The native
 *     dialog is the only mechanism.
 *
 * Surfaces wired in this story (per E4.S9 plan-spec):
 *   - `/admin/atemi` Atemi probe-config (PlaybookRunner, ConceptReconPanel)
 *   - `/admin/bushido/run` Bushido sign-off form
 *   - `/admin/agentic` ScenarioRunner
 *   - `/admin/eval/run` race launcher
 */

'use client';

import { useEffect } from 'react';

/**
 * Register a `beforeunload` confirm prompt while the form is dirty.
 *
 * @param dirty — `true` when the form has unsaved input. `false` to
 *   tear the listener down (no warning on next navigation).
 */
export function useBeforeUnloadGuard(dirty: boolean): void {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!dirty) return;

    const handler = (event: BeforeUnloadEvent): void => {
      // Cross-browser opt-in — modern engines all key off either
      // `event.preventDefault()` OR a non-empty `returnValue`. Setting
      // both is the safe belt-and-braces idiom; it's also what MDN's
      // canonical example does.
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handler);
    return () => {
      window.removeEventListener('beforeunload', handler);
    };
  }, [dirty]);
}
