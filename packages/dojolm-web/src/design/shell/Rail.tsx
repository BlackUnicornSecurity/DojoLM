// SPDX-License-Identifier: Apache-2.0
/* eslint-disable no-restricted-syntax -- Rail item ids are v2 display identities resolved through the navigation bridge, not legacy outgoing NavIds. */
"use client";

import type { ReactElement } from "react";
import {
  ROUTE_NAMING,
  type RouteNamingId,
} from "@/lib/navigation/route-naming";
import { I } from "./icons";

export interface RailItem {
  id: string;
  route: string;
  icon: ReactElement;
  label: string;
  sub: string | null;
  jp: string | null;
  badge?: string;
}

export interface RailSection {
  group: string | null;
  items: RailItem[];
}

function railItem(
  id: RouteNamingId,
  icon: ReactElement,
  badge?: string,
): RailItem {
  const naming = ROUTE_NAMING[id];
  return {
    id,
    route: naming.route,
    icon,
    label: naming.plain,
    sub: naming.navSecondary ?? naming.romaji,
    jp: naming.kanji,
    ...(badge === undefined ? {} : { badge }),
  };
}

// Shipped IA — canonical navigation reconciled with parity plan route tree.
// Kanji subtitles controlled via Kamae panel data-kanji attr on the enclosing
// [data-kamae-scope] element.
//
// E3.S6c (F-3-019) — `/console` Workbench was reachable from no rail
// entry, no admin index card, and no `/` link before this PR (audit
// finding: F-3-019 P3 Discoverability / Nielsen #6). The Workbench
// route ships ALL-FIVE-LIVE (D-212 #546) but had zero IA scaffolding.
// The new `'console'` row sits adjacent to `'dashboard'` because the
// two surfaces complement each other: `/` is the Sensei Command-archetype
// home (single-pane briefing), `/console` is the Workbench-archetype
// companion (5-widget grid). Kanji 工房 (kōbō — workshop) reads as the
// builder/worker complement to the dashboard's `先生` (Sensei) glyph.
// Glyph `I.console` is a fresh monitor-with-widgets motif distinct from
// every other RAIL icon.
export const RAIL: RailSection[] = [
  {
    group: null,
    items: [railItem("dashboard", I.dashboard), railItem("console", I.console)],
  },
  {
    group: "Test",
    items: [
      railItem("scanner", I.scanner),
      railItem("buki", I.buki),
      railItem("jutsu", I.jutsu),
      railItem("arena", I.arena),
      railItem("atemi", I.atemi),
      railItem("sengoku", I.sengoku),
      railItem("ronin", I.ronin),
    ],
  },
  {
    group: "Protect",
    items: [railItem("hattori", I.hattori), railItem("kotoba", I.kotoba)],
  },
  {
    group: "Intel & evidence",
    items: [
      railItem("mitsuke", I.mitsuke),
    ],
  },
  // HAGANE E4.S2 (plan v1.1 R1 carve-out — the ONE sanctioned
  // structural nav change): Operations group surfaces the rail-orphaned
  // admin long-tail plus the evidence workspace (audit M4).
  // Registry-marked off-nav modules remain directory and palette reachable.
  {
    group: "Operations",
    items: [
      railItem("admin", I.admin, "12"),
      railItem("tatami", I.tatami),
      railItem("system-health", I.activity),
    ],
  },
];

