// SPDX-License-Identifier: Apache-2.0
/**
 * Length-cap helpers for primitive prop boundaries. API-supplied strings
 * (campaign names, model ids, bounty descriptions, scanner targets) are
 * truncated at the prop entry point so the rendered DOM cannot blow out
 * the layout or carry a multi-MB string into a memoised render tree.
 *
 * Defaults are conservative; callers pass an explicit `max` for fields
 * with a known UI envelope (e.g. score-card big-number = 12 chars).
 */

const ELLIPSIS = '…';

export function cap(s: string, max = 200): string {
  if (s.length <= max) return s;
  if (max <= 1) return s.slice(0, max);
  return s.slice(0, max - 1) + ELLIPSIS;
}

export function capOpt(s: string | undefined, max = 200): string | undefined {
  return s === undefined ? undefined : cap(s, max);
}
