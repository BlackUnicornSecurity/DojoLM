// SPDX-License-Identifier: Apache-2.0
/**
 * scan-runs/record — HAGANE E2.S1a. Pure builder: scanner output →
 * persisted ScanRunRecord. No I/O; unit-tested.
 */

import { createHash } from 'node:crypto';
import type { ScanRunFinding, ScanRunRecord } from './types';

/** Findings persisted per run (history/triage summary cap — the UI
 *  paginates; the pre-cap total is recorded honestly). */
export const MAX_PERSISTED_FINDINGS = 200;
/** Free-text field cap (description / match excerpt). */
export const MAX_TEXT_FIELD = 500;
const MAX_ENGINES = 32;
const MAX_FIELD_SHORT = 120;

/** Strip control / format / line-separator chars (log-injection + bidi
 *  hygiene — same character classes the sibling stores reject). */
function sanitize(value: string, cap: number): string {
  // eslint-disable-next-line no-control-regex
  const cleaned = value.replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, ' ');
  return cleaned.length > cap ? `${cleaned.slice(0, cap - 1)}…` : cleaned;
}

export interface ScannerFindingInput {
  readonly category: string;
  readonly severity: string;
  readonly description: string;
  readonly match: string;
  readonly engine: string;
  readonly pattern_name?: string;
}

export interface BuildScanRunInput {
  readonly findings: readonly ScannerFindingInput[];
  readonly operator: string;
  readonly durationMs: number;
  readonly textLength: number;
  readonly enginesRequested: readonly string[] | null;
  /** Injected for determinism in tests; callers pass `new Date()`. */
  readonly now: Date;
  /** sha256 hex of the scanned text (computed by the route; the raw
   *  text itself is never persisted here — WORM evidence owns it). */
  readonly textSha256: string;
}

function findingId(runId: string, f: ScannerFindingInput, seq: number): string {
  return createHash('sha256')
    .update(`${runId}|${f.engine}|${f.category}|${f.pattern_name ?? ''}|${seq}`)
    .digest('hex')
    .slice(0, 16);
}

export function buildScanRunRecord(input: BuildScanRunInput): ScanRunRecord {
  const ts = input.now.toISOString();
  const id = `r-${input.now.getTime().toString(36)}-${createHash('sha256')
    .update(`${ts}|${input.operator}|${input.textSha256}`)
    .digest('hex')
    .slice(0, 10)}`;

  const severityCounts: Record<string, number> = {};
  for (const f of input.findings) {
    const sev = sanitize(f.severity, MAX_FIELD_SHORT) || 'UNKNOWN';
    severityCounts[sev] = (severityCounts[sev] ?? 0) + 1;
  }

  const findings: ScanRunFinding[] = input.findings
    .slice(0, MAX_PERSISTED_FINDINGS)
    .map((f, seq) => ({
      id: findingId(id, f, seq),
      seq,
      severity: sanitize(f.severity, MAX_FIELD_SHORT) || 'UNKNOWN',
      category: sanitize(f.category, MAX_FIELD_SHORT),
      engine: sanitize(f.engine, MAX_FIELD_SHORT),
      description: sanitize(f.description, MAX_TEXT_FIELD),
      match: sanitize(f.match, MAX_TEXT_FIELD),
      ...(f.pattern_name !== undefined
        ? { patternName: sanitize(f.pattern_name, MAX_FIELD_SHORT) }
        : {}),
    }));

  return {
    id,
    ts,
    operator: sanitize(input.operator, MAX_FIELD_SHORT),
    durationMs: Math.max(0, Math.round(input.durationMs)),
    textLength: Math.max(0, Math.round(input.textLength)),
    enginesRequested:
      input.enginesRequested === null
        ? null
        : input.enginesRequested
            .slice(0, MAX_ENGINES)
            .map((e) => sanitize(e, MAX_FIELD_SHORT)),
    severityCounts,
    findings,
    findingsTotal: input.findings.length,
  };
}

/** Read-side row guard — drops malformed JSONL rows (defense-in-depth,
 *  mirrors the sibling stores' validate-on-read posture). */
export function isScanRunRecord(v: unknown): v is ScanRunRecord {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.id === 'string'
    && /^r-[a-z0-9]+-[0-9a-f]{10}$/.test(r.id)
    && typeof r.ts === 'string'
    && typeof r.operator === 'string'
    && typeof r.durationMs === 'number'
    && typeof r.textLength === 'number'
    && (r.enginesRequested === null || Array.isArray(r.enginesRequested))
    && typeof r.severityCounts === 'object'
    && r.severityCounts !== null
    && Array.isArray(r.findings)
    && typeof r.findingsTotal === 'number'
  );
}
