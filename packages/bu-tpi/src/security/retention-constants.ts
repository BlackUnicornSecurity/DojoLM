// SPDX-License-Identifier: Apache-2.0
/**
 * Retention-period constants per DSR data class (plan §0.3).
 *
 * Single source of truth for how long each data class is retained before
 * auto-purge or DSR-triggered deletion. Imported by:
 *  - DSR cascade (`packages/bu-tpi/src/compliance/dsr.ts`, issue #134)
 *  - Gap 8 wire-format redaction (plan amendment §7.1)
 *  - Any future retention-aware code
 *
 * Values mirror plan §0.3 "Data-retention matrix" exactly. Do not edit
 * without updating the plan row in the same commit.
 *
 * Reference: the industry-tools parity implementation plan §0.3
 */

import type { DsrDataClass } from '../compliance/dsr.js';

// Re-export so callers have a single import point for class + constants.
export type { DsrDataClass } from '../compliance/dsr.js';

const DAYS_PER_YEAR = 365;

/** 7 years — legal-defensibility retention used for audit + billing classes. */
export const SEVEN_YEARS_DAYS = 7 * DAYS_PER_YEAR;

/**
 * Retention period in days, per `DsrDataClass`.
 *
 * Design notes:
 * - `HydraTranscript` uses the plan default (90d). The 30d member-owned
 *   override is applied at query time based on ownership, not here.
 * - `Match` and `ProbeOutcome` fall under the plan's transcript/probe
 *   delete-raw group with GDPR 30d SLA. We conservatively pick the
 *   shorter probe retention (30d) for `ProbeOutcome` since probe
 *   screenshots drive it, and the transcript retention (90d) for
 *   `Match` since matches carry full conversation history.
 * - `CommunitySubmission` uses the rejected-submission retention (30d);
 *   approved submissions keep only the hash per the cascade spec, and
 *   that hash is not gated by this constant.
 * - `BudgetLedger` + `OnigaeshiAuditRecord` are audit/legal classes
 *   retained for 7y.
 */
export const DSR_RETENTION_DAYS: Readonly<Record<DsrDataClass, number>> = {
  // Plan §0.3: "Refusal-loop transcripts (Gap 4 HydraTranscript) | 90d default"
  HydraTranscript: 90,
  // Plan §0.3: grouped with transcripts in cascade spec; carries same turn
  // history scope as HydraTranscript, so the transcript default applies.
  Match: 90,
  // Plan §0.3: "Probe screenshots (Gap 3) | 30d". ProbeOutcome is the row
  // gated by this class — cookies are session-only and never persisted raw.
  ProbeOutcome: 30,
  // Plan §0.3: "Community submissions | Indefinite if approved; 30d if
  // rejected". Approved submissions are hash-only (not subject to this
  // constant); this value gates the rejected-submission raw payload.
  CommunitySubmission: 30,
  // Plan §0.3: "Budget ledger | 7y (billing/audit)"
  BudgetLedger: SEVEN_YEARS_DAYS,
  // Plan §0.3: "Unaligned-attacker audit logs (Gap 6) | 7y (legal
  // defensibility)". OnigaeshiAuditRecord is the concrete record type.
  OnigaeshiAuditRecord: SEVEN_YEARS_DAYS,
};

/**
 * Lookup helper that returns the retention period for a given class.
 * Throws if the class is unknown — guards against silent drift when the
 * `DsrDataClass` union grows without a corresponding retention entry.
 */
export function retentionDaysFor(dataClass: DsrDataClass): number {
  const value = DSR_RETENTION_DAYS[dataClass];
  if (value === undefined) {
    throw new RangeError(
      `No retention period defined for DsrDataClass="${dataClass}". ` +
        'Update DSR_RETENTION_DAYS in security/retention-constants.ts.',
    );
  }
  return value;
}
