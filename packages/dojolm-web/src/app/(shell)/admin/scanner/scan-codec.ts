// SPDX-License-Identifier: Apache-2.0
/**
 * scan-codec — HAGANE E2.S2a (pre-req split: ScannerClient was 885 LOC,
 * already over the 800 cap, BEFORE the history UI lands in E2.S2b).
 *
 * Pure module: ScannerClient's wire types, response sanitizers, and
 * closed display maps, moved verbatim (zero behavior change — the
 * scanner test family must pass unmodified). Discriminant-redaction +
 * closed-map discipline notes live in ScannerClient's header.
 *
 * Type-only imports from `@/design` are erased at compile time (no
 * runtime barrel cost on darwin — R7).
 */

import type {
  AttackRowStatus,
  EncodingChainKind,
  EncodingChainStep,
  RefusalDepthBar,
  FeedTagKind,
  Severity as FeedSeverity,
  SevStripLevel,
} from '@/design';
import type { AivssScore } from 'bu-tpi/aivss';

export type Severity = 'INFO' | 'WARNING' | 'CRITICAL';
export type Verdict = 'BLOCK' | 'ALLOW';

// Issue #349 fold-in (post-train) — discriminated `ScanErrorCode` union
// + closed `SCAN_ERROR_COPY` map. Replaces the prior `error: string | null`
// state shape so every banner string is sourced from a closed-map lookup
// instead of a stringly-typed `cap(error, 200)`. R-T1 closed-map
// discipline mirrors the pattern applied to KagamiClient / MitsukeClient
// / KotobaClient under YR.19.
export type ScanErrorCode =
  | 'input-empty'
  | 'input-too-long'
  | 'scan-unavailable'
  | 'network';

export const SCAN_ERROR_COPY: Record<ScanErrorCode, string> = {
  'input-empty': 'Enter scan target text',
  'input-too-long': 'Scan input over 10,000 characters',
  'scan-unavailable': 'Scan unavailable',
  network: 'Network error',
};

export interface Finding {
  readonly category: string;
  readonly severity: Severity;
  readonly description: string;
  readonly match: string;
  readonly engine: string;
  /**
   * Optional AIVSS score per ADR-0097 §7. Server may emit later (TICKET-G3-API);
   * for now the client derives via `findingToAivssMetrics` + `calculate`.
   * If absent and derivation also fails, the row falls back to band 'none'.
   */
  readonly aivss?: AivssScore;
}

export interface ScanCounts {
  readonly critical: number;
  readonly warning: number;
  readonly info: number;
}

export interface ScanResponse {
  readonly findings: readonly Finding[];
  readonly verdict: Verdict;
  readonly elapsed: number;
  readonly textLength: number;
  readonly counts: ScanCounts;
  // YR.18 / G-021 + G-022 — optional enrichment fields. Server may not
  // populate either today; the UI renders the visualization only when
  // present, EmptyState otherwise.
  readonly encodingChain?: readonly EncodingChainStep[];
  readonly refusalDepth?: readonly RefusalDepthBar[];
  /** HAGANE E2.S1a — persisted run id (additive server key); the
   *  deep-link target for the history panel. */
  readonly runId?: string;
}

const ENCODING_KINDS: ReadonlySet<EncodingChainKind> = new Set([
  'plaintext',
  'base64',
  'hex',
  'url',
  'unicode',
  'rot13',
  'html',
  'unknown',
]);

function isEncodingKind(v: unknown): v is EncodingChainKind {
  return typeof v === 'string' && ENCODING_KINDS.has(v as EncodingChainKind);
}

function sanitizeEncodingChain(raw: unknown): readonly EncodingChainStep[] {
  if (!Array.isArray(raw)) return [];
  const out: EncodingChainStep[] = [];
  for (const item of raw.slice(0, 16)) {
    if (!item || typeof item !== 'object') continue;
    const r = item as Record<string, unknown>;
    if (!isEncodingKind(r.kind)) continue;
    const detail = typeof r.detail === 'string' ? r.detail : undefined;
    out.push(detail !== undefined ? { kind: r.kind, detail } : { kind: r.kind });
  }
  return out;
}

