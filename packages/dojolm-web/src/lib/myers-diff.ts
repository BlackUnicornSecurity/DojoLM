// SPDX-License-Identifier: Apache-2.0
/**
 * myers-diff.ts — issue #349 item 5 fold-in (post-train).
 *
 * Hand-rolled Myers O(ND) diff for the Kotoba Workshop tab. Replaces
 * the prior Set-membership best-effort visual aid in
 * `(shell)/admin/kotoba/KotobaTabs.tsx#diffOriginalVsHardened` with a
 * positional line diff: lines that move position without changing
 * content are now reported as a paired (rm, add) instead of being
 * silently collapsed.
 *
 * Reference: Eugene W. Myers, "An O(ND) Difference Algorithm and Its
 * Variations," Algorithmica vol. 1 no. 2 (1986). The implementation is
 * a straightforward greedy edit-graph walk with a back-trace; no
 * external dependency (zero-deps mandate carried from YR.18+).
 *
 * Capacity:
 *   - `MAX_INPUT_LINES_PER_SIDE` caps each side at 1024 lines. Inputs
 *     longer than that are truncated with an ellipsis line so a
 *     pathological prompt cannot drive O((N+M)*D) memory through the
 *     `vArr` ring.
 *   - `MAX_OUTPUT_LINES` caps the rendered diff at 1024 entries so a
 *     fully-disjoint pair (worst case D = N + M) cannot blow past the
 *     `<DiffBlock>` 512-line render cap by more than a 2x safety
 *     margin (the consumer slices to `DIFF_BLOCK_MAX_LINES` again).
 *
 * Output shape: `readonly DiffLine[]` matching `<DiffBlock>` props.
 * Every entry is `{ kind: 'add' | 'rm' | 'ctx', text }`. Equal lines
 * surface as `kind: 'ctx'` so the consumer can render them as
 * unchanged-context rows when desired (the Kotoba Workshop tab today
 * filters them out for compactness, but the API leaves the choice to
 * the caller).
 */

import type { DiffLine } from '@/design/primitives/DiffBlock';

export const MAX_INPUT_LINES_PER_SIDE = 1024;
export const MAX_OUTPUT_LINES = 1024;
const TRUNCATION_LINE = '… (truncated for diff)';

interface BackTraceState {
  readonly v: Int32Array;
  readonly k: number;
}

/**
 * Compute a positional line-by-line diff between `a` and `b`. Equal
 * lines emit `ctx`; deletions from `a` emit `rm`; insertions into `b`
 * emit `add`. The traversal preserves order — a line that moves from
 * position 3 to position 7 surfaces as `(rm at original pos 3, add at
 * hardened pos 7)`, not a silent no-op.
 *
 * Truncates each input side to `MAX_INPUT_LINES_PER_SIDE` lines (with
 * a synthetic `… (truncated for diff)` sentinel). Output is capped at
 * `MAX_OUTPUT_LINES` entries.
 */
export function diffLines(
  a: readonly string[],
  b: readonly string[],
): readonly DiffLine[] {
  const aTrim = truncateInput(a);
  const bTrim = truncateInput(b);
  const ops = computeMyersOps(aTrim, bTrim);
  const out: DiffLine[] = [];
  for (const op of ops) {
    if (out.length >= MAX_OUTPUT_LINES) break;
    out.push(op);
  }
  return out;
}

function truncateInput(lines: readonly string[]): readonly string[] {
  if (lines.length <= MAX_INPUT_LINES_PER_SIDE) return lines;
  return [...lines.slice(0, MAX_INPUT_LINES_PER_SIDE - 1), TRUNCATION_LINE];
}

/**
 * Greedy O((N+M)*D) edit-graph traversal. Records each frontier in
 * `trace` so back-trace can reconstruct the path. Equal lines on the
 * forward extension are walked greedily (line 30-32 of the original
 * algorithm) so context regions consume D=0 work.
 *
 * Edge case — both sides empty: returns `[]` immediately.
 * Edge case — `a` empty: every `b` line surfaces as `add`.
 * Edge case — `b` empty: every `a` line surfaces as `rm`.
 */
function computeMyersOps(
  a: readonly string[],
  b: readonly string[],
): readonly DiffLine[] {
  const n = a.length;
  const m = b.length;
  if (n === 0 && m === 0) return [];
  if (n === 0) return b.map((line) => ({ kind: 'add' as const, text: line }));
  if (m === 0) return a.map((line) => ({ kind: 'rm' as const, text: line }));

  const max = n + m;
  const offset = max;
  const trace: BackTraceState[] = [];

  // `v` is indexed by k + offset; v[k] holds the furthest x reachable
  // on diagonal k after this round.
  let v = new Int32Array(2 * max + 1);
  v[1 + offset] = 0;

  let foundD = -1;
  for (let d = 0; d <= max; d++) {
    // Snapshot before this round so back-trace can rebuild.
    const snapshot = new Int32Array(v);
    for (let k = -d; k <= d; k += 2) {
      const kIdx = k + offset;
      let x: number;
      if (k === -d || (k !== d && snapshot[kIdx - 1] < snapshot[kIdx + 1])) {
        x = snapshot[kIdx + 1]; // Down: insert from b
      } else {
        x = snapshot[kIdx - 1] + 1; // Right: delete from a
      }
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) {
        x++;
        y++;
      }
      v[kIdx] = x;
      if (x >= n && y >= m) {
        trace.push({ v: snapshot, k });
        foundD = d;
        break;
      }
    }
    if (foundD !== -1) break;
    trace.push({ v: snapshot, k: 0 });
  }

  if (foundD === -1) {
    // Defensive fallback — should not happen because d ≤ N+M always
    // converges. Emit an honest all-rm-then-all-add result.
    return [
      ...a.map((line) => ({ kind: 'rm' as const, text: line })),
      ...b.map((line) => ({ kind: 'add' as const, text: line })),
    ];
  }

  // Back-trace: walk from (n, m) using the snapshot stack to recover
  // the edit sequence. Push operations in reverse, reverse at the end.
  const ops: DiffLine[] = [];
  let x = n;
  let y = m;
  for (let d = foundD; d > 0; d--) {
    const snapshot = trace[d].v;
    const k = x - y;
    const kIdx = k + offset;
    const goDown =
      k === -d || (k !== d && snapshot[kIdx - 1] < snapshot[kIdx + 1]);
    const prevK = goDown ? k + 1 : k - 1;
    const prevX = snapshot[prevK + offset];
    const prevY = prevX - prevK;
    while (x > prevX && y > prevY) {
      ops.push({ kind: 'ctx', text: a[x - 1] });
      x--;
      y--;
    }
    if (d > 0) {
      if (goDown) {
        ops.push({ kind: 'add', text: b[y - 1] });
      } else {
        ops.push({ kind: 'rm', text: a[x - 1] });
      }
    }
    x = prevX;
    y = prevY;
  }
  while (x > 0 && y > 0 && a[x - 1] === b[y - 1]) {
    ops.push({ kind: 'ctx', text: a[x - 1] });
    x--;
    y--;
  }
  while (x > 0) {
    ops.push({ kind: 'rm', text: a[x - 1] });
    x--;
  }
  while (y > 0) {
    ops.push({ kind: 'add', text: b[y - 1] });
    y--;
  }
  return ops.reverse();
}
