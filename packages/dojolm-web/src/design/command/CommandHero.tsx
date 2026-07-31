// SPDX-License-Identifier: Apache-2.0
import type { ReactNode } from "react";
import {
  ROUTE_NAMING,
  type RouteNamingId,
} from "@/lib/navigation/route-naming";
import { PageHead } from "../shell/PageHead";

export type CommandHeroTint = "red" | "steel" | "gold" | "violet";

interface CommandHeroCommonProps {
  eyebrow?: ReactNode;
  lede?: ReactNode;
  actions?: ReactNode;
  readiness?: ReactNode;
  /**
   * v2 (Yamabushi 1.2): lacquer gradient + accent palette. `red` is the
   * Epic 0 default (torii lacquer). New variants: `steel`, `gold`, `violet`
   * — each pulls its accent from src/design/styles/tokens.css and never
   * uses --bu-cyan (G10 cross-brand chrome only).
   */
  tint?: CommandHeroTint;
  /**
   * v2: kanji watermark anchored bottom-left, hero-only per G3
   * (no kanji on data rows). Defaults to the Epic 0 `構` glyph.
   * Pass a static literal — never user-supplied text (G3 + R-T1).
   */
  watermark?: string;
  /**
   * v2: vertical band label on the left edge. Defaults to the Epic 0
   * `剣 · COMMAND` literal. Pass a static literal — never user input.
   */
  vertical?: string;
  /**
   * v2: enables/disables the radial glow + ray sweep. Defaults true.
   * Set false on hero variants where the rising-sun motif is suppressed
   * (e.g. attestation paper surfaces).
   */
  glow?: boolean;
}

export type CommandHeroProps = CommandHeroCommonProps &
  (
    | {
        /** Signed route identity owns the visible H1 and gloss. */
        readonly namingId: RouteNamingId;
        readonly title?: ReactNode;
      }
    | {
        readonly namingId?: undefined;
        readonly title: ReactNode;
      }
  );

// Hero banner: left narrative, right readiness gauge. v2 (Yamabushi 1.2)
// adds tint variants (red default / steel / gold / violet), each with its
// own lacquer gradient + accent driven by src/design/styles/tokens.css.
// Watermark + vertical band remain hero-only per G3.
export function CommandHero({
  namingId,
  eyebrow,
  title,
  lede,
  actions,
  readiness,
  tint = "red",
  watermark = "構",
  vertical = "剣 · COMMAND",
  glow = true,
}: CommandHeroProps) {
  const naming = namingId ? ROUTE_NAMING[namingId] : null;
  const resolvedTitle = naming?.plain ?? title;
  const resolvedLede = naming?.gloss ?? lede;
  // S3 — tier-3 utility surfaces (Settings, Plugins, API keys, Validation,
  // Flags, Compliance…) get the compact flat-Inter header, NOT the Fraunces
  // serif hero band. The serif hero is reserved for command / paper-ceremony /
  // marketing surfaces (design SKIN-SPEC §3). Reuses PageHead's compact variant
  // so utility headers share one anatomy app-wide.
  if (naming?.tier === 3) {
    return (
      <PageHead
        namingId={namingId}
        title={resolvedTitle}
        lede={resolvedLede}
        actions={actions}
        variant="compact"
      />
    );
  }
  const resolvedWatermark = watermark;
  const tintClass = `tint-${tint}`;
  return (
    <div className={`cmd-hero ${tintClass}`.trim()} data-tint={tint}>
      <HeroDecoration
        glow={glow}
        watermark={resolvedWatermark}
        vertical={vertical}
      />
      <HeroNarrative
        eyebrow={eyebrow}
        title={resolvedTitle}
        lede={resolvedLede}
        actions={actions}
      />
      <div className="cmd-hero-right">{readiness}</div>
    </div>
  );
}

function HeroDecoration({
  glow,
  watermark,
  vertical,
}: {
  glow: boolean;
  watermark: string;
  vertical: string;
}) {
  return (
    <>
      {glow ? (
        <>
          <div className="cmd-hero-glow" />
          <div className="cmd-hero-rays" />
        </>
      ) : null}
      <div className="cmd-hero-grid" />
      <span className="cmd-hero-vlabel" lang="ja">
        {vertical}
      </span>
      {watermark ? (
        <span className="cmd-hero-watermark" aria-hidden="true" lang="ja">
          {watermark}
        </span>
      ) : null}
    </>
  );
}

function HeroNarrative({
  eyebrow,
  title,
  lede,
  actions,
}: {
  readonly eyebrow?: ReactNode;
  readonly title: ReactNode;
  readonly lede?: ReactNode;
  readonly actions?: ReactNode;
}) {
  return (
    <div className="cmd-hero-left">
      {eyebrow ? (
        <div className="cmd-eyebrow">
          <span className="bar" />
          <span>{eyebrow}</span>
        </div>
      ) : null}
      <h1 className="cmd-title">{title}</h1>
      {lede ? <p className="cmd-lede">{lede}</p> : null}
      {actions ? <div className="cmd-actions">{actions}</div> : null}
    </div>
  );
}
