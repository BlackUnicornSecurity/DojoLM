// SPDX-License-Identifier: Apache-2.0
/**
 * MitsukeClient — YR.19 / Mitsuke ticket
 * (the v1-v2-restore-mitsuke-views backlog item).
 *
 * 4-tab workbench replacing the YR.4.8 single-screen codex archetype
 * per execution-plan §YR.19 ("placeholders REPLACED, not extended").
 *
 *   - Entries — list + severity filter + source chip strip + row-click
 *     detail `<Drawer>` (see `MitsukeTabs.EntriesTab`).
 *   - Sources — card grid driven by closed `SOURCE_STATUS` map.
 *   - Indicators — search + type filter; closed IndicatorType enum.
 *   - Triage templates — read-only cards.
 *
 * Heavy subcomponents + sanitizers + closed maps live in
 * `./MitsukeTabs.tsx` to keep this parent under the 800-line ceiling
 * (mirrors YR.18 JutsuClient → CompareTab + AddProviderDrawer pattern).
 *
 * Endpoints are GET-only; CSRF inventory delta is zero. POST
 * `/api/mitsuke/sources` (source registration) remains an admin-write
 * surface tracked in `csrf-inventory.md` for YR.20+ tightening.
 */

"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
} from "react";
import {
  PageHead,
  Panel,
  KpiStrip,
  type KpiStripItem,
  externalSegmentedPanelProps,
  SegmentedSubTabs,
  type SegmentedSubTabItem,
} from "@/design";
import { RefBlock } from "@/design/shell/RefBlock";
// HAGANE E3.S3 — ?sev/?src URL state (page wraps in <Suspense>).
import { useSearchParams } from "next/navigation";
// HAGANE E3.S5 — saved filter views.
import { useViewPresets } from "@/lib/view-presets";
import { ViewPresetMenu } from "@/design/primitives/ViewPresetMenu";
import { Drawer } from "@/design/codex/Drawer";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { readCsrfToken } from "@/lib/csrf-cookie";
import {
  SEVERITIES,
  EntriesTab,
  IndicatorsTab,
  SEVERITY_LABEL,
  SourcesTab,
  TriageTab,
  sanitizeEntry,
  sanitizeIndicator,
  sanitizeSource,
  sanitizeTriageTemplate,
  type IndicatorType,
  type MitsukeSeverity,
  type MitsukeTabId,
  type ThreatEntry,
  type ThreatIndicator,
  type ThreatSource,
  type TriageTemplate,
} from "./MitsukeTabs";
import {
  TriageEditDrawer,
  type TriageEditorTarget,
} from "./MitsukeTriageEditor";

// P2d (audit D1/D8) — Indicators first + active on load per the wave-g2
// reference ("indicators-first" UAT rule); each tab carries its live count.

// Closed `LoadErrorCode` map — pass-1 fold-in (code-reviewer M-1 +
// security MED-2). Mirrors KagamiClient/KotobaClient ErrorCode pattern
// so a future setLoadError(serverDerivedString) call can't leak free
// text into the operator banner. R-T1.
type LoadErrorCode = "feed-unavailable" | "network";
const LOAD_ERROR_COPY: Record<LoadErrorCode, string> = {
  "feed-unavailable": "Threat feed unavailable. Refresh in a moment.",
  network: "Network error. Try again.",
};

// Closed revert-error map (T8.1) — every banner string is hardcoded.
type RevertErrorCode = "forbidden" | "not-found" | "network" | "server";
const REVERT_ERROR_COPY: Record<RevertErrorCode, string> = {
  forbidden: "Admin role required to revert.",
  "not-found": "No override or authored template with that id.",
  network: "Network error. Try again.",
  server: "Server error. Try again in a moment.",
};

const AUTHORED_PREFIX = "auth-";

const MAX_ENTRIES = 200;
const MAX_INDICATORS = 200;
const MAX_SOURCES = 32;
const MAX_TEMPLATES = 64;
const SEARCH_PATTERN = /^[A-Za-z0-9_ .\-&]*$/;

