// SPDX-License-Identifier: Apache-2.0
/**
 * SengokuClient — YR.4.5 client component for `/admin/sengoku`.
 *
 * Live-wires the v2.1 Sengoku campaign scheduler:
 *   - GET /api/sengoku/campaigns → { campaigns: Campaign[] }
 *   - 4 MCard tiles: total campaigns, active, paused, archived
 *   - CpnRow per campaign (capped, status-mapped via static map)
 *   - SchedulerList (cron-cadence summary for scheduled campaigns)
 *   - KV details panel
 *   - FeedRow ticker for recent campaign updates
 *
 * Discriminant-redaction:
 *   - CAMPAIGN_TO_CPN maps CampaignStatus → CpnRowStatus
 *   - CAMPAIGN_TO_SCHEDULER maps CampaignStatus → SchedulerListStatus
 *   - CAMPAIGN_TO_FEED_KIND maps CampaignStatus → FeedTagKind
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PageHead,
  Panel,
  KpiStrip,
  type KpiStripItem,
  SegmentedSubTabs,
  externalSegmentedPanelProps,
  type SegmentedSubTabItem,
  cap,
} from "@/design";
import { FeedRow, type FeedTagKind } from "@/design";
import type { Severity as FeedSeverity } from "@/design";
import { RunsTab, OrchestratorTab } from "./SengokuTabs";

// YR.20 outer-tab strip per gap-matrix G-029 / G-030. Wraps the
// existing single-screen Campaigns workbench with sibling Runs +
// Orchestrator tabs. Per stop condition: no drag-drop DAG canvas
// today (zero-deps mandate excludes a charting library; pure-SVG DAG
// layout is YR.21 closeout). The tabs are list/table-driven, which
// closes G-029 / G-030 with read-only parity.
type SengokuOuterTab = "campaigns" | "runs" | "orchestrator";
const OUTER_TAB_LABEL: Record<SengokuOuterTab, string> = {
  campaigns: "Campaigns",
  runs: "Temporal runs",
  orchestrator: "Orchestrator",
};
const OUTER_TAB_ORDER: readonly SengokuOuterTab[] = [
  "campaigns",
  "runs",
  "orchestrator",
];

const OUTER_TAB_ITEMS: readonly SegmentedSubTabItem[] = OUTER_TAB_ORDER.map(
  (id) => ({ id, label: OUTER_TAB_LABEL[id], testId: `sengoku-tab-${id}` }),
);

function isSengokuOuterTab(id: string): id is SengokuOuterTab {
  return (OUTER_TAB_ORDER as readonly string[]).includes(id);
}

type CampaignStatus = "draft" | "active" | "paused" | "completed" | "archived";

interface Campaign {
  readonly id: string;
  readonly name: string;
  readonly targetUrl: string;
  readonly status: CampaignStatus;
  readonly schedule: string | null;
  readonly selectedSkillIds: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface CampaignsResponse {
  readonly campaigns?: readonly unknown[];
}

// P2d (audit D5) — flat campaign rows carry a designed status chip (dot +
// sentence-case label), not a boxed mono card. Running=jade, Queued=gold,
// Done=neutral — matches the wave-g2 reference.
interface CampaignChip {
  readonly cls: string;
  readonly dot: string;
  readonly label: string;
}
const CAMPAIGN_CHIP: Record<CampaignStatus, CampaignChip> = {
  active: { cls: "chip jade", dot: "dot", label: "Running" },
  draft: { cls: "chip warn", dot: "dot", label: "Queued" },
  paused: { cls: "chip warn", dot: "dot", label: "Queued" },
  completed: { cls: "chip", dot: "dot quiet", label: "Done" },
  archived: { cls: "chip", dot: "dot quiet", label: "Done" },
};

// P2d (audit D7/D8) — honest date formatting. The feed shows a short
// "Mon DD" date and the scheduler shows the cron + last-update timestamp;
// neither leaks the raw ISO string that collided with the row body in prod.
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
function parseIso(iso: string): Date | null {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}
const pad2 = (n: number) => String(n).padStart(2, "0");
function shortDate(iso: string): string {
  const d = parseIso(iso);
  return d ? `${MONTHS[d.getUTCMonth()]} ${pad2(d.getUTCDate())}` : "—";
}
function dateOnly(iso: string): string {
  const d = parseIso(iso);
  return d
    ? `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`
    : "—";
}
function dateTime(iso: string): string {
  const d = parseIso(iso);
  return d
    ? `${dateOnly(iso)} ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`
    : "—";
}

// Honest cadence helper (audit D5) — derives the secondary line from the
// live campaign fields; no fabricated "runs Mondays 09:00" copy.
function campaignCadence(c: Campaign): string {
  const base = `${c.selectedSkillIds.length} payloads`;
  switch (c.status) {
    case "completed":
      return `${base} · completed ${dateOnly(c.updatedAt)}`;
    case "archived":
      return `${base} · archived`;
    case "draft":
      return `${base} · not scheduled`;
    case "paused":
      return c.schedule ? `${base} · schedule paused` : `${base} · not scheduled`;
    default:
      return c.schedule ? `${base} · cron ${c.schedule}` : base;
  }
}

const CAMPAIGN_TO_FEED_KIND: Record<CampaignStatus, FeedTagKind> = {
  active: "allow",
  draft: "muted",
  paused: "warn",
  completed: "log",
  archived: "muted",
};

const CAMPAIGN_TO_FEED_SEV: Record<CampaignStatus, FeedSeverity> = {
  active: "low",
  draft: "low",
  paused: "med",
  completed: "low",
  archived: "low",
};

const CAMPAIGN_LABEL: Record<CampaignStatus, string> = {
  active: "active",
  draft: "draft",
  paused: "paused",
  completed: "completed",
  archived: "archived",
};

export const MAX_CAMPAIGNS_DISPLAYED = 50;
export const MAX_SCHEDULED_DISPLAYED = 50;
export const MAX_FEED_DISPLAYED = 12;
const NAME_MAX = 200;
const SCHEDULE_MAX = 64;

function isCampaignStatus(value: unknown): value is CampaignStatus {
  return (
    value === "draft" ||
    value === "active" ||
    value === "paused" ||
    value === "completed" ||
    value === "archived"
  );
}

function sanitizeCampaign(raw: unknown): Campaign | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.name !== "string") return null;
  if (typeof r.targetUrl !== "string") return null;
  if (!isCampaignStatus(r.status)) return null;
  const skills = Array.isArray(r.selectedSkillIds)
    ? r.selectedSkillIds.filter((s): s is string => typeof s === "string")
    : [];
  return {
    id: r.id,
    name: r.name,
    targetUrl: r.targetUrl,
    status: r.status,
    schedule: typeof r.schedule === "string" ? r.schedule : null,
    selectedSkillIds: skills,
    createdAt: typeof r.createdAt === "string" ? r.createdAt : "",
    updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : "",
  };
}

export function SengokuClient() {
  const [outerTab, setOuterTab] = useState<SengokuOuterTab>("campaigns");
  const [mountedOuterTabs, setMountedOuterTabs] = useState<
    ReadonlySet<SengokuOuterTab>
  >(() => new Set(["campaigns"]));

  useEffect(() => {
    setMountedOuterTabs((previous) => {
      if (previous.has(outerTab)) return previous;
      return new Set([...previous, outerTab]);
    });
  }, [outerTab]);
  const [campaigns, setCampaigns] = useState<readonly Campaign[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // CONT-R2-005 — bumped when the Orchestrator completes a run so the
  // sibling (already-mounted) Runs tab refetches without a page reload.
  const [runsRefreshToken, setRunsRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/sengoku/campaigns", {
          cache: "no-store",
        });
        const body = (await res.json().catch(() => ({}))) as CampaignsResponse;
        if (cancelled) return;
        if (!res.ok) {
          setError("Sengoku unavailable");
          setCampaigns([]);
        } else {
          const safe: Campaign[] = [];
          for (const raw of body.campaigns ?? []) {
            const c = sanitizeCampaign(raw);
            if (c) safe.push(c);
          }
          setCampaigns(safe);
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setError("Network error");
          setCampaigns([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cappedCampaigns = useMemo(
    () => campaigns.slice(0, MAX_CAMPAIGNS_DISPLAYED),
    [campaigns],
  );

  const totalCampaigns = campaigns.length;
  const activeCount = useMemo(
    () => campaigns.filter((c) => c.status === "active").length,
    [campaigns],
  );
  const pausedCount = useMemo(
    () => campaigns.filter((c) => c.status === "paused").length,
    [campaigns],
  );
  const archivedCount = useMemo(
    () => campaigns.filter((c) => c.status === "archived").length,
    [campaigns],
  );

  const scheduledCampaigns = useMemo(
    () =>
      campaigns
        .filter((c) => c.schedule !== null)
        .slice(0, MAX_SCHEDULED_DISPLAYED),
    [campaigns],
  );

  const feedEntries = useMemo(
    () => campaigns.slice(0, MAX_FEED_DISPLAYED),
    [campaigns],
  );

  // P2d (audit D10) — tab strip carries the live campaign count badge; the
  // orchestrator/runs counts live in their own fetched tabs so no badge is
  // fabricated here.
  const outerTabItems = useMemo<readonly SegmentedSubTabItem[]>(
    () =>
      OUTER_TAB_ITEMS.map((item) =>
        item.id === "campaigns"
          ? { ...item, badge: { count: totalCampaigns } }
          : item,
      ),
    [totalCampaigns],
  );

  const cpnPanelSub = loading
    ? "Loading campaigns…"
    : error
      ? cap(error, 80)
      : `${totalCampaigns} registered`;

  return (
    <>
      <PageHead
        namingId="sengoku"
        title="Campaigns"
        jp="戦国"
        actions={
          /* P2d (audit D1) — the view's single torii-red primary, per the
             wave-g2 reference header. ponytail: no campaign-create endpoint
             is wired on this screen yet, so the button just focuses the
             Campaigns tab; wire it to the create flow when the write path
             ships. */
          <button
            type="button"
            className="btn btn-primary btn-sm"
            data-testid="sengoku-new-campaign"
            onClick={() => setOuterTab("campaigns")}
          >
            New campaign
          </button>
        }
      />

      {/* P2d (audit D4/D10) — KPI band above the tab strip; labels auto
          mono-caps, values ink (no tone re-tint), captions per the reference.
          Zeros render dim via the strip's §5.2 value-color law. */}
      <KpiStrip
        module="sengoku"
        testId="sengoku-kpi-strip"
        items={
          [
            {
              label: "Campaigns",
              value: totalCampaigns,
              delta: { direction: "flat", value: "registered" },
            },
            {
              label: "Running",
              value: activeCount,
              delta: {
                direction: "flat",
                value: activeCount > 0 ? "live" : "none live",
              },
            },
            {
              label: "Paused",
              value: pausedCount,
              delta: { direction: "flat", value: "on hold" },
            },
            {
              label: "Archived",
              value: archivedCount,
              delta: {
                direction: "flat",
                value: archivedCount === 0 ? "none yet" : "archived",
              },
            },
          ] satisfies KpiStripItem[]
        }
      />

      <div style={{ marginTop: 16, marginBottom: 12 }}>
        <SegmentedSubTabs
          items={outerTabItems}
          active={outerTab}
          onChange={(id) => {
            if (isSengokuOuterTab(id)) setOuterTab(id);
          }}
          ariaLabel="Sengoku outer tabs"
          testId="sengoku-outer-tabs"
          externalPanelIdPrefix="sengoku-panel"
          externalMountedPanelIds={[...mountedOuterTabs]}
        />
      </div>

      {(mountedOuterTabs.has("runs") || outerTab === "runs") && (
        <div
          {...externalSegmentedPanelProps("sengoku-panel", "runs")}
          hidden={outerTab !== "runs"}
          data-testid="sengoku-tab-body-runs"
        >
          <RunsTab refreshToken={runsRefreshToken} />
        </div>
      )}

      {(mountedOuterTabs.has("orchestrator") ||
        outerTab === "orchestrator") && (
        <div
          {...externalSegmentedPanelProps("sengoku-panel", "orchestrator")}
          hidden={outerTab !== "orchestrator"}
          data-testid="sengoku-tab-body-orchestrator"
        >
          <OrchestratorTab
            onRunComplete={() => setRunsRefreshToken((t) => t + 1)}
          />
        </div>
      )}

      {(mountedOuterTabs.has("campaigns") || outerTab === "campaigns") && (
        <div
          {...externalSegmentedPanelProps("sengoku-panel", "campaigns")}
          hidden={outerTab !== "campaigns"}
        >
          {/* P2d (audit D6) — Campaigns list + Totals paired in the two-column
              band (design .g2-wide); the Scheduler moves full-width below so
              the Totals panel no longer strands dead space. */}
          <div className="g2-wide">
            <Panel title="Campaigns" headingLevel={2} sub={cpnPanelSub}>
              {error !== null && (
                <div
                  role="alert"
                  data-testid="sengoku-error"
                  className="yr4-banner tone-red"
                >
                  {cap(error, 200)}
                </div>
              )}
              {!loading && cappedCampaigns.length === 0 && !error && (
                <p className="wb-hint" data-testid="sengoku-empty">
                  No campaigns yet. Campaign creation is not available on this
                  screen.
                </p>
              )}
              {cappedCampaigns.length > 0 && (
                <div
                  className="yr4-data-list"
                  role="list"
                  data-testid="sengoku-campaigns-list"
                  aria-label="Sengoku campaigns"
                >
                  {cappedCampaigns.map((c) => {
                    const chip = CAMPAIGN_CHIP[c.status];
                    return (
                      <div className="lrow" role="listitem" key={c.id}>
                        <span className="bd">
                          <span className="t">{cap(c.name, NAME_MAX)}</span>
                          <span className="s">{campaignCadence(c)}</span>
                        </span>
                        <span className="end">
                          <span className={chip.cls}>
                            <span className={chip.dot} aria-hidden="true" />
                            {chip.label}
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Panel>

            <Panel title="Totals" headingLevel={2} sub="Across all campaigns">
              <div className="drows">
                <div className="drow">
                  <span className="l">Campaigns</span>
                  <span className="v">{totalCampaigns}</span>
                </div>
                <div className="drow">
                  <span className="l">Running</span>
                  <span className="v">{activeCount}</span>
                </div>
                <div className="drow">
                  <span className="l">Paused</span>
                  <span className="v">{pausedCount}</span>
                </div>
                <div className="drow">
                  <span className="l">Archived</span>
                  <span className={archivedCount === 0 ? "v dim" : "v"}>
                    {archivedCount}
                  </span>
                </div>
                <div className="drow">
                  <span className="l">Scheduled</span>
                  <span className="v">{scheduledCampaigns.length}</span>
                </div>
              </div>
            </Panel>
          </div>

          <div style={{ marginTop: 12 }}>
            <Panel
              title="Scheduler queue"
              headingLevel={2}
              sub="Campaigns with a cadence set"
            >
              {scheduledCampaigns.length === 0 ? (
                <p className="wb-hint" data-testid="sengoku-scheduler-empty">
                  No scheduled campaigns.
                </p>
              ) : (
                <div
                  className="yr4-data-list"
                  role="list"
                  data-testid="sengoku-scheduler-list"
                  aria-label="Sengoku scheduler queue"
                >
                  {scheduledCampaigns.map((c) => {
                    const enabled = c.status === "active";
                    return (
                      <div className="lrow" role="listitem" key={c.id}>
                        <span className="bd">
                          <span className="t">{cap(c.name, NAME_MAX)}</span>
                          <span className="s mono">
                            cron {cap(c.schedule ?? "—", SCHEDULE_MAX)} · last{" "}
                            {dateTime(c.updatedAt)}
                          </span>
                        </span>
                        <span className="end">
                          <span className={enabled ? "chip jade" : "chip"}>
                            <span
                              className={enabled ? "dot" : "dot quiet"}
                              aria-hidden="true"
                            />
                            {enabled ? "Enabled" : "Paused"}
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Panel>
          </div>

          <div style={{ marginTop: 12 }}>
            <Panel
              title="Recent activity"
              headingLevel={2}
              sub="Latest campaign updates"
            >
              {feedEntries.length === 0 ? (
                <p className="wb-hint" data-testid="sengoku-feed-empty">
                  No campaign activity yet.
                </p>
              ) : (
                <div
                  className="yr4-data-list"
                  role="list"
                  data-testid="sengoku-feed-list"
                  aria-label="Sengoku recent activity"
                >
                  {feedEntries.map((c) => {
                    const sev: FeedSeverity = CAMPAIGN_TO_FEED_SEV[c.status];
                    const kind: FeedTagKind = CAMPAIGN_TO_FEED_KIND[c.status];
                    return (
                      <div key={c.id} role="listitem">
                        {/* P2d (audit D7) — short "Mon DD" date, no raw ISO,
                            no target URL: kills the timestamp/name collision. */}
                        <FeedRow
                          ts={shortDate(c.updatedAt)}
                          sev={sev}
                          msg={cap(c.name, NAME_MAX)}
                          tag={{
                            kind,
                            label: CAMPAIGN_LABEL[c.status].toUpperCase(),
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </Panel>
          </div>
        </div>
      )}
    </>
  );
}
