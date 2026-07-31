// SPDX-License-Identifier: Apache-2.0
import type { ReactNode } from 'react';

export interface KVRow {
  k: ReactNode;
  v: ReactNode;
}

export interface KVProps {
  rows: KVRow[];
  /**
   * Optional accessible label for the definition list. Sets aria-label
   * on the <dl>; sighted users still see the rendered k/v pairs.
   */
  ariaLabel?: string;
}

/**
 * Definition-list grid: `k` mono-uppercase eyebrow on the left, `v`
 * regular foreground on the right. Renders semantic <dl>/<dt>/<dd> so
 * AT consumes the term/definition relationship correctly.
 */
export function KV({ rows, ariaLabel }: KVProps) {
  return (
    <dl className="kv" aria-label={ariaLabel}>
      {rows.map((r, i) => (
        <div className="kv-row" key={i}>
          <dt>{r.k}</dt>
          <dd>{r.v}</dd>
        </div>
      ))}
    </dl>
  );
}
