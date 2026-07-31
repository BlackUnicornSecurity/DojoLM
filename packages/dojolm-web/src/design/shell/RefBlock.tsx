// SPDX-License-Identifier: Apache-2.0
import type { ReactNode } from "react";

export interface RefBlockProps {
  /**
   * Decorative kanji mark (design §5.5). Pass a static literal — never
   * user-supplied text. Announced nowhere: `aria-hidden` + `lang="ja"`.
   * Some design blocks carry no mark (e.g. models→evaluations) — omit it
   * and no `.kj` span (or its flex gap) is rendered.
   */
  kj?: string;
  title: ReactNode;
  sub: ReactNode;
  href: string;
  linkLabel: ReactNode;
}

/**
 * P2a — §5.5 cross-link block (design wave-b `.ref-block`): a quiet one-row
 * pointer from one module to a related surface ("Arena · live matches — Live
 * multi-agent matches → Open Arena"). Render-pure; the `.ref-block` CSS
 * lives in styles/v2/module.css. The link is a plain anchor so the design
 * layer keeps zero routing dependencies.
 */
export function RefBlock({ kj, title, sub, href, linkLabel }: RefBlockProps) {
  return (
    <div className="ref-block">
      {kj ? (
        <span className="kj" lang="ja" aria-hidden="true">
          {kj}
        </span>
      ) : null}
      {/* Design (wave-g2 §5.5): title + sub stack inside a `.bd` that flexes
          to fill, pushing the link to the far right — without it the long
          sub and link wrap onto their own lines. */}
      <span className="bd">
        <span className="t">{title}</span>
        <span className="s">{sub}</span>
      </span>
      <a href={href}>{linkLabel}</a>
    </div>
  );
}
