// SPDX-License-Identifier: Apache-2.0
/**
 * KotobaIssueRow — co-located row component for the Kotoba issues list
 * inside `StudioTab`.
 *
 * Extracted from KotobaTabs.tsx (TICKET-G3-KOTOBA — keeps the host file
 * comfortably below the 800-line ceiling and isolates the per-row AIVSS
 * derivation so the row concern is unit-testable in isolation; mirrors
 * the `KagamiFindingRow.tsx` (Kagami) + `IndicatorRow.tsx` (Mitsuke) +
 * `AttackToolRow.tsx` (Atemi) patterns from the prior G-3 wirings).
 *
 * Per ADR-0097 §7 — derives AIVSS client-side from the closed
 * `categoryId` + `severity` enums via `findingToAivssMetrics` +
 * `calculate`. When `/api/kotoba/score` begins emitting `issue.aivss`
 * directly (TICKET-G3-API), the server-supplied value wins over the
 * client derivation.
 *
 * Defensive try/catch — a malformed issue can never crash the list; the
 * row falls back to a `band='none'` chip and logs to the console so the
 * regression is visible in dev tools (mirrors the `KagamiFindingRow`
 * defensive pattern).
 */

'use client';

import type { ReactElement } from 'react';
import { AivssPill } from '@/design/aivss';
import { cap } from '@/design';
import { calculate, type AivssScore } from 'bu-tpi/aivss';
import { findingToAivssMetrics } from '@/lib/kotoba/aivss-mapping';

// Local label / tone maps — duplicated narrowly here (rather than
// imported from KotobaTabs.tsx) to avoid a circular import. The 3-value
// IssueSeverity enum is small enough that inlining is cheaper than a
// shared module.
const SEVERITY_LABEL = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
} as const satisfies Record<KotobaIssueSeverity, string>;

const SEVERITY_TONE = {
  high: 'red',
  medium: 'gold',
  low: 'jade',
} as const satisfies Record<KotobaIssueSeverity, 'red' | 'gold' | 'jade'>;

const NOTE_MAX = 120;

/**
 * Closed 3-value Kotoba issue severity enum, lowercase. Mirrors the
 * `IssueSeverity` declared in `lib/kotoba/rubric.ts` and re-exported
 * via `KotobaTabs.tsx`. Re-declared here to keep the row component
 * self-contained.
 */
export type KotobaIssueSeverity = 'high' | 'medium' | 'low';

/**
 * Narrow shape consumed by the row — sufficient subset of `RubricIssue`
 * to keep this component decoupled from the host client's full type.
 *
 * `categoryId` is typed as `string` (not the closed `RubricCategoryId`
 * literal union) to mirror the widened client-edge shape in
 * `KotobaTabs.tsx`'s `sanitizeIssue` (defence-in-depth). The AIVSS
 * mapper falls through to the EXPLICIT `'unknown'` kind for any value
 * outside the closed table.
 */
export interface KotobaIssueRowItem {
  readonly id: string;
  readonly severity: KotobaIssueSeverity;
  readonly title: string;
  readonly description: string;
  readonly fix: string;
  readonly categoryId: string;
  /**
   * ADR-0097 §7 — server-supplied AIVSS field (placeholder; today the
   * client derives via `findingToAivssMetrics` + `calculate` at
   * row-render time when this field is absent). When `/api/kotoba/score`
   * begins emitting `issue.aivss` directly (TICKET-G3-API), the server
   * value wins over the client derivation.
   */
  readonly aivss?: AivssScore;
}

export interface KotobaIssueRowProps {
  readonly issue: KotobaIssueRowItem;
  readonly applyDisabled: boolean;
  readonly onApply: () => void;
}

export function KotobaIssueRow({
  issue: iss,
  applyDisabled,
  onApply,
}: KotobaIssueRowProps): ReactElement {
  // ADR-0097 §7 — derive AIVSS client-side from category + severity.
  // Server-supplied `iss.aivss` wins when present (TICKET-G3-API
  // future). Wrapped in try/catch so a malformed issue can never crash
  // the list — falls back to band='none' chip + console.error for
  // diagnostics. Mirrors the pattern in `KagamiFindingRow.tsx`.
  let aivss: AivssScore | null = iss.aivss ?? null;
  if (aivss === null) {
    try {
      aivss = calculate(
        findingToAivssMetrics({
          category: iss.categoryId,
          severity: iss.severity,
        }),
      );
    } catch (err) {
      // Defensive fallback — preserves the row but flags the regression.
      // A throw here means findingToAivssMetrics or calculate broke for
      // a shape that should have been narrowed by sanitizeIssue
      // upstream.
      // eslint-disable-next-line no-console
      console.error('[kotoba] AIVSS derivation failed for issue', {
        categoryId: iss.categoryId,
        severity: iss.severity,
        err,
      });
      aivss = null;
    }
  }

  return (
    <div
      role="listitem"
      data-testid={`kotoba-issue-${iss.id}`}
      style={{
        display: 'grid',
        gridTemplateColumns: '90px 1fr 110px 140px',
        gap: 8,
        alignItems: 'center',
        padding: '8px 6px',
        borderTop: '1px solid var(--b-1, #222)',
      }}
    >
      <span
        className={`chip ${SEVERITY_TONE[iss.severity]}`}
        aria-label={`Severity ${SEVERITY_LABEL[iss.severity].toLowerCase()}`}
      >
        {SEVERITY_LABEL[iss.severity]}
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <strong style={{ fontSize: 12 }}>{iss.title}</strong>
        <span className="wb-hint" style={{ fontSize: 11 }}>{iss.description}</span>
        <span className="wb-hint" style={{ fontSize: 11 }}>
          Fix: {iss.fix}
        </span>
      </div>
      <span>
        {aivss !== null ? (
          <AivssPill
            band={aivss.severity}
            score={aivss.base}
            testId={`kotoba-aivss-pill-${iss.id}`}
          />
        ) : (
          <AivssPill band="none" testId={`kotoba-aivss-pill-${iss.id}`} />
        )}
      </span>
      <button
        type="button"
        data-testid={`kotoba-apply-fix-${iss.id}`}
        className="btn"
        onClick={onApply}
        disabled={applyDisabled}
        aria-label={`Apply hardening for issue ${cap(iss.title, NOTE_MAX)}`}
      >
        Apply hardening
      </button>
    </div>
  );
}
