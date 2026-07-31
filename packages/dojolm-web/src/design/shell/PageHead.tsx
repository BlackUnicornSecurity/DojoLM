// SPDX-License-Identifier: Apache-2.0
import type { ReactNode } from "react";
import {
  ROUTE_NAMING,
  type RouteNaming,
  type RouteNamingId,
} from "@/lib/navigation/route-naming";

type NamingEntry = readonly [RouteNamingId, RouteNaming];

export function buildPageHeadId(
  entries: readonly NamingEntry[],
): Readonly<Record<string, RouteNamingId>> {
  const index: Record<string, RouteNamingId> = {};
  for (const [id, naming] of entries) {
    if (naming.inferPageHead === false) continue;
    const titles = [
      naming.plain,
      naming.codename,
      ...(naming.legacyPageHeadTitles ?? []),
    ].filter((title): title is string => Boolean(title));
    for (const title of titles) {
      if (index[title] && index[title] !== id) {
        throw new Error(`Duplicate PageHead title: ${title}`);
      }
      index[title] = id;
    }
  }
  return Object.freeze(index);
}

const PAGE_HEAD_ID = buildPageHeadId(
  Object.entries(ROUTE_NAMING) as NamingEntry[],
);

export function canonicalPageHeadId(title: ReactNode): RouteNamingId | null {
  if (typeof title !== "string") return null;
  return PAGE_HEAD_ID[title] ?? null;
}

export interface PageHeadProps {
  /** Canonical route identity. Title inference remains only for legacy callers. */
  namingId?: RouteNamingId;
  title: ReactNode;
  jp?: ReactNode;
  lede?: ReactNode;
  actions?: ReactNode;
  chips?: ReactNode;
  variant?: "default" | "compact";
}

export function PageHead({
  namingId,
  title,
  jp,
  lede,
  actions,
  chips,
  variant = "default",
}: PageHeadProps) {
  const resolvedNamingId = namingId ?? canonicalPageHeadId(title);
  const naming = resolvedNamingId ? ROUTE_NAMING[resolvedNamingId] : null;
  const resolvedTitle = naming ? naming.plain : title;
  const resolvedKanji = naming ? naming.kanji : jp;
  // Lede precedence contract: a caller passing `namingId` is a migrated
  // v2 caller whose explicit lede is deliberate — the prop wins and the
  // registry gloss only fills when the prop is omitted. Title-INFERRED
  // (legacy) callers keep the registry scrub: their technical ledes are
  // replaced by the gloss wholesale.
  const resolvedLede =
    naming && namingId === undefined ? naming.gloss : (lede ?? naming?.gloss);
  // S2 — tier-2 header kicker (design app-shell.css .page-kick): the codename
  // romaji and belt rank sit above the plain Inter H1, not inlined into it.
  const resolvedRomaji = naming?.romaji ?? null;
  const resolvedBelt = naming?.belt ?? null;
  const kicker = resolvedKanji || resolvedRomaji || resolvedBelt;
  if (variant === "compact") {
    return (
      <div className="page-head page-head--compact">
        <div className="col" style={{ minWidth: 0 }}>
          <h1>{resolvedTitle}</h1>
          {resolvedLede && <span className="gloss">{resolvedLede}</span>}
        </div>
        {actions && <div className="actions">{actions}</div>}
      </div>
    );
  }
  return (
    <div className="page-head">
      <div className="col" style={{ minWidth: 0 }}>
        {kicker && (
          <div className="page-kick">
            {resolvedKanji && (
              <span className="kj" lang="ja">
                {resolvedKanji}
              </span>
            )}
            {resolvedRomaji && <span>{resolvedRomaji}</span>}
            {resolvedBelt && (
              <span className={`belt ${resolvedBelt}`}>{resolvedBelt} belt</span>
            )}
          </div>
        )}
        <h1>{resolvedTitle}</h1>
        {resolvedLede && <p className="lede">{resolvedLede}</p>}
        {chips && (
          <div className="row" style={{ marginTop: 10, flexWrap: "wrap" }}>
            {chips}
          </div>
        )}
      </div>
      {actions && <div className="actions">{actions}</div>}
    </div>
  );
}
