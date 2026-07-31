// SPDX-License-Identifier: Apache-2.0
/**
 * SenseiFindingRow — co-located row component for the Sensei chat
 * tool-result findings list.
 *
 * Extracted from SenseiToolResult.tsx (TICKET-G3-SENSEI — keeps the host
 * client below the 800-line ceiling and isolates the per-row AIVSS
 * derivation so the row concern is unit-testable in isolation; mirrors
 * the `WorkbenchFindingRow.tsx` (Shingan) + `BukiSeedRow.tsx` (Buki) +
 * `KagamiFindingRow.tsx` (Kagami) + `AttackToolRow.tsx` (Atemi) +
 * `IndicatorRow.tsx` (Mitsuke) patterns from the prior G-3 wirings).
 *
 * Per ADR-0097 §7 — derives AIVSS client-side from the closed
 * `category` (8-value `SenseiCategory` enum at the server edge,
 * widened to `string` at the client edge for defence-in-depth) +
 * `severity` (closed 3-value `'INFO' | 'WARNING' | 'CRITICAL'` enum)
 * inputs via `findingToAivssMetrics` + `calculate`. When the
 * Sensei-dispatched scan responses begin emitting `finding.aivss`
 * directly (TICKET-G3-API), the server-supplied value wins over the
 * client derivation.
 *
 * Defensive try/catch — a malformed finding can never crash the chat
 * tool-result panel; the row falls back to a `band='none'` chip and
 * logs to the console so the regression is visible in dev tools.
 */

'use client';

import type { ReactElement } from 'react';
import { AivssPill } from '@/design/aivss';
import { calculate, type AivssScore } from 'bu-tpi/aivss';
import {
  findingToAivssMetrics,
  type SenseiSeverity,
} from '@/lib/sensei/aivss-mapping';

/**
 * Closed-enum CSS class table for the severity chip. Mirrors the
 * inline `cn(...)` palette in the existing `renderScanResult`
 * (severity-count pill row above), kept as a frozen `Record` per the
 * R-T1 immutability discipline shared with the sister G-3 row
 * components.
 *
 * `UNKNOWN` is the EXPLICIT slot for a `severity` string that bypasses
 * the closed `SenseiSeverity` enum (defence-in-depth for the wire-shape
 * coercion in the host file's `severityCounts` loop) — NOT a silent
 * default.
 */
type SeverityClassKey = SenseiSeverity | 'UNKNOWN';

const SEVERITY_CHIP_CLASS: Readonly<Record<SeverityClassKey, string>> =
  Object.freeze({
    CRITICAL: 'bg-red-500/20 text-red-400',
    WARNING: 'bg-amber-500/20 text-amber-400',
    INFO: 'bg-blue-500/20 text-blue-400',
    UNKNOWN: 'bg-gray-500/20 text-gray-400',
  });

const SEVERITY_LABEL: Readonly<Record<SeverityClassKey, string>> =
  Object.freeze({
    CRITICAL: 'CRITICAL',
    WARNING: 'WARNING',
    INFO: 'INFO',
    UNKNOWN: 'UNKNOWN',
  });

/**
 * Coerce a wire-shape `severity` string into the closed
 * {@link SeverityClassKey} for chip-class lookup. Returns `'UNKNOWN'`
 * for any value outside the closed `SenseiSeverity` enum (defence-in-
 * depth for the chat tool-result wire-coercion layer).
 */
function classifySeverity(severity: string): SeverityClassKey {
  if (severity === 'CRITICAL' || severity === 'WARNING' || severity === 'INFO') {
    return severity;
  }
  return 'UNKNOWN';
}

/**
 * Coerce a wire-shape `severity` string into the closed `SenseiSeverity`
 * enum for AIVSS-mapper consumption. Returns `null` when the wire shape
 * does not narrow to the closed enum — the calling site treats `null` as
 * "skip AIVSS derivation, render band='none'" (mirrors the
 * defence-in-depth fallback in the sister G-3 row components).
 */
function narrowSenseiSeverity(severity: string): SenseiSeverity | null {
  if (severity === 'CRITICAL' || severity === 'WARNING' || severity === 'INFO') {
    return severity;
  }
  return null;
}

