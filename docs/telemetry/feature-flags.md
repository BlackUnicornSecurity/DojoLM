# Feature-flag strategy (Wave 0 Track E.2)

**Status:** draft — pending decision.
**Last updated:** 2026-04-18

This document proposes how we gate Wave 1 features behind toggles and how
we kill them safely.

## Context

Wave 0 already installed a runtime-mode system in
`packages/dojolm-web/src/lib/demo/` with three modes: `demo`, `preview`,
`partial`. It is process-global (env-var driven) and UI-surfaced via
`<FeatureBadge />`. That covers the "mark a whole build as unfinished"
case, but not per-feature toggling for A/B rollouts, per-user canaries,
or kill-switches that don't require a redeploy.

## Proposed approach

**Extend the existing demo-mode registry** (`src/lib/demo/registry.ts`)
with a second registry that maps **feature ids** (not routes) to flag
state. Keep the two registries side-by-side — they serve different
purposes and their drift tests stay independent.

```ts
// src/lib/flags/registry.ts
export type FeatureFlagDefault = 'on' | 'off';

export interface FeatureFlagEntry {
  readonly id: string;                // e.g. 'arena.live-leaderboard'
  readonly default: FeatureFlagDefault;
  readonly owner: string;             // ADR id
  readonly description: string;
  readonly killSwitch?: true;         // true = override to off ignores everything else
}
```

## Resolution order

`isFeatureEnabled(id, context)` resolves flags in this order:

1. **Environment variable** `TPI_FLAG_<ID_SHOUTY>` — `on` / `off` / unset.
   Takes precedence over everything. Used for local dev and as a quick
   kill-switch that requires a restart.
2. **Per-user override** (Wave 2) — admin UI toggle per user. Stored in
   the existing user record. For canary/beta cohorts.
3. **Kill-switch flag** (if set) — forces `off` regardless of other state.
   Used to turn a feature off in production within seconds.
4. **Registry default** — the shipped default.

## Staged rollout

- `off` by default in the registry until the feature is `complete` per
  the Wave 0 `FeatureBadge` contract.
- Flip to `on` by default only after:
  - Track A ADR signed off.
  - Tests green (unit + API + E2E).
  - Telemetry emitting `feature_used` / `feature_error`.
  - One week in staging with zero `mock_served` events.

## Kill-switch contract

Every feature that touches state-changing API routes must have a
`killSwitch: true` flag. The handler must check it **before** any write
and return a deterministic "this feature is temporarily unavailable"
response (HTTP 503 with `Retry-After`).

Operator playbook (to be documented once the system ships):

1. Set `TPI_FLAG_<FEATURE>=off` in the running deployment.
2. Reload without a redeploy (the flag is read per-request, not cached).
3. Verify via the telemetry dashboard that `feature_used` drops to zero.

## Decision points (needs sign-off)

- **Registry location:** extend `src/lib/demo/` vs create `src/lib/flags/`.
  Recommendation: `src/lib/flags/` — keep the two contracts separate, and
  the demo registry's drift test is specific to API-route gating.
- **Third-party library:** roll-our-own vs OpenFeature SDK vs LaunchDarkly.
  Recommendation: roll-our-own for Wave 1 (minimal, no network dep), then
  migrate to OpenFeature if/when per-user canaries are needed. Avoid
  LaunchDarkly until the privacy review is done.
- **Per-user overrides:** in scope for Wave 1 or punt to Wave 2?
  Recommendation: Wave 2. The `off` → `on` flip-day pattern is enough
  to ship the features Plan 2 calls out.

## Implementation sequence (Wave 1)

1. `src/lib/flags/registry.ts` + `isFeatureEnabled()` function.
2. Companion drift test mirroring `src/lib/demo/__tests__/registry.test.ts`.
3. Minimum one flag per Wave 1 feature as it lands.
4. Kill-switch verification as part of the E2E plan.
5. Dashboard showing current flag state + last-flip timestamp.