function sanitizeRefusalDepth(raw: unknown): readonly RefusalDepthBar[] {
  if (!Array.isArray(raw)) return [];
  const out: RefusalDepthBar[] = [];
  for (const item of raw.slice(0, 32)) {
    if (!item || typeof item !== 'object') continue;
    const r = item as Record<string, unknown>;
    if (typeof r.module !== 'string') continue;
    const depth = typeof r.depth === 'number' && Number.isFinite(r.depth) ? Math.max(0, Math.trunc(r.depth)) : 0;
    out.push({ module: r.module, depth });
  }
  return out;
}

export function isSeverity(v: unknown): v is Severity {
  return v === 'INFO' || v === 'WARNING' || v === 'CRITICAL';
}

export function isVerdict(v: unknown): v is Verdict {
  return v === 'BLOCK' || v === 'ALLOW';
}

function safeNum(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function sanitizeFinding(raw: unknown): Finding | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.category !== 'string') return null;
  if (typeof r.description !== 'string') return null;
  if (typeof r.match !== 'string') return null;
  if (typeof r.engine !== 'string') return null;
  if (!isSeverity(r.severity)) return null;
  return {
    category: r.category,
    severity: r.severity,
    description: r.description,
    match: r.match,
    engine: r.engine,
  };
}

export function sanitizeScanResponse(raw: unknown): ScanResponse | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (!isVerdict(r.verdict)) return null;
  const counts = (r.counts && typeof r.counts === 'object') ? r.counts as Record<string, unknown> : {};
  const findings: Finding[] = [];
  if (Array.isArray(r.findings)) {
    for (const raw of r.findings) {
      const f = sanitizeFinding(raw);
      if (f) findings.push(f);
    }
  }
  const encodingChain = sanitizeEncodingChain(r.encodingChain);
  const refusalDepth = sanitizeRefusalDepth(r.refusalDepth);
  return {
    findings,
    verdict: r.verdict,
    elapsed: safeNum(r.elapsed),
    textLength: safeNum(r.textLength),
    counts: {
      critical: safeNum(counts.critical),
      warning: safeNum(counts.warning),
      info: safeNum(counts.info),
    },
    ...(encodingChain.length > 0 ? { encodingChain } : {}),
    ...(refusalDepth.length > 0 ? { refusalDepth } : {}),
    ...(typeof r.runId === 'string' && /^r-[a-z0-9]+-[0-9a-f]{10}$/.test(r.runId)
      ? { runId: r.runId }
      : {}),
  };
}

export interface HistoryEntry {
  readonly id: string;
  readonly ts: string;
  readonly verdict: Verdict;
  readonly findings: number;
  readonly elapsedMs: number;
  readonly engine: string;
  readonly preview: string;
}

export const SEVERITY_TO_SEV_LEVEL: Record<Severity, SevStripLevel> = {
  CRITICAL: 'crit',
  WARNING: 'med',
  INFO: 'low',
};

export const SEVERITY_TO_STATUS: Record<Severity, AttackRowStatus> = {
  CRITICAL: 'fail',
  WARNING: 'open',
  INFO: 'pass',
};

export const VERDICT_LABEL: Record<Verdict, string> = {
  BLOCK: 'BLOCK',
  ALLOW: 'ALLOW',
};

export const VERDICT_TONE: Record<Verdict, 'red' | 'jade'> = {
  BLOCK: 'red',
  ALLOW: 'jade',
};

export const VERDICT_TO_FEED_KIND: Record<Verdict, FeedTagKind> = {
  BLOCK: 'block',
  ALLOW: 'log',
};

export const VERDICT_TO_FEED_SEV: Record<Verdict, FeedSeverity> = {
  BLOCK: 'high',
  ALLOW: 'low',
};
