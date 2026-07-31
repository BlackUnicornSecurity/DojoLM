// SPDX-License-Identifier: Apache-2.0
/**
 * Style + geometry constants for `<ThreatRadarWidget>` — extracted out
 * of `ThreatRadarWidget.tsx` so the primitive stays under the ≤200-line
 * ceiling per project CLAUDE.md.
 *
 * P5 prod-parity (2026-07-18): the radar is now a FILLED HEXAGON that
 * reproduces `wave-a/Workbench v2.html:112-130` exactly — three grid
 * hexagons, three through-axes, a single steel data polygon, and six
 * full-word mono axis labels. Geometry constants are the design's own
 * SVG coordinates (viewBox `-36 0 264 176`, hex circumradius 62 about
 * centre 95,88). Color tokens via `var(--*)` only — zero inline hex.
 */

import type { CSSProperties } from "react";
// Type-only import — erased at compile time, so no runtime import cycle
// with the widget (which imports these geometry values back).
import type { ThreatRadarSector } from "./ThreatRadarWidget";

/** Design viewBox — reproduced verbatim from Workbench v2.html:112. */
export const RADAR_VIEWBOX = "-36 0 264 176";

/** Hexagon centre (design: vertical axis x=95, y-span 26..150 → 88). */
export const RADAR_CENTER = Object.freeze({ x: 95, y: 88 });

/**
 * Outer-hexagon vertex per sector, clockwise from top (Workbench
 * v2.html:114 outer polygon). The data polygon interpolates each vertex
 * between `RADAR_CENTER` (0 detections) and this point (saturated).
 */
export const RADAR_OUTER: Readonly<Record<ThreatRadarSector, { x: number; y: number }>> =
  Object.freeze({
    memory: { x: 95, y: 26 },
    prompts: { x: 149, y: 57 },
    tools: { x: 149, y: 119 },
    injection: { x: 95, y: 150 },
    governance: { x: 41, y: 119 },
    agents: { x: 41, y: 57 },
  });

/** Three concentric grid hexagons (Workbench v2.html:114-116) — verbatim. */
export const RADAR_GRID_RINGS: readonly string[] = Object.freeze([
  "95,26 149,57 149,119 95,150 41,119 41,57",
  "95,47 131,68 131,108 95,129 59,108 59,68",
  "95,68 113,78 113,98 95,108 77,98 77,78",
]);

/** Three through-axes (Workbench v2.html:117-119). */
export const RADAR_AXES: readonly {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}[] = Object.freeze([
  { x1: 95, y1: 26, x2: 95, y2: 150 },
  { x1: 41, y1: 57, x2: 149, y2: 119 },
  { x1: 149, y1: 57, x2: 41, y2: 119 },
]);

/** Full-word axis labels + placement (Workbench v2.html:122-129). */
export const RADAR_AXIS_LABELS: readonly {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly anchor: "start" | "middle" | "end";
}[] = Object.freeze([
  { text: "MEMORY", x: 95, y: 16, anchor: "middle" },
  { text: "PROMPTS", x: 160, y: 54, anchor: "start" },
  { text: "TOOLS", x: 160, y: 126, anchor: "start" },
  { text: "INJECTION", x: 95, y: 166, anchor: "middle" },
  { text: "GOVERNANCE", x: 30, y: 126, anchor: "end" },
  { text: "AGENTS", x: 30, y: 54, anchor: "end" },
]);

/**
 * Data-polygon points string. Each vertex is interpolated from centre
 * toward its outer vertex by detection intensity (`min(count/3, 1)` —
 * matches the V1 saturation curve). Zero detections collapse the vertex
 * to centre → an honest empty radar (grid only).
 */
export function radarPlotPoints(
  counts: Readonly<Record<ThreatRadarSector, number>>,
  order: readonly ThreatRadarSector[],
): string {
  return order
    .map((s) => {
      const intensity = Math.min((counts[s] ?? 0) / 3, 1);
      const o = RADAR_OUTER[s];
      const x = RADAR_CENTER.x + intensity * (o.x - RADAR_CENTER.x);
      const y = RADAR_CENTER.y + intensity * (o.y - RADAR_CENTER.y);
      return `${Math.round(x * 100) / 100},${Math.round(y * 100) / 100}`;
    })
    .join(" ");
}

export const ROOT_STYLE: CSSProperties = Object.freeze({
  border: "1px solid var(--b-2)",
  borderRadius: 6,
  padding: 16,
  background: "var(--bg-1)",
  minHeight: 280,
  display: "flex",
  flexDirection: "column",
  gap: 8,
});

// Panel header row — title + sub INLINE (audit D5 / P5; the design's
// `.p-hd` renders `<h3>` and `.sub` on one baseline, not stacked).
export const HEAD_ROW_STYLE: CSSProperties = Object.freeze({
  display: "flex",
  alignItems: "baseline",
  gap: 10,
  flexWrap: "wrap",
});

// Sentence-case panel title (Inter 600 ~15px) — panel headers are NOT
// mono-caps (audit D5; Workbench v2.html:110).
export const KICKER_STYLE: CSSProperties = Object.freeze({
  fontSize: 15.5, // design .p-hd h3 (15.5/600/-0.02em)
  letterSpacing: "-0.02em",
  fontWeight: 600,
  color: "var(--fg)",
  margin: 0,
});

// Header sub — "Six pillars · last 7 days" (Workbench v2.html:110), inline.
export const SUB_STYLE: CSSProperties = Object.freeze({
  fontSize: 12.5,
  color: 'var(--fg-ghost)' /* design .p-hd .sub */,
  margin: 0,
});

export const RADAR_WRAP_STYLE: CSSProperties = Object.freeze({
  display: "flex",
  gap: 18,
  alignItems: "center",
  flexWrap: "wrap",
});

export const SVG_WRAP_STYLE: CSSProperties = Object.freeze({
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 220,
});

export const SVG_STYLE: CSSProperties = Object.freeze({
  width: "100%",
  maxWidth: 323,
  height: "auto",
  overflow: "visible",
});

// Six-row legend beside the radar (Workbench v2.html:131-138).
export const LEGEND_STYLE: CSSProperties = Object.freeze({
  display: "flex",
  flexDirection: "column",
  gap: 6,
  fontSize: 12.5,
  color: "var(--fg-dim)",
});

export const LEGEND_ROW_STYLE: CSSProperties = Object.freeze({
  display: "flex",
  alignItems: "center",
  gap: 9,
});

// Interactive variant — the legend row doubles as the sector-filter
// affordance (the design radar has no clickable wedges). Styled to read
// as plain text so the render is pixel-identical to the static legend.
export const LEGEND_ROW_BUTTON_STYLE: CSSProperties = Object.freeze({
  ...LEGEND_ROW_STYLE,
  appearance: "none",
  border: "none",
  background: "none",
  padding: 0,
  margin: 0,
  font: "inherit",
  color: "inherit",
  textAlign: "left",
  cursor: "pointer",
  width: "100%",
});

// Mono code stub — MEM/PRM/… (Workbench v2.html:132 `.radar-legend .k`,
// var(--fg-mute), 28px column, mono micro-label class).
export const LEGEND_CODE_STYLE: CSSProperties = Object.freeze({
  fontFamily: "var(--mono)",
  fontSize: 11,
  color: "var(--fg-mute)",
  letterSpacing: "0.08em",
  minWidth: 28,
});
