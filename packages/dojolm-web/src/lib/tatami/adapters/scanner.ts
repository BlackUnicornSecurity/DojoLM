// SPDX-License-Identifier: Apache-2.0
/**
 * tatami/adapters/scanner — maps a persisted scanner run into a Tatami proof (OSS).
 *
 * The thesis slice: `Scanner finding → Proof → customer-safe receipt`. This adapter
 * reads the bounded `ScanRunRecord` (scan-runs history) ONLY. It MUST NOT dereference
 * the WORM `EvidenceRecord` — that raw, sealed payload is the EE `tatami-vault`
 * surface (`raw_sealed`) and is off-limits from an OSS context.
 *
 * Pure + deterministic: no I/O, no clock, no secrets. Trust is intentionally floored
 * at draft/local — the adapter anchors nothing; the receipt layer adds the B7 chain.
 */

import type { ScanRunFinding, ScanRunRecord } from '../../scan-runs/types';
import { classifyReplaySafety } from '../replay-safety';
import type {
  TatamiProof,
  TatamiRedactedPreview,
  TatamiSourceAdapter,
  TatamiTraceEvent,
} from '../types';

/**
 * Replay-safety for a scanner proof — a CONSTANT (Epic 6 / P2.1). The scan
 * record stores `textLength` only, never the scanned text, so there is no prompt
 * snapshot to replay: the classifier returns `not_replayable` /
 * `missing_prompt_snapshot`. The scanner is not a model (no model-config), and
 * `attack_technique` previews do not redact-cap the verdict (the operative
 * payload is stripped at export, not by refusing replay). None of these signals
 * depend on the record, so the verdict is hoisted out of `toProof`.
 */
const SCANNER_REPLAY_SAFETY = classifyReplaySafety({
  hasPromptSnapshot: false,
  maturity: 'live',
  reproducibility: 'deterministic',
  redactionClasses: ['attack_technique'],
});

/** Highest-severity-first ranking; unknown severities rank lowest (0). */
const SEVERITY_RANK: Readonly<Record<string, number>> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

/** The most severe severity with a non-zero count, or undefined when none. */
function topSeverity(counts: Readonly<Record<string, number>>): string | undefined {
  let best: string | undefined;
  let bestRank = -1;
  for (const [severity, count] of Object.entries(counts)) {
    if (typeof count !== 'number' || count <= 0) continue;
    const rank = SEVERITY_RANK[severity.toLowerCase()] ?? 0;
    if (rank > bestRank) {
      best = severity;
      bestRank = rank;
    }
  }
  return best;
}

function buildSummary(record: ScanRunRecord): string {
  const engines =
    record.enginesRequested && record.enginesRequested.length > 0
      ? record.enginesRequested.join(', ')
      : 'default engine set';
  const severity = topSeverity(record.severityCounts ?? {});
  const severityPart = severity ? `, top severity ${severity}` : '';
  return `${record.findingsTotal ?? 0} finding(s) over ${record.textLength ?? 0} chars via ${engines}${severityPart}.`;
}

/**
 * Customer-safe, pseudonymous previews. Each finding is referenced by its already
 * salted, run-scoped `id` (sha256 of run+engine+category+pattern+seq) — pseudonymous,
 * NEVER "anonymous" (GDPR Recital 26). The raw matched excerpt is withheld and the
 * `attack_technique` class is recorded, so the operative payload is never exposed.
 */
function buildPreviews(findings: readonly ScanRunFinding[]): TatamiRedactedPreview[] {
  return findings.map((finding) => {
    const ref = typeof finding.id === 'string' ? finding.id.slice(0, 12) : 'unknown';
    const pattern = finding.patternName ? ` · ${finding.patternName}` : '';
    return {
      tier: 'customer_safe',
      text: `finding ${ref} · ${finding.severity}/${finding.category} · ${finding.engine}${pattern}`,
      applied: ['attack_technique'],
    };
  });
}

export const scannerAdapter: TatamiSourceAdapter<ScanRunRecord> = {
  module: 'scanner',

  toProof(record: ScanRunRecord): Partial<TatamiProof> {
    const runId = typeof record.id === 'string' && record.id.length > 0 ? record.id : undefined;
    const severity = topSeverity(record.severityCounts ?? {});
    const findingsTotal = typeof record.findingsTotal === 'number' ? record.findingsTotal : 0;

    return {
      source: {
        module: 'scanner',
        route: '/api/scan',
        ...(runId ? { runId } : {}),
      },
      title: runId
        ? `Scan ${runId} — ${findingsTotal} finding(s)`
        : `Scan — ${findingsTotal} finding(s)`,
      summary: buildSummary(record),
      ...(severity ? { severity } : {}),
      previews: buildPreviews(record.findings ?? []),
      maturity: 'live',
      // Floored: the adapter anchors nothing. The receipt layer adds the B7 chain.
      trustState: 'draft',
      trustTier: 'local',
      // Scanner is deterministic pattern-matching.
      reproducibility: 'deterministic',
      // Honest replay state, derived by the classifier (see SCANNER_REPLAY_SAFETY).
      replaySafety: SCANNER_REPLAY_SAFETY.safety,
      replaySafetyReasons: SCANNER_REPLAY_SAFETY.reasons,
      retentionClass: 'standard',
      legalHold: false,
      capturedBy: typeof record.operator === 'string' ? record.operator : 'unknown',
      createdAt: typeof record.ts === 'string' ? record.ts : '',
    };
  },

  toTrace(record: ScanRunRecord): readonly TatamiTraceEvent[] {
    // No event stream exists for a scan — synthesize the single execution event.
    const runId = typeof record.id === 'string' && record.id.length > 0 ? record.id : 'unknown';
    const findingsTotal = typeof record.findingsTotal === 'number' ? record.findingsTotal : 0;
    return [
      {
        id: `${runId}:scanner.executed`,
        ts: typeof record.ts === 'string' ? record.ts : '',
        type: 'scanner.executed',
        level: findingsTotal > 0 ? 'warn' : 'info',
        source: 'scanner',
        message: `Scanner executed: ${findingsTotal} finding(s) over ${record.textLength ?? 0} chars in ${record.durationMs ?? 0}ms`,
        details: {
          findingsTotal,
          durationMs: record.durationMs ?? 0,
          textLength: record.textLength ?? 0,
          engines: record.enginesRequested ? record.enginesRequested.length : 0,
        },
      },
    ];
  },
};
