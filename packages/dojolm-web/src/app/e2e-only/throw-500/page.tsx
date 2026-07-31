// SPDX-License-Identifier: Apache-2.0
/**
 * E2E-only trigger route for the root error.tsx (ERR-001 / Epic 7 S7.2).
 *
 * Epic 8 S8.2 · Visual regression baselines need a deterministic way to
 * render the full-page 500 surface without crashing an admin page
 * mid-snapshot. This page throws on render — Next.js then composes the
 * root error.tsx boundary, which is the surface we want to baseline.
 *
 * Folder naming note: the parent directory is `e2e-only/` NOT `__test__/`.
 * Next.js App Router treats any folder whose name starts with a single
 * underscore (including `__test__`) as a private folder and excludes it
 * from routing — making the route unreachable. The `e2e-only` name keeps
 * the test-only intent clear while remaining a public route segment so
 * the e2e runner can reach it.
 *
 * Gating (defense-in-depth, two independent checks):
 *
 *   1. BUILD-TIME — `NEXT_PUBLIC_E2E !== '1'` short-circuits to
 *      notFound(). Inlined at build time; a production build without
 *      the flag bakes in the 404 branch permanently.
 *
 *   2. RUNTIME — `process.env.E2E_RUNTIME_ALLOW !== '1'` also
 *      short-circuits. This is a server-only variable (no NEXT_PUBLIC_
 *      prefix) that the app reads on every request. The e2e runner
 *      sets it via the `start:e2e` script; neither the production
 *      compose (`deploy/docker-compose.yml`) nor the dev/QA
 *      compose (`deploy/docker-compose.challenger.yml`) sets it. If a
 *      build:e2e artifact were ever accidentally deployed, the runtime
 *      check would still 404 the trigger route.
 *
 * Nothing downstream renders `error.message` or `error.stack` —
 * `src/app/error.tsx` logs only the digest in production and shows
 * the operator a static message. See Epic 8 Rule: "Do not render
 * error.stack in any synthetic error fixture."
 */

import { notFound } from 'next/navigation';

// Opt out of static pre-rendering. Without this Next.js would try to
// SSG the throwing page at `build:e2e` time, which would either fail
// the build or cache a static error output that short-circuits the
// live `error.tsx` boundary the visual baseline needs to observe.
export const dynamic = 'force-dynamic';

export default function ThrowFiveHundredPage() {
  if (process.env.NEXT_PUBLIC_E2E !== '1') {
    notFound();
  }
  if (process.env.E2E_RUNTIME_ALLOW !== '1') {
    notFound();
  }
  throw new Error('E2E synthetic 500 — triggers root error.tsx for baseline');
}
