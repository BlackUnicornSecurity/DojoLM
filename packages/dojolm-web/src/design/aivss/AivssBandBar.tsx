// SPDX-License-Identifier: Apache-2.0
/**
 * AivssBandBar — pure SVG horizontal stacked bar of the 5-band AIVSS distribution.
 *
 * Phase G.4 / TICKET-G4-WIDGETS-API — V1→V2 Restoration program.
 *
 * Consumes the `AivssRollup` shape produced by `aggregateAivssRollup` /
 * `emptyAivssRollup` (G6). The bar renders 5 segments in band-order
 * (critical → high → medium → low → none) with widths proportional to
 * `byBand[band] / totalScored`. When no records have been scored,
 * a single neutral-fill rectangle is rendered with a "No scored findings"
 * label so the primitive always occupies the same visual footprint.
 *
 * Closed-enum band → CSS color token via {@link BAND_FILL}; engineering
 * never hand-types a hex literal (R-T1).
 *
 * @see ADR-0097 §11 — Aggregate dashboards foundation
 * @see canvas-amendments-2026-Q2.md CA-1 — full-word band keys
 */

import type { ReactElement } from 'react';
import { AIVSS_BANDS, type AivssBand } from 'bu-tpi/aivss';
import type { AivssRollup } from 'bu-tpi/compliance/client';

import { BAND_LABEL } from './aivss-band-constants';

// ───────────────────────────────────────────────────────────────────────────────
// Closed-enum maps — single source of truth for fills + labels.
// `var(--*)` color tokens only; no hex literals (R-T1).
// `var(--fg-mute)` for the `none` bucket aligns with the existing token
// vocabulary (`fg-mute` is the neutral "ghost" foreground).
// ───────────────────────────────────────────────────────────────────────────────

const BAND_FILL: Readonly<Record<AivssBand, string>> = Object.freeze({
  // D-02 / SKIN-SPEC §1.4 severity ramp (wave-b/module.css:38-42):
  // crit fills use the text-safe --torii-text tier (raw --torii is
  // reserved for the chrome-red moment), high uses --ember — the legacy
  // --sev-high tier is retired on v2 surfaces.
  none: 'var(--fg-mute)',
  low: 'var(--steel)',
  medium: 'var(--gold)',
  high: 'var(--ember)',
  critical: 'var(--torii-text)',
} satisfies Record<AivssBand, string>);

// Render order: critical → high → medium → low → none (left-to-right).
// Locked here because `AIVSS_BANDS` is none-low-medium-high-critical and the
// visualization spec wants severity descending.
const RENDER_ORDER: ReadonlyArray<AivssBand> = Object.freeze([
  'critical',
  'high',
  'medium',
  'low',
  'none',
] satisfies AivssBand[]);

// Bar geometry — token-driven box. SVG viewBox is unitless; consumer CSS
// can resize via the wrapping <div>.
const BAR_VIEW_WIDTH = 1000;
const BAR_VIEW_HEIGHT = 32;

export interface AivssBandBarProps {
  readonly rollup: AivssRollup;
  readonly testId?: string;
  readonly ariaLabel?: string;
}

/**
 * Build the human-readable distribution string used as the SVG <title>
 * (hover + screenreader exposition). Iterates `AIVSS_BANDS` so the order
 * stays in lock-step with the canonical band declaration; the visual bar
 * uses a separate descending render order.
 */
function buildDistributionTitle(rollup: AivssRollup): string {
  if (rollup.totalScored === 0) {
    return 'AIVSS distribution: no scored findings';
  }
  const parts: string[] = [];
  for (const band of AIVSS_BANDS) {
    parts.push(`${BAND_LABEL[band]}: ${rollup.byBand[band]}`);
  }
  return `AIVSS distribution — ${parts.join(' · ')} (total ${rollup.totalScored})`;
}

export function AivssBandBar({
  rollup,
  testId = 'aivss-band-bar',
  ariaLabel,
}: AivssBandBarProps): ReactElement {
  const isEmpty = rollup.totalScored === 0;
  const titleText = buildDistributionTitle(rollup);
  const resolvedAriaLabel = ariaLabel ?? titleText;

  // Empty state — render a single neutral rectangle + the "No scored findings"
  // label. Keeps the visual footprint stable so callers don't need to reflow.
  if (isEmpty) {
    return (
      <div data-testid={testId} className="av-bandbar av-bandbar-empty">
        <svg
          viewBox={`0 0 ${BAR_VIEW_WIDTH} ${BAR_VIEW_HEIGHT}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={resolvedAriaLabel}
          style={{ width: '100%', height: BAR_VIEW_HEIGHT, display: 'block' }}
        >
          <title>{titleText}</title>
          <rect
            x={0}
            y={0}
            width={BAR_VIEW_WIDTH}
            height={BAR_VIEW_HEIGHT}
            fill={BAND_FILL.none}
            opacity={0.35}
          />
        </svg>
        <div className="av-bandbar-legend" data-testid={`${testId}-legend`}>
          No scored findings
        </div>
      </div>
    );
  }

  // Populated state — emit one <rect> per band in descending render order
  // with width proportional to its share of `totalScored`. We use the
  // unitless view-width so the SVG can be stretched by the caller.
  // Cursor accumulator threaded via reduce (immutable — no mid-map mutation).
  const totalScored = Math.max(1, rollup.totalScored);
  const { segments } = RENDER_ORDER.reduce<{
    readonly segments: ReadonlyArray<{
      readonly band: AivssBand;
      readonly count: number;
      readonly x: number;
      readonly width: number;
    }>;
    readonly cursor: number;
  }>(
    ({ segments, cursor }, band) => {
      const count = rollup.byBand[band];
      const width = (count / totalScored) * BAR_VIEW_WIDTH;
      return {
        segments: [...segments, { band, count, x: cursor, width }],
        cursor: cursor + width,
      };
    },
    { segments: [], cursor: 0 },
  );

  return (
    <div data-testid={testId} className="av-bandbar">
      <svg
        viewBox={`0 0 ${BAR_VIEW_WIDTH} ${BAR_VIEW_HEIGHT}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={resolvedAriaLabel}
        style={{ width: '100%', height: BAR_VIEW_HEIGHT, display: 'block' }}
      >
        <title>{titleText}</title>
        {segments.map(({ band, count, x, width }) => (
          <rect
            key={band}
            data-testid={`${testId}-segment-${band}`}
            data-band={band}
            data-count={count}
            x={x}
            y={0}
            width={width}
            height={BAR_VIEW_HEIGHT}
            fill={BAND_FILL[band]}
          />
        ))}
      </svg>
      <div className="av-bandbar-legend" data-testid={`${testId}-legend`}>
        {RENDER_ORDER.map((band, idx) => (
          <span
            key={band}
            data-testid={`${testId}-legend-${band}`}
            className="av-bandbar-legend-chip"
          >
            {idx > 0 ? ' · ' : null}
            {BAND_LABEL[band]}: {rollup.byBand[band]}
          </span>
        ))}
      </div>
    </div>
  );
}
