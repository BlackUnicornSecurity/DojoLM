// SPDX-License-Identifier: Apache-2.0
/**
 * ThreatRadarWidget — TICKET-D-208 Workbench widget primitive.
 *
 * Renders the V2.1 `/console` "Threat radar" — a FILLED HEXAGON radar
 * reproducing `wave-a/Workbench v2.html:109-139` exactly: three grid
 * hexagons, three through-axes, one steel data polygon, six full-word
 * mono axis labels (MEMORY / PROMPTS / TOOLS / INJECTION / GOVERNANCE /
 * AGENTS), and a six-row legend (MEM / PRM / AGT / TLS / INJ / GOV).
 *
 * Pure presentational — receives per-sector counts as props. No fetches,
 * no contexts, no state. The live consumer (`<ThreatRadarWidgetLive>`)
 * derives counts from `useScanner().scanResult.findings` via the
 * `ENGINE_TO_SECTOR` closed map and passes them down.
 *
 * P5 note (2026-07-18): the design radar has no clickable wedges, so the
 * optional sector-filter affordance moved to the legend rows — each row
 * is a `<button>` when `onSectorClick` is supplied, styled to read as
 * plain text (render is pixel-identical to the static legend). This also
 * clears the old nested-interactive axe finding: the SVG is now purely
 * presentational (`role="img"`), the buttons live outside it.
 *
 * Closed-enum discipline (R-T1 §10.16): all sector ids, labels, short
 * codes, and descriptions route through frozen closed maps. Color tokens
 * are `var(--*)` references only — zero inline hex.
 */

'use client';

import { type ReactElement } from 'react';
import {
  RADAR_VIEWBOX,
  RADAR_GRID_RINGS,
  RADAR_AXES,
  RADAR_AXIS_LABELS,
  radarPlotPoints,
  ROOT_STYLE,
  HEAD_ROW_STYLE,
  KICKER_STYLE,
  SUB_STYLE,
  RADAR_WRAP_STYLE,
  SVG_WRAP_STYLE,
  SVG_STYLE,
  LEGEND_STYLE,
  LEGEND_ROW_STYLE,
  LEGEND_ROW_BUTTON_STYLE,
  LEGEND_CODE_STYLE,
} from './ThreatRadarWidget.styles';

/**
 * Six sectors in SVG clockwise order (top → upper-right → … ) so their
 * index maps to the outer-hexagon vertex sequence in
 * `RADAR_OUTER` / the data polygon.
 */
export const THREAT_RADAR_SECTORS = Object.freeze([
  'memory',
  'prompts',
  'tools',
  'injection',
  'governance',
  'agents',
] as const);

export type ThreatRadarSector = (typeof THREAT_RADAR_SECTORS)[number];

/**
 * Legend render order (Workbench v2.html:132-137) — MEM, PRM, AGT, TLS,
 * INJ, GOV. Deliberately NOT the clockwise SVG order.
 */
export const THREAT_RADAR_LEGEND_ORDER: readonly ThreatRadarSector[] =
  Object.freeze([
    'memory',
    'prompts',
    'agents',
    'tools',
    'injection',
    'governance',
  ]);

export const THREAT_RADAR_SECTOR_LABEL: Readonly<Record<ThreatRadarSector, string>> =
  Object.freeze({
    memory: 'Memory',
    prompts: 'Prompts',
    tools: 'Tools',
    injection: 'Injection',
    governance: 'Governance',
    agents: 'Agents',
  });

// Three-letter legend codes (Workbench v2.html:132-137).
export const THREAT_RADAR_SECTOR_SHORT: Readonly<Record<ThreatRadarSector, string>> =
  Object.freeze({
    memory: 'MEM',
    prompts: 'PRM',
    tools: 'TLS',
    injection: 'INJ',
    governance: 'GOV',
    agents: 'AGT',
  });

// Legend copy (Workbench v2.html:132-137). One line per sector.
export const THREAT_RADAR_SECTOR_DESC: Readonly<Record<ThreatRadarSector, string>> =
  Object.freeze({
    memory: 'Memory poisoning attempts',
    prompts: 'Prompt-layer attacks',
    tools: 'Tool-call abuse',
    injection: 'Direct injection',
    governance: 'Policy violations',
    agents: 'Agent misdirection',
  });

