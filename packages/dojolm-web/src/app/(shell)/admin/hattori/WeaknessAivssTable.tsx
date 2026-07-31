// SPDX-License-Identifier: Apache-2.0
/**
 * WeaknessAivssTable — co-located row table for the Hattori hardening
 * weaknesses surface.
 *
 * Phase G.3 / TICKET-G3-HATTORI — V1→V2 Restoration program (thirteenth
 * G.3 surface).
 *
 * Mirrors the row-decoration pattern used by sister G-3 surfaces
 * (`AttackToolRow.tsx` for Atemi, `IndicatorRow.tsx` for Mitsuke). The
 * Hattori host (`HattoriClient.tsx`) renders {@link HardeningWeakness}
 * rows via the shared `<RegressionLog>` primitive, which has no native
 * AIVSS chip slot — modifying it would be cross-cutting (~12 consumers).
 * Instead this component renders a SIBLING chip table next to the log
 * so the descriptive feed stays untouched while the AIVSS signal lands
 * on the same surface.
 *
 * Per ADR-0097 §7 — derives AIVSS client-side from the closed
 * `severity` enum via `findingToAivssMetrics` + `calculate`. When
 * `/api/guard/hardening` begins emitting `weakness.aivss` directly
 * (TICKET-G3-API), the server-supplied value wins over the client
 * derivation.
 *
 * Defensive try/catch — a malformed weakness can never crash the
 * table; the row falls back to a `band='none'` chip and logs to the
 * console so the regression is visible in dev tools (mirrors the
 * Atemi / Mitsuke / Kagami row defensive pattern).
 *
 * @see packages/dojolm-web/src/lib/hattori/aivss-mapping.ts
 * @see packages/dojolm-web/src/app/(shell)/admin/atemi/AttackToolRow.tsx
 * @see packages/dojolm-web/src/app/(shell)/admin/mitsuke/IndicatorRow.tsx
 */

import type { ReactElement } from 'react';
import { AivssPill } from '@/design/aivss';
import { calculate, type AivssScore } from 'bu-tpi/aivss';
import {
  findingToAivssMetrics,
  type HattoriSeverity,
} from '@/lib/hattori/aivss-mapping';

/**
 * Narrow weakness shape consumed by this row table. Mirrors the
 * sanitized {@link HardeningWeakness} shape from `HattoriClient.tsx`
 * (severity is the input the AIVSS mapping consumes; id + description
 * drive the row labels).
 *
 * Re-declared here (not imported) to keep the row component
 * decoupled from the host's internal shape — the host can evolve
 * its `HardeningWeakness` interface without breaking this row.
 * The host narrows its values into this shape when constructing
 * the row props.
 */
export interface WeaknessAivssRow {
  readonly id: string;
  readonly severity: HattoriSeverity;
  readonly description: string;
}

/**
 * Cap label maps for closed-enum severity. Used in aria-labels so the
 * R-T1 closed-map discipline holds (zero `as` casts; severity values
 * flow through a closed map before reaching the DOM).
 */
const SEVERITY_LABEL: Readonly<Record<HattoriSeverity, string>> = Object.freeze({
  critical: 'CRITICAL',
  high: 'HIGH',
  medium: 'MEDIUM',
  low: 'LOW',
});

export interface WeaknessAivssTableProps {
  readonly weaknesses: readonly WeaknessAivssRow[];
  readonly testId?: string;
}

export function WeaknessAivssTable({
  weaknesses,
  testId = 'hattori-weakness-aivss-table',
}: WeaknessAivssTableProps): ReactElement {
  return (
    <table
      data-testid={testId}
      className="yr4-table"
      aria-label="Hattori weakness AIVSS scores"
    >
      <thead>
        <tr>
          <th scope="col">Weakness</th>
          <th scope="col">Severity</th>
          <th scope="col">AIVSS</th>
        </tr>
      </thead>
      <tbody>
        {weaknesses.map((w) => (
          <WeaknessAivssRow key={w.id} weakness={w} />
        ))}
      </tbody>
    </table>
  );
}

interface WeaknessAivssRowProps {
  readonly weakness: WeaknessAivssRow;
}

function WeaknessAivssRow({ weakness: w }: WeaknessAivssRowProps): ReactElement {
  // ADR-0097 §7 — derive AIVSS client-side from severity. Wrapped in
  // try/catch so a malformed weakness can never crash the table —
  // falls back to band='none' chip + console.error for diagnostics.
  // Mirrors the pattern in
  // `packages/dojolm-web/src/app/(shell)/admin/atemi/AttackToolRow.tsx`.
  let aivss: AivssScore | null = null;
  try {
    aivss = calculate(findingToAivssMetrics({ severity: w.severity }));
  } catch (err) {
    // Defensive fallback — preserves the row but flags the regression.
    // A throw here means findingToAivssMetrics or calculate broke for a
    // shape that should have been narrowed by sanitizeWeakness upstream.
    // eslint-disable-next-line no-console
    console.error('[hattori] AIVSS derivation failed for weakness', {
      severity: w.severity,
      err,
    });
    aivss = null;
  }

  return (
    <tr data-testid={`hattori-weakness-row-${w.id}`}>
      <td>{w.description}</td>
      <td>
        <span aria-label={`Severity ${SEVERITY_LABEL[w.severity]}`}>
          {SEVERITY_LABEL[w.severity]}
        </span>
      </td>
      <td>
        {aivss !== null ? (
          <AivssPill
            band={aivss.severity}
            score={aivss.base}
            testId={`hattori-aivss-pill-${w.id}`}
          />
        ) : (
          <AivssPill
            band="none"
            testId={`hattori-aivss-pill-${w.id}`}
          />
        )}
      </td>
    </tr>
  );
}
