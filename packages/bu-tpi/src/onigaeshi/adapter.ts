// SPDX-License-Identifier: Apache-2.0
/**
 * File: onigaeshi/adapter.ts
 * Purpose: Gap 6 — unaligned-attacker ("onigaeshi" / return-strike) adapter.
 *          Routes attacker payloads to open-weights (HF / Ollama) when
 *          the aligned frontier sensei would refuse. Ships FLAG-OFF by
 *          default and BLOCKS every invocation until:
 *            (a) the `ONIGAESHI_ENABLED` feature flag is on, AND
 *            (b) the caller presents an active, signature-verified
 *                engagement record via the `engagement-gate`.
 * Story: Industry-tools parity plan §Gap 6 (lines 432–467).
 *
 * =====================================================================
 *  PRODUCTION WARNING (mirrors `security/kms-vault.ts` scaffold pattern)
 * =====================================================================
 *  This adapter is a HARNESS — it wires up the engagement gate, audit
 *  log, safety-classifier interface, and telemetry shape, but it does
 *  NOT ship a live HF/Ollama driver and it does NOT ship a live Azure
 *  Content Safety client. Those land in follow-on PRs once the spec's
 *  documented blockers are cleared:
 *    - "Engagement workflow design session (user commitment)"
 *    - "Safety-classifier vendor selection"
 *    - "Legal review of HF/Ollama hosting"
 *
 *  The default behaviour of this module is to REFUSE every call:
 *    - if the feature flag is off → returns `{ verdict: 'disabled' }`
 *      and writes an `invocation.attempted` audit record.
 *    - if the flag is on but the engagement gate refuses → returns
 *      `{ verdict: 'blocked' }` and writes `invocation.blocked`.
 *    - if the flag is on, gate passes, but no driver is injected →
 *      returns `{ verdict: 'blocked', reason: 'no-driver' }`.
 *
 *  There is intentionally no default driver. Tests inject a fake
 *  driver; production wiring will inject the HF/Ollama client from a
 *  separate PR.
 *
 * R-T1: telemetry carries only the seed length + sha256, never the raw
 * payload. The audit record stores seed length + hash + outcome; the
 * payload content is never persisted here (the authoritative WORM S3
 * store in the follow-on PR may store it under a separate KMS key for
 * legal-defensibility — out of scope for this PR).
 */

import { createHash } from 'node:crypto';
import type { FlagReader } from '../flags/flags.js';
import {
  CancellationToken,
  KillSwitchAbort,
} from '../flags/kill-switch.js';
import {
  appendOnigaeshiAudit,
  type OnigaeshiAuditEntry,
} from './audit.js';
import {
  requireEngagement,
  EngagementGateError,
  type EngagementGateOptions,
} from './engagement-gate.js';
import { checkOnigaeshiSanitize } from './sanitize.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Minimal safety-classifier interface. Stubbed here — the spec locks
 * Anthropic / Azure Content Safety as the vendor choice but the SDK
 * wiring is a separate PR (spec §Gap 6 blocker: vendor selection).
 * A classifier returns `{ allowed: false }` to short-circuit the call
 * before any outbound network hop.
 */
export interface SafetyClassifier {
  classify(input: {
    readonly phase: 'input' | 'output';
    readonly payload: string;
  }): Promise<{ readonly allowed: boolean; readonly reason?: string }>;
}

/**
 * Minimal open-weights driver interface. Production HF/Ollama drivers
 * land in a follow-on PR; this interface is the contract they must
 * satisfy.
 */
export interface OnigaeshiDriver {
  readonly id: string;
  generate(input: {
    readonly seed: string;
    readonly engagementId: string;
  }): Promise<{ readonly output: string }>;
}

export type InvocationVerdict =
  | 'disabled'
  | 'blocked'
  | 'completed';

export interface OnigaeshiInvocationResult {
  readonly verdict: InvocationVerdict;
  readonly reason?: string;
  readonly output?: string;
  readonly audit: OnigaeshiAuditEntry;
}

/**
 * Telemetry shape for `onigaeshi.invocation` events. R-T1: no payload
 * content — only length + hash + ids + verdict.
 */
export interface OnigaeshiInvocationTelemetry {
  readonly type:
    | 'onigaeshi.gate.check'
    | 'onigaeshi.call.redacted'
    | 'onigaeshi.audit.written'
    | 'onigaeshi.killswitch.honored'
    | 'onigaeshi.sanitize.blocked';
  readonly engagementId: string;
  readonly targetModel: string;
  readonly verdict: InvocationVerdict;
  readonly reason?: string;
  readonly seedLength: number;
  readonly seedSha256: string;
}

