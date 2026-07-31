// SPDX-License-Identifier: Apache-2.0
/**
 * AivssSummaryCard — numeric summary card for the 5-band AIVSS distribution.
 *
 * Phase G.4 / TICKET-G4-WIDGETS-API — V1→V2 Restoration program.
 *
 * Consumes the `AivssRollup` shape produced by `aggregateAivssRollup` /
 * `emptyAivssRollup` (G6). Renders a 5-row grid where each row pairs an
 * {@link AivssPill} chip with the band label and per-band count, then a
 * footer row with `totalScored`. When `totalScored === 0` an empty-state
 * line is rendered above the footer (the footer itself always shows so
 * downstream pages don't need to special-case the layout).
 *
 * Closed-enum band → label via {@link BAND_LABEL}; closed-enum band order
 * via the canonical {@link AIVSS_BANDS} export. Engineering never hand-
 * builds the 5-element list (R-T1).
 *
 * @see ADR-0097 §11 — Aggregate dashboards foundation
 * @see canvas-amendments-2026-Q2.md CA-1 — full-word band keys
 */

import type { ReactElement } from 'react';
import { AIVSS_BANDS, type AivssBand } from 'bu-tpi/aivss';
import type { AivssRollup } from 'bu-tpi/compliance/client';

import { AivssPill } from './AivssPill';
import { BAND_LABEL } from './aivss-band-constants';

// Display order: critical → high → medium → low → none (severity-descending).
// Mirrors the visual hierarchy of <AivssBandBar>; iterates closed-enum
// `AIVSS_BANDS` only to assert membership at compile time.
const ROW_ORDER: ReadonlyArray<AivssBand> = Object.freeze([
  'critical',
  'high',
  'medium',
  'low',
  'none',
] satisfies AivssBand[]);

const DEFAULT_TITLE = 'AIVSS distribution';

export interface AivssSummaryCardProps {
  readonly rollup: AivssRollup;
  readonly title?: string;
  readonly testId?: string;
  /**
   * E1-A-RB-3 (Master Plan v1.0 §4.1, founder Option A pre-fire):
   * mark the rollup as derived from operator self-attestation rather
   * than measurement. When `true`, the card renders an explicit
   * "(self-attested — not yet measured)" subtitle and the per-band
   * pills inherit `selfAttested`. Non-Bushido consumers MUST pass
   * `selfAttested={true}` until E1-PHASE-4-M4 verdict-to-run binding
   * supplies real measurement.
   */
  readonly selfAttested?: boolean;
}

export function AivssSummaryCard({
  rollup,
  title = DEFAULT_TITLE,
  testId = 'aivss-summary-card',
  selfAttested = false,
}: AivssSummaryCardProps): ReactElement {
  // Compile-time check that ROW_ORDER and AIVSS_BANDS cover the same set
  // of band keys — the type system already pins this via the `satisfies`,
  // but the runtime length pin guards against a future regression.
  const rowOrder: ReadonlyArray<AivssBand> =
    ROW_ORDER.length === AIVSS_BANDS.length ? ROW_ORDER : AIVSS_BANDS;
  const isEmpty = rollup.totalScored === 0;

  return (
    <section
      data-testid={testId}
      className="av-summary-card"
      data-empty={isEmpty ? 'true' : 'false'}
      aria-label={`${title} — total scored ${rollup.totalScored}`}
    >
      <header className="av-summary-card-head">
        <h3 data-testid={`${testId}-title`}>{title}</h3>
        {selfAttested ? (
          <p
            data-testid={`${testId}-self-attested`}
            className="av-summary-card-self-attested"
            style={{ margin: '2px 0 0', fontSize: 11, fontStyle: 'italic', opacity: 0.7 }}
          >
            (self-attested — not yet measured)
          </p>
        ) : null}
      </header>

      <ul
        className="av-summary-card-rows"
        data-testid={`${testId}-rows`}
        role="list"
      >
        {rowOrder.map((band) => (
          <li
            key={band}
            data-testid={`${testId}-row-${band}`}
            data-band={band}
            className="av-summary-card-row"
          >
            {/* D-02 / E1.S4 — explicit whitespace between the adjacent
                spans: without it the row's text content concatenates
                ("Critical3") for screen readers and text extraction. */}
            <AivssPill band={band} testId={`${testId}-pill-${band}`} selfAttested={selfAttested} />{' '}
            <span className="av-summary-card-row-label">{BAND_LABEL[band]}</span>{' '}
            <span
              className="av-summary-card-row-count"
              data-testid={`${testId}-count-${band}`}
            >
              {rollup.byBand[band]}
            </span>
          </li>
        ))}
      </ul>

      {isEmpty ? (
        <div
          className="av-summary-card-empty"
          data-testid={`${testId}-empty`}
        >
          No scored findings yet
        </div>
      ) : null}

      <footer
        className="av-summary-card-foot"
        data-testid={`${testId}-total`}
      >
        Total scored: {rollup.totalScored}
      </footer>
    </section>
  );
}