// Epic 4B.1 — member-facing nav. Intentionally sparse: E4B.1 only
// ships the /members shell. E4B.2 appends the Leaderboard entry.
// The v2 skin gives the bypass matrix a dedicated row so its active
// state remains visible on both desktop and drawer navigation. E4B.4 adds the Seasons entry
// — the seasons index IS a dedicated nav surface (decision #7:
// "Prior-season leaderboards archived to /members/seasons/archive/:slug").
// The archive viewer reuses the `'seasons'` active-id. E4B.5
// appends the Bounty entry — the bounty page IS a dedicated surface
// (belt ledger + tier distribution). Kanji `褒美` supplies the visual
// affordance; the ARIA label is the romaji `Houbi` per guardrails §5
// (no kanji in ARIA).
//
// E3.S6a (F-3-010) — Seasons + Bounty originally reused `I.mitsuke`
// (the E4B.4/E4B.5 deviation note). The reuse made the two member
// rows visually indistinguishable on the rail. Distinct glyphs from
// the existing icon set restore Fitts/Hick scan-ability without
// introducing new SVG paths:
//   - Seasons → `I.flag` (banner/cycle metaphor; reads as "marker
//     of time" matching 季節 / Kisetsu)
//   - Bounty  → `I.target` (bounty-target metaphor; reads as
//     "reward goal" matching 褒美 / Houbi)
export const MEMBER_RAIL: RailSection[] = [
  {
    group: null,
    items: [railItem("members", I.dashboard)],
  },
  {
    group: "Competition",
    items: [
      railItem("leaderboard", I.arena),
      railItem("seasons", I.flag),
      railItem("bounty", I.target),
      railItem("bypass-matrix", I.buki),
    ],
  },
];

/**
 * F-QA-040 — Atemi is a flag-gated surface (`ATEMI_ENABLED`). When the flag
 * is off, drop the `atemi` rail item so operators can't navigate to a disabled
 * module. Pure + immutable: returns the same `sections` reference untouched
 * when the flag is on (byte-identical for the many canvas-preview / test
 * call-sites that don't gate), and fresh arrays/objects when it filters. The
 * flag value must be resolved server-side (this and its consumers are client
 * components; `NEXT_PUBLIC_*` is build-frozen) and threaded down as a prop.
 */
export function railSectionsForFlags(
  sections: RailSection[],
  atemiEnabled: boolean,
): RailSection[] {
  if (atemiEnabled) return sections;
  return sections.map((section) => ({
    ...section,
    items: section.items.filter((item) => item.id !== "atemi"),
  }));
}

export function railActiveForSections(
  active: string,
  sections: readonly RailSection[],
): string {
  const ids = new Set(
    sections.flatMap((section) => section.items.map((item) => item.id)),
  );
  if (ids.has(active)) return active;
  return ids.has("members") ? "members" : "admin";
}

export interface RailProps {
  active?: string;
  /** HAGANE E4.S3 — per-item plain-English tooltip (rail-id keyed;
   *  single-sourced from ROUTE_NAMING glosses by the shell host). */
  tips?: Readonly<Record<string, string>>;
  /**
   * Optional override for the rendered sections. Defaults to the
   * admin `RAIL` constant — the omitted-prop behavior is byte-
   * identical to the pre-E4B.1 shipping surface. The `/members`
   * ShellChrome selects `MEMBER_RAIL` automatically for member paths so
   * member-facing pages surface only member-accessible affordances.
   */
  sections?: RailSection[];
  /**
   * Optional click handler. When provided each rail item becomes a button
   * that calls onItemClick(item.id). Default render is non-interactive so
   * canvas preview pages and SSR placeholders keep their static-marker
   * appearance.
   */
  onItemClick?: (id: string) => void;
  /**
   * YR.15 (DP-009 / G-013): the admin Rail row historically rendered a
   * hardcoded `'12'` badge. Hosts can pass a derived count here:
   *   - `string`        → replaces the static badge text
   *   - `null`          → hides the badge entirely (e.g. count = 0)
   *   - `undefined`     → falls through to the section's static badge
   *                       (preserves byte-compat for canvas previews
   *                        and the legacy fixture marker)
   * Only the `'admin'` row reads this override; other rows ignore it.
   */
  adminBadgeOverride?: string | null;
}

interface RailItemViewProps {
  readonly item: RailItem;
  readonly active: string;
  readonly tip?: string;
  readonly onItemClick?: (id: string) => void;
  readonly adminBadgeOverride?: string | null;
}