export interface RunOnigaeshiInput {
  readonly engagementId: string;
  readonly targetModel: string;
  readonly seed: string;
  readonly actor: string;
}

export interface OnigaeshiAdapterDeps {
  readonly flagReader: FlagReader;
  readonly gateOptions: EngagementGateOptions;
  readonly safetyClassifier?: SafetyClassifier;
  readonly driver?: OnigaeshiDriver;
  readonly emit?: (event: OnigaeshiInvocationTelemetry) => void;
  readonly now?: () => Date;
  /**
   * Optional kill-switch cancellation token. When provided, the adapter
   * calls `throwIfCancelled()` after the flag + gate checks and again
   * before the driver call. Mirrors the `amaterasu-sync` pattern.
   */
  readonly cancellation?: CancellationToken;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const ID_RE = /^[a-z0-9][a-z0-9._-]*$/i;
const MAX_ID_LEN = 128;
const MAX_SEED_LEN = 64 * 1024;

function isSafeId(id: string): boolean {
  if (typeof id !== 'string') return false;
  if (id.length === 0 || id.length > MAX_ID_LEN) return false;
  return ID_RE.test(id);
}

function isSafeActor(id: string): boolean {
  if (typeof id !== 'string') return false;
  if (id.length === 0 || id.length > MAX_ID_LEN) return false;
  // Post-#188 M-1: mirror audit.ts / engagement-gate.ts — reject control,
  // bidi-override, zero-width, and format chars. A crafted actor id lands
  // in audit rows + telemetry payloads; a bidi-override would let a log
  // reader see a misattributed actor.
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f\u200B-\u200F\u2028-\u202F\u2066-\u2069\uFEFF]/.test(id)) {
    return false;
  }
  return true;
}

