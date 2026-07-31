// SPDX-License-Identifier: Apache-2.0
/**
 * scan-runs/types — HAGANE E2.S1a.
 *
 * Persistent scan-run records: the operator's scan history. Closes
 * audit finding C3 (scan results were ephemeral in-memory UI state —
 * no IDs, no history, no deep links). Findings here are bounded
 * SUMMARIES for triage/history; the full request payload is already
 * captured by the WORM evidence wrap on /api/scan (ADR-0098 H-6) and
 * is NOT duplicated.
 */

export interface ScanRunFinding {
  /** Stable within the run: sha256-derived from run id + engine +
   *  category + pattern + sequence. Deep-link target (`?findingId=`). */
  readonly id: string;
  readonly seq: number;
  readonly severity: string;
  readonly category: string;
  readonly engine: string;
  readonly description: string;
  /** Matched excerpt, capped — full payload lives in WORM evidence. */
  readonly match: string;
  readonly patternName?: string;
}

export interface ScanRunRecord {
  readonly id: string;
  /** RFC-3339 UTC. */
  readonly ts: string;
  /** Hashed operator id (the audit-log-safe form — never a raw bearer). */
  readonly operator: string;
  readonly durationMs: number;
  readonly textLength: number;
  /** Engines explicitly requested by the caller; null = scanner default set. */
  readonly enginesRequested: readonly string[] | null;
  readonly severityCounts: Readonly<Record<string, number>>;
  /** Bounded list (MAX_PERSISTED_FINDINGS); findingsTotal is pre-cap. */
  readonly findings: readonly ScanRunFinding[];
  readonly findingsTotal: number;
}

export interface ScanRunSummary {
  readonly id: string;
  readonly ts: string;
  readonly operator: string;
  readonly durationMs: number;
  readonly severityCounts: Readonly<Record<string, number>>;
  readonly findingsTotal: number;
}

export interface ScanRunsStore {
  /** Best-effort append — callers fire-and-forget; failures must never
   *  break the scan response (mirrors emitScannerFindings posture). */
  append(record: ScanRunRecord): Promise<void>;
  /** Newest-first summaries. `before` = exclusive run-id cursor. */
  list(opts: { limit: number; before?: string }): Promise<readonly ScanRunSummary[]>;
  getById(id: string): Promise<ScanRunRecord | null>;
}

export function toSummary(r: ScanRunRecord): ScanRunSummary {
  return {
    id: r.id,
    ts: r.ts,
    operator: r.operator,
    durationMs: r.durationMs,
    severityCounts: r.severityCounts,
    findingsTotal: r.findingsTotal,
  };
}
