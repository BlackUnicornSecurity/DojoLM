// SPDX-License-Identifier: Apache-2.0
/**
 * Shared long-form legal-document renderer (E6.S2 — closes F-QA-015).
 *
 * Renders the validated Wave-H legal chrome for every `/legal/*` route
 * (`sys-fullpage-eyebrow` / `-title` + `legal-prose.module.css` +
 * `<LegalFooter>`), parametrised so the Terms / Accessibility / Cookie
 * pages render structurally identical to the canonical Privacy policy.
 * The `LegalSection` shape carries each page's founder-approved copy
 * (paras / bullets / table / parasAfter) so the structural check the QA
 * sweep asserts — ≥4 `<h2>` sections + no "Content under Legal review"
 * stub keyword + entity facts matching Privacy — holds across all four
 * `/legal/*` pages.
 */

import Link from "next/link";

import { LegalFooter } from "@/design";

import styles from "./legal-prose.module.css";

export interface LegalSection {
  readonly n: number;
  readonly title: string;
  readonly paras?: readonly string[];
  readonly bullets?: readonly string[];
  readonly parasAfter?: readonly string[];
  readonly table?: {
    readonly head: readonly string[];
    readonly rows: readonly (readonly string[])[];
  };
  /**
   * Inline steel cross-links. Each entry links the first occurrence of
   * `label` inside any of this section's paragraphs to `href` (Wave-H
   * "links = steel"). Used by /legal/cookies §1 → Privacy policy.
   */
  readonly links?: readonly { readonly label: string; readonly href: string }[];
}

/** Render a paragraph, linking the first matching `links` label if present. */
function renderPara(
  text: string,
  links?: readonly { readonly label: string; readonly href: string }[],
) {
  const link = links?.find((l) => text.includes(l.label));
  if (!link) return text;
  const idx = text.indexOf(link.label);
  return (
    <>
      {text.slice(0, idx)}
      <Link href={link.href}>{link.label}</Link>
      {text.slice(idx + link.label.length)}
    </>
  );
}

export interface LegalDocumentProps {
  /** Top-of-page eyebrow label (e.g. "Terms of service"). */
  readonly eyebrow: string;
  /** Visible <h1> on the page. */
  readonly title: string;
  /** Effective / last-updated meta line, mono-styled like Privacy. */
  readonly meta: string;
  /** One- or two-sentence lede shown under the heading. */
  readonly lede: string;
  /** The ordered body sections. */
  readonly sections: readonly LegalSection[];
  /** Stable testid root — e.g. "legal-terms-page". */
  readonly testId: string;
}

export function LegalDocument({
  eyebrow,
  title,
  meta,
  lede,
  sections,
  testId,
}: LegalDocumentProps) {
  // "legal-cookies-page" → "cookies"; drives the footer active-page accent.
  const currentKey = testId.replace(/^legal-/, "").replace(/-page$/, "");
  return (
    <>
      <main
        id="main-content"
        tabIndex={-1}
        className={`${styles.page} legal-document`}
        aria-labelledby={`${testId}-heading`}
        data-testid={testId}
      >
        <article className={`${styles.prose} legal-document-prose`}>
          <p className="sys-fullpage-eyebrow">{eyebrow}</p>
          <h1 id={`${testId}-heading`} className="sys-fullpage-title">
            {title}
          </h1>
          <p className={`${styles.meta} legal-document-meta`}>{meta}</p>
          <p className={`${styles.lede} legal-document-lede`}>{lede}</p>

          {sections.map((s) => (
            <section
              key={s.n}
              className={`${styles.section} legal-document-section`}
            >
              <h2>
                <span className="legal-section-number">{s.n}</span>{" "}
                {s.title}
              </h2>
              {s.paras?.map((p, i) => (
                <p key={`p${i}`}>{renderPara(p, s.links)}</p>
              ))}
              {s.bullets ? (
                <ul>
                  {s.bullets.map((b, i) => (
                    <li key={`b${i}`}>{b}</li>
                  ))}
                </ul>
              ) : null}
              {s.table ? (
                <div
                  className="legal-table-scroll"
                  role="region"
                  aria-label={`${s.title} table`}
                  tabIndex={0}
                >
                  <table className={`${styles.table} legal-document-table`}>
                    <thead>
                      <tr>
                        {s.table.head.map((h) => (
                          <th key={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {s.table.rows.map((row, ri) => (
                        <tr key={`r${ri}`}>
                          {row.map((cell, ci) => (
                            <td key={`c${ci}`}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
              {s.parasAfter?.map((p, i) => (
                <p key={`a${i}`}>{renderPara(p, s.links)}</p>
              ))}
            </section>
          ))}
        </article>
      </main>
      {/* Wave-H `.dfoot`: back action (left) + legal nav (right) share one
          space-between row under a single hairline. The nav is the
          <LegalFooter> contentinfo primitive, kept OUTSIDE <main> so the
          page-level landmark is not nested in the document body. */}
      <div className="legal-document-footer">
        <Link
          href="/login"
          className="btn btn-ghost btn-sm"
          data-testid={`${testId}-back`}
        >
          ← Back to sign in
        </Link>
        <LegalFooter className={`legal-document-nav legal-nav-cur-${currentKey}`} />
      </div>
    </>
  );
}
