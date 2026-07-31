// SPDX-License-Identifier: Apache-2.0
import type { ReactNode } from 'react';

export interface PageCardProps {
  id: string;
  label: string;
  sub?: string;
  children: ReactNode;
}

// Wraps one page mock in a labelled frame for the canvas layout.
// The page-card-shell carries the [data-kamae-scope] attribute so the Kamae
// panel's vibe/kanji/density toggles scope to a single artboard.
//
// Do NOT nest a PageCard inside a ShellChrome tree. ShellChrome emits its own
// [data-kamae-scope] at the route root, and Kamae.tsx uses closest() which
// would resolve to PageCard's inner scope instead of the shell's. PageCard is
// for /(design)/canvas/* artboards only — those routes live outside the shell
// route group by design (plan §4).
export function PageCard({ id, label, sub, children }: PageCardProps) {
  const [num, ...rest] = label.split('·');
  const name = rest.join('·').trim();
  return (
    <section className="page-card" id={id}>
      <header className="page-card-head">
        <div className="pc-label">
          <span className="pc-num">{num.trim()}</span>
          <span className="pc-name">{name}</span>
        </div>
        {sub && <div className="pc-sub">{sub}</div>}
      </header>
      <div
        className="page-card-shell"
        data-kamae-scope
        data-vibe="confident"
        data-kanji="on"
        data-density="balanced"
      >
        {children}
      </div>
    </section>
  );
}