export function MitsukeClient(): ReactElement {
  const [tab, setTab] = useState<MitsukeTabId>("indicators");
  const [entries, setEntries] = useState<readonly ThreatEntry[]>([]);
  const [indicators, setIndicators] = useState<readonly ThreatIndicator[]>([]);
  const [sources, setSources] = useState<readonly ThreatSource[]>([]);
  const [templates, setTemplates] = useState<readonly TriageTemplate[]>([]);
  const [overriddenIds, setOverriddenIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [authoredIds, setAuthoredIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [loadError, setLoadError] = useState<LoadErrorCode | null>(null);
  const [revertError, setRevertError] = useState<RevertErrorCode | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorTarget, setEditorTarget] = useState<TriageEditorTarget | null>(
    null,
  );

  // HAGANE E3.S3 — hydrate ?sev=/?src= (closed-enum guarded severity;
  // free-string source is length-capped) + replaceState sync so filter
  // state survives refresh/share (audit M2).
  const searchParams = useSearchParams();
  const [severityFilter, setSeverityFilterState] = useState<
    MitsukeSeverity | "all"
  >(() => {
    const v = searchParams.get("sev");
    return v !== null && (SEVERITIES as readonly string[]).includes(v)
      ? (v as MitsukeSeverity)
      : "all";
  });
  const [sourceFilter, setSourceFilterState] = useState<string | null>(() => {
    const v = searchParams.get("src");
    return v !== null && v.length > 0 && v.length <= 120 ? v : null;
  });
  const syncFilterUrl = useCallback(
    (sev: MitsukeSeverity | "all", src: string | null) => {
      const url = new URL(window.location.href);
      if (sev === "all") url.searchParams.delete("sev");
      else url.searchParams.set("sev", sev);
      if (src === null) url.searchParams.delete("src");
      else url.searchParams.set("src", src);
      window.history.replaceState(null, "", url.toString());
    },
    [],
  );
  const setSeverityFilter = useCallback(
    (sev: MitsukeSeverity | "all") => {
      setSeverityFilterState(sev);
      syncFilterUrl(sev, sourceFilter);
    },
    [sourceFilter, syncFilterUrl],
  );
  const setSourceFilter = useCallback(
    (src: string | null) => {
      setSourceFilterState(src);
      syncFilterUrl(severityFilter, src);
    },
    [severityFilter, syncFilterUrl],
  );
  // HAGANE remediation R3 (caught by e2e HR-9) — preset apply previously
  // called setSeverityFilter + setSourceFilter back-to-back; the second
  // call's closure still held the OLD severity, so its syncFilterUrl
  // clobbered ?sev= right back off the URL. One atomic setter keeps
  // state and URL consistent.
  const applyFilters = useCallback(
    (sev: MitsukeSeverity | "all", src: string | null) => {
      setSeverityFilterState(sev);
      setSourceFilterState(src);
      syncFilterUrl(sev, src);
    },
    [syncFilterUrl],
  );

  // HAGANE E3.S5 — named filter presets (validated on read; applying a
  // preset routes through the URL-synced setters).
  interface MitsukeViewPreset {
    readonly sev: MitsukeSeverity | "all";
    readonly src: string | null;
  }
  const isMitsukeViewPreset = (v: unknown): v is MitsukeViewPreset => {
    if (typeof v !== "object" || v === null) return false;
    const r = v as Record<string, unknown>;
    const sevOk =
      r.sev === "all" ||
      (typeof r.sev === "string" &&
        (SEVERITIES as readonly string[]).includes(r.sev));
    const srcOk =
      r.src === null || (typeof r.src === "string" && r.src.length <= 120);
    return sevOk && srcOk;
  };
  const viewPresets = useViewPresets<MitsukeViewPreset>(
    "mitsuke-view-presets-v1",
    isMitsukeViewPreset,
  );
  const [indicatorQuery, setIndicatorQuery] = useState("");
  const [indicatorType, setIndicatorType] = useState<IndicatorType | "all">(
    "all",
  );
  const [drawer, setDrawer] = useState<ThreatEntry | null>(null);

  // mountedRef pattern (reviewer pass-1 fold-in): every async
  // continuation that writes state below checks `mountedRef.current`
  // first so an unmount mid-await cannot leak a state write into the
  // unmounted tree. Matches the discipline established in
  // ArenaLive.tsx + AmaterasuBlackBox.tsx + MitsukeTriageEditor.tsx.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Initial templates fetch is wrapped so a Save can re-fetch and surface
  // the freshly-applied override without forcing a full page reload.
  const reloadTemplates = useCallback(async (): Promise<void> => {
    try {
      const res = await fetchWithAuth(
        "/api/mitsuke/triage-templates?limit=200",
        {
          cache: "no-store",
        },
      );
      if (!res.ok) return;
      const body: unknown = await res.json().catch(() => null);
      const safe: TriageTemplate[] = [];
      let overriddenSet = new Set<string>();
      let authoredSet = new Set<string>();
      if (
        body &&
        typeof body === "object" &&
        Array.isArray((body as { templates?: unknown[] }).templates)
      ) {
        for (const item of (body as { templates: unknown[] }).templates) {
          const tt = sanitizeTriageTemplate(item);
          if (tt) safe.push(tt);
        }
        const ovr = (body as { overriddenIds?: unknown }).overriddenIds;
        if (Array.isArray(ovr)) {
          overriddenSet = new Set(
            ovr.filter((s): s is string => typeof s === "string"),
          );
        }
        const aut = (body as { authoredIds?: unknown }).authoredIds;
        if (Array.isArray(aut)) {
          authoredSet = new Set(
            aut.filter((s): s is string => typeof s === "string"),
          );
        }
      }
      if (!mountedRef.current) return;
      setTemplates(safe.slice(0, MAX_TEMPLATES));
      setOverriddenIds(overriddenSet);
      setAuthoredIds(authoredSet);
    } catch {
      // Silent — operator triggered the reload; an error here just means
      // the optimistic in-place state stays.
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [eRes, iRes, sRes, tRes] = await Promise.all([
          fetchWithAuth("/api/mitsuke/entries?limit=200", {
            cache: "no-store",
          }),
          fetchWithAuth("/api/mitsuke/indicators?limit=200", {
            cache: "no-store",
          }),
          fetchWithAuth("/api/mitsuke/sources", { cache: "no-store" }),
          fetchWithAuth("/api/mitsuke/triage-templates?limit=200", {
            cache: "no-store",
          }),
        ]);
        if (cancelled) return;

        if (!eRes.ok) {
          if (!cancelled) setLoadError("feed-unavailable");
        } else {
          const eBody: unknown = await eRes.json().catch(() => null);
          const safe: ThreatEntry[] = [];
          if (
            eBody &&
            typeof eBody === "object" &&
            Array.isArray((eBody as { entries?: unknown[] }).entries)
          ) {
            for (const item of (eBody as { entries: unknown[] }).entries) {
              const e = sanitizeEntry(item);
              if (e) safe.push(e);
            }
          }
          if (!cancelled) setEntries(safe.slice(0, MAX_ENTRIES));
        }

        if (iRes.ok) {
          const iBody: unknown = await iRes.json().catch(() => null);
          const safe: ThreatIndicator[] = [];
          if (
            iBody &&
            typeof iBody === "object" &&
            Array.isArray((iBody as { indicators?: unknown[] }).indicators)
          ) {
            for (const item of (iBody as { indicators: unknown[] })
              .indicators) {
              const ind = sanitizeIndicator(item);
              if (ind) safe.push(ind);
            }
          }
          if (!cancelled) setIndicators(safe.slice(0, MAX_INDICATORS));
        }

        if (sRes.ok) {
          const sBody: unknown = await sRes.json().catch(() => null);
          const safe: ThreatSource[] = [];
          if (
            sBody &&
            typeof sBody === "object" &&
            Array.isArray((sBody as { sources?: unknown[] }).sources)
          ) {
            for (const item of (sBody as { sources: unknown[] }).sources) {
              const ss = sanitizeSource(item);
              if (ss) safe.push(ss);
            }
          }
          if (!cancelled) setSources(safe.slice(0, MAX_SOURCES));
        }

        if (tRes.ok) {
          const tBody: unknown = await tRes.json().catch(() => null);
          const safe: TriageTemplate[] = [];
          let overriddenSet = new Set<string>();
          let authoredSet = new Set<string>();
          if (
            tBody &&
            typeof tBody === "object" &&
            Array.isArray((tBody as { templates?: unknown[] }).templates)
          ) {
            for (const item of (tBody as { templates: unknown[] }).templates) {
              const tt = sanitizeTriageTemplate(item);
              if (tt) safe.push(tt);
            }
            const ovr = (tBody as { overriddenIds?: unknown }).overriddenIds;
            if (Array.isArray(ovr)) {
              overriddenSet = new Set(
                ovr.filter((s): s is string => typeof s === "string"),
              );
            }
            const aut = (tBody as { authoredIds?: unknown }).authoredIds;
            if (Array.isArray(aut)) {
              authoredSet = new Set(
                aut.filter((s): s is string => typeof s === "string"),
              );
            }
          }
          if (!cancelled) {
            setTemplates(safe.slice(0, MAX_TEMPLATES));
            setOverriddenIds(overriddenSet);
            setAuthoredIds(authoredSet);
          }
        }
      } catch {
        if (!cancelled) setLoadError("network");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onTabChange = useCallback((id: string) => {
    if (
      id === "entries" ||
      id === "sources" ||
      id === "indicators" ||
      id === "triage"
    ) {
      setTab(id);
    }
  }, []);

  const isOverridden = useCallback(
    (id: string) => overriddenIds.has(id),
    [overriddenIds],
  );
  const isAuthored = useCallback(
    (id: string) => authoredIds.has(id) || id.startsWith(AUTHORED_PREFIX),
    [authoredIds],
  );

  const onCreateTemplate = useCallback(() => {
    setEditorTarget({
      mode: "create",
      template: {
        id: "",
        name: "",
        description: "",
        severity: "MEDIUM",
        triggerTypes: [],
        steps: [],
        expectedOutcome: "",
        tags: [],
      },
    });
    setEditorOpen(true);
    setRevertError(null);
  }, []);

  const onEditTemplate = useCallback(
    (template: TriageTemplate) => {
      const mode: TriageEditorTarget["mode"] = isAuthored(template.id)
        ? "edit-authored"
        : "edit-bundled";
      setEditorTarget({ mode, template });
      setEditorOpen(true);
      setRevertError(null);
    },
    [isAuthored],
  );

  const onCloseEditor = useCallback(() => {
    setEditorOpen(false);
    setEditorTarget(null);
  }, []);

  const onSavedEditor = useCallback(() => {
    void reloadTemplates();
  }, [reloadTemplates]);

  const onRevertTemplate = useCallback(
    async (template: TriageTemplate) => {
      setRevertError(null);
      try {
        const csrf = readCsrfToken();
        const res = await fetch(
          `/api/mitsuke/triage-templates/${encodeURIComponent(template.id)}`,
          {
            method: "DELETE",
            credentials: "same-origin",
            headers: csrf ? { "x-csrf-token": csrf } : {},
          },
        );
        if (!mountedRef.current) return;
        if (!res.ok) {
          if (res.status === 401 || res.status === 403)
            setRevertError("forbidden");
          else if (res.status === 404) setRevertError("not-found");
          else if (res.status >= 500) setRevertError("server");
          else setRevertError("network");
          return;
        }
      } catch {
        if (mountedRef.current) setRevertError("network");
        return;
      }
      // Reload happens AFTER the success-path try/catch closes. A
      // throw inside `reloadTemplates` (it has its own silent catch
      // already; this is belt-and-braces) must not leak into the
      // outer catch and flip the revert banner to "Network error"
      // even though the DELETE succeeded.
      try {
        await reloadTemplates();
      } catch {
        // reloadTemplates is already silent-catch internally.
      }
    },
    [reloadTemplates],
  );

  const totalEntries = entries.length;
  const totalIndicators = indicators.length;
  // P2d (audit D2) — the reference KPI set derives from the indicator feed,
  // not the entries list: confirmed-critical indicators + distinct sources
  // referenced by indicators. All honest live-data derivations.
  const criticalIndicators = useMemo(
    () => indicators.filter((i) => i.severity === "CRITICAL").length,
    [indicators],
  );
  const sourcesReferenced = useMemo(
    () => new Set(indicators.map((i) => i.source)).size,
    [indicators],
  );

  const tabs = useMemo<readonly SegmentedSubTabItem[]>(
    () => [
      {
        id: "indicators",
        label: "Indicators",
        badge: { count: totalIndicators },
      },
      { id: "entries", label: "Entries", badge: { count: totalEntries } },
      { id: "sources", label: "Sources", badge: { count: sources.length } },
      {
        id: "triage",
        label: "Triage templates",
        badge: { count: templates.length },
      },
    ],
    [totalIndicators, totalEntries, sources.length, templates.length],
  );

  const searchInvalid = useMemo(
    () => indicatorQuery.length > 0 && !SEARCH_PATTERN.test(indicatorQuery),
    [indicatorQuery],
  );

  return (
    <>
      <PageHead
        namingId="mitsuke"
        title="Mitsuke"
        jp="見つけ"
        actions={
          /* P2d (audit D3) — the view's single torii-red primary, per the
             wave-g2 reference header. ponytail: no indicators POST endpoint
             exists yet, so the primary lands on the feed; wire it to the
             add-indicator form when TICKET-G3-API ships the write path. */
          <button
            type="button"
            className="btn btn-primary btn-sm"
            data-testid="mitsuke-add-indicator"
            onClick={() => setTab("indicators")}
          >
            Add indicator
          </button>
        }
      />

      {/* P2d (audit D2) — reference KPI set/order/captions; values are ink
          (no tones), zeros render dim via the strip's §5.2 law. */}
      <KpiStrip
        module="mitsuke"
        testId="mitsuke-kpi-strip"
        items={
          [
            {
              label: "Indicators",
              value: totalIndicators,
              delta: { direction: "flat", value: "on the feed" },
            },
            {
              label: "Confirmed critical",
              value: criticalIndicators,
              delta: {
                direction: "flat",
                value: `of ${totalIndicators} indicators`,
              },
            },
            {
              label: "Sources referenced",
              value: sourcesReferenced,
              delta: { direction: "flat", value: "feeds & rulesets" },
            },
            {
              label: "Intel entries",
              value: totalEntries,
              delta: {
                direction: "flat",
                value:
                  totalEntries === 0 ? "none written yet" : "analyst write-ups",
              },
            },
          ] satisfies KpiStripItem[]
        }
      />

      {loadError !== null && (
        <div
          role="alert"
          data-testid="mitsuke-load-error"
          className="yr4-banner tone-red"
        >
          {LOAD_ERROR_COPY[loadError]}
        </div>
      )}

      {/* P2d (audit D1/D6/D8) — the sub-tab strip sits under the KPIs and
          each section owns its designed panel header; the "4-tab workbench"
          jargon panel is retired. */}
      <SegmentedSubTabs
        items={tabs}
        active={tab}
        onChange={onTabChange}
        ariaLabel="Threat intel sections"
        externalPanelIdPrefix="mitsuke-panel"
      />
      <div
        {...externalSegmentedPanelProps("mitsuke-panel", tab)}
        style={{ marginTop: 12 }}
      >
        {tab === "indicators" && (
          <Panel
            title="Indicator feed"
            headingLevel={2}
            sub="Severity derives from the AIVSS band"
          >
            <IndicatorsTab
              indicators={indicators}
              query={indicatorQuery}
              onQueryChange={setIndicatorQuery}
              typeFilter={indicatorType}
              onTypeChange={setIndicatorType}
              searchInvalid={searchInvalid}
            />
          </Panel>
        )}
        {tab === "entries" && (
          <Panel
            title="Intel entries"
            headingLevel={2}
            sub="Analyst write-ups built from indicators"
          >
            <div style={{ marginBottom: 10 }}>
              <ViewPresetMenu
                presets={viewPresets.presets}
                error={viewPresets.error}
                onApply={(p) => applyFilters(p.sev, p.src)}
                onSave={(name) =>
                  viewPresets.save(name, {
                    sev: severityFilter,
                    src: sourceFilter,
                  })
                }
                onDelete={viewPresets.remove}
                testId="mitsuke-view-presets"
              />
            </div>
            <EntriesTab
              entries={entries}
              severityFilter={severityFilter}
              onSeverityChange={setSeverityFilter}
              sourceFilter={sourceFilter}
              onSourceChange={setSourceFilter}
              onRowClick={setDrawer}
            />
          </Panel>
        )}
        {tab === "sources" && (
          <Panel
            title="Feed sources"
            headingLevel={2}
            sub={`${sourcesReferenced} sources referenced by the ${totalIndicators} indicators on the feed`}
          >
            <SourcesTab sources={sources} />
          </Panel>
        )}
        {tab === "triage" && (
          <Panel
            title="Triage templates"
            headingLevel={2}
            sub="Response paths matched against incoming indicators"
          >
            {revertError !== null && (
              <div
                role="alert"
                data-testid="mitsuke-triage-revert-error"
                className="yr4-banner tone-red"
                style={{ marginBottom: 8 }}
              >
                {REVERT_ERROR_COPY[revertError]}
              </div>
            )}
            <TriageTab
              templates={templates}
              onEdit={onEditTemplate}
              onRevert={onRevertTemplate}
              onCreate={onCreateTemplate}
              isOverridden={isOverridden}
              isAuthored={isAuthored}
            />
          </Panel>
        )}
      </div>

      {/* P2c (2026-07-16) — audit D7: the Leaks cross-link card below the
          main panel, verbatim from wave-g2 "Threat Intel v2.html". */}
      <div style={{ marginTop: 12 }}>
        <RefBlock
          kj="漏"
          title="Leaks"
          sub="The read-only evidence ledger this pipeline feeds"
          href="/admin/leaks"
          linkLabel="Open in Leaks →"
        />
      </div>

      <Drawer
        open={drawer !== null}
        onClose={() => setDrawer(null)}
        title={drawer ? `Entry · ${drawer.title}` : "Entry"}
        sub={
          drawer
            ? `Severity: ${SEVERITY_LABEL[drawer.severity]} · Source: ${drawer.source}`
            : ""
        }
        closeLabel="Close drawer"
      >
        {drawer && (
          <div
            data-testid="mitsuke-entry-drawer"
            className="yr4-kv-stack"
            style={{ padding: 12 }}
          >
            <dl
              style={{
                display: "grid",
                gridTemplateColumns: "120px 1fr",
                gap: 4,
                fontSize: 12,
              }}
            >
              <dt className="wb-hint">Threat type</dt>
              <dd>{drawer.threatType}</dd>
              <dt className="wb-hint">First seen</dt>
              <dd>{drawer.firstSeen}</dd>
              <dt className="wb-hint">Last seen</dt>
              <dd>{drawer.lastSeen}</dd>
              <dt className="wb-hint">Source</dt>
              <dd>{drawer.source}</dd>
            </dl>
            {drawer.indicators.length > 0 && (
              <div>
                <div
                  className="wb-hint"
                  style={{ fontSize: 11, marginBottom: 4 }}
                >
                  Indicators
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {drawer.indicators.map((ind, idx) => (
                    <span
                      key={`${drawer.id}-ind-${idx}`}
                      className="chip steel"
                      style={{ fontFamily: "monospace", fontSize: 11 }}
                    >
                      {ind}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>

      <TriageEditDrawer
        open={editorOpen}
        target={editorTarget}
        onClose={onCloseEditor}
        onSaved={onSavedEditor}
      />
    </>
  );
}

export type { MitsukeSeverity, IndicatorType, MitsukeTabId };
