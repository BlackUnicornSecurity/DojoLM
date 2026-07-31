// SPDX-License-Identifier: Apache-2.0
/**
 * Evidence envelope — one immutable record per authenticated, target-bound
 * QA action (PR-4 / CONT-R2 evidence contract). Design:
 * team/docs/QA-R2-EVIDENCE-ENVELOPE-DESIGN-2026-07-22.md §3.
 *
 * Hashes-only: the exchange stores payload/response sha256, never the raw
 * bodies (smaller PII surface). Immutable: there is no update path — a
 * correction is a new envelope with `retryOfEnvelopeId` set.
 */
import { z } from 'zod';
import crypto from 'node:crypto';

export type EvidenceSurface =
  | 'jutsu'
  | 'eval'
  | 'arena'
  | 'sensei'
  | 'adversarial' // the Live-Practice / probe surface (codename retired)
  | 'kagami'
  | 'agentic'
  | 'hattori'
  | 'embedding';

export type EvidenceStatus = 'ok' | 'failed' | 'blocked' | 'skipped';

export type EvidenceErrorCode =
  | 'forbidden'
  | 'invalid-input'
  | 'not-found'
  | 'conflict'
  | 'rate-limited'
  | 'server'
  | 'network'
  | 'timeout'
  | 'unavailable';

export interface EvidenceError {
  readonly code: EvidenceErrorCode;
  readonly terminal: boolean;
}

export interface EvidenceEnvelope {
  readonly envelopeId: string;
  readonly runId: string;
  readonly surface: EvidenceSurface;
  readonly action: string;
  readonly build: {
    readonly gitSha: string | null;
    readonly imageDigest: string | null;
    readonly appEnv: string;
  };
  readonly target: {
    readonly spark: string;
    readonly tag: string;
    readonly fullDigest: string;
    readonly configId: string;
    readonly providerMapping: string;
    readonly readinessId: string | null;
    readonly reservationId: string | null;
  };
  readonly exchange: {
    readonly payloadSha256: string;
    readonly responseSha256: string | null;
    readonly typedError: EvidenceError | null;
  };
  readonly timing: {
    readonly startedAt: string;
    readonly endedAt: string;
    readonly latencyMs: number;
    readonly status: EvidenceStatus;
    readonly terminalReason: string | null;
    readonly retryOfEnvelopeId: string | null;
  };
  readonly actor: {
    readonly role: string;
    readonly csrfPresent: boolean;
    readonly originMatched: boolean;
    readonly auditRef: string | null;
  };
}

/** The envelope minus the server-minted id — what storage persists. */
export type EvidenceEnvelopeInput = Omit<EvidenceEnvelope, 'envelopeId'>;

/** The `actor` block — server-stamped from the authenticated request, never
 *  trusted from the HTTP body. */
export type EvidenceActor = EvidenceEnvelope['actor'];

/** What an HTTP producer submits: the input minus the server-authoritative
 *  `actor` block (the route derives that from the authenticated session). */
export type EvidenceSubmission = Omit<EvidenceEnvelopeInput, 'actor'>;

const SHA256_RE = /^[a-f0-9]{64}$/;
const sha256 = z.string().regex(SHA256_RE, 'must be a lowercase sha256 hex');

export const EvidenceErrorSchema = z.object({
  code: z.enum([
    'forbidden', 'invalid-input', 'not-found', 'conflict', 'rate-limited',
    'server', 'network', 'timeout', 'unavailable',
  ]),
  terminal: z.boolean(),
});

/** Validates an HTTP submission — the envelope MINUS the server-minted id and
 *  the server-stamped `actor`. `.strict()` so an unknown key (including a
 *  smuggled `actor`/`envelopeId`) is rejected rather than silently dropped. */
export const EvidenceSubmissionSchema = z
  .object({
    // Same charset the GET [runId] route accepts, so anything writable is
    // readable back (no write/read charset mismatch).
    runId: z.string().regex(/^[\w.:-]{1,200}$/),
    surface: z.enum([
      'jutsu', 'eval', 'arena', 'sensei', 'adversarial', 'kagami', 'agentic',
      'hattori', 'embedding',
    ]),
    action: z.string().min(1).max(120),
    build: z
      .object({
        gitSha: z.string().max(64).nullable(),
        imageDigest: z.string().max(200).nullable(),
        appEnv: z.string().max(40),
      })
      .strict(),
    target: z
      .object({
        spark: z.string().max(40),
        tag: z.string().max(200),
        fullDigest: z.string().max(200),
        configId: z.string().max(200),
        // An APPROVED PROVIDER KEY, never a raw URL (design §3) — reject
        // scheme-bearing strings so a credentialed URL can't be persisted.
        providerMapping: z
          .string()
          .min(1)
          .max(120)
          .regex(/^[\w.\-]+$/, 'provider key only, not a URL'),
        readinessId: z.string().max(200).nullable(),
        reservationId: z.string().max(200).nullable(),
      })
      .strict(),
    exchange: z
      .object({
        payloadSha256: sha256,
        responseSha256: sha256.nullable(),
        typedError: EvidenceErrorSchema.nullable(),
      })
      .strict(),
    timing: z
      .object({
        startedAt: z.string().datetime(),
        endedAt: z.string().datetime(),
        latencyMs: z.number().int().nonnegative(),
        status: z.enum(['ok', 'failed', 'blocked', 'skipped']),
        terminalReason: z.string().max(200).nullable(),
        retryOfEnvelopeId: z.string().max(80).nullable(),
      })
      .strict(),
  })
  .strict();

// Compile-time drift guard: the zod submission and the TS submission type must
// stay in lock-step. If a field is added to one but not the other this fails
// `tsc`, so no unchecked `as` cast is needed at the call site.
type _AssertEqual<A, B> = [A] extends [B]
  ? [B] extends [A]
    ? true
    : never
  : never;
const _schemaMatchesType: _AssertEqual<
  z.infer<typeof EvidenceSubmissionSchema>,
  EvidenceSubmission
> = true;
void _schemaMatchesType;

/** Server-minted, roughly time-sortable envelope id. */
export function newEnvelopeId(): string {
  return `env_${Date.now().toString(36)}_${crypto.randomBytes(6).toString('hex')}`;
}
