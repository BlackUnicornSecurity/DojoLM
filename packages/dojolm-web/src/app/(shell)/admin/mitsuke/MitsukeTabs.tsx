// SPDX-License-Identifier: Apache-2.0
"use client";

import { useMemo, useState, type ReactElement } from "react";
import { deriveIndicatorAivss, IndicatorRow } from "./IndicatorRow";
import {
  deriveSourceStatus,
  INDICATOR_TYPES,
  INDICATOR_TYPE_LABEL,
  MAX_SOURCE_CHIPS,
  SEVERITIES,
  SEVERITY_LABEL,
  SEVERITY_SEVW,
  SOURCE_STATUS_LABEL,
  SOURCE_STATUS_TONE,
  SOURCE_TYPE_LABEL,
  isIndicatorType,
  isMitsukeSeverity,
  type IndicatorType,
  type MitsukeSeverity,
  type ThreatEntry,
  type ThreatIndicator,
  type ThreatSource,
  type TriageTemplate,
} from "./mitsuke-tab-data";

export * from "./mitsuke-tab-data";
function TerminalEmpty({
  testId,
  title,
  sub,
}: {
  readonly testId: string;
  readonly title: string;
  readonly sub: string;
}): ReactElement {
  return (
    <div role="status" data-testid={testId} className="yr4-banner tone-gold">
      <strong>{title}</strong>
      <span>{sub}</span>
    </div>
  );
}
// ---------------------------------------------------------------------------
// Entries tab
// ---------------------------------------------------------------------------

interface EntriesTabProps {
  readonly entries: readonly ThreatEntry[];
  readonly severityFilter: MitsukeSeverity | "all";
  readonly onSeverityChange: (s: MitsukeSeverity | "all") => void;
  readonly sourceFilter: string | null;
  readonly onSourceChange: (s: string | null) => void;
  readonly onRowClick: (entry: ThreatEntry) => void;
}

function EntryRow({
  entry,
  onClick,
}: {
  entry: ThreatEntry;
  onClick: (entry: ThreatEntry) => void;
}): ReactElement {
  return (
    <button
      type="button"
      data-testid={`mitsuke-entry-row-${entry.id}`}
      onClick={() => onClick(entry)}
      className="mitsuke-entry-row"
    >
      {/* §1.4 severity words (.sevw) — chip.red on HIGH was the audited
          legacy violation; word tiers carry the ramp instead. */}
      <span
        className={`sevw ${SEVERITY_SEVW[entry.severity]}`}
        aria-label={`Severity ${SEVERITY_LABEL[entry.severity].toLowerCase()}`}
      >
        {SEVERITY_LABEL[entry.severity]}
      </span>
      <span className="mitsuke-entry-title">{entry.title}</span>
      <span className="wb-hint mitsuke-entry-source">{entry.source}</span>
      <span className="wb-hint mitsuke-entry-seen">
        {entry.lastSeen.replace("T", " ").slice(0, 16)}
      </span>
    </button>
  );
}

