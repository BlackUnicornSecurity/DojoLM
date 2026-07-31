// SPDX-License-Identifier: Apache-2.0
/* eslint-disable no-restricted-syntax -- `ronin` is a typed EmptyState product module here, never a retired NavId. */
/**
 * RoninAdminClient — YR.4.11 client component for `/admin/ronin`.
 *
 * Live-wires the v2.1 Ronin bounty hub:
 *   - GET /api/ronin/programs    → curated bounty program list
 *   - GET /api/ronin/submissions → bug-bounty submission queue
 *
 * Composition (workbench archetype, gold-tint):
 *   - PageHead with kanji `浪人` (Ronin) + Gold-tint chip pulse
 *   - 4 MCard KPI tiles (programs · submissions · open · paid)
 *   - AttackRow list — submission queue (severity-coded)
 *   - HunterLeader stack — top hunters synthesized from submissions
 *   - BountyList — programs as bounty rows
 *   - KV summary — top program / payout total / lifecycle mix
 *
 * Discriminant-redaction:
 *   - SUBMISSION_STATUS_TO_ATTACK_STATUS  → AttackRow status pill
 *   - SUBMISSION_STATUS_LABEL             → AttackRow sub label (closed-union)
 *   - SUBMISSION_SEVERITY_TO_SEV_LEVEL    → AttackRow / SevStrip level
 *   - PROGRAM_STATUS_TO_BOUNTY_STATUS     → BountyList row status pill
 *   - PROGRAM_SEVERITY_TO_SEV_LEVEL       → BountyList SevStrip level
 *   - HUNTER_RANK_TO_BELT                 → BeltDisc tier
 *   - HUNTER_RANK_TO_TAG                  → HunterLeader tag chip
 *   - PLATFORM_LABEL                      → bounty list eyebrow
 * No closed-union value participates in an aria-label without going
 * through one of these maps.
 *
 * Caps: cap()/capOpt() at every API string boundary AT the sanitizer
 * (subset-2 lesson). .slice(0, MAX_*) on every list.
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PlanningTab,
  IntelligenceTab,
  SubmissionWizardPanel,
} from "./RoninTabs";

// YR.20 outer-tab strip per gap-matrix G-037 / G-038 / G-039. Wraps the
// existing single-screen Hub workbench with sibling Submission wizard /
// Planning / Intelligence tabs. Submissions tab keeps the existing
// queue + adds a wizard CTA. The 4-step wizard (target → details →
// evidence → review) lands in YR.21; YR.20 ships a single-step form +
// embedded AI severity calculator.
type RoninOuterTab = "submissions" | "wizard" | "planning" | "intelligence";
const OUTER_TAB_LABEL: Record<RoninOuterTab, string> = {
  submissions: "Submissions",
  wizard: "New submission",
  planning: "Planning targets",
  intelligence: "Intelligence feed",
};
const OUTER_TAB_ORDER: readonly RoninOuterTab[] = [
  "submissions",
  "wizard",
  "planning",
  "intelligence",
];

// E-A9 Phase B — closed-enum R-T1 named predicate replacing the previous
// `id as RoninOuterTab` cast on `<SegmentedSubTabs onChange>`. Mirrors
// E-A4 `isBukiOuterTab` / E-A5 `isJutsuOuterTab` / E-A7 MED-1 fixup
// pattern.
function isRoninOuterTab(value: unknown): value is RoninOuterTab {
  return (
    value === "submissions" ||
    value === "wizard" ||
    value === "planning" ||
    value === "intelligence"
  );
}

// E-A9 Phase B — Darwin-perf rule per the darwin-perf import rule:
// narrow direct-component-path imports (never the bare `@/design` barrel).
// `<BountyList>` consumer site replaced inline by the V1 3-col program-card
// grid per Step 1 Q1 — the primitive itself remains exported from
// `@/design/primitives/BountyList` for other consumers (V2 preservation
// matrix row 11) so we no longer import it here.
import { PageHead } from "@/design/shell/PageHead";
import { Panel } from "@/design/shell/Panel";
import { KpiStrip, type KpiStripItem } from "@/design/primitives/KpiStrip";
import {
  externalSegmentedPanelProps,
  SegmentedSubTabs,
  type SegmentedSubTabItem,
} from "@/design/primitives/SegmentedSubTabs";
import { BOUNTY_LIST_MAX_ENTRIES } from "@/design/primitives/BountyList";
import { KV, type KVRow } from "@/design/primitives/KV";
import { cap } from "@/design/primitives/_caps";
import type { AivssScore } from "bu-tpi/aivss";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { formatNumber } from "@/lib/format/intl";
// PR #3 component split — shared types + sub-components extracted to
// `./_components/`. The orchestrator keeps the wire-shape sanitizers +
// fetch/state derivations; sub-components own the per-card / filter-row
// / queue-rows JSX so this file stays under the 800-LOC cap.
import {
  PLATFORM_LABEL,
  PROGRAM_STATUS_LABEL,
  type BountyPlatform,
  type HunterRow,
  type OwaspLlmCategoryId,
  type PlatformFilter,
  type ProgramLite,
  type ProgramStatus,
  type StatusFilter,
  type SubmissionLite,
  type SubmissionSeverity,
  type SubmissionStatus,
  COMPANY_MAX,
  ID_MAX,
  NAME_MAX,
  PROGRAM_NAME_MAX,
  SCOPE_MAX,
  TITLE_MAX,
  TS_MAX,
} from "./_components/types";
import { ProgramCard } from "./_components/ProgramCard";
import { ProgramFilterRow } from "./_components/ProgramFilterRow";
import { SubmissionQueue } from "./_components/SubmissionQueue";
import { SubmissionsEmptySection } from "./_components/SubmissionsEmptySection";
import { HunterLeaderboardPanel } from "./_components/HunterLeaderboardPanel";
import { HubSummaryPanel } from "./_components/HubSummaryPanel";
// `rankToBelt` + `rankToTag` are imported directly by
// `HunterLeaderboardPanel` (no orchestrator-side use post-audit
// fixup); the orchestrator imports only the derivation helper +
// severity-rank comparator + cap constant.
import {
  deriveHunters,
  SEVERITY_RANK,
  MAX_RONIN_HUNTERS_DISPLAYED as MAX_RONIN_HUNTERS_DISPLAYED_INTERNAL,
} from "./_components/hunter-derive";

// E-A9 Phase 2 polish — OWASP LLM Top-10 closed enum. The seed shape
// (`BountyProgram.owaspAiCategories: string[]`) is open at the wire
// boundary so the client narrows to the canonical 10-id vocabulary
// before rendering. Unknown ids are filtered out (rather than coerced)
// so attacker text can't slip into the chip row.
//
// Aggregate-audit fix (adversarial MED-1) — `satisfies` clause locks
// the runtime array against the closed `OwaspLlmCategoryId` type union
// in `./_components/types.ts`. If the union ever gains a new member
// (e.g. an `'LLM11'` extension), TypeScript will fail to compile here
// until the runtime allow-list is updated — closing the dual-source-
// of-truth drift risk between the type module and the predicate site.
const OWASP_LLM_CATEGORY_IDS = [
  "LLM01",
  "LLM02",
  "LLM03",
  "LLM04",
  "LLM05",
  "LLM06",
  "LLM07",
  "LLM08",
  "LLM09",
  "LLM10",
] as const satisfies readonly OwaspLlmCategoryId[];

function isOwaspLlmCategory(value: unknown): value is OwaspLlmCategoryId {
  return (
    typeof value === "string" &&
    (OWASP_LLM_CATEGORY_IDS as readonly string[]).includes(value)
  );
}

// Cap the per-program chip count to the full 10-id vocabulary. Empty
// arrays render no chip row at all.
const OWASP_LLM_CHIPS_PER_PROGRAM_MAX = OWASP_LLM_CATEGORY_IDS.length;

// Adversarial-review LOW-1 — hard cap on raw wire array length to bound
// the predicate scan to O(50) per program. Hostile wire shapes that
// ship thousands of junk entries are clipped before the filter loop.
const RAW_OWASP_CATEGORIES_MAX = 50;

interface ProgramsResponse {
  readonly programs?: readonly unknown[];
}

interface SubmissionsResponse {
  readonly submissions?: readonly unknown[];
}

// Architect Q4 — `HUNTER_RANK_TO_BELT` + `HUNTER_RANK_TO_TAG`
// relocated to `./_components/hunter-derive.ts` alongside their sole
// consumers (`deriveHunters` + `rankToBelt` + `rankToTag`).

export const MAX_RONIN_QUEUE_DISPLAYED = 64;
export const MAX_RONIN_HUNTERS_DISPLAYED = MAX_RONIN_HUNTERS_DISPLAYED_INTERNAL;
export const MAX_RONIN_PROGRAMS_DISPLAYED = BOUNTY_LIST_MAX_ENTRIES;

// Caps live in `./_components/types.ts` so sub-component renderers
// stay in lock-step with the orchestrator's sanitizer. Re-imported
// above; nothing to declare locally.

function isSubmissionStatus(v: unknown): v is SubmissionStatus {
  return (
    v === "draft" ||
    v === "submitted" ||
    v === "triaged" ||
    v === "validated" ||
    v === "paid" ||
    v === "rejected"
  );
}

function isSubmissionSeverity(v: unknown): v is SubmissionSeverity {
  return (
    v === "critical" ||
    v === "high" ||
    v === "medium" ||
    v === "low" ||
    v === "info"
  );
}

function isProgramStatus(v: unknown): v is ProgramStatus {
  return v === "active" || v === "paused" || v === "upcoming" || v === "closed";
}

function isPlatform(v: unknown): v is BountyPlatform {
  return v === "hackerone" || v === "bugcrowd" || v === "huntr" || v === "0din";
}

/**
 * Pass-1 fold-in (mirrors TICKET-G3-BUKI MED): wire-shape validator for
 * `AivssScore`. Without this, `SubmissionLite.aivss` would be unreachable
 * and the row's `s.aivss ?? null` guard would always fall through to
 * client-side derivation — making the optional field dead code that would
 * silently stay broken when TICKET-G3-API ships server-side AIVSS values.
 * Returns null on any shape mismatch so consumers fall back to the
 * client-side derivation.
 */
