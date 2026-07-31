// SPDX-License-Identifier: Apache-2.0
import type { CSSProperties, ReactNode } from "react";
import { Panel, type PanelVariant } from "../shell/Panel";

export interface ScrollProps {
  readonly eyebrow?: ReactNode;
  readonly title: ReactNode;
  readonly lede?: ReactNode;
  readonly seal?: ReactNode;
  readonly footer?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly ariaLabel?: string;
  readonly standalone?: boolean;
  /** Standalone page rituals, such as first-boot setup, own the document H1. */
  readonly titleLevel?: 1 | 2;
  /**
   * E1-A-RB-5 (Master Plan v1.0): variant-scoped override of the
   * default paper Panel. Defaults to `'paper'` for backward-compat
   * with the Dashboard `<TrainingScroll>` consumer (P3-AUDIT-6
   * design-intent: paper-scroll metaphor on Dashboard). Bushido
   * Sign-off opts into the default lacquer-dark Panel by passing
   * `panelVariant=""` — kills the cream-paper-on-dark inversion
   * Marcus + Hélène flagged as the procurement-killer "operationally
   * distressing" surface on a regulated-industry deliverable.
   */
  readonly panelVariant?: PanelVariant;
}

// Scroll — the Ritual archetype's primary surface. Composes a Panel
// (default variant="paper": noise-SVG overlay + paper-line border +
// paper-ink foreground from primitives.css) and layers a scroll
// header with eyebrow/title/lede, an optional seal, a body slot, and
// an optional footer slot.
//
// Server-safe. The caller passes whatever signature / step / action
// content the ritual needs into children + footer.
//
// `standalone` is the escape hatch for /setup which pre-dates the
// (shell) layout and therefore lives outside the .dojo-ds-v3 scope.
// When standalone=true the scroll is wrapped in a self-contained
// page background so tokens resolve without the shell wrapper.
//
// `panelVariant` (E1-A-RB-5) lets Bushido Sign-off opt out of the
// paper metaphor while preserving the Ritual surface structure
// (eyebrow/title/lede/seal/footer) and the audit-defensible region
// role + aria-label.
export function Scroll({
  eyebrow,
  title,
  lede,
  seal,
  footer,
  children,
  className = "",
  style,
  ariaLabel = "Ritual",
  standalone = false,
  titleLevel = 2,
  panelVariant = "paper",
}: ScrollProps) {
  const Title = titleLevel === 1 ? "h1" : "h2";
  const scroll = (
    <section
      role="region"
      aria-label={ariaLabel}
      className={`ritual-scroll ${className}`.trim()}
      style={style}
      data-testid="ritual-scroll"
    >
      <div
        className={`ritual-scroll-wrap${
          panelVariant !== "paper" ? " ritual-scroll-wrap--no-paper" : ""
        }`}
      >
        <Panel variant={panelVariant}>
          <header className="ritual-scroll-head">
            <div className="ritual-scroll-head-text">
              {eyebrow && (
                <div className="ritual-scroll-eyebrow">{eyebrow}</div>
              )}
              <Title>{title}</Title>
              {lede && <p className="lede">{lede}</p>}
            </div>
            {seal}
          </header>
          <div className="ritual-scroll-body">{children}</div>
          {footer && (
            <>
              <hr className="ritual-scroll-divider" aria-hidden="true" />
              <div className="ritual-scroll-footer">{footer}</div>
            </>
          )}
        </Panel>
      </div>
    </section>
  );

  if (!standalone) return scroll;

  return <div className="dojo-ds-v3 ritual-scroll-standalone">{scroll}</div>;
}
