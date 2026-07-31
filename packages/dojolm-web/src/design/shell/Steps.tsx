// SPDX-License-Identifier: Apache-2.0

export interface StepsItem {
  title: string;
  sub: string;
}

export interface StepsProps {
  items: readonly StepsItem[];
  /** Circle-number discs. The design splits by wave: wave-e/f steps carry
   *  the CSS-counter circles, wave-g2 steps render title/sub only — g2
   *  surfaces pass `numbered={false}`. Defaults true (byte-identical). */
  numbered?: boolean;
}

/**
 * P2a — "how X works" numbered explainer (design wave-e `.steps`): a static
 * forward-pointing sequence with CSS-counter circle numbers. Distinct from
 * `command/StepList` (the command-center `01`/check + arrow variant) — this
 * one is non-interactive prose, not a checklist.
 *
 * Semantics: an <ol> so assistive tech announces the ordering; the visible
 * circle number is a decorative CSS counter (`aria-hidden`). CSS lives in
 * styles/v2/module.css.
 */
export function Steps({ items, numbered = true }: StepsProps) {
  return (
    <ol className={numbered ? "steps" : "steps steps--plain"}>
      {items.map((item) => (
        <li className="step" key={item.title}>
          {numbered && <span className="n" aria-hidden="true" />}
          <div className="bd">
            <span className="t">{item.title}</span>
            <span className="s">{item.sub}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}
