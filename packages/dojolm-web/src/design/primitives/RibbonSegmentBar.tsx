// SPDX-License-Identifier: Apache-2.0
import { cap, capOpt } from './_caps';

export type RibbonSegmentTone =
  | 'jade'
  | 'steel'
  | 'gold'
  | 'red'
  | 'violet'
  | 'mute';

export interface RibbonSegmentBarSegment {
  /** Optional stable id — preferred over array index for reorder-safe lists. */
  readonly id?: string;
  /** Mono label rendered in the legend (e.g. "ALLOW", "BLOCK", "REVIEW"). */
  label: string;
  /** Numeric weight — segment width = (value / total) × 100%. */
  value: number;
  /** Color swatch driving `.ribbon-segbar-seg.<tone>` and the legend swatch. */
  tone: RibbonSegmentTone;
}

export interface RibbonSegmentBarProps {
  /** Caller-defined segments. Capped at RIBBON_SEGMENT_BAR_MAX_SEGS. */
  segs: RibbonSegmentBarSegment[];
  /** Optional accessible label override; falls back to a static-mapped summary. */
  ariaLabel?: string;
  /** Toggle the legend row below the bar. Default: true. */
  legend?: boolean;
}

/** Defensive cap on segments — UI envelope is ~6 categories max. */
export const RIBBON_SEGMENT_BAR_MAX_SEGS = 16;

const LABEL_MAX = 32;
const ARIA_LABEL_MAX = 200;

const TONE_LABEL: Record<RibbonSegmentTone, string> = {
  jade: 'jade',
  steel: 'steel',
  gold: 'gold',
  red: 'red',
  violet: 'violet',
  mute: 'mute',
};

/**
 * Generic segmented summary bar — sibling to the closed-kind `Ribbon`
 * primitive (which is locked to pass/warn/fail/block). RibbonSegmentBar
 * accepts caller-defined segment labels + tones for cross-module
 * categorisation summaries (Sengoku campaign mix, Kotoba prompt-tone
 * distribution, etc.).
 *
 * Closed-union props (`tone` per segment) participate in the bar's
 * aria-label summary and are therefore indexed via the static
 * `TONE_LABEL` map — never spliced as raw `${seg.tone}`. A runtime
 * widening (`as RibbonSegmentTone`) cannot leak attacker-controlled
 * text into the AT layer.
 *
 * Naming-disambiguation: `Ribbon` exists in `primitives/Ribbon.tsx`
 * with a fixed kind union. This sibling adds a generic-segment variant
 * without breaking the Ribbon contract or its consumers.
 */
export function RibbonSegmentBar({
  segs,
  ariaLabel,
  legend = true,
}: RibbonSegmentBarProps) {
  const safeSegs = segs.slice(0, RIBBON_SEGMENT_BAR_MAX_SEGS).map((s) => ({
    id: s.id,
    label: cap(s.label, LABEL_MAX),
    value: Number.isFinite(s.value) ? Math.max(0, s.value) : 0,
    tone: s.tone,
  }));
  const total = safeSegs.reduce((acc, s) => acc + s.value, 0) || 1;
  const fallbackSummary = safeSegs
    .map((s) => `${TONE_LABEL[s.tone]} ${s.label} ${s.value}`)
    .join(', ');
  // Apply ARIA_LABEL_MAX to BOTH branches: the explicit override AND the
  // auto-generated fallback. With MAX_SEGS=16 + LABEL_MAX=32 the fallback
  // can otherwise reach ~900 chars, which AT consumers may silently
  // truncate or discard. cap() keeps the AT layer payload bounded.
  const summary =
    capOpt(ariaLabel, ARIA_LABEL_MAX) ?? cap(fallbackSummary, ARIA_LABEL_MAX);
  return (
    <div className="ribbon-segbar-wrap">
      <div className="ribbon-segbar" role="img" aria-label={summary}>
        {safeSegs.map((s, i) => (
          <span
            key={s.id ?? `${s.label}-${i}`}
            className={`ribbon-segbar-seg ${s.tone}`}
            style={{ width: `${(s.value / total) * 100}%` }}
            aria-hidden="true"
          />
        ))}
      </div>
      {legend && safeSegs.length > 0 && (
        <ul className="ribbon-segbar-legend" role="list">
          {safeSegs.map((s, i) => (
            <li key={s.id ?? `${s.label}-${i}`}>
              <i className={`ribbon-segbar-swatch ${s.tone}`} aria-hidden="true" />
              <span className="ribbon-segbar-legend-label">{s.label}</span>
              <span className="ribbon-segbar-legend-value">{s.value}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
