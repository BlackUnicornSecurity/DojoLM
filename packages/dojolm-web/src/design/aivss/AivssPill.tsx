// SPDX-License-Identifier: Apache-2.0
/**
 * AivssPill — compact severity-band pill (band label, optional score).
 *
 * Phase G.2 / TICKET-G2 — V1→V2 Restoration program.
 *
 * Closed-enum band → CSS class via {@link BAND_CSS_KEY}; engineering NEVER
 * hand-types the `'med'` / `'crit'` shorteners (CA-1 rule).
 *
 * @see ADR-0097 §2 — Severity bands
 * @see canvas-amendments-2026-Q2.md CA-1 — full-word band keys
 */

import type { ReactElement } from 'react';
import { BAND_CSS_KEY, type AivssBand } from 'bu-tpi/aivss';

const BAND_LABEL: Readonly<Record<AivssBand, string>> = Object.freeze({
  none: 'NONE',
  low: 'LOW',
  medium: 'MEDIUM',
  high: 'HIGH',
  critical: 'CRITICAL',
});

export interface AivssPillProps {
  readonly band: AivssBand;
  readonly score?: number;
  readonly testId?: string;
  /**
   * E1-A-RB-3 (Master Plan v1.0 §4.1, founder Option A pre-fire):
   * mark the rendered AIVSS chip as derived from operator
   * self-attestation rather than measurement. When `true`, the chip
   * appends an italicised "self-attested" subscript and the aria-label
   * states the provenance explicitly. Non-Bushido consumers that
   * derive AIVSS scores from operator-set safetyRisk / verdict
   * checklists MUST pass `selfAttested={true}` until real measurement
   * arrives via E1-PHASE-4-M4 verdict-to-run binding.
   */
  readonly selfAttested?: boolean;
  /**
   * HAGANE E1.S6 (audit: empty-ledger honesty): when `true` the control
   * has NO recorded verdict — render a neutral "— PENDING" pill instead
   * of a severity claim. Unassessed is NOT the same as `none` severity
   * (which reads as "no risk"); `band`/`score` are ignored.
   */
  readonly pending?: boolean;
}

export function AivssPill({
  band,
  score,
  testId = 'aivss-pill',
  selfAttested = false,
  pending = false,
}: AivssPillProps): ReactElement {
  if (pending) {
    return (
      <span
        data-testid={testId}
        className={`av-band ${BAND_CSS_KEY.none}`}
        aria-label="AIVSS pending — no verdict recorded yet"
        title="No verdict recorded — not yet assessed"
        data-pending="true"
      >
        — PENDING
      </span>
    );
  }
  const cssClass = BAND_CSS_KEY[band];
  const label = BAND_LABEL[band];
  const text = typeof score === 'number' ? `${label} · ${score.toFixed(1)}` : label;
  const ariaLabel = selfAttested
    ? `AIVSS severity ${label} (self-attested, not measured)`
    : `AIVSS severity ${label}`;
  return (
    <span
      data-testid={testId}
      className={`av-band ${cssClass}`}
      aria-label={ariaLabel}
      data-self-attested={selfAttested ? 'true' : 'false'}
    >
      {text}
      {selfAttested ? (
        <span
          className="av-band-self-attested"
          data-testid={`${testId}-self-attested`}
          style={{ marginLeft: 4, fontStyle: 'italic', opacity: 0.7, fontSize: '0.85em' }}
        >
          (self-attested)
        </span>
      ) : null}
    </span>
  );
}
