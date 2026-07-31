// SPDX-License-Identifier: Apache-2.0
/**
 * File: atemi/tos-attestation.ts
 * Purpose: Per-(vendor, target) Terms-of-Service attestation state machine.
 *
 * Atemi probes authenticated product-UI surfaces. Running such a probe
 * without the operator's explicit ToS attestation exposes the dojo
 * (and the vendor) to terms-of-service violation liability. This module
 * owns the `pending -> attested -> active` state transitions AND the
 * dispatch gate — the `withTosAttestation` wrapper refuses to forward
 * any probe call whose (vendor, targetId) state !== `active`.
 *
 * HARD CONSTRAINTS (from Gap 3 v1-deferred spec):
 * - No "skip" path. There is no default `active` state. Fresh registrations
 *   begin at `pending`.
 * - Attestation MUST be signed (operator identifier + signature + timestamp).
 *   The module does NOT verify the signature cryptographically — it is
 *   an audit record, not a crypto oracle — but an empty signature string
 *   is rejected.
 * - Dispatch is blocked (returns `error` AtemiDriverResult) when state
 *   is not `active`. Blocking is side-effect free: no telemetry, no
 *   budget burn.
 *
 * Safety:
 * - (vendor, targetId) keys are stored in a native `Map` — prototype-safe.
 * - targetId / operatorId / signature are bidi-stripped before use
 *   (audit-lesson #182 M-01).
 * - Reserved id denylist mirrors auth-vault (audit-lesson #184 M-1).
 * - R-T1: ToS records never carry raw payload content.
 */

import { stripBidiOverrides } from '../bushido/safety.js';
import {
  type AtemiDriver,
  type AtemiDriverResult,
  type AtemiDriverRunArgs,
  type AtemiProduct,
  AtemiConfigurationError,
} from './types.js';

export type TosState = 'pending' | 'attested' | 'active';

export interface TosRecord {
  readonly vendor: AtemiProduct;
  readonly targetId: string;
  readonly state: TosState;
  readonly operatorId?: string;
  readonly signature?: string;
  /** ISO-8601 UTC timestamp of the most recent state change. */
  readonly updatedAt: string;
}

export interface AttestArgs {
  readonly vendor: AtemiProduct;
  readonly targetId: string;
  readonly operatorId: string;
  readonly signature: string;
}

export interface ActivateArgs {
  readonly vendor: AtemiProduct;
  readonly targetId: string;
}

const TARGET_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const OPERATOR_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._@:-]{0,127}$/;
const MAX_SIG_LEN = 1024;

const RESERVED_IDS: ReadonlySet<string> = new Set([
  '__proto__',
  'prototype',
  'constructor',
  'hasOwnProperty',
  'toString',
  'valueOf',
]);

export class TosStateError extends Error {
  readonly code = 'ATEMI.TOS.STATE' as const;
  constructor(message: string) {
    super(message);
    this.name = 'TosStateError';
  }
}

/**
 * In-memory (vendor, targetId) -> TosRecord store with the transition
 * rules baked in. The registry is intended to live for the life of the
 * web-app process; long-term persistence is a future PR (it will be a
 * swap-in behind this same surface).
 */
export class TosAttestationRegistry {
  private readonly records = new Map<string, TosRecord>();

  /** Exposed for admin UI read paths. Returns a frozen snapshot. */
  list(): readonly TosRecord[] {
    return Object.freeze(
      [...this.records.values()].sort((a, b) => {
        if (a.vendor !== b.vendor) return a.vendor.localeCompare(b.vendor);
        return a.targetId.localeCompare(b.targetId);
      }),
    );
  }

  get(vendor: AtemiProduct, targetId: string): TosRecord | undefined {
    const key = makeKey(vendor, validateTargetId(targetId));
    return this.records.get(key);
  }

  /** Idempotently create a pending record. */
  register(vendor: AtemiProduct, targetId: string): TosRecord {
    const tid = validateTargetId(targetId);
    const key = makeKey(vendor, tid);
    const existing = this.records.get(key);
    if (existing) return existing;
    const record: TosRecord = Object.freeze({
      vendor,
      targetId: tid,
      state: 'pending',
      updatedAt: new Date().toISOString(),
    });
    this.records.set(key, record);
    return record;
  }

  /** pending -> attested. Requires a non-empty operatorId + signature. */
  attest(args: AttestArgs): TosRecord {
    const tid = validateTargetId(args.targetId);
    const operatorId = validateOperatorId(args.operatorId);
    const signature = validateSignature(args.signature);
    const key = makeKey(args.vendor, tid);
    const existing = this.records.get(key);
    if (!existing) {
      throw new TosStateError(
        `tos-attestation: no record for (${args.vendor}, ${tid}) — call register() first`,
      );
    }
    if (existing.state !== 'pending') {
      throw new TosStateError(
        `tos-attestation: cannot attest from state "${existing.state}" — ` +
          'expected "pending". Reset the record if re-attestation is required.',
      );
    }
    const next: TosRecord = Object.freeze({
      vendor: args.vendor,
      targetId: tid,
      state: 'attested',
      operatorId,
      signature,
      updatedAt: new Date().toISOString(),
    });
    this.records.set(key, next);
    return next;
  }

