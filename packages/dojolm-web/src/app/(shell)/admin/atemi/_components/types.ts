// SPDX-License-Identifier: Apache-2.0
/**
 * /admin/atemi shared types — extracted from page.tsx in Atemi-PR-3 to
 * keep the 800-LOC cap. These shapes mirror the API responses; only the
 * fields surfaced in the page UI are typed here.
 */

export interface TosRecord {
  readonly vendor: string;
  readonly targetId: string;
  readonly state: 'pending' | 'attested' | 'active';
  readonly operatorId?: string;
  readonly updatedAt: string;
}

export interface ListResponse {
  readonly records?: readonly TosRecord[];
  readonly error?: string;
}

export type StateFilter = 'all' | 'pending' | 'attested' | 'active';

export interface ProbeTupleResult {
  readonly vendor: string;
  readonly targetId: string;
  readonly status: 'started' | 'skipped' | 'error';
  readonly probeStatus?:
    | 'success'
    | 'refused'
    | 'timeout'
    | 'budget-denied'
    | 'error';
  readonly elapsedMs: number;
  readonly reason?: string;
}

export interface ProbeFleetResponse {
  readonly ok: boolean;
  readonly started: number;
  readonly skipped: number;
  readonly errors: number;
  readonly results: readonly ProbeTupleResult[];
  readonly durationMs: number;
}

export interface ProbeHistoryEntry {
  readonly ts: string;
  readonly started: number;
  readonly skipped: number;
  readonly errors: number;
  readonly durationMs: number;
}

export interface McpStatusResponse {
  readonly connected?: boolean;
  readonly enabled?: boolean;
  readonly latency?: number;
  readonly server?: {
    readonly mode?: string;
    readonly uptime?: number;
    readonly running?: boolean;
  };
  readonly lastError?: string;
}

export interface FleetSummary {
  readonly active: number;
  readonly attested: number;
  readonly pending: number;
  readonly total: number;
}
