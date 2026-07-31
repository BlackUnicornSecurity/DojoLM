// SPDX-License-Identifier: Apache-2.0
/**
 * Retention reaper — purges rows whose age exceeds the plan §0.3
 * retention window for their data class.
 *
 * Consumes `DSR_RETENTION_DAYS` (per-class day counts shipped in #136).
 * Each class provides a `RetentionReapableStore` that knows how to
 * delete rows older than a cutoff timestamp; the reaper orchestrates
 * the six calls and aggregates per-class results.
 *
 * Error policy: one class failing does not halt the reap — the failing
 * class's error is captured in its result and the loop continues so a
 * single transient failure does not leak expired rows across the
 * remaining classes.
 *
 * The plan's retain-7y classes (BudgetLedger, OnigaeshiAuditRecord)
 * still have a 7y ceiling after which records may be purged per
 * retention matrix; this reaper honours that ceiling. DSR-triggered
 * pseudonymisation inside the window is handled separately by the DSR
 * cascade (#134), not here.
 */

import { DSR_RETENTION_DAYS, type DsrDataClass } from './retention-constants.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface RetentionReapableStore {
  readonly dataClass: DsrDataClass;
  /**
   * Delete rows whose canonical timestamp (row-creation or
   * period-start, per class convention) is strictly before `cutoffISO`.
   * Returns the number of rows deleted.
   */
  deleteOlderThan(cutoffISO: string): Promise<number>;
}

export interface RetentionReapResult {
  readonly dataClass: DsrDataClass;
  readonly cutoffISO: string;
  readonly deleted: number;
  readonly error?: string;
}

export interface RunRetentionReapOptions {
  /** Map of DataClass → store. Missing classes are reported as skipped. */
  readonly stores: Partial<Record<DsrDataClass, RetentionReapableStore>>;
  /** Clock override for tests. Defaults to `new Date()`. */
  readonly now?: () => Date;
  /** Per-class retention override (days). Defaults to `DSR_RETENTION_DAYS`. */
  readonly retentionDays?: Readonly<Record<DsrDataClass, number>>;
}

const ALL_CLASSES: readonly DsrDataClass[] = [
  'HydraTranscript',
  'Match',
  'ProbeOutcome',
  'CommunitySubmission',
  'BudgetLedger',
  'OnigaeshiAuditRecord',
];

/** Compute the cutoff ISO timestamp for a given class at a given clock. */
export function cutoffFor(
  dataClass: DsrDataClass,
  now: Date = new Date(),
  retentionDays: Readonly<Record<DsrDataClass, number>> = DSR_RETENTION_DAYS,
): string {
  const days = retentionDays[dataClass];
  if (days === undefined) {
    throw new RangeError(`No retention days for data class "${dataClass}"`);
  }
  return new Date(now.getTime() - days * MS_PER_DAY).toISOString();
}

/**
 * Run the retention reaper across every class that has a supplied
 * store. Classes without a store return `{ deleted: 0 }` with a
 * `skipped` marker in the error field so callers can distinguish
 * missing wiring from zero-rows-matched.
 */
export async function runRetentionReap(
  opts: RunRetentionReapOptions,
): Promise<readonly RetentionReapResult[]> {
  const now = opts.now ?? (() => new Date());
  const retention = opts.retentionDays ?? DSR_RETENTION_DAYS;
  const results: RetentionReapResult[] = [];

  for (const cls of ALL_CLASSES) {
    const store = opts.stores[cls];
    const cutoffISO = cutoffFor(cls, now(), retention);

    if (!store) {
      results.push({ dataClass: cls, cutoffISO, deleted: 0, error: 'no-store' });
      continue;
    }

    try {
      const deleted = await store.deleteOlderThan(cutoffISO);
      results.push({ dataClass: cls, cutoffISO, deleted });
    } catch (err) {
      results.push({
        dataClass: cls,
        cutoffISO,
        deleted: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// In-memory reference implementation
// ---------------------------------------------------------------------------

interface TimestampedRow {
  readonly id: string;
  readonly createdAt: string;
}

export class InMemoryReapableStore implements RetentionReapableStore {
  readonly dataClass: DsrDataClass;
  private rows: TimestampedRow[] = [];

  constructor(dataClass: DsrDataClass) {
    this.dataClass = dataClass;
  }

  seed(row: TimestampedRow): void {
    this.rows = [...this.rows, { ...row }];
  }

  rowCount(): number {
    return this.rows.length;
  }

  async deleteOlderThan(cutoffISO: string): Promise<number> {
    const before = this.rows.length;
    this.rows = this.rows.filter((r) => r.createdAt >= cutoffISO);
    return before - this.rows.length;
  }
}