function isAivssSeverity(value: unknown): value is AivssScore["severity"] {
  return (
    value === "critical" ||
    value === "high" ||
    value === "medium" ||
    value === "low" ||
    value === "none"
  );
}

function sanitizeAivss(raw: unknown): AivssScore | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.base !== "number" || !Number.isFinite(r.base)) return null;
  if (!isAivssSeverity(r.severity)) return null;
  if (typeof r.vector !== "string") return null;
  const temporal =
    typeof r.temporal === "number" && Number.isFinite(r.temporal)
      ? r.temporal
      : null;
  const environmental =
    typeof r.environmental === "number" && Number.isFinite(r.environmental)
      ? r.environmental
      : null;
  return {
    base: r.base,
    temporal,
    environmental,
    severity: r.severity,
    vector: r.vector,
  };
}

function sanitizeSubmission(raw: unknown): SubmissionLite | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string") return null;
  if (typeof r.programId !== "string") return null;
  if (typeof r.programName !== "string") return null;
  if (typeof r.title !== "string") return null;
  if (!isSubmissionStatus(r.status)) return null;
  if (!isSubmissionSeverity(r.severity)) return null;
  const cvssScore = Number.isFinite(r.cvssScore)
    ? Math.max(0, Math.min(10, Number(r.cvssScore)))
    : 0;
  const finalScore = Number.isFinite(r.finalScore)
    ? Math.max(0, Math.min(10, Number(r.finalScore)))
    : 0;
  const payout =
    typeof r.payout === "number" && Number.isFinite(r.payout) && r.payout >= 0
      ? Math.min(r.payout, 1_000_000)
      : null;
  const createdAt =
    typeof r.createdAt === "string" ? cap(r.createdAt, TS_MAX) : "";
  // Pass-1 fold-in (TICKET-G3-BUKI lesson): forward `aivss` from wire when
  // present. Server-side AIVSS lands here when TICKET-G3-API ships; until
  // then `r.aivss` is `undefined` and the per-row client-side derivation
  // runs as the fallback.
  const aivss = sanitizeAivss(r.aivss);
  return {
    id: cap(r.id, ID_MAX),
    programId: cap(r.programId, ID_MAX),
    programName: cap(r.programName, PROGRAM_NAME_MAX),
    title: cap(r.title, TITLE_MAX),
    status: r.status,
    severity: r.severity,
    cvssScore,
    finalScore,
    payout,
    createdAt,
    ...(aivss !== null ? { aivss } : {}),
  };
}

