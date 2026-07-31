// SPDX-License-Identifier: Apache-2.0
/**
 * File: atemi/probe-runner.ts
 * Purpose: Budget-aware orchestration for a single `AtemiProbe` call.
 *
 * The runner owns:
 * - budget-ledger consultation (debit BEFORE the driver runs)
 * - timeout enforcement (wall-clock race against the driver)
 * - R-T1 redaction of the driver's raw response before return
 * - bidi-strip + sanitize of user-supplied fields per audit-lessons
 *   #176/#178/#181/#182/#184
 *
 * Telemetry is surfaced via an optional callback — the runner itself
 * never touches a sink, so callers compose with `probe.executed`,
 * `probe.throttle.hit`, `probe.killswitch.honored` emitters at the
 * edge per spec §Gap 3.
 */

import { createHash } from 'node:crypto';
import type { BudgetLedger } from '../sensei/budget-ledger.js';
import { redactString } from '../telemetry/redaction.js';
import { sanitizeSeed, stripBidiOverrides } from '../bushido/safety.js';
import {
  AtemiConfigurationError,
  AtemiTimeoutError,
  type AtemiDriver,
  type AtemiDriverResult,
  type AtemiProbe,
  type AtemiProbeKind,
  type AtemiProbeOutcome,
  type AtemiProbeRunArgs,
  type AtemiProduct,
  type AtemiSessionAuth,
} from './types.js';

export interface ProbeRunnerConfig {
  readonly product: AtemiProduct;
  readonly kind: AtemiProbeKind;
  readonly driver: AtemiDriver;
  readonly ledger: BudgetLedger;
  readonly auth: AtemiSessionAuth;
  /** Credits debited per probe invocation (default 5 — UI probes are heavier). */
  readonly creditsPerRun?: number;
  /** Per-probe wall-clock cap (default 30_000 ms). */
  readonly timeoutMs?: number;
  /**
   * Optional kill-switch callback. Consulted BEFORE any driver call.
   * Returning `true` aborts with `status: 'error'` + kill-switch reason.
   */
  readonly killSwitch?: () => boolean;
}

const DEFAULT_CREDITS = 5;
const DEFAULT_TIMEOUT_MS = 30_000;
const EMPTY_EVIDENCE_HASH = 'sha256:' + createHash('sha256').update('').digest('hex');

/**
 * Factory — produces an `AtemiProbe` bound to a product + driver +
 * ledger. Multiple probes (different products or kinds) can share a
 * driver; budget is checked per invocation.
 */
export function createProbeRunner(config: ProbeRunnerConfig): AtemiProbe {
  validateConfig(config);
  const credits = config.creditsPerRun ?? DEFAULT_CREDITS;
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return {
    product: config.product,
    kind: config.kind,
    async run(rawArgs: AtemiProbeRunArgs): Promise<AtemiProbeOutcome> {
      return runOnce(config, credits, timeoutMs, rawArgs);
    },
  };
}

/** Max cookie length — prevents pathological session blobs from blowing up logs. */
const MAX_COOKIE_LEN = 4096;

function validateConfig(config: ProbeRunnerConfig): void {
  if (!config) {
    throw new AtemiConfigurationError('createProbeRunner requires a config object');
  }
  if (!config.driver) {
    throw new AtemiConfigurationError('createProbeRunner requires a driver');
  }
  if (!config.ledger) {
    throw new AtemiConfigurationError('createProbeRunner requires a BudgetLedger');
  }
  if (!config.auth || typeof config.auth.cookie !== 'string') {
    throw new AtemiConfigurationError('createProbeRunner requires a session auth');
  }
  // Post-#186 M-1: strip bidi-overrides from the cookie + cap length
  // before any downstream code logs/redacts it. We mutate via the
  // assertion below — the AtemiSessionAuth.cookie field is intentionally
  // an opaque string, so callers should treat it as such.
  const stripped = stripBidiOverrides(config.auth.cookie);
  if (stripped.length === 0 || stripped.length > MAX_COOKIE_LEN) {
    throw new AtemiConfigurationError(
      `auth.cookie length must be 1..${MAX_COOKIE_LEN}`,
    );
  }
  // Re-assign the sanitized cookie back via a defensive copy. The auth
  // object is `readonly` at the type level; we replace it in-place with
  // a new sanitized copy by re-binding on the config.
  (config as { auth: AtemiSessionAuth }).auth = Object.freeze({
    ...config.auth,
    cookie: stripped,
  });
  if (config.creditsPerRun !== undefined && config.creditsPerRun < 0) {
    throw new AtemiConfigurationError('creditsPerRun must be >= 0');
  }
  if (config.timeoutMs !== undefined && config.timeoutMs <= 0) {
    throw new AtemiConfigurationError('timeoutMs must be > 0');
  }
}

