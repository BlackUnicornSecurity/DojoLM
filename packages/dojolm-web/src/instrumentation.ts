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
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const demoRequested = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
  if (!demoRequested) return;

  const isProd = process.env.NODE_ENV === 'production';
  const prodOverride = process.env.TPI_ALLOW_DEMO_IN_PROD === 'true';

  if (isProd && !prodOverride) {
    // Matches the failsafe in src/lib/demo/index.ts — demo mode refused.
    // eslint-disable-next-line no-console
    console.error(
      '[demo] REFUSED: NEXT_PUBLIC_DEMO_MODE=true in production without ' +
        'TPI_ALLOW_DEMO_IN_PROD=true. Mock data will NOT be served. ' +
        'Review your deployment env — this is a dangerous combination.',
    );
    return;
  }

  const env = isProd ? 'PRODUCTION (override enabled)' : 'development';
  // eslint-disable-next-line no-console
  console.warn(
    `\n${'━'.repeat(72)}\n` +
      `  [demo] DEMO MODE ACTIVE — ${env}\n` +
      `  All 54 gated API routes will return mock data from @/lib/demo.\n` +
      `  Auth bypassed. No DB, filesystem, or external LLM calls.\n` +
      `  Registry: src/lib/demo/registry.ts\n` +
      `${'━'.repeat(72)}\n`,
  );
}