function sanitizeProgram(raw: unknown): ProgramLite | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string") return null;
  if (typeof r.name !== "string") return null;
  if (typeof r.company !== "string") return null;
  if (!isPlatform(r.platform)) return null;
  if (!isProgramStatus(r.status)) return null;
  if (typeof r.scopeSummary !== "string") return null;
  const rewardMin = Number.isFinite(r.rewardMin)
    ? Math.max(0, Math.floor(Number(r.rewardMin)))
    : 0;
  const rewardMax = Number.isFinite(r.rewardMax)
    ? Math.max(0, Math.floor(Number(r.rewardMax)))
    : 0;
  const currency = typeof r.currency === "string" ? cap(r.currency, 8) : "USD";
  // E-A9 Phase 2 polish — `subscribed` is optional on the wire; only
  // forward when it's strictly `true` so missing/null/0/"" all map to
  // "not subscribed". Avoids a subtle UX bug where a truthy non-bool
  // wire value would flip the filter on for that row.
  const subscribed: true | undefined = r.subscribed === true ? true : undefined;
  // E-A9 Phase 2 polish — narrow `owaspAiCategories: string[]` (wire)
  // through `isOwaspLlmCategory` predicate to the closed
  // `OwaspLlmCategoryId` vocabulary. Unknown ids are filtered, not
  // coerced. Dedupe + cap at the full 10-id vocabulary so even a hostile
  // wire shape can't blow up the chip row.
  //
  // Adversarial-review LOW-1 fix — hard cap `rawCategories.length` at
  // RAW_OWASP_CATEGORIES_MAX BEFORE the loop so a hostile wire that ships
  // thousands of junk entries can't pay an O(n) cost per render. The
  // existing `seen.size >= OWASP_LLM_CHIPS_PER_PROGRAM_MAX` break only
  // fires when 10 valid ids are found — an all-junk array would iterate
  // fully without the input cap.
  const rawCategoriesUnclamped = Array.isArray(r.owaspAiCategories)
    ? r.owaspAiCategories
    : [];
  const rawCategories = rawCategoriesUnclamped.slice(
    0,
    RAW_OWASP_CATEGORIES_MAX,
  );
  const seen = new Set<OwaspLlmCategoryId>();
  for (const c of rawCategories) {
    if (isOwaspLlmCategory(c)) seen.add(c);
    if (seen.size >= OWASP_LLM_CHIPS_PER_PROGRAM_MAX) break;
  }
  // Architect MED-2 fix — sort by canonical OWASP_LLM_CATEGORY_IDS order
  // (LLM01..LLM10) so chips render consistently across cards regardless
  // of wire order. `Set` preserves insertion order which leaks attacker
  // ordering into the rendered UI.
  const owaspLlmCoverage: readonly OwaspLlmCategoryId[] | undefined =
    seen.size > 0
      ? OWASP_LLM_CATEGORY_IDS.filter((id) => seen.has(id))
      : undefined;
  return {
    id: cap(r.id, ID_MAX),
    name: cap(r.name, NAME_MAX),
    company: cap(r.company, COMPANY_MAX),
    platform: r.platform,
    status: r.status,
    scopeSummary: cap(r.scopeSummary, SCOPE_MAX),
    rewardMin,
    rewardMax,
    currency,
    ...(subscribed !== undefined ? { subscribed } : {}),
    ...(owaspLlmCoverage !== undefined ? { owaspLlmCoverage } : {}),
  };
}

