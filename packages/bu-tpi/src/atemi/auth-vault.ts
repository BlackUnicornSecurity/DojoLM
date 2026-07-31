// SPDX-License-Identifier: Apache-2.0
/**
 * File: atemi/auth-vault.ts
 * Purpose: KMS-backed session-cookie vault for Atemi probe targets.
 *
 * Wraps an opaque browser-session cookie with `KmsVault.encryptForTarget`
 * so cookies are never stored at rest as plaintext. Decrypt is scoped
 * per-target: the `targetId` tag in the `WrappedBlob` MUST match the
 * requesting target (cross-target tamper guard).
 *
 * This module DOES NOT provide a production `KmsVault` adapter — in dev
 * the caller wires `InMemoryKmsVault` (from `security/kms-vault.ts`).
 * The Vault-backed adapter is a future PR; consumers that construct
 * `AtemiAuthVault` with `InMemoryKmsVault` in production will already
 * see the one-shot stderr warning emitted by the scaffold itself.
 *
 * Safety:
 * - `targetId` is sanitized via `sanitizeId` (audit-lesson #176 M-1) and
 *   `stripBidiOverrides` before any vault I/O (audit-lesson #182 M-01).
 * - Prototype-safe lookups on the in-memory blob index use `Object.hasOwn`
 *   (audit-lesson #181 M-1).
 * - No payload content is logged or telemetered (R-T1).
 */

import { stripBidiOverrides } from '../bushido/safety.js';
import type { KmsVault, WrappedBlob } from '../security/kms-vault.js';
import type { AtemiSessionAuth } from './types.js';
import { AtemiConfigurationError } from './types.js';

/** Filename-safe targetId grammar — mirrors sanitizeId's ID_PATTERN. */
const TARGET_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

/** Max cookie length — mirrors probe-runner's MAX_COOKIE_LEN. */
const MAX_COOKIE_LEN = 4096;

/**
 * Reserved target-id values that MUST be rejected at the boundary to
 * prevent prototype-pollution via map-like lookups (audit-lesson #181,
 * #184 M-1 root containment).
 */
const RESERVED_TARGET_IDS: ReadonlySet<string> = new Set([
  '__proto__',
  'prototype',
  'constructor',
  'hasOwnProperty',
  'toString',
  'valueOf',
]);

export interface AtemiAuthVaultConfig {
  readonly kms: KmsVault;
}

export interface AuthVaultStoreArgs {
  readonly targetId: string;
  readonly cookie: string;
  readonly label?: string;
}

/**
 * Production-warning banner: the Vault-backed KmsVault is deferred
 * (ADR-0002, PR #172). Callers wiring `InMemoryKmsVault` in production
 * will see a stderr warning from `kms-vault.ts` itself — this module
 * does not re-emit it.
 */
export class AtemiAuthVault {
  private readonly kms: KmsVault;
  private readonly blobs = new Map<string, WrappedBlob>();

  constructor(config: AtemiAuthVaultConfig) {
    if (!config || !config.kms) {
      throw new AtemiConfigurationError(
        'AtemiAuthVault requires a `kms` KmsVault implementation',
      );
    }
    this.kms = config.kms;
  }

  /**
   * Encrypt + persist a session cookie for a target.
   * Returns the sanitized `targetId` the caller should use from now on.
   */
  async store(args: AuthVaultStoreArgs): Promise<string> {
    const targetId = this.validateTargetId(args.targetId);
    const cookie = stripBidiOverrides(args.cookie ?? '');
    if (cookie.length === 0 || cookie.length > MAX_COOKIE_LEN) {
      throw new AtemiConfigurationError(
        `AtemiAuthVault: cookie length must be 1..${MAX_COOKIE_LEN}`,
      );
    }
    await this.kms.ensureTargetKey(targetId);
    const blob = await this.kms.encryptForTarget(
      targetId,
      new TextEncoder().encode(cookie),
    );
    this.blobs.set(targetId, blob);
    return targetId;
  }

  /**
   * Unwrap the stored cookie for a target, returning an `AtemiSessionAuth`
   * suitable for passing to the probe runner. Throws if the target is
   * unknown or if the KMS decrypt fails (including cross-target tamper).
   */
  async unwrap(targetId: string, label?: string): Promise<AtemiSessionAuth> {
    const id = this.validateTargetId(targetId);
    // Using `Map.has` is prototype-safe by construction (native Map
    // does not consult prototype for key lookup), but we still gate on
    // the sanitized id to keep the surface tight.
    const blob = this.blobs.get(id);
    if (!blob) {
      throw new AtemiConfigurationError(
        `AtemiAuthVault: no wrapped session for target "${id}"`,
      );
    }
    const plaintext = await this.kms.decryptForTarget(id, blob);
    const cookie = new TextDecoder().decode(plaintext);
    const auth: AtemiSessionAuth = {
      targetId: id,
      cookie,
      ...(label !== undefined && { label: stripBidiOverrides(label) }),
    };
    return Object.freeze(auth);
  }

  /** Returns the list of target ids with wrapped sessions. */
  listTargets(): readonly string[] {
    return Object.freeze([...this.blobs.keys()].sort());
  }

  /** Drops a wrapped session. Idempotent. */
  forget(targetId: string): boolean {
    const id = this.validateTargetId(targetId);
    return this.blobs.delete(id);
  }

  private validateTargetId(raw: unknown): string {
    if (typeof raw !== 'string') {
      throw new AtemiConfigurationError('AtemiAuthVault: targetId must be a string');
    }
    const stripped = stripBidiOverrides(raw);
    if (stripped.length === 0) {
      throw new AtemiConfigurationError('AtemiAuthVault: targetId must not be empty');
    }
    if (RESERVED_TARGET_IDS.has(stripped)) {
      throw new AtemiConfigurationError(
        `AtemiAuthVault: targetId "${stripped}" is reserved`,
      );
    }
    if (!TARGET_ID_PATTERN.test(stripped)) {
      throw new AtemiConfigurationError(
        `AtemiAuthVault: targetId "${stripped}" is not filename-safe — ` +
          'use [A-Za-z0-9][A-Za-z0-9._:-]* (max 128)',
      );
    }
    return stripped;
  }
}
