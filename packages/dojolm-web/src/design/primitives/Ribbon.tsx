// SPDX-License-Identifier: Apache-2.0
export type RibbonSegmentKind = 'pass' | 'warn' | 'fail' | 'block';

export interface RibbonSegment {
  k: RibbonSegmentKind;
  v: number;
}

export interface RibbonProps {
  segs: RibbonSegment[];
  legend?: boolean;
}

/**
 * Single fat 10px bar split into pass/warn/fail/block segments.
 * Each segment width = (v / total) × 100%. Legend below maps the
 * tone class to the human-readable label + count.
 */
export function Ribbon({ segs, legend = true }: RibbonProps) {
  const total = segs.reduce((s, r) => s + r.v, 0) || 1;
  const summary = segs.map((s) => `${s.k} ${s.v}`).join(', ');
  return (
    <div>
      <div className="ribbon" role="img" aria-label={`distribution: ${summary}`}>
        {segs.map((s, i) => (
          <span
            key={i}
            className={`ribbon-seg ${s.k}`}
            style={{ width: `${(s.v / total) * 100}%` }}
            title={`${s.k}: ${s.v}`}
            aria-hidden="true"
          />
        ))}
      </div>
      {legend && (
        <div className="ribbon-legend">
          {segs.map((s, i) => (
            <span key={i}>
              <i className={`ribbon-legend-swatch ${s.k}`} />
              {s.k.toUpperCase()} · {s.v}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