async function runOnce(
  config: ProbeRunnerConfig,
  credits: number,
  timeoutMs: number,
  rawArgs: AtemiProbeRunArgs,
): Promise<AtemiProbeOutcome> {
  const started = Date.now();
  const userId = sanitizeUserId(rawArgs.userId);
  const seed = sanitizeSeed(rawArgs.seedPayload);
  const metadata = freezeMetadata(rawArgs.metadata);

  // Kill-switch: consulted before anything else (spec R-F2 — 5s).
  if (config.killSwitch && config.killSwitch() === true) {
    return {
      status: 'error',
      kind: config.kind,
      product: config.product,
      evidenceHash: EMPTY_EVIDENCE_HASH,
      elapsedMs: Date.now() - started,
      creditsConsumed: 0,
      errorMessage: 'kill-switch engaged',
    };
  }

  // Budget: debit BEFORE running the driver. If denied, short-circuit.
  const decision = await config.ledger.checkAndDecrement(userId, credits);
  if (decision.verdict === 'denied') {
    return {
      status: 'budget-denied',
      kind: config.kind,
      product: config.product,
      evidenceHash: EMPTY_EVIDENCE_HASH,
      elapsedMs: Date.now() - started,
      creditsConsumed: 0,
      errorMessage: decision.reason ?? 'budget exhausted',
    };
  }

  // Timeout race.
  let driverResult: AtemiDriverResult;
  try {
    driverResult = await raceWithTimeout(
      config.driver.runProbe({
        product: config.product,
        kind: config.kind,
        auth: config.auth,
        seedPayload: seed,
        timeoutMs,
        metadata,
      }),
      timeoutMs,
      config.product,
    );
  } catch (err) {
    if (err instanceof AtemiTimeoutError) {
      return {
        status: 'timeout',
        kind: config.kind,
        product: config.product,
        evidenceHash: EMPTY_EVIDENCE_HASH,
        elapsedMs: Date.now() - started,
        creditsConsumed: credits,
        inputRedacted: redactString(seed),
        errorMessage: err.message,
      };
    }
    return {
      status: 'error',
      kind: config.kind,
      product: config.product,
      evidenceHash: EMPTY_EVIDENCE_HASH,
      elapsedMs: Date.now() - started,
      creditsConsumed: credits,
      inputRedacted: redactString(seed),
      errorMessage: err instanceof Error ? err.message : String(err),
    };
  }

  // Redact: driver's `responseText` never leaves this function.
  const outputRedacted = redactString(driverResult.responseText);
  const evidenceHash = outputRedacted.hash;

  return {
    status: driverResult.status,
    kind: config.kind,
    product: config.product,
    evidenceHash,
    elapsedMs: Date.now() - started,
    creditsConsumed: credits,
    inputRedacted: redactString(seed),
    outputRedacted,
    errorMessage: driverResult.errorMessage,
  };
}

function sanitizeUserId(raw: unknown): string {
  if (typeof raw !== 'string') {
    throw new TypeError('userId must be a string');
  }
  const stripped = stripBidiOverrides(raw);
  if (stripped.length === 0 || stripped.length > 256) {
    throw new RangeError('userId length must be 1..256');
  }
  return stripped;
}

/**
 * Returns a defensive shallow copy that only carries own enumerable
 * keys (audit-lesson #181 M-1 — no prototype walk). Nested values are
 * passed through as-is; adapters must treat them as opaque.
 */
function freezeMetadata(
  raw: Readonly<Record<string, unknown>> | undefined,
): Readonly<Record<string, unknown>> | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(raw)) {
    if (Object.hasOwn(raw, key)) {
      out[key] = (raw as Record<string, unknown>)[key];
    }
  }
  return Object.freeze(out);
}

function raceWithTimeout<T>(
  task: Promise<T>,
  timeoutMs: number,
  product: AtemiProduct,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new AtemiTimeoutError(product, timeoutMs)), timeoutMs);
    // Don't keep the event loop alive solely for this timer.
    if (typeof timer === 'object' && timer && 'unref' in timer) {
      (timer as { unref: () => void }).unref();
    }
  });
  return Promise.race([task, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}
