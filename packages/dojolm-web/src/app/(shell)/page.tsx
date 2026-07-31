// SPDX-License-Identifier: Apache-2.0
/**
 * `/` — Dojo dashboard landing + `?tab=<id>` legacy redirect dispatcher.
 *
 * YR.5 retired the legacy in-`/` activeTab dispatcher: every module now
 * owns a top-level `/admin/<module>` route, and the Rail in
 * `shell-chrome.tsx` navigates directly to those routes via the closed
 * `NAV_ID_TO_URL` projection. This server component preserves
 * back-compat for stale `?tab=<id>` bookmarks by resolving the value
 * through the same closed map and 307-redirecting to the canonical
 * destination before the client tree mounts.
 *
 * Open-redirect defense: `resolveTabRedirect` only returns URLs sourced
 * from `NAV_ID_TO_URL` (a closed map of hardcoded `/admin/*` paths). A
 * malicious `?tab=https://attacker.example` value is not a valid NavId,
 * resolves to `null`, and the page falls through to the dashboard. Non-
 * `tab` query-string params (e.g. `?tab=mitsuke&debug=1`) are forwarded
 * to the redirect target; the `tab` param is dropped.
 *
 * For unrecognized or `tab=dashboard` values, the dispatcher does not
 * redirect — the page renders the dashboard so the user keeps moving.
 */

import { redirect } from 'next/navigation';
import {
  normalizeTabParam,
  resolveTabRedirect,
  searchParamsToOtherParams,
} from '@/lib/navigation/admin-routes';
import { HomeClient } from './HomeClient';

interface PageProps {
  readonly searchParams: Promise<
    Record<string, string | string[] | undefined>
  >;
}

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;
  // Next.js delivers a duplicated `tab` query key as a string[] (e.g.
  // `/?tab=mitsuke&tab=other`). normalizeTabParam picks the first
  // non-empty entry so the dispatcher treats `?tab=mitsuke&tab=other`
  // identically to `?tab=mitsuke` instead of silently falling through.
  const tab = normalizeTabParam(params.tab);
  if (tab !== null) {
    // Destructure `tab` out at the call site so the exclusion contract
    // is enforced by the compiler rather than by an internal filter
    // inside `searchParamsToOtherParams`. A future refactor that drops
    // the internal `if (key === 'tab')` guard cannot accidentally
    // forward `tab` (which would otherwise create a redirect loop on
    // the destination page).
    const { tab: _tab, ...rest } = params;
    const url = resolveTabRedirect(tab, searchParamsToOtherParams(rest));
    if (url !== null) redirect(url);
  }
  return <HomeClient />;
}