// Currency code → symbol projection. Closed against the small set of
// codes the bounty programs use today; unknown codes fall back to the
// plain-text code so a runtime widening cannot inject attacker text
// into the rendered string.
const CURRENCY_SYMBOL: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
};

function payoutFmt(n: number, currency: string): string {
  // Manual formatter — defends against locale variance during SSR
  // hydration. `currency` is already capped at sanitization (see
  // sanitizeProgram). Unknown codes render as `<CODE> <amount>` so
  // the operator can still read the number even when the symbol map
  // misses; mapped codes render with the canonical currency glyph.
  //
  // F-8-013 (Wave 3kk) — the digit-grouping piece is routed through
  // the centralized `formatNumber()` helper so locale lives in one
  // place; the symbol/code prefix logic stays put because (a) the
  // allowlist is a tighter security boundary than Intl currency-style
  // resolution and (b) the SSR-portability rationale above still
  // applies to the glyph selection.
  const safe = Math.max(0, Math.floor(n));
  const formatted = formatNumber(safe);
  const sym = CURRENCY_SYMBOL[currency];
  if (sym) return `${sym}${formatted}`;
  return `${currency} ${formatted}`;
}

function rangeFmt(min: number, max: number, currency: string): string {
  return `${payoutFmt(min, currency)}–${payoutFmt(max, currency)}`;
}

