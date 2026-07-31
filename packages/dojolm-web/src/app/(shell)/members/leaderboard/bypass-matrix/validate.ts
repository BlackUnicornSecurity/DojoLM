// SPDX-License-Identifier: Apache-2.0
/**
 * Pure shape-validators for the /members/leaderboard/bypass-matrix
 * response. Extracted from `BypassMatrixClient` so the rule §12
 * defense (Number.isFinite + range + Wilson monotonicity + id
 * charset) is unit-testable without React / JSDOM.
 *
 * These functions MUST NOT throw. Invalid input returns `null`
 * (cells drop individually; a malformed matrix returns `null`). The
 * caller decides whether to surface an error banner or render an
 * empty grid.
 */

import { UNRANKED_THRESHOLD } from 'bu-tpi/catalog';
import { TECHNIQUE_ID_RE } from '@/lib/technique-catalog';

export interface BypassCellData {
  readonly techniqueId: string;
  readonly modelId: string;
  readonly n: number;
  readonly bypassCount: number;
  readonly bypassRate: number;
  readonly wilsonLow: number;
  readonly wilsonHigh: number;
  readonly unranked: boolean;
}

export interface BypassMatrixDTO {
  readonly techniques: readonly string[];
  readonly models: readonly string[];
  readonly cells: readonly BypassCellData[];
  readonly generatedAt: string;
  readonly unrankedThreshold: number;
}

function isFiniteRate(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1;
}
function isFiniteCount(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0;
}

export function validateCell(raw: unknown): BypassCellData | null {
  if (!raw || typeof raw !== 'object') return null;
  const c = raw as Record<string, unknown>;
  if (typeof c.techniqueId !== 'string') return null;
  if (typeof c.modelId !== 'string') return null;
  // Symmetric gate with the hash-read path: TECHNIQUE_ID_RE is what
  // HASH_CELL_RE expects on round-trip, so ids written into
  // `#cell=<t>|<m>` via `window.history.replaceState` must pass the
  // same filter. Rejecting here also caps length (<=64 chars), so
  // drawer titles cannot overflow from a malformed future source.
  if (!TECHNIQUE_ID_RE.test(c.techniqueId)) return null;
  if (!TECHNIQUE_ID_RE.test(c.modelId)) return null;
  // `buildBypassMatrix` only emits a cell when at least one submission
  // hit the grid key, so n >= 1 upstream. Tighten here so a future
  // source that bypasses buildBypassMatrix cannot render a degenerate
  // 0-sample cell that would still pass the Wilson CI [0,1] check.
  if (!isFiniteCount(c.n) || c.n < 1) return null;
  if (!isFiniteCount(c.bypassCount)) return null;
  if (!isFiniteRate(c.bypassRate)) return null;
  if (!isFiniteRate(c.wilsonLow)) return null;
  if (!isFiniteRate(c.wilsonHigh)) return null;
  if (typeof c.unranked !== 'boolean') return null;
  if (c.wilsonLow > c.wilsonHigh) return null;
  if (c.bypassRate < c.wilsonLow || c.bypassRate > c.wilsonHigh) return null;
  return {
    techniqueId: c.techniqueId,
    modelId: c.modelId,
    n: c.n,
    bypassCount: c.bypassCount,
    bypassRate: c.bypassRate,
    wilsonLow: c.wilsonLow,
    wilsonHigh: c.wilsonHigh,
    unranked: c.unranked,
  };
}

export function validateMatrix(
  raw: unknown,
  opts: { readonly onDroppedCell?: (cell: unknown) => void } = {},
): BypassMatrixDTO | null {
  if (!raw || typeof raw !== 'object') return null;
  const m = raw as Record<string, unknown>;
  // Gate top-level index arrays with the same TECHNIQUE_ID_RE that
  // validateCell applies to cell ids. Without this symmetry a
  // malformed source could pipe a 10k-char model name into a <th>
  // (layout overflow) or bloat `data-testid` on every <td>.
  const techniques = Array.isArray(m.techniques)
    ? (m.techniques.filter(
        (t): t is string => typeof t === 'string' && TECHNIQUE_ID_RE.test(t),
      ) as string[])
    : [];
  const models = Array.isArray(m.models)
    ? (m.models.filter(
        (t): t is string => typeof t === 'string' && TECHNIQUE_ID_RE.test(t),
      ) as string[])
    : [];
  const rawCells = Array.isArray(m.cells) ? m.cells : [];
  const cells: BypassCellData[] = [];
  for (const rc of rawCells) {
    const cell = validateCell(rc);
    if (cell) {
      cells.push(cell);
    } else if (opts.onDroppedCell) {
      opts.onDroppedCell(rc);
    }
  }
  const generatedAt = typeof m.generatedAt === 'string' ? m.generatedAt : '';
  // Reject `0` alongside missing / negative / non-numeric values —
  // a threshold of 0 would render every 1-sample cell as ranked,
  // contradicting the statistical-confidence intent. Fall back to
  // `UNRANKED_THRESHOLD` (the canonical value in bu-tpi/catalog).
  const unrankedThreshold =
    isFiniteCount(m.unrankedThreshold) && m.unrankedThreshold >= 1
      ? m.unrankedThreshold
      : UNRANKED_THRESHOLD;
  return { techniques, models, cells, generatedAt, unrankedThreshold };
}
