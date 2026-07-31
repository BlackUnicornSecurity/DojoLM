// SPDX-License-Identifier: Apache-2.0
/**
 * File: lib/atemi/probe-orchestrator.ts
 *
 * Fleet-wide probe orchestrator. Iterates every `active` (vendor,
 * targetId) tuple in the ToS attestation registry and composes the
 * Gap 3 `createProbeRunner` factory per tuple. Each tuple is either:
 *
 *   - started  — probe executed end-to-end; status reflects driver result
 *   - skipped  — preconditions missing (driver not wired, no auth
 *                cookie in the vault, bu-tpi config-error on construct).
 *                Carries a `reason` string so operators see what's
 *                missing without reading the server log.
 *   - error    — probe started but threw unexpectedly (driver bug, etc.)
 *
 * R-T1 compliance: neither the orchestrator nor the endpoint ever
 * returns `inputRedacted` / `outputRedacted` / `evidenceHash` to the
 * client. Only counts + per-tuple status + elapsed-ms + optional
 * skip-reason cross the API boundary.
 */

import {
  AtemiConfigurationError,
  createProbeRunner,
  type AtemiDriver,
  type AtemiAuthVault,
  type AtemiProbeKind,
  type TosAttestationRegistry,
} from 'bu-tpi/atemi';
import type { BudgetLedger } from 'bu-tpi/sensei';

/** Default kind used by the fleet-wide probe pass — mirrors the Gap 3 health-check intent. */
const DEFAULT_KIND: AtemiProbeKind = 'system-prompt-leak';
/** Deterministic seed — intentionally not operator-controllable. Adapters may interpret freely. */
const FLEET_SEED = 'atemi-fleet-probe-v1';

export type ProbeTupleStatus =
  | 'started'
  | 'skipped'
  | 'error';

/**
 * Closed union of skip/error reasons. Security-review HIGH-3: the
 * field is serialised across the API boundary, so it MUST be a fixed
 * enum — never a free-form error message. Any new orchestrator skip
 * path must add a sentinel here and compile-check the call sites.
 */
export type ProbeTupleReason =
  | 'driver-not-configured'
  | 'auth-not-provisioned'
  | 'auth-unwrap-failed'
  | 'probe-config-error'
  | 'probe-unexpected-error';

export interface ProbeTupleResult {
  readonly vendor: string;
  readonly targetId: string;
  /** High-level lifecycle bucket for the orchestrator's counting. */
  readonly status: ProbeTupleStatus;
  /**
   * When `status === 'started'`, the driver-level AtemiProbeStatus
   * ('success' | 'refused' | 'timeout' | 'budget-denied' | 'error').
   * Undefined when skipped (no probe ran).
   */
  readonly probeStatus?:
    | 'success'
    | 'refused'
    | 'timeout'
    | 'budget-denied'
    | 'error';
  readonly elapsedMs: number;
  /** Closed-union skip/error reason. See ProbeTupleReason. */
  readonly reason?: ProbeTupleReason;
}

export interface ProbeFleetSummary {
  readonly started: number;
  readonly skipped: number;
  readonly errors: number;
  readonly results: readonly ProbeTupleResult[];
}

export interface RunFleetProbeConfig {
  readonly registry: TosAttestationRegistry;
  readonly vault: AtemiAuthVault;
  readonly ledger: BudgetLedger;
  /** Optional — when omitted every tuple is skipped with reason `driver-not-configured`. */
  readonly driver?: AtemiDriver;
  /** Operator identifier — used as ledger userId and carried into telemetry. */
  readonly operatorId: string;
  /** Optional throttle callback — consulted between tuples (cheap guard). */
  readonly killSwitch?: () => boolean;
}

/**
 * Run one fleet probe pass. The caller is responsible for admin-auth,
 * flag gating, and the kill-switch refusal BEFORE invoking this.
 * Throws only on unrecoverable orchestrator misuse; per-tuple failures
 * are surfaced in the summary.
 */
export async function runFleetProbe(
  config: RunFleetProbeConfig,
): Promise<ProbeFleetSummary> {
  if (!config.registry) {
    throw new TypeError('runFleetProbe: registry required');
  }
  if (!config.vault) {
    throw new TypeError('runFleetProbe: vault required');
  }
  if (!config.ledger) {
    throw new TypeError('runFleetProbe: ledger required');
  }
  if (typeof config.operatorId !== 'string' || config.operatorId.length === 0) {
    throw new TypeError('runFleetProbe: operatorId required');
  }

  const active = config.registry
    .list()
    .filter((r) => r.state === 'active');

  const results: ProbeTupleResult[] = [];

  for (const record of active) {
    // Review M-2: use a clearly-named timestamp local so it does not
    // shadow the outer `started` counter below.
    const tupleStartedAt = Date.now();

    if (!config.driver) {
      results.push({
        vendor: record.vendor,
        targetId: record.targetId,
        status: 'skipped',
        elapsedMs: Date.now() - tupleStartedAt,
        reason: 'driver-not-configured',
      });
      continue;
    }

    // Auth — the vault throws AtemiConfigurationError when no cookie
    // has been staged for a target. Count as `skipped` with a clean
    // reason rather than treating missing auth as an error.
    let auth;
    try {
      auth = await config.vault.unwrap(record.targetId);
    } catch (err) {
      results.push({
        vendor: record.vendor,
        targetId: record.targetId,
        status: 'skipped',
        elapsedMs: Date.now() - tupleStartedAt,
        reason:
          err instanceof AtemiConfigurationError
            ? 'auth-not-provisioned'
            : 'auth-unwrap-failed',
      });
      continue;
    }

    // Compose + run the probe.
    try {
      const probe = createProbeRunner({
        product: record.vendor as Parameters<typeof createProbeRunner>[0]['product'],
        kind: DEFAULT_KIND,
        driver: config.driver,
        ledger: config.ledger,
        auth,
        ...(config.killSwitch && { killSwitch: config.killSwitch }),
      });
      const outcome = await probe.run({
        userId: config.operatorId,
        seedPayload: FLEET_SEED,
      });
      results.push({
        vendor: record.vendor,
        targetId: record.targetId,
        status: 'started',
        probeStatus: outcome.status,
        elapsedMs: outcome.elapsedMs,
      });
    } catch (err) {
      results.push({
        vendor: record.vendor,
        targetId: record.targetId,
        status: 'error',
        elapsedMs: Date.now() - tupleStartedAt,
        reason:
          err instanceof AtemiConfigurationError
            ? 'probe-config-error'
            : 'probe-unexpected-error',
      });
    }
  }

  let startedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  for (const r of results) {
    if (r.status === 'started') startedCount += 1;
    else if (r.status === 'skipped') skippedCount += 1;
    else errorCount += 1;
  }

  return {
    started: startedCount,
    skipped: skippedCount,
    errors: errorCount,
    results: Object.freeze(results),
  };
}