/**
 * Narrow shape consumed by the row — sufficient subset of the wire
 * shape rendered by `renderScanResult` in `SenseiToolResult.tsx`. The
 * `category` field is widened to `string` here to mirror the
 * client-edge sanitization layer (the server-side
 * `/api/sensei/generate` route enforces the closed `SenseiCategory`
 * enum; `'unknown'` is the explicit fallback in the AIVSS mapper for
 * any value that bypasses the server gate).
 *
 * `severity` is also widened to `string` to mirror the existing
 * coercion in the host file's `severityCounts` loop (the wire shape
 * may carry a `severity` string outside the closed
 * `SenseiSeverity` enum; the row narrows to the closed enum via
 * {@link narrowSenseiSeverity} for AIVSS-mapper consumption).
 */
export interface SenseiFindingLite {
  readonly category: string;
  readonly severity: string;
  readonly description?: string;
  /**
   * ADR-0097 §7 — server-supplied AIVSS field (placeholder; today the
   * client derives via `findingToAivssMetrics` + `calculate` at
   * row-render time when this field is absent). When the
   * Sensei-dispatched scan responses begin emitting `finding.aivss`
   * directly (TICKET-G3-API), the server value wins over the client
   * derivation.
   */
  readonly aivss?: AivssScore;
}

export interface SenseiFindingRowProps {
  readonly finding: SenseiFindingLite;
  readonly index: number;
}

export function SenseiFindingRow({
  finding: f,
  index,
}: SenseiFindingRowProps): ReactElement {
  const severityKey = classifySeverity(f.severity);
  const narrowSeverity = narrowSenseiSeverity(f.severity);

  // ADR-0097 §7 — derive AIVSS client-side from category + severity.
  // Server-supplied `f.aivss` wins when present (TICKET-G3-API future).
  // Wrapped in try/catch so a malformed finding can never crash the
  // chat tool-result panel — falls back to band='none' chip +
  // console.error for diagnostics. Mirrors the pattern in
  // `packages/dojolm-web/src/app/(shell)/admin/buki/BukiSeedRow.tsx`.
  let aivss: AivssScore | null = f.aivss ?? null;
  if (aivss === null && narrowSeverity !== null) {
    try {
      aivss = calculate(
        findingToAivssMetrics({
          category: f.category,
          severity: narrowSeverity,
        }),
      );
    } catch (err) {
      // Defensive fallback — preserves the row but flags the regression.
      // A throw here means findingToAivssMetrics or calculate broke for a
      // shape that should have been narrowed upstream.
      // eslint-disable-next-line no-console
      console.error('[sensei] AIVSS derivation failed for finding', {
        category: f.category,
        severity: f.severity,
        err,
      });
      aivss = null;
    }
  }

  const testIdSuffix = `${index}`;

  return (
    <div
      role="row"
      data-testid={`sensei-finding-row-${testIdSuffix}`}
      className="flex items-center gap-2 text-xs"
      style={{
        padding: '4px 0',
        borderTop: '1px solid var(--border-subtle, #222)',
      }}
    >
      <span
        role="cell"
        className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${SEVERITY_CHIP_CLASS[severityKey]}`}
        aria-label={`Severity ${SEVERITY_LABEL[severityKey]}`}
      >
        {SEVERITY_LABEL[severityKey]}
      </span>
      <span
        role="cell"
        className="text-[var(--text-secondary)] truncate"
        aria-label={`Category ${f.category}`}
        style={{ minWidth: 120 }}
      >
        {f.category}
      </span>
      <span role="cell">
        {aivss !== null ? (
          <AivssPill
            band={aivss.severity}
            score={aivss.base}
            testId={`sensei-aivss-pill-${testIdSuffix}`}
          />
        ) : (
          <AivssPill
            band="none"
            testId={`sensei-aivss-pill-${testIdSuffix}`}
          />
        )}
      </span>
      {f.description ? (
        <span
          role="cell"
          className="text-[var(--text-tertiary)] truncate flex-1"
          style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {f.description}
        </span>
      ) : null}
    </div>
  );
}