export function EntriesTab({
  entries,
  severityFilter,
  onSeverityChange,
  sourceFilter,
  onSourceChange,
  onRowClick,
}: EntriesTabProps): ReactElement {
  const sourceList = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) set.add(e.source);
    return Array.from(set).sort();
  }, [entries]);
  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (severityFilter !== "all" && e.severity !== severityFilter)
        return false;
      if (sourceFilter !== null && e.source !== sourceFilter) return false;
      return true;
    });
  }, [entries, severityFilter, sourceFilter]);
  return (
    <div data-testid="mitsuke-tab-entries">
      <div
        className="yr4-button-row"
        style={{ alignItems: "center", flexWrap: "wrap", gap: 8 }}
      >
        <label className="wb-field" htmlFor="mitsuke-severity-filter">
          <span className="wb-hint" style={{ fontSize: 11 }}>
            Severity
          </span>
          <select
            id="mitsuke-severity-filter"
            data-testid="mitsuke-severity-filter"
            className="wb-input"
            value={severityFilter}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "all" || isMitsukeSeverity(v)) onSeverityChange(v);
            }}
          >
            <option value="all">All severities</option>
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {SEVERITY_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        {/*
          Source-chip strip. Each chip's text content is the operator-
          facing display name of the threat-feed source — these are
          NOT closed-enum values; they're free-form names registered
          via `/api/mitsuke/sources` POST and sanitized through
          `cap(SOURCE_MAX=64)`. Treat them as opaque display strings:
          we never let a source name reach an aria-label that implies
          a closed taxonomy. The chip's accessible name is constructed
          via a fixed-vocabulary `aria-label` prefix (R-T1 fold-in,
          security MED-1) so screen readers announce
          "Source filter: <name>" rather than the bare name. The
          `data-testid` interpolation is testid scope only (not parsed
          by browsers as code).
        */}
        <div
          data-testid="mitsuke-source-chips"
          className="mitsuke-source-strip"
          style={{ display: "flex", flexWrap: "wrap", gap: 4 }}
        >
          <button
            type="button"
            className={`chip mitsuke-source-chip ${sourceFilter === null ? "gold" : ""}`.trim()}
            data-testid="mitsuke-source-chip-all"
            onClick={() => onSourceChange(null)}
            aria-pressed={sourceFilter === null}
            aria-label="Source filter: all sources"
          >
            All sources
          </button>
          {sourceList.slice(0, MAX_SOURCE_CHIPS).map((src) => (
            <button
              key={src}
              type="button"
              className={`chip mitsuke-source-chip ${sourceFilter === src ? "gold" : ""}`.trim()}
              data-testid={`mitsuke-source-chip-${src}`}
              onClick={() => onSourceChange(src)}
              aria-pressed={sourceFilter === src}
              aria-label={`Source filter: ${src}`}
            >
              {src}
            </button>
          ))}
        </div>
      </div>
      {filtered.length === 0 ? (
        <p className="wb-hint" data-testid="mitsuke-entries-empty">
          No entries match the current filters.
        </p>
      ) : (
        <div
          role="list"
          aria-label="Mitsuke threat entries"
          data-testid="mitsuke-entries-list"
        >
          {filtered.map((entry) => (
            <EntryRow key={entry.id} entry={entry} onClick={onRowClick} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sources tab
// ---------------------------------------------------------------------------

export function SourcesTab({
  sources,
}: {
  sources: readonly ThreatSource[];
}): ReactElement {
  if (sources.length === 0) {
    return (
      <div data-testid="mitsuke-tab-sources">
        <TerminalEmpty
          title="No sources registered"
          sub="Source registration is not available on this screen."
          testId="mitsuke-sources-empty"
        />
      </div>
    );
  }
  return (
    <div
      data-testid="mitsuke-tab-sources"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 8,
      }}
    >
      {sources.map((s) => {
        const status = deriveSourceStatus(s);
        return (
          <div
            key={s.id}
            data-testid={`mitsuke-source-card-${s.id}`}
            data-status={status}
            style={{
              border: "1px solid var(--b-1, #2a2a2a)",
              borderRadius: 6,
              padding: 10,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <strong style={{ fontSize: 13 }}>{s.name}</strong>
              <span
                className={`chip ${SOURCE_STATUS_TONE[status]}`}
                aria-label={`Source ${SOURCE_STATUS_LABEL[status].toLowerCase()}`}
              >
                {SOURCE_STATUS_LABEL[status]}
              </span>
            </div>
            <span className="wb-hint" style={{ fontSize: 11 }}>
              {SOURCE_TYPE_LABEL[s.type]} · refresh every{" "}
              {s.refreshIntervalMinutes}m
            </span>
            <span className="wb-hint" style={{ fontSize: 11 }}>
              Last fetch: {s.lastFetched ?? "never"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Indicators tab
// ---------------------------------------------------------------------------

interface IndicatorsTabProps {
  readonly indicators: readonly ThreatIndicator[];
  readonly query: string;
  readonly onQueryChange: (q: string) => void;
  readonly typeFilter: IndicatorType | "all";
  readonly onTypeChange: (t: IndicatorType | "all") => void;
  readonly searchInvalid: boolean;
}

const SEARCH_MAX = 64;

// P2d (audit D9) — sentence-case band labels + dot tiers for the grouped
// indicator table; the design collapses Medium/Low/Info at rest.
const BAND_LABEL: Record<MitsukeSeverity, string> = {
  CRITICAL: "Critical",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
  INFO: "Info",
};
const BAND_DOT: Record<MitsukeSeverity, string> = {
  CRITICAL: "crit",
  HIGH: "high",
  MEDIUM: "med",
  LOW: "low",
  INFO: "none",
};
const CLOSED_AT_REST: readonly MitsukeSeverity[] = ["MEDIUM", "LOW", "INFO"];

export function IndicatorsTab({
  indicators,
  query,
  onQueryChange,
  typeFilter,
  onTypeChange,
  searchInvalid,
}: IndicatorsTabProps): ReactElement {
  const [closedBands, setClosedBands] = useState<ReadonlySet<MitsukeSeverity>>(
    () => new Set(CLOSED_AT_REST),
  );
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return indicators.filter((i) => {
      if (typeFilter !== "all" && i.type !== typeFilter) return false;
      if (
        q.length > 0 &&
        !i.value.toLowerCase().includes(q) &&
        !i.source.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [indicators, query, typeFilter]);
  // Severity bands in ramp order; empty bands are not rendered. Band AIVSS
  // is the honest max of the derived per-indicator scores.
  const bands = useMemo(
    () =>
      SEVERITIES.map((sev) => {
        const rows = filtered.filter((i) => i.severity === sev);
        let max: number | null = null;
        for (const row of rows) {
          const score = deriveIndicatorAivss(row);
          if (score !== null && (max === null || score.base > max)) {
            max = score.base;
          }
        }
        return { sev, rows, max };
      }).filter((band) => band.rows.length > 0),
    [filtered],
  );
  const toggleBand = (sev: MitsukeSeverity): void => {
    setClosedBands((prev) => {
      const next = new Set(prev);
      if (next.has(sev)) next.delete(sev);
      else next.add(sev);
      return next;
    });
  };
  return (
    <div data-testid="mitsuke-tab-indicators">
      {/* P2d (audit D11) — the reference filter row: value/source filter +
          type select + shown-count. */}
      <div className="filters">
        <input
          id="mitsuke-indicator-search"
          data-testid="mitsuke-indicator-search"
          className="fin"
          type="search"
          value={query}
          maxLength={SEARCH_MAX}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Filter by value or source…"
          aria-label="Filter indicators"
          aria-invalid={searchInvalid}
          autoComplete="off"
        />
        <select
          id="mitsuke-indicator-type"
          data-testid="mitsuke-indicator-type"
          aria-label="Indicator type"
          value={typeFilter}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "all" || isIndicatorType(v)) onTypeChange(v);
          }}
        >
          <option value="all">All types</option>
          {INDICATOR_TYPES.map((t) => (
            <option key={t} value={t}>
              {INDICATOR_TYPE_LABEL[t]}
            </option>
          ))}
        </select>
        <span className="cnt" data-testid="mitsuke-indicator-count">
          {filtered.length} of {indicators.length} shown
        </span>
      </div>
      {searchInvalid && (
        <p
          role="alert"
          data-testid="mitsuke-indicator-search-invalid"
          className="wb-hint"
          style={{ color: "var(--torii-hi)" }}
        >
          Search must be alphanumerics, spaces, or punctuation (`. - _ &`) only.
        </p>
      )}
      {/* Deep data view — labelled keyboard-scroll region (Hallmark
          responsive contract): role + aria-label + tabIndex on the
          overflow container so it's reachable and announced. */}
      <div
        className="v2-data-scroll"
        role="region"
        aria-label="Threat indicators"
        tabIndex={0}
        style={{ marginTop: 12 }}
      >
        <table className="ctable" data-testid="mitsuke-indicators-list">
          <thead>
            <tr>
              <th scope="col" style={{ width: 84 }}>
                Type
              </th>
              <th scope="col">Value</th>
              <th scope="col">Source</th>
              <th scope="col" className="num" style={{ width: 76 }}>
                AIVSS
              </th>
            </tr>
          </thead>
          {bands.map(({ sev, rows, max }) => {
            const closed = closedBands.has(sev);
            return (
              <tbody
                key={sev}
                className={closed ? "grp closed" : "grp"}
                data-sev={BAND_LABEL[sev]}
              >
                <tr className="grp-row">
                  <td colSpan={4}>
                    <button
                      type="button"
                      className="grp-btn"
                      aria-expanded={!closed}
                      data-testid={`mitsuke-band-${sev}`}
                      onClick={() => toggleBand(sev)}
                    >
                      <span className="car" aria-hidden="true">
                        ▾
                      </span>
                      <span
                        className={`sev ${BAND_DOT[sev]}`}
                        aria-hidden="true"
                      />
                      {BAND_LABEL[sev]}
                      <span className="meta">
                        {rows.length}{" "}
                        {rows.length === 1 ? "indicator" : "indicators"}
                        {max !== null ? ` · AIVSS ${max.toFixed(1)}` : ""}
                      </span>
                    </button>
                  </td>
                </tr>
                {rows.map((i) => (
                  <IndicatorRow key={i.id} indicator={i} />
                ))}
              </tbody>
            );
          })}
          {filtered.length === 0 && (
            <tbody>
              <tr>
                <td
                  className="filter-empty"
                  colSpan={4}
                  data-testid="mitsuke-indicators-empty"
                >
                  No indicators match these filters.
                  <button
                    type="button"
                    className="link-steel"
                    data-testid="mitsuke-indicators-clear"
                    onClick={() => {
                      onQueryChange("");
                      onTypeChange("all");
                    }}
                  >
                    Clear filters
                  </button>
                </td>
              </tr>
            </tbody>
          )}
        </table>
      </div>
      <div className="tbl-foot" data-testid="mitsuke-indicators-foot">
        {filtered.length} {filtered.length === 1 ? "indicator" : "indicators"} ·
        one page — scores are self-attested by the feed
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Triage tab
// ---------------------------------------------------------------------------

interface TriageTabProps {
  readonly templates: readonly TriageTemplate[];
  readonly onEdit: (template: TriageTemplate) => void;
  readonly onRevert: (template: TriageTemplate) => void;
  readonly onCreate: () => void;
  readonly isOverridden: (id: string) => boolean;
  readonly isAuthored: (id: string) => boolean;
}

export function TriageTab({
  templates,
  onEdit,
  onRevert,
  onCreate,
  isOverridden,
  isAuthored,
}: TriageTabProps): ReactElement {
  return (
    <div
      data-testid="mitsuke-tab-triage"
      style={{ display: "flex", flexDirection: "column", gap: 12 }}
    >
      <div className="yr4-button-row" style={{ justifyContent: "flex-end" }}>
        <button
          type="button"
          className="wb-btn primary"
          data-testid="mitsuke-triage-create"
          onClick={onCreate}
        >
          + New template
        </button>
      </div>
      {templates.length === 0 ? (
        <TerminalEmpty
          title="No triage templates"
          sub="Author your first template via + New template."
          testId="mitsuke-triage-empty"
        />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(260px, 100%), 1fr))",
            gap: 8,
          }}
        >
          {templates.map((t) => {
            const overridden = isOverridden(t.id);
            const authored = isAuthored(t.id);
            return (
              <div
                key={t.id}
                data-testid={`mitsuke-triage-card-${t.id}`}
                data-overridden={overridden ? "true" : "false"}
                data-authored={authored ? "true" : "false"}
                style={{
                  border: "1px solid var(--b-1, #2a2a2a)",
                  borderRadius: 6,
                  padding: 10,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <strong style={{ fontSize: 13 }}>{t.name}</strong>
                  <span
                    className={`sevw ${SEVERITY_SEVW[t.severity]}`}
                    aria-label={`Severity ${SEVERITY_LABEL[t.severity].toLowerCase()}`}
                  >
                    {SEVERITY_LABEL[t.severity]}
                  </span>
                </div>
                <p className="wb-hint" style={{ fontSize: 12 }}>
                  {t.description}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {t.triggerTypes.map((tt) => (
                    <span
                      key={tt}
                      className="chip steel"
                      aria-label={`Trigger type ${INDICATOR_TYPE_LABEL[tt]}`}
                    >
                      {INDICATOR_TYPE_LABEL[tt]}
                    </span>
                  ))}
                </div>
                {(overridden || authored) && (
                  <span
                    className="chip gold"
                    data-testid={`mitsuke-triage-badge-${t.id}`}
                    aria-label={
                      authored ? "Authored by you" : "Customised override"
                    }
                    style={{ alignSelf: "flex-start", fontSize: 11 }}
                  >
                    {authored ? "Authored" : "Override"}
                  </span>
                )}
                <div
                  className="yr4-button-row"
                  style={{ justifyContent: "flex-end", gap: 4 }}
                >
                  <button
                    type="button"
                    className="wb-btn"
                    data-testid={`mitsuke-triage-edit-${t.id}`}
                    onClick={() => onEdit(t)}
                  >
                    Edit
                  </button>
                  {(overridden || authored) && (
                    <button
                      type="button"
                      className="wb-btn"
                      data-testid={`mitsuke-triage-revert-${t.id}`}
                      onClick={() => onRevert(t)}
                    >
                      {authored ? "Delete" : "Revert"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