const WIDGET_KICKER = 'Threat radar';
const WIDGET_SUB = 'Six pillars · last 7 days';
const WIDGET_ARIA_LABEL = 'Threat Radar widget';

export type ThreatRadarSectorCounts = Readonly<Record<ThreatRadarSector, number>>;

export interface ThreatRadarWidgetProps {
  readonly counts: ThreatRadarSectorCounts;
  readonly onSectorClick?: (sector: ThreatRadarSector) => void;
  readonly testId?: string;
}

export function ThreatRadarWidget(props: ThreatRadarWidgetProps): ReactElement {
  const { counts, onSectorClick, testId } = props;
  const resolvedTestId = testId ?? 'workbench-widget-threat-radar';
  const total = THREAT_RADAR_SECTORS.reduce((sum, s) => sum + (counts[s] ?? 0), 0);
  const plotPoints = radarPlotPoints(counts, THREAT_RADAR_SECTORS);

  return (
    <div role="region" aria-label={WIDGET_ARIA_LABEL} data-testid={resolvedTestId} style={ROOT_STYLE}>
      <div style={HEAD_ROW_STYLE}>
        <h3 style={KICKER_STYLE}>{WIDGET_KICKER}</h3>
        <span style={SUB_STYLE}>{WIDGET_SUB}</span>
      </div>
      <div style={RADAR_WRAP_STYLE}>
        <div style={SVG_WRAP_STYLE}>
          <svg
            viewBox={RADAR_VIEWBOX}
            role="img"
            aria-label={`${WIDGET_ARIA_LABEL}: ${total} detections across ${THREAT_RADAR_SECTORS.length} pillars`}
            style={SVG_STYLE}
          >
            {/* Grid hexagons + through-axes (Workbench v2.html:113-119). */}
            <g stroke="var(--b-1)" fill="none">
              {RADAR_GRID_RINGS.map((points) => (
                <polygon key={points} points={points} />
              ))}
              {RADAR_AXES.map((a) => (
                <line key={`${a.x1}-${a.y1}-${a.x2}-${a.y2}`} x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2} />
              ))}
            </g>
            {/* Steel data polygon (Workbench v2.html:121) — fill 0.18 alpha
                via token opacity, no inline rgba. */}
            <polygon
              points={plotPoints}
              fill="var(--steel)"
              fillOpacity={0.18}
              stroke="var(--steel)"
              strokeWidth={1.5}
              data-testid={`${resolvedTestId}-plot`}
            />
            {/* Full-word mono axis labels (Workbench v2.html:122-129). */}
            <g fontFamily="var(--mono)" fontSize={9} fill="var(--fg-mute)" letterSpacing="0.08em" aria-hidden="true">
              {RADAR_AXIS_LABELS.map((l) => (
                <text key={l.text} x={l.x} y={l.y} textAnchor={l.anchor}>
                  {l.text}
                </text>
              ))}
            </g>
          </svg>
        </div>
        {/* Six-row legend (Workbench v2.html:131-138) — code + description.
            Interactive (button) when a sector-filter handler is supplied. */}
        <div style={LEGEND_STYLE} data-testid={`${resolvedTestId}-legend`}>
          {THREAT_RADAR_LEGEND_ORDER.map((sector) => {
            const detections = counts[sector] ?? 0;
            const code = THREAT_RADAR_SECTOR_SHORT[sector];
            const desc = THREAT_RADAR_SECTOR_DESC[sector];
            const rowTestId = `${resolvedTestId}-legend-${sector}`;
            if (onSectorClick) {
              return (
                <button
                  key={sector}
                  type="button"
                  style={LEGEND_ROW_BUTTON_STYLE}
                  data-testid={rowTestId}
                  onClick={() => onSectorClick(sector)}
                  aria-label={`${THREAT_RADAR_SECTOR_LABEL[sector]}: ${desc} — ${detections} detections`}
                >
                  <span style={LEGEND_CODE_STYLE}>{code}</span>
                  <span>{desc}</span>
                </button>
              );
            }
            return (
              <div key={sector} style={LEGEND_ROW_STYLE} data-testid={rowTestId}>
                <span style={LEGEND_CODE_STYLE}>{code}</span>
                <span>{desc}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