function validateSeed(seed: string): void {
  if (typeof seed !== 'string') {
    throw new Error('runOnigaeshi: seed must be a string');
  }
  if (seed.length === 0) {
    throw new Error('runOnigaeshi: seed must not be empty');
  }
  if (seed.length > MAX_SEED_LEN) {
    throw new Error(`runOnigaeshi: seed must be <= ${MAX_SEED_LEN} chars`);
  }
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

/**
 * Execute an unaligned-attacker invocation. FLAG-OFF BY DEFAULT — the
 * `ONIGAESHI_ENABLED` flag governs whether the gate + driver path is
 * even attempted. Even with the flag on, the engagement gate and
 * safety classifier must both approve before the driver runs.
 *
 * Every invocation writes an audit record. Callers SHOULD emit the
 * returned telemetry events through the dojo telemetry bus; this
 * module emits them synchronously via `deps.emit` so the caller can
 * control the wire.
 */
export async function runOnigaeshi(
  input: RunOnigaeshiInput,
  deps: OnigaeshiAdapterDeps,
): Promise<OnigaeshiInvocationResult> {
  if (!input || typeof input !== 'object') {
    throw new Error('runOnigaeshi: input is required');
  }
  if (!isSafeId(input.engagementId)) {
    throw new Error(
      'runOnigaeshi: engagementId must be [a-z0-9._-], 1..128 chars',
    );
  }
  if (!isSafeId(input.targetModel)) {
    throw new Error(
      'runOnigaeshi: targetModel must be [a-z0-9._-], 1..128 chars',
    );
  }
  if (!isSafeActor(input.actor)) {
    throw new Error('runOnigaeshi: actor must be 1..128 chars without control chars');
  }
  validateSeed(input.seed);

  const seedLength = input.seed.length;
  const seedSha256 = sha256(input.seed);

  // ---- Hard sanitizer (CBRN/CSAM block-list) --------------------------
  // This is the module boundary. A matching seed is rejected BEFORE any
  // engagement gate, classifier, or driver is consulted. R-T1: the
  // verdict surfaces only the category/ruleId, never the raw match.
  const seedSanitize = checkOnigaeshiSanitize(input.seed);
  if (!seedSanitize.allowed) {
    const reason = `sanitize:${seedSanitize.ruleId ?? 'blocked'}`;
    const entry = appendOnigaeshiAudit({
      engagementId: input.engagementId,
      type: 'sanitize.blocked',
      actor: input.actor,
      targetModel: input.targetModel,
      outcome: 'blocked',
      detail: {
        reason,
        category: seedSanitize.category ?? 'unknown',
        phase: 'input',
        seedLength,
        seedSha256,
      },
      now: deps.now,
    });
    deps.emit?.({
      type: 'onigaeshi.sanitize.blocked',
      engagementId: input.engagementId,
      targetModel: input.targetModel,
      verdict: 'blocked',
      reason,
      seedLength,
      seedSha256,
    });
    return { verdict: 'blocked', reason, audit: entry };
  }

  // ---- Early kill-switch check (pre-flag, so a cancelled token wins) --
  // Mirrors the amaterasu-sync pattern: caller registers the token with
  // `KILL_ONIGAESHI` via `killSwitchRegistry.registerToken`. We honor it
  // at every decision boundary.
  try {
    deps.cancellation?.throwIfCancelled();
  } catch (err) {
    if (err instanceof KillSwitchAbort) {
      const entry = appendOnigaeshiAudit({
        engagementId: input.engagementId,
        type: 'killswitch.honored',
        actor: input.actor,
        targetModel: input.targetModel,
        outcome: 'blocked',
        detail: {
          reason: 'killswitch',
          signal: err.event.signal,
          seedLength,
          seedSha256,
        },
        now: deps.now,
      });
      deps.emit?.({
        type: 'onigaeshi.killswitch.honored',
        engagementId: input.engagementId,
        targetModel: input.targetModel,
        verdict: 'blocked',
        reason: 'killswitch',
        seedLength,
        seedSha256,
      });
      return {
        verdict: 'blocked',
        reason: 'killswitch',
        audit: entry,
      };
    }
    throw err;
  }

  // ---- Flag check (harm-path flag, default false) ---------------------
  const flagOn = deps.flagReader.isEnabled('ONIGAESHI_ENABLED');
  if (!flagOn) {
    const entry = appendOnigaeshiAudit({
      engagementId: input.engagementId,
      type: 'invocation.attempted',
      actor: input.actor,
      targetModel: input.targetModel,
      outcome: 'blocked',
      detail: {
        reason: 'flag-off',
        seedLength,
        seedSha256,
      },
      now: deps.now,
    });
    deps.emit?.({
      type: 'onigaeshi.gate.check',
      engagementId: input.engagementId,
      targetModel: input.targetModel,
      verdict: 'disabled',
      reason: 'flag-off',
      seedLength,
      seedSha256,
    });
    return {
      verdict: 'disabled',
      reason: 'flag-off',
      audit: entry,
    };
  }

  // ---- Engagement gate ------------------------------------------------
  try {
    requireEngagement(input.engagementId, input.targetModel, deps.gateOptions);
  } catch (err) {
    const reason =
      err instanceof EngagementGateError ? err.code : 'gate-error';
    const entry = appendOnigaeshiAudit({
      engagementId: input.engagementId,
      type: 'invocation.blocked',
      actor: input.actor,
      targetModel: input.targetModel,
      outcome: 'blocked',
      detail: {
        reason,
        seedLength,
        seedSha256,
      },
      now: deps.now,
    });
    deps.emit?.({
      type: 'onigaeshi.gate.check',
      engagementId: input.engagementId,
      targetModel: input.targetModel,
      verdict: 'blocked',
      reason,
      seedLength,
      seedSha256,
    });
    return {
      verdict: 'blocked',
      reason,
      audit: entry,
    };
  }

  // ---- Safety classifier (input phase) --------------------------------
  if (deps.safetyClassifier) {
    const verdict = await deps.safetyClassifier.classify({
      phase: 'input',
      payload: input.seed,
    });
    if (!verdict.allowed) {
      const reason = verdict.reason ?? 'safety-input-blocked';
      const entry = appendOnigaeshiAudit({
        engagementId: input.engagementId,
        type: 'invocation.blocked',
        actor: input.actor,
        targetModel: input.targetModel,
        outcome: 'blocked',
        detail: {
          reason,
          phase: 'input',
          seedLength,
          seedSha256,
        },
        now: deps.now,
      });
      deps.emit?.({
        type: 'onigaeshi.call.redacted',
        engagementId: input.engagementId,
        targetModel: input.targetModel,
        verdict: 'blocked',
        reason,
        seedLength,
        seedSha256,
      });
      return {
        verdict: 'blocked',
        reason,
        audit: entry,
      };
    }
  }

  // ---- Driver check ---------------------------------------------------
  if (!deps.driver) {
    const entry = appendOnigaeshiAudit({
      engagementId: input.engagementId,
      type: 'invocation.blocked',
      actor: input.actor,
      targetModel: input.targetModel,
      outcome: 'blocked',
      detail: {
        reason: 'no-driver',
        seedLength,
        seedSha256,
      },
      now: deps.now,
    });
    deps.emit?.({
      type: 'onigaeshi.gate.check',
      engagementId: input.engagementId,
      targetModel: input.targetModel,
      verdict: 'blocked',
      reason: 'no-driver',
      seedLength,
      seedSha256,
    });
    return {
      verdict: 'blocked',
      reason: 'no-driver',
      audit: entry,
    };
  }

  // ---- Kill-switch check before outbound call -------------------------
  try {
    deps.cancellation?.throwIfCancelled();
  } catch (err) {
    if (err instanceof KillSwitchAbort) {
      const entry = appendOnigaeshiAudit({
        engagementId: input.engagementId,
        type: 'killswitch.honored',
        actor: input.actor,
        targetModel: input.targetModel,
        outcome: 'blocked',
        detail: {
          reason: 'killswitch',
          signal: err.event.signal,
          seedLength,
          seedSha256,
        },
        now: deps.now,
      });
      deps.emit?.({
        type: 'onigaeshi.killswitch.honored',
        engagementId: input.engagementId,
        targetModel: input.targetModel,
        verdict: 'blocked',
        reason: 'killswitch',
        seedLength,
        seedSha256,
      });
      return {
        verdict: 'blocked',
        reason: 'killswitch',
        audit: entry,
      };
    }
    throw err;
  }

  // ---- Invoke driver --------------------------------------------------
  const driverResult = await deps.driver.generate({
    seed: input.seed,
    engagementId: input.engagementId,
  });

  // ---- Hard sanitizer (output phase) ----------------------------------
  const outputSanitize = checkOnigaeshiSanitize(driverResult.output);
  if (!outputSanitize.allowed) {
    const reason = `sanitize:${outputSanitize.ruleId ?? 'blocked'}`;
    const entry = appendOnigaeshiAudit({
      engagementId: input.engagementId,
      type: 'sanitize.blocked',
      actor: input.actor,
      targetModel: input.targetModel,
      outcome: 'blocked',
      detail: {
        reason,
        category: outputSanitize.category ?? 'unknown',
        phase: 'output',
        seedLength,
        seedSha256,
        driver: deps.driver.id,
      },
      now: deps.now,
    });
    deps.emit?.({
      type: 'onigaeshi.sanitize.blocked',
      engagementId: input.engagementId,
      targetModel: input.targetModel,
      verdict: 'blocked',
      reason,
      seedLength,
      seedSha256,
    });
    return { verdict: 'blocked', reason, audit: entry };
  }

  // ---- Safety classifier (output phase) -------------------------------
  if (deps.safetyClassifier) {
    const verdict = await deps.safetyClassifier.classify({
      phase: 'output',
      payload: driverResult.output,
    });
    if (!verdict.allowed) {
      const reason = verdict.reason ?? 'safety-output-blocked';
      const entry = appendOnigaeshiAudit({
        engagementId: input.engagementId,
        type: 'invocation.blocked',
        actor: input.actor,
        targetModel: input.targetModel,
        outcome: 'blocked',
        detail: {
          reason,
          phase: 'output',
          seedLength,
          seedSha256,
          driver: deps.driver.id,
        },
        now: deps.now,
      });
      deps.emit?.({
        type: 'onigaeshi.call.redacted',
        engagementId: input.engagementId,
        targetModel: input.targetModel,
        verdict: 'blocked',
        reason,
        seedLength,
        seedSha256,
      });
      return {
        verdict: 'blocked',
        reason,
        audit: entry,
      };
    }
  }

  // ---- Success --------------------------------------------------------
  const entry = appendOnigaeshiAudit({
    engagementId: input.engagementId,
    type: 'invocation.completed',
    actor: input.actor,
    targetModel: input.targetModel,
    outcome: 'allowed',
    detail: {
      seedLength,
      seedSha256,
      outputLength: driverResult.output.length,
      driver: deps.driver.id,
    },
    now: deps.now,
  });
  deps.emit?.({
    type: 'onigaeshi.audit.written',
    engagementId: input.engagementId,
    targetModel: input.targetModel,
    verdict: 'completed',
    seedLength,
    seedSha256,
  });
  return {
    verdict: 'completed',
    output: driverResult.output,
    audit: entry,
  };
}
