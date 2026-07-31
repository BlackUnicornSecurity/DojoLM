// SPDX-License-Identifier: Apache-2.0
export interface CoverageGridProps {
  rows?: number;
  cols?: number;
  seed?: number;
}

type Level = 'l0' | 'l1' | 'l2' | 'l3' | 'l4' | 'crit';

// Deterministic 13×7 heatmap. Seeded so SSR and client render match without
// hydration skew — the seed alone determines every cell.
//
// Phase 4.3 conformity (SKIN-SPEC §1.3.9 / A-06 + Command Center
// v2.html:49-56, 222-223): the ramp is a positive coverage metric —
// under the v2 chain it renders steel; only `crit` cells (critical-
// severity days) carry the sanctioned data-red tier. The legend swatches
// are CLASSED (same level classes as the cells) instead of inline
// style color literals so the active skin owns every swatch color.
export function CoverageGrid({ rows = 7, cols = 13, seed = 1 }: CoverageGridProps) {
  const cells: Level[] = [];
  for (let i = 0, s = seed; i < rows * cols; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const r = s / 0x7fffffff;
    let lvl: Level = 'l0';
    // `crit` marks critical-severity days — drawn from the same seeded
    // stream as the ramp (same fixture status as every other cell; the
    // page-level demo banner discloses it).
    if (r > 0.98) lvl = 'crit';
    else if (r > 0.85) lvl = 'l4';
    else if (r > 0.7) lvl = 'l3';
    else if (r > 0.5) lvl = 'l2';
    else if (r > 0.3) lvl = 'l1';
    cells.push(lvl);
  }
  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S', 'S', 'M', 'T', 'W', 'T', 'F'];
  const ramp: readonly Level[] = ['l0', 'l1', 'l2', 'l3', 'l4'];
  return (
    <div>
      <div className="cov-header">
        {days.slice(0, cols).map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div
        className="cov-grid"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        role="img"
        aria-label="Coverage heatmap; red cells mark critical-severity days"
      >
        {cells.map((l, i) => (
          <div key={i} className={`cov-cell ${l}`} />
        ))}
      </div>
      <div className="cov-footer">
        <span>Less</span>
        {ramp.map((l) => (
          <span key={l} className="legend">
            <span className={`sw ${l}`} />
          </span>
        ))}
        <span>More</span>
        <span className="cov-crit-label">Critical day</span>
        <span className="legend">
          <span className="sw crit" />
        </span>
      </div>
    </div>
  );
}
