// SPDX-License-Identifier: Apache-2.0
/**
 * tatami/retention — DRY-RUN proof retention sweeper (OSS, Epic 1 / PR-3, B4).
 *
 * Maps each proof's `retentionClass` to a TTL and reports how many proofs WOULD
 * expire — it deletes NOTHING. The enforcing engine is a later PR (decision B4:
 * "fields now, engine later, or gate persistence"). Two hard exemptions,
 * enforced not advisory:
 *   - `legalHold === true`              ⇒ never eligible, regardless of class.
 *   - `retentionClass === 'legal_hold'` ⇒ never eligible (no TTL).
 *
 * Result is counts-only — it mirrors `lib/retention/policy.ts`'s
 * RetentionNamespaceResult posture and never leaks proof ids / operator / org.
 * The clock is injected (deterministic; mirrors `runRetention(config, clock)`).
 */

import type { TatamiProof, TatamiRetentionClass } from './types';
import type { TatamiProofRetentionSource } from './store/types';

export interface TatamiRetentionConfig {
  readonly ephemeralDays: number;
  readonly standardDays: number;
  readonly extendedDays: number;
}

export interface TatamiRetentionResult {
  readonly namespace: 'tatami';
  /** Proofs evaluated. */
  readonly scanned: number;
  /** Proofs whose class TTL has expired AND are not held (would-expire). */
  readonly eligible: number;
  /** Always 0 in PR-3 — this is a dry run. */
  readonly pruned: number;
  /** Proofs exempt via `legalHold` flag or the `legal_hold` class. */
  readonly held: number;
  /** Always `true` in PR-3 — widen to `boolean` when the enforcing engine lands. */
  readonly dryRun: true;
  /** ISO instant the sweep was evaluated at (from the injected clock). */
  readonly evaluatedAt: string;
}

const DEFAULT_EPHEMERAL_DAYS = 1;
const DEFAULT_STANDARD_DAYS = 90;
const DEFAULT_EXTENDED_DAYS = 365;
export const DAY_MS = 24 * 60 * 60 * 1000;

/** Mirrors policy.ts: invalid / non-positive → default (never silently disable). */
function positiveInt(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

export function loadTatamiRetentionConfig(): TatamiRetentionConfig {
  return {
    ephemeralDays: positiveInt(process.env.TATAMI_RETENTION_EPHEMERAL_DAYS, DEFAULT_EPHEMERAL_DAYS),
    standardDays: positiveInt(process.env.TATAMI_RETENTION_STANDARD_DAYS, DEFAULT_STANDARD_DAYS),
    extendedDays: positiveInt(process.env.TATAMI_RETENTION_EXTENDED_DAYS, DEFAULT_EXTENDED_DAYS),
  };
}

/**
 * TTL in days for a class, or `null` when the class is never eligible
 * (`legal_hold`, or any unrecognised class — conservative: never expire on
 * ambiguous data in a dry run).
 */
function classTtlDays(
  cls: TatamiRetentionClass | string,
  config: TatamiRetentionConfig,
): number | null {
  switch (cls) {
    case 'ephemeral':
      return config.ephemeralDays;
    case 'standard':
      return config.standardDays;
    case 'extended':
      return config.extendedDays;
    case 'legal_hold':
    default:
      return null;
  }
}

/**
 * Pure dry-run eligibility computation over a record set. Deletes nothing —
 * callers in PR-3 only ever read the counts.
 */
export function evaluateTatamiRetention(
  proofs: readonly TatamiProof[],
  config: TatamiRetentionConfig,
  now: Date,
): TatamiRetentionResult {
  const nowMs = now.getTime();
  let eligible = 0;
  let held = 0;
  for (const p of proofs) {
    // B4 — hold exemptions take precedence over any class TTL.
    if (p.legalHold === true || p.retentionClass === 'legal_hold') {
      held += 1;
      continue;
    }
    const ttlDays = classTtlDays(p.retentionClass, config);
    if (ttlDays === null) continue; // unrecognised class — never eligible
    const createdMs = Date.parse(p.createdAt);
    if (!Number.isFinite(createdMs)) continue; // unparseable — never eligible
    if (nowMs - createdMs > ttlDays * DAY_MS) eligible += 1;
  }
  return {
    namespace: 'tatami',
    scanned: proofs.length,
    eligible,
    pruned: 0,
    held,
    dryRun: true,
    evaluatedAt: now.toISOString(),
  };
}

/**
 * Convenience wrapper: pull every persisted proof and report what WOULD expire.
 * Deletes nothing. `source` is a retention-only read surface (NOT org-scoped —
 * retention is operator housekeeping, not a tenant op).
 */
export async function sweepTatamiRetention(
  source: TatamiProofRetentionSource,
  config: TatamiRetentionConfig = loadTatamiRetentionConfig(),
  clock: () => Date = () => new Date(),
): Promise<TatamiRetentionResult> {
  const proofs = await source.listAllForRetention();
  return evaluateTatamiRetention(proofs, config, clock());
}