function RailItemView(props: RailItemViewProps) {
  const { item } = props;
  const naming = Object.hasOwn(ROUTE_NAMING, item.id)
    ? ROUTE_NAMING[item.id as RouteNamingId]
    : null;
  const className =
    `rail-item ${item.id === props.active ? "active" : ""}`.trim();
  const badgeText =
    item.id === "admin" && props.adminBadgeOverride !== undefined
      ? props.adminBadgeOverride
      : item.badge;
  const body = <RailItemBody item={item} naming={naming} badge={badgeText} />;
  if (props.onItemClick) {
    return (
      <button
        type="button"
        className={className}
        onClick={() => props.onItemClick?.(item.id)}
        aria-current={item.id === props.active ? "page" : undefined}
        title={props.tip}
      >
        {body}
      </button>
    );
  }
  return <div className={className}>{body}</div>;
}

function RailItemBody({
  item,
  naming,
  badge,
}: {
  readonly item: RailItem;
  readonly naming: (typeof ROUTE_NAMING)[RouteNamingId] | null;
  readonly badge?: string | null;
}) {
  // S1 — the v2 rail mark is the module's kanji glyph, not a line-icon.
  // `kanjiGlyph` overrides the default first-kanji-character mark (e.g.
  // the Command Center sets 道 explicitly with no kanji name); routes
  // with neither render an intentionally empty, alignment-holding
  // mark. Decorative — the accessible name is the English label + romaji.
  const mark = naming?.kanjiGlyph ?? naming?.kanji?.charAt(0) ?? "";
  return (
    <>
      <span className="icon" lang="ja" aria-hidden="true">
        {mark}
      </span>
      <span className="label">
        <b className="label-en">{naming?.plain ?? item.label}</b>
        {(naming?.romaji ?? item.sub) ? (
          <b className="label-jp">{naming?.romaji ?? item.sub}</b>
        ) : null}
      </span>
      {badge ? (
        <span
          className="badge"
          data-testid={item.id === "admin" ? "rail-admin-badge" : undefined}
        >
          {badge}
        </span>
      ) : null}
    </>
  );
}

function RailGroup({
  section,
  ...props
}: Omit<RailItemViewProps, "item" | "tip"> & {
  readonly section: RailSection;
  readonly tips?: Readonly<Record<string, string>>;
}) {
  return (
    <div className="rail-group">
      {section.group ? (
        <div className="rail-group-label">{section.group}</div>
      ) : null}
      {section.items.map((item) => (
        <RailItemView
          key={item.id}
          {...props}
          item={item}
          tip={props.tips?.[item.id]}
        />
      ))}
    </div>
  );
}

export function Rail({
  tips,
  active = "dashboard",
  sections = RAIL,
  onItemClick,
  adminBadgeOverride,
}: RailProps) {
  const memberRail = sections.some((section) =>
    section.items.some((item) => item.id === "members"),
  );
  return (
    <aside className="rail">
      <div className="rail-logo">
        <div className="rail-logo-mark">
          <span className="jp" lang="ja">
            道
          </span>
          <span className="en">DL</span>
        </div>
        <div className="rail-logo-text">
          <span className="brand">
            Dojo<span className="lm">LM</span>
          </span>
          {/* S7 — admin brand attribution is "BlackUnicorn" (design .attr); the
              "Prod" environment indicator lives in the topbar env chip, not as a
              prefix on the lockup. The member shell keeps its "Yamabushi ·
              Members" attribution (design .attr.members). */}
          <span className="env">
            {memberRail ? "Yamabushi · Members" : "BlackUnicorn"}
          </span>
        </div>
      </div>
      {sections.map((section) => (
        <RailGroup
          key={section.group ?? section.items.map((item) => item.id).join("-")}
          section={section}
          tips={tips}
          active={active}
          onItemClick={onItemClick}
          adminBadgeOverride={adminBadgeOverride}
        />
      ))}
    </aside>
  );
}
