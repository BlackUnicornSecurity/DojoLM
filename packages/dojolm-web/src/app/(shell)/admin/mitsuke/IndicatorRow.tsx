// SPDX-License-Identifier: Apache-2.0
/**
 * IndicatorRow — co-located row for the Mitsuke indicator feed table.
 *
 * Extracted from MitsukeTabs.tsx (TICKET-G3-MITSUKE pass-1 fold-in: HIGH file
 * size — host file exceeded 800-line ceiling). Contains the per-row AIVSS
 * derivation (ADR-0097 §7) so the host tab stays under cap and the row
 * concern is unit-testable in isolation.
 *
 * P2d (audit D9) — renders the design's grouped-ctable `tr.data` anatomy
 * (Type / Value / Source / AIVSS); severity is carried by the band header,
 * and self-attestation by the table footnote.
 */

import type { ReactElement } from 'react';
import { calculate, type AivssScore } from 'bu-tpi/aivss';
import { findingToAivssMetrics } from '@/lib/mitsuke/aivss-mapping';
import type { ThreatIndicator } from './MitsukeTabs';
import { INDICATOR_TYPE_LABEL } from './mitsuke-tab-data';

/**
 * ADR-0097 §7 — derive AIVSS client-side from indicator type + severity.
 * When the server begins emitting `i.aivss` directly (TICKET-G3-API), the
 * explicit field wins; otherwise we calculate. Wrapped in try/catch so a
 * malformed indicator can never crash the indicators table — callers fall
 * back to an em-dash cell. Mirrors the pattern in
 * `packages/dojolm-web/src/app/(shell)/admin/scanner/ScannerClient.tsx`.
 */
export function deriveIndicatorAivss(i: ThreatIndicator): AivssScore | null {
  if (i.aivss) return i.aivss;
  try {
    return calculate(
      findingToAivssMetrics({ type: i.type, severity: i.severity }),
    );
  } catch (err) {
    // Defensive fallback — preserves the row but flags the regression. A
    // throw here means findingToAivssMetrics or calculate broke for a shape
    // that should have been narrowed by sanitizeIndicator upstream.
    // eslint-disable-next-line no-console
    console.error('[mitsuke] AIVSS derivation failed for finding', {
      type: i.type,
      severity: i.severity,
      err,
    });
    return null;
  }
}

export interface IndicatorRowProps {
  readonly indicator: ThreatIndicator;
}

export function IndicatorRow({ indicator: i }: IndicatorRowProps): ReactElement {
  const aivss = deriveIndicatorAivss(i);
  return (
    <tr className="data" data-testid={`mitsuke-indicator-row-${i.id}`}>
      <td className="cid">{INDICATOR_TYPE_LABEL[i.type]}</td>
      <td className="val">{i.value}</td>
      <td className="src">{i.source}</td>
      <td className="num" data-testid={`mitsuke-aivss-${i.id}`}>
        {aivss !== null ? aivss.base.toFixed(1) : '—'}
      </td>
    </tr>
  );
}
