// SPDX-License-Identifier: Apache-2.0
/**
 * File: src/instrumentation.ts
 * Purpose: Next.js runtime init hook. Runs once per server process on cold
 *         start (both Node and Edge runtimes). Used here solely to emit a
 *         visible banner when demo mode is active, so operators spot an
 *         accidentally-enabled demo deployment in the logs.
 *
 * Next.js auto-loads this file — do not import from elsewhere. See:
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register(): Promise<void> {
  // Only run in the Node.js runtime. The Edge runtime boots per-request and
  // lacks the env vars we care about here (DEMO_MODE is Node-time flag).
  //
  // P6 cold-boot fix (2026-07-11): this MUST stay a block-form `if`, not an
  // early return. Next.js substitutes `process.env.NEXT_RUNTIME` as a
  // compile-time constant per bundle, and webpack only skips dependency
  // collection inside a statically-false `if` branch — code after an early
  // `return` is still walked, which dragged the lib/storage → better-sqlite3
  // chain into the edge compile and broke `next dev --webpack` on a cold
  // tree ("Can't resolve 'fs'").
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // YR.13.4 — single-worker assertion. The kill-switch registry is in-process;
    // refuse to boot if `WEB_WORKERS > 1` so an operator who skips the runbook
    // gets a hard failure instead of a silent split-brain.
    // Runbook: deploy/runbooks/kill-switch-multi-worker.md
    const { assertSingleWorkerOrThrow } = await import('./lib/kill-switch/startup-assert');
    assertSingleWorkerOrThrow();

    // F-QA-006 — fail fast on a misconfigured storage backend BEFORE serving.
    // getStorageBackendType() throws on any TPI_STORAGE_BACKEND ∉ {json,db,unset};
    // calling it here turns a per-request 500-on-first-hit into a clear boot crash.
    const { getStorageBackendType } = await import('./lib/storage/storage-interface');
    getStorageBackendType();

    // Epic 4B.6 S4B.6.2 — install persistent members storage (fs-JSON
    // append-log adapters) when gate passes. Side-effect import runs the
    // install at module-evaluation time; gate + re-entrancy guard live
    // inside the shim. Awaited dynamic import so the install completes
    // before any request handler reads the store.
    await import('./app/_members-persistent-storage');

    const demoRequested = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
    const previewRequested = process.env.NEXT_PUBLIC_PREVIEW_MODE === 'true';
    const partialRequested = process.env.NEXT_PUBLIC_PARTIAL_MODE === 'true';
    if (!demoRequested && !previewRequested && !partialRequested) return;

    const isProd = process.env.NODE_ENV === 'production';
    const prodOverride = process.env.TPI_ALLOW_DEMO_IN_PROD === 'true';

    if (demoRequested && isProd && !prodOverride) {
      // Matches the failsafe in src/lib/demo/index.ts — demo mode refused.
      // eslint-disable-next-line no-console
      console.error(
        '[demo] REFUSED: NEXT_PUBLIC_DEMO_MODE=true in production without ' +
          'TPI_ALLOW_DEMO_IN_PROD=true. Mock data will NOT be served. ' +
          'Review your deployment env — this is a dangerous combination.',
      );
      // Fall through: preview/partial may still be valid; don't return.
    } else if (demoRequested) {
      const env = isProd ? 'PRODUCTION (override enabled)' : 'development';
      // Import from the registry so the count stays truthful as routes are
      // added or removed — Wave 0 Track C.5 instrumentation refactor.
      const { DEMO_ROUTE_COUNT } = await import('./lib/demo/registry');
      // eslint-disable-next-line no-console
      console.warn(
        `\n${'━'.repeat(72)}\n` +
          `  [demo] DEMO MODE ACTIVE — ${env}\n` +
          `  All ${DEMO_ROUTE_COUNT} gated API routes will return mock data from @/lib/demo.\n` +
          `  Auth bypassed. No DB, filesystem, or external LLM calls.\n` +
          `  Registry: src/lib/demo/registry.ts\n` +
          `${'━'.repeat(72)}\n`,
      );
    }

    // Preview / partial are UI-only badges. They never alter API routing.
    if (previewRequested && !demoRequested) {
      // eslint-disable-next-line no-console
      console.warn(
        '[preview] NEXT_PUBLIC_PREVIEW_MODE=true — UI renders a "Preview" badge ' +
          'to signal that features may have limited backend coverage.',
      );
    }
    if (partialRequested && !demoRequested) {
      // eslint-disable-next-line no-console
      console.warn(
        '[partial] NEXT_PUBLIC_PARTIAL_MODE=true — UI renders a "Partial" badge ' +
          'to signal that some flows are real and others are mocked.',
      );
    }
  }
}