  /** attested -> active. Separate step so a second reviewer can ratify. */
  activate(args: ActivateArgs): TosRecord {
    const tid = validateTargetId(args.targetId);
    const key = makeKey(args.vendor, tid);
    const existing = this.records.get(key);
    if (!existing) {
      throw new TosStateError(
        `tos-attestation: no record for (${args.vendor}, ${tid})`,
      );
    }
    if (existing.state !== 'attested') {
      throw new TosStateError(
        `tos-attestation: cannot activate from state "${existing.state}" — ` +
          'expected "attested"',
      );
    }
    const next: TosRecord = Object.freeze({
      ...existing,
      state: 'active',
      updatedAt: new Date().toISOString(),
    });
    this.records.set(key, next);
    return next;
  }

  /**
   * Drops an existing record back to `pending` (dispatch blocked again)
   * or removes it entirely. Admin-driven only.
   */
  revoke(vendor: AtemiProduct, targetId: string): void {
    const tid = validateTargetId(targetId);
    const key = makeKey(vendor, tid);
    this.records.delete(key);
  }

  /** True iff the (vendor, targetId) is in `active` state. */
  isActive(vendor: AtemiProduct, targetId: string): boolean {
    const tid = validateTargetId(targetId);
    const key = makeKey(vendor, tid);
    const r = this.records.get(key);
    return r !== undefined && r.state === 'active';
  }
}

function makeKey(vendor: AtemiProduct, targetId: string): string {
  return `${vendor}\u0000${targetId}`;
}

function validateTargetId(raw: unknown): string {
  if (typeof raw !== 'string') {
    throw new AtemiConfigurationError('tos-attestation: targetId must be a string');
  }
  const stripped = stripBidiOverrides(raw);
  if (stripped.length === 0) {
    throw new AtemiConfigurationError('tos-attestation: targetId must not be empty');
  }
  if (RESERVED_IDS.has(stripped)) {
    throw new AtemiConfigurationError(
      `tos-attestation: targetId "${stripped}" is reserved`,
    );
  }
  if (!TARGET_ID_PATTERN.test(stripped)) {
    throw new AtemiConfigurationError(
      `tos-attestation: targetId "${stripped}" is not filename-safe`,
    );
  }
  return stripped;
}

function validateOperatorId(raw: unknown): string {
  if (typeof raw !== 'string') {
    throw new AtemiConfigurationError('tos-attestation: operatorId must be a string');
  }
  const stripped = stripBidiOverrides(raw);
  if (stripped.length === 0) {
    throw new AtemiConfigurationError('tos-attestation: operatorId must not be empty');
  }
  if (RESERVED_IDS.has(stripped)) {
    throw new AtemiConfigurationError(
      `tos-attestation: operatorId "${stripped}" is reserved`,
    );
  }
  if (!OPERATOR_ID_PATTERN.test(stripped)) {
    throw new AtemiConfigurationError(
      'tos-attestation: operatorId contains disallowed characters',
    );
  }
  return stripped;
}

function validateSignature(raw: unknown): string {
  if (typeof raw !== 'string') {
    throw new AtemiConfigurationError('tos-attestation: signature must be a string');
  }
  const stripped = stripBidiOverrides(raw);
  if (stripped.length === 0 || stripped.length > MAX_SIG_LEN) {
    throw new AtemiConfigurationError(
      `tos-attestation: signature length must be 1..${MAX_SIG_LEN}`,
    );
  }
  return stripped;
}

/**
 * Wrap an underlying `AtemiDriver` so every probe call is gated on an
 * `active` ToS attestation for the (product, auth.targetId) tuple.
 *
 * Blocked calls return `status: 'error'` with a descriptive message.
 * They do NOT touch the inner driver — no live browser launch, no live
 * vendor API calls, no budget burn.
 */
export function withTosAttestation(
  inner: AtemiDriver,
  registry: TosAttestationRegistry,
): AtemiDriver {
  if (!inner) {
    throw new AtemiConfigurationError('withTosAttestation: inner driver required');
  }
  if (!registry) {
    throw new AtemiConfigurationError('withTosAttestation: registry required');
  }
  return {
    async runProbe(args: AtemiDriverRunArgs): Promise<AtemiDriverResult> {
      // The registry's isActive performs its own validation; we catch
      // AtemiConfigurationError and surface it as a dispatch block.
      let active: boolean;
      try {
        active = registry.isActive(args.product, args.auth.targetId);
      } catch (err) {
        return {
          status: 'error',
          responseText: '',
          errorMessage:
            err instanceof Error
              ? `tos-attestation: ${err.message}`
              : 'tos-attestation: invalid target',
        };
      }
      if (!active) {
        return {
          status: 'error',
          responseText: '',
          errorMessage:
            `tos-attestation: dispatch blocked for (${args.product}, ${args.auth.targetId}) — ` +
            'state is not "active". Attest + activate before probing.',
        };
      }
      return inner.runProbe(args);
    },
  };
}
