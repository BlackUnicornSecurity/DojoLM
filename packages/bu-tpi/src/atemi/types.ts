// SPDX-License-Identifier: Apache-2.0
/**
 * File: atemi/types.ts
 * Purpose: Gap 3 — Playwright-driven product-UI probe module types.
 * Story: Industry-tools parity plan §Gap 3 (lines 345–378).
 *
 * v1 scope cut (documented in PR + scope-divergence notes):
 * - Ships `AtemiProbe` interface + injected Playwright driver adapter.
 * - Concrete targets: `claude-memory`, `claude-artifacts`, `system-prompt-leak`.
 * - Defers ChatGPT/Gemini vendor-specific selectors to a follow-up PR.
 * - Defers `auth-vault`, `tos-attestation` state machine, and admin UI
 *   pages — those ship with the web-app delta in a follow-up.
 *
 * Safety notes carried from Gap 10 (audit lessons #176/#178/#181/#182/#184):
 * - User-supplied strings (targetId, artifactId, seed) MUST pass through
 *   `stripBidiOverrides` + `sanitizeId` before persistence.
 * - Metadata lookups use `Object.hasOwn` only (no prototype walk).
 * - Filenames / selectors are NEVER derived directly from user input.
 * - R-T1: no payload content in telemetry — hash + length only.
 */

import type { RedactedPayload } from '../telemetry/types.js';

/** Coarse product-UI target identifier. Ships claude-* in v1. */
export type AtemiProduct =
  | 'claude-chat'
  | 'claude-memory'
  | 'claude-artifacts'
  | 'chatgpt'
  | 'chatgpt-memory'
  | 'chatgpt-artifacts'
  | 'gemini'
  | 'gemini-memory';

/** Which kind of probe the caller is running. */
export type AtemiProbeKind =
  | 'memory-poison'
  | 'artifact-exfil'
  | 'system-prompt-leak';

/** Outcome surface returned by every probe invocation. */
export type AtemiProbeStatus =
  | 'success'        // target complied (attacker-eye view)
  | 'refused'        // target refused — hard or soft
  | 'timeout'        // driver timed out waiting for the target
  | 'budget-denied'  // ledger refused the debit before we hit the driver
  | 'error';         // driver threw or target returned an error state

/**
 * R-T1-safe probe outcome. No raw payload text — only redacted hash+len.
 * `evidenceHash` is a sha256 of the redacted response (or empty state);
 * useful for dedupe + replay-correlation without leaking content.
 */
export interface AtemiProbeOutcome {
  readonly status: AtemiProbeStatus;
  readonly kind: AtemiProbeKind;
  readonly product: AtemiProduct;
  readonly evidenceHash: string;
  /** Elapsed wall-clock ms from driver-call start to outcome. */
  readonly elapsedMs: number;
  /** Credits actually debited from the ledger. 0 on budget-denied. */
  readonly creditsConsumed: number;
  /** Redacted input seed (R-T1). */
  readonly inputRedacted?: RedactedPayload;
  /** Redacted observed target output (R-T1). */
  readonly outputRedacted?: RedactedPayload;
  /**
   * Human-readable error message when status === 'error' | 'timeout'.
   * Post-#186 L-1: this string MAY contain caller-supplied artifactId or
   * other validated identifiers (already passed grammar checks). It MUST
   * NOT contain raw user payload content. Consumers logging this string
   * should still apply length caps before persistence.
   */
  readonly errorMessage?: string;
}

/**
 * Session authentication handle. Cookie payloads are deliberately opaque;
 * auth-vault (follow-up PR) will wrap them with KMS encryption.
 *
 * We keep this narrow in v1 — just enough to prove the probe driver
 * plumbing. Treat the cookie as a secret (never log, never telemeter).
 */
export interface AtemiSessionAuth {
  readonly targetId: string;
  /** Opaque cookie blob. Redacted from all telemetry. */
  readonly cookie: string;
  /** Optional label (sanitized before persistence). */
  readonly label?: string;
}

/** Injected driver surface — allows mock drivers in tests. */
export interface AtemiDriver {
  /**
   * Run a single probe step against the target. Implementations must:
   * - honor `timeoutMs` and throw `AtemiTimeoutError` on overrun
   * - never return raw response text to the caller — redact at the edge
   * - be side-effect free beyond the underlying browser session
   */
  runProbe(args: AtemiDriverRunArgs): Promise<AtemiDriverResult>;
}

export interface AtemiDriverRunArgs {
  readonly product: AtemiProduct;
  readonly kind: AtemiProbeKind;
  readonly auth: AtemiSessionAuth;
  readonly seedPayload: string;
  readonly timeoutMs: number;
  /** Opaque primitive-defined knobs (e.g. artifactId). Own-key lookups only. */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Driver-level result. Still carries raw response text — `AtemiProbe`
 * immediately redacts it before returning `AtemiProbeOutcome` upward.
 * Drivers MUST NOT emit telemetry themselves.
 */
export interface AtemiDriverResult {
  readonly status: Exclude<AtemiProbeStatus, 'budget-denied'>;
  readonly responseText: string;
  readonly errorMessage?: string;
}

/**
 * Exported so Gap 10 primitives can type their `target` option against
 * a stable interface. The concrete implementation is `probe-runner.ts`
 * bound to the vendor-specific `targets/*` adapter.
 */
export interface AtemiProbe {
  readonly product: AtemiProduct;
  readonly kind: AtemiProbeKind;
  run(args: AtemiProbeRunArgs): Promise<AtemiProbeOutcome>;
}

export interface AtemiProbeRunArgs {
  readonly userId: string;
  readonly seedPayload: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class AtemiTimeoutError extends Error {
  readonly code = 'ATEMI.PROBE.TIMEOUT' as const;
  constructor(product: AtemiProduct, timeoutMs: number) {
    super(`Atemi probe against "${product}" timed out after ${timeoutMs}ms`);
    this.name = 'AtemiTimeoutError';
  }
}

export class AtemiConfigurationError extends Error {
  readonly code = 'ATEMI.PROBE.CONFIG' as const;
  constructor(message: string) {
    super(message);
    this.name = 'AtemiConfigurationError';
  }
}