// Architect Q4 — hunter-row derivation + rank-tier helpers extracted
// to `./_components/hunter-derive.ts`. The orchestrator imports them
// above; nothing to declare locally.

export function RoninAdminClient() {
  const [outerTab, setOuterTab] = useState<RoninOuterTab>("submissions");
  const [mountedOuterTabs, setMountedOuterTabs] = useState<
    ReadonlySet<RoninOuterTab>
  >(() => new Set(["submissions"]));

  useEffect(() => {
    setMountedOuterTabs((previous) => {
      if (previous.has(outerTab)) return previous;
      return new Set([...previous, outerTab]);
    });
  }, [outerTab]);
  const [programs, setPrograms] = useState<readonly ProgramLite[]>([]);
  const [submissions, setSubmissions] = useState<readonly SubmissionLite[]>([]);
  const [refDataError, setRefDataError] = useState<string | null>(null);

  // E-A9 Phase B — filter-row state (V1-FULL scope per Step 1 Q2):
  // text search filters program name + company; closed-enum dropdowns
  // for platform + status. E-A9 Phase 2 polish wired the previously-
  // disabled "Subscribed" toggle to a real `subscribedOnly` boolean
  // that filters to `subscribed === true` rows.
  const [programSearch, setProgramSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [subscribedOnly, setSubscribedOnly] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [pRes, sRes] = await Promise.all([
          fetchWithAuth("/api/ronin/programs", { cache: "no-store" }),
          fetchWithAuth("/api/ronin/submissions", { cache: "no-store" }),
        ]);
        if (cancelled) return;

        if (!pRes.ok) {
          setRefDataError("Bounty programs unavailable");
          return;
        }
        const pBody: unknown = await pRes.json().catch(() => null);
        const safePrograms: ProgramLite[] = [];
        if (pBody && typeof pBody === "object") {
          const list = (pBody as ProgramsResponse).programs;
          if (Array.isArray(list)) {
            for (const item of list) {
              const p = sanitizeProgram(item);
              if (p) safePrograms.push(p);
            }
          }
        }
        if (cancelled) return;
        setPrograms(safePrograms.slice(0, MAX_RONIN_PROGRAMS_DISPLAYED));

        const safeSubmissions: SubmissionLite[] = [];
        if (sRes.ok) {
          const sBody: unknown = await sRes.json().catch(() => null);
          if (sBody && typeof sBody === "object") {
            const list = (sBody as SubmissionsResponse).submissions;
            if (Array.isArray(list)) {
              for (const item of list) {
                const sub = sanitizeSubmission(item);
                if (sub) safeSubmissions.push(sub);
              }
            }
          }
        }
        if (cancelled) return;
        setSubmissions(safeSubmissions.slice(0, MAX_RONIN_QUEUE_DISPLAYED));
      } catch {
        if (!cancelled) setRefDataError("Network error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalPrograms = programs.length;
  const totalSubmissions = submissions.length;
  const openSubmissions = useMemo(
    () =>
      submissions.filter((s) => s.status !== "paid" && s.status !== "rejected")
        .length,
    [submissions],
  );
  const paidPayout = useMemo(
    () =>
      submissions
        .filter((s) => s.status === "paid")
        .reduce((acc, s) => acc + (s.payout ?? 0), 0),
    [submissions],
  );
  // P2d (audit D2) — "Verified" = confirmed bypasses (validated or paid).
  const verifiedCount = useMemo(
    () =>
      submissions.filter((s) => s.status === "validated" || s.status === "paid")
        .length,
    [submissions],
  );

  const hunters = useMemo(() => deriveHunters(submissions), [submissions]);

  const queueRows = useMemo(() => {
    return [...submissions]
      .sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity])
      .slice(0, MAX_RONIN_QUEUE_DISPLAYED);
  }, [submissions]);

  // E-A9 Phase B — the prior `bountyEntries: BountyEntry[]` useMemo +
  // `<BountyList entries={...}>` consumer were dropped when the V1 3-col
  // program-card grid replaced the BountyList row list (Step 1 Q1). The
  // program card renders status pill + payout range directly from
  // ProgramLite fields via PROGRAM_STATUS_LABEL + PROGRAM_SEVERITY_TO_SEV_LEVEL.
  // The BountyList primitive itself remains in @/design/primitives/BountyList
  // for other consumers; only the local consumer site was removed.

  // V1-FULL filter row predicate (Step 1 Q2): text search filters program
  // name + company; closed-enum platform + status dropdowns short-circuit
  // on 'all'. E-A9 Phase 2 polish — `subscribedOnly` boolean filter
  // narrows to `subscribed === true` rows (off → no-op). Cap to
  // MAX_RONIN_PROGRAMS_DISPLAYED preserved.
  const filteredPrograms = useMemo(() => {
    const needle = programSearch.trim().toLowerCase();
    return programs
      .filter((p) => {
        if (subscribedOnly && p.subscribed !== true) return false;
        if (platformFilter !== "all" && p.platform !== platformFilter)
          return false;
        if (statusFilter !== "all" && p.status !== statusFilter) return false;
        if (needle.length === 0) return true;
        return (
          p.name.toLowerCase().includes(needle) ||
          p.company.toLowerCase().includes(needle)
        );
      })
      .slice(0, MAX_RONIN_PROGRAMS_DISPLAYED);
  }, [programs, programSearch, platformFilter, statusFilter, subscribedOnly]);

  const kvRows: readonly KVRow[] = useMemo(() => {
    const programByName = new Map<string, number>();
    for (const s of submissions) {
      programByName.set(
        s.programName,
        (programByName.get(s.programName) ?? 0) + 1,
      );
    }
    const top = Array.from(programByName.entries()).sort(
      (a, b) => b[1] - a[1],
    )[0];
    const platformMix = programs.reduce<
      Partial<Record<BountyPlatform, number>>
    >((acc, p) => {
      acc[p.platform] = (acc[p.platform] ?? 0) + 1;
      return acc;
    }, {});
    const topPlatform = Object.entries(platformMix).sort(
      (a, b) => (b[1] ?? 0) - (a[1] ?? 0),
    )[0] as [BountyPlatform, number] | undefined;
    return [
      { k: "Top program", v: top ? `${top[0]} · ${top[1]}` : "—" },
      {
        k: "Top platform",
        v: topPlatform
          ? `${PLATFORM_LABEL[topPlatform[0]]} · ${topPlatform[1]}`
          : "—",
      },
      {
        k: "Open / paid",
        v: `${openSubmissions} / ${submissions.length - openSubmissions}`,
      },
      { k: "Paid total", v: payoutFmt(paidPayout, "USD") },
    ];
  }, [submissions, programs, openSubmissions, paidPayout]);

  const liveLabel =
    totalSubmissions > 0
      ? `LIVE · ${totalSubmissions} submissions`
      : "LIVE · standby";

  return (
    <>
      <PageHead
        title="Ronin Hub"
        jp="浪人"
        lede="Bounty hub. Submission queue, hunter leaderboard, and the live program registry — all severity-coded and CVSS-ranked."
      />

      {/* P2d (audit D3) — the view's single torii-red primary "New
          submission", restored per the wave-g2 reference (the prior red-
          demotion + settings-gear were undone when the founder fired the
          plan). Clicking switches to the wizard tab. */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <button
          type="button"
          className="btn btn-primary btn-sm"
          data-testid="ronin-new-submission-trigger"
          onClick={() => setOuterTab("wizard")}
        >
          New submission
        </button>
      </div>

      {/* P2d (audit D2) — KPI band renders in every state (the founder-fired
          plan supersedes the flag-off suppression). Values are ink; honest
          live zeros render dim via the strip's §5.2 value-color law. */}
      <KpiStrip
        module="ronin"
        testId="ronin-kpi-strip"
        items={
          [
            {
              label: "Submissions",
              value: totalSubmissions,
              delta: {
                direction: "flat",
                value:
                  totalSubmissions > 0 ? "on the queue" : "none received yet",
              },
            },
            {
              label: "Verified",
              value: verifiedCount,
              delta: { direction: "flat", value: "confirmed bypasses" },
            },
            {
              label: "Programs",
              value: totalPrograms,
              delta: { direction: "flat", value: "registered" },
            },
            {
              label: "Payouts",
              value: paidPayout > 0 ? payoutFmt(paidPayout, "USD") : "—",
              delta: { direction: "flat", value: "rules publish at launch" },
            },
          ] satisfies KpiStripItem[]
        }
      />

      <div style={{ marginTop: 16, marginBottom: 12 }}>
        <SegmentedSubTabs
          items={
            OUTER_TAB_ORDER.map((id) => ({
              id,
              label: OUTER_TAB_LABEL[id],
              testId: `ronin-tab-${id}`,
            })) satisfies SegmentedSubTabItem[]
          }
          active={outerTab}
          onChange={(id) => {
            if (isRoninOuterTab(id)) setOuterTab(id);
          }}
          ariaLabel="Ronin outer tabs"
          testId="ronin-outer-tabs"
          externalPanelIdPrefix="ronin-panel"
          externalMountedPanelIds={[...mountedOuterTabs]}
        />
      </div>

      {(mountedOuterTabs.has("wizard") || outerTab === "wizard") && (
        <section
          {...externalSegmentedPanelProps("ronin-panel", "wizard")}
          hidden={outerTab !== "wizard"}
          data-testid="ronin-tab-body-wizard"
        >
          <SubmissionWizardPanel />
        </section>
      )}

      {(mountedOuterTabs.has("planning") || outerTab === "planning") && (
        <section
          {...externalSegmentedPanelProps("ronin-panel", "planning")}
          hidden={outerTab !== "planning"}
          data-testid="ronin-tab-body-planning"
        >
          <PlanningTab />
        </section>
      )}

      {(mountedOuterTabs.has("intelligence") ||
        outerTab === "intelligence") && (
        <section
          {...externalSegmentedPanelProps("ronin-panel", "intelligence")}
          hidden={outerTab !== "intelligence"}
          data-testid="ronin-tab-body-intelligence"
        >
          <IntelligenceTab />
        </section>
      )}

      {(mountedOuterTabs.has("submissions") || outerTab === "submissions") && (
        <section
          {...externalSegmentedPanelProps("ronin-panel", "submissions")}
          hidden={outerTab !== "submissions"}
          data-testid="ronin-tab-body-submissions"
        >
          {/*
        Stage 2 design-audit (Path A): RONIN_DATA_PRESENT flag gate.

        Critical finding BU-CRITICAL-2 ("page-as-brochure for unbuilt
        feature"): the 4-Panel stack (KpiStrip → Submission queue →
        Hunter leaderboard → Bounty programs → Hub summary) renders
        ~3 viewports of fixture data for a feature the founder has
        never used. UI-011 product-level critique. Until a real bounty
        runs, surface a single one-viewport EmptyState pointing at
        the wizard tab as the actual entry point.

        Flag: `NEXT_PUBLIC_RONIN_DATA_PRESENT` (build-time env). Default
        false (founder's current state). Flip to true when first real
        bounty runs OR when a customer demo needs the full surface.
        Build-time env lets the gate ship without runtime store
        coupling — the surface stays static + fast + reviewable.

        When false: single EmptyState + CTA to the New-submission
        wizard tab (which still mounts on its own tab unconditionally
        — operator can always start a submission).

        When true: existing 4-Panel stack renders unchanged. All
        existing tests + data flow preserved.
      */}
          {process.env.NEXT_PUBLIC_RONIN_DATA_PRESENT === "true" ? (
            <>
              {refDataError !== null && (
                <div
                  role="alert"
                  data-testid="ronin-refdata-error"
                  className="yr4-banner tone-red"
                >
                  {refDataError}
                </div>
              )}

              <Panel
                title="Submission queue"
                sub="Severity-ranked bug-bounty submissions · last 64"
                meta={
                  <span
                    className={`chip gold yr4-gold-pulse`}
                    aria-label={`Ronin ${liveLabel}`}
                    data-testid="ronin-live-chip"
                  >
                    <span className="dot" aria-hidden="true" />
                    {liveLabel}
                  </span>
                }
              >
                {/* PR #3 component split — submission queue rows extracted to
            `./_components/SubmissionQueue`. */}
                <SubmissionQueue rows={queueRows} />
              </Panel>

              {/*
        E-A9 founder eye-test 2026-05-20 — Ronin Programs body REBUILT.
        Was: Hunter leaderboard + Bounty programs side-by-side in
        `yr4-section-grid` (2-col), which squeezed the Bounty programs
        "3-col card grid" into a single column inside the right pane.
        Founder reported: "Ronin still not there, condensed, needs
        spacing, lack coherence, 10km long boxes, very far from V1."
        Now: Hunter leaderboard panel renders full-width above; Bounty
        programs panel renders full-width below with the program-card
        grid using all available horizontal space (3+ cols at 1440px).
        Each card chrome beefed up: padding 12 → 18, border-radius
        6 → 10, gradient bg, shadow, more breathing room between fields.
      */}
              <Panel
                title="Hunter leaderboard"
                sub="Synthesized from submission attribution · top 100"
              >
                {/* PR #3 component split — hunter rows extracted to
            `./_components/HunterLeaderboardPanel`. Architect LOW-2
            fixup — `rankToBelt`/`rankToTag` are imported directly by
            the panel (pure module exports); only `payoutFmt`
            (orchestrator-local) is injected. */}
                <HunterLeaderboardPanel
                  hunters={hunters}
                  payoutFmt={payoutFmt}
                />
              </Panel>

              <Panel
                title="Bounty programs"
                sub="Curated registry · severity-coded by lifecycle"
              >
                {/* PR #3 component split — V1-FULL filter row extracted to
              `./_components/ProgramFilterRow`. */}
                <ProgramFilterRow
                  search={programSearch}
                  platform={platformFilter}
                  status={statusFilter}
                  subscribedOnly={subscribedOnly}
                  onSearchChange={setProgramSearch}
                  onPlatformChange={setPlatformFilter}
                  onStatusChange={setStatusFilter}
                  onSubscribedOnlyChange={setSubscribedOnly}
                />

                {programs.length === 0 ? (
                  <p className="wb-hint" data-testid="ronin-programs-empty">
                    No bounty programs surfaced.
                  </p>
                ) : filteredPrograms.length === 0 ? (
                  <p
                    className="wb-hint"
                    data-testid="ronin-programs-filtered-empty"
                  >
                    No programs match the current filter.
                  </p>
                ) : (
                  <div
                    className="ronin-program-grid"
                    role="list"
                    aria-label="Ronin bounty program list"
                    data-testid="ronin-programs-list"
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(300px, 1fr))",
                      gap: 20,
                    }}
                  >
                    {filteredPrograms.map((p) => (
                      <ProgramCard
                        key={p.id}
                        program={p}
                        formatRange={rangeFmt}
                      />
                    ))}
                  </div>
                )}
              </Panel>

              <Panel
                title="Hub summary"
                sub="Top program · platform mix · payout totals"
              >
                {/* Architect Q4 — Hub summary KV + per-status mix list
            extracted to `./_components/HubSummaryPanel` to land the
            orchestrator under the 800-LOC cap. */}
                <HubSummaryPanel kvRows={kvRows} programs={programs} />
              </Panel>
            </>
          ) : (
            /* P2c D1+D6+D8 (research-intake audit) — flag-off Submissions
               tab restored to the design's two-column layout. P2d NEW-1 —
               the queue rows pass through so the panel count agrees with
               its body (an empty state only when the queue is truly empty).
               See `./_components/SubmissionsEmptySection`. */
            <SubmissionsEmptySection rows={queueRows} />
          )}
        </section>
      )}
    </>
  );
}
