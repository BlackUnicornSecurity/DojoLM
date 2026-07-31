// SPDX-License-Identifier: Apache-2.0
/**
 * YR.9.2 — useOnlineStatus.
 *
 * Reactive `navigator.onLine` boolean for the network-offline indicator.
 * Defaults to `true` on the server (no real network state available) so
 * SSR + the first client paint never flash an offline chip on a healthy
 * connection.
 *
 * Cross-page consumer: ShellChrome reads this and forwards `isOffline`
 * to TopBar. Per-panel consumers can call it directly to disable
 * mutating actions when offline.
 *
 * `online` / `offline` events are not 100% reliable (browsers ship
 * heuristic implementations) but this hook reflects whatever the
 * platform says — operators get a best-effort indicator, not a
 * connectivity oracle. The TopBar copy says "offline" not "no
 * connectivity" for that reason.
 *
 * E8.S1 — SSR/CSR hydration parity hardening (retires F-9-001 P0 React
 * #418 hydration error on every authenticated route).
 *
 *   1. Always seed `online` to `true` on the very first render. The
 *      lazy initializer used to read `navigator.onLine` on the client
 *      and fall back to `true` only when `navigator` was undefined.
 *      Node 21+ exposes a stub `navigator` global where `navigator.onLine`
 *      is `undefined` (a falsy value) — under that runtime the SSR
 *      branch was rendering as if the operator was offline (the offline
 *      chip in TopBar appeared in the streamed HTML), while the client's
 *      `navigator.onLine` was the real `true`. Result: every authenticated
 *      page paint produced a server/client text mismatch and React #418
 *      fired (audit/findings/09-live-runtime.md F-9-001).
 *
 *   2. Even on the client we no longer read `navigator.onLine` during
 *      the first render. Reading it inside `useState`'s initializer
 *      forces the first paint to embed the live network state, which
 *      diverges from the SSR-stable default whenever the browser is
 *      actually offline. The initial commit deliberately matches the
 *      server (`true`); the `useEffect` below is responsible for
 *      reconciling against `navigator.onLine` AFTER hydration has
 *      finished. React handles a post-hydration state update cleanly
 *      (no #418 — it's a normal re-render).
 *
 *   3. The `typeof navigator === 'undefined'` check is gone — that gate
 *      was only correct under Node ≤20. We now rely on `typeof window`
 *      (which IS still reliably-undefined on the server in Node 21+) for
 *      every guard inside the effect.
 */

'use client';

import { useEffect, useState } from 'react';

export function useOnlineStatus(): boolean {
  // Always start with `true` to keep SSR + the first hydration commit
  // byte-identical. The post-hydration effect below reconciles against
  // the real `navigator.onLine` value on the next paint.
  const [online, setOnline] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Reconcile against the live navigator state once on mount. A
    // post-hydration update is a normal React re-render, so this no
    // longer drives a #418 mismatch the way reading the live value
    // inside `useState`'s lazy initializer did.
    if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
      setOnline(navigator.onLine);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return online;
}
