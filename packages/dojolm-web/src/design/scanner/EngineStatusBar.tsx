// SPDX-License-Identifier: Apache-2.0
/**
 * EngineStatusBar — design primitive (TICKET-S-301 / CA-6).
 *
 * 13-cell horizontal status bar mirroring the V1 Scanner Engine Stack.
 * Pure presentational primitive: no fetches, no internal data lookup
 * beyond the `engines` prop; the lib at `lib/scanner/engines.ts`
 * is the single source of truth for engine ids + metadata.
 *
 * Three consumers (operator decision 2026-05-04):
 *   - /admin/scanner page header (TICKET-S-301 — this ticket mounts it)
 *   - /admin/scanner Scanner+Guard combined toggle grid (TICKET-A-405)
 *   - Workbench /console archetype (ADR-0096 §2)
 *
 * Discriminant-redaction (R-T1 §10.16):
 *   - `STATUS_LABEL`, `STATUS_CLASS`, `STATUS_ARIA` are closed
 *     `Record<EngineStatus, ...>` maps. Status strings NEVER reach an
 *     aria-label or className except through these maps.
 *   - `BAND_CLASS` mirrors the same discipline for engine bands.
 *
 * Color + tint via `var(--*)` tokens only (PROTECT=steel, TEST=torii,
 * GOVERN=violet, INTEL=gold, status active=jade, error=torii,
 * pending=gold, inactive=fg-mute). No inline hex.
 *
 * Defensive caps:
 *   - Max 32 entries rendered (R-T1 array-DoS guard) — the canonical
 *     fleet is 13, so this is a 2.5x headroom against malformed
 *     server input.
 *   - Unknown engine ids are dropped (validated against ENGINE_BY_ID)
 *     so a malformed status payload cannot inject arbitrary strings
 *     into aria-labels or className.
 *
 * Renders nothing (`null`) when `engines` is empty — the caller's
 * empty-state copy lives in the page wrapper.
 */

"use client";

import { useMemo, type CSSProperties } from "react";
import {
  DEFAULT_ENGINES,
  ENGINE_BY_ID,
  type EngineBand,
  type EngineStatus,
  type ScannerEngine,
  type ScannerEngineId,
  isEngineStatus,
  isScannerEngineId,
} from "@/lib/scanner/engines";
import { engineDisplayName } from "./engine-display-names";

/**
 * One status entry per engine cell. Caller is responsible for sourcing
 * the live status (e.g. polling a future `/api/scan/engine-status`
 * route or wiring to client state).
 */
export interface EngineStatusEntry {
  readonly engineId: ScannerEngineId;
  readonly status: EngineStatus;
}

export interface EngineStatusBarProps {
  /**
   * Per-engine status entries. Order is irrelevant — the primitive
   * always renders cells in canonical `DEFAULT_ENGINES` order.
   * Engines absent from this list render as `inactive`.
   */
  readonly engines: readonly EngineStatusEntry[];
  /**
   * Override the engine def list. Defaults to the canonical 13.
   * Useful for pixel-test fixtures + Workbench compact variant.
   */
  readonly defs?: readonly ScannerEngine[];
  /** Optional sub-line under the title. */
  readonly sub?: string;
  /** Test id stem. Cells suffix with `-cell-${idx}`. */
  readonly testId?: string;
  /** Wrapper className for spacing/layout overrides. */
  readonly className?: string;
  /**
   * Compact mode (Workbench `/console`-style) — drops the per-cell
   * footer status microreadout to fit a tighter horizontal slot.
   * The cell still carries the status via `data-status` + dot indicator
   * + `aria-label`, so screen readers retain full information.
   */
  readonly compact?: boolean;
  /** Controls variant: omit the duplicate header and decorative band stripes. */
  readonly bare?: boolean;
  /**
   * When set, cells become interactive `<button>` elements and clicking
   * a cell invokes `onChange(engineId)`. Use for the A-405 toggle-grid
   * consumer. When omitted, cells stay as non-interactive `<div>`s
   * (the read-only Scanner status mode used today).
   */
  readonly onChange?: (engineId: ScannerEngineId) => void;
  /**
   * Optional set of engine ids that should display as "selected" in
   * the toggle-grid mode. A-405 consumer passes its current toggle
   * state here; the primitive reflects it via `aria-pressed` +
   * `data-selected` for CSS targeting. Read-only consumers (Scanner
   * mount today) omit this and the primitive treats every cell as
   * not-selected.
   */
  readonly selected?: ReadonlySet<ScannerEngineId>;
}

/**
 * Render-time cap. The canonical fleet is 13; the cap protects against
 * malformed server input that could push hundreds of entries through
 * the renderer (R-T1 §10.16 array-DoS gate, mirrored from
 * HattoriGuardModes.HATTORI_GUARD_MODES_MAX). Anything above 32 is
 * truncated silently.
 */
export const ENGINE_STATUS_BAR_MAX = 32;

/**
 * Closed status → display copy map (R-T1). The user-visible label of a
 * cell ALWAYS goes through this map; raw `status` strings never reach
 * the DOM.
 */
const STATUS_LABEL: Record<EngineStatus, string> = {
  active: "active",
  inactive: "stood down",
  error: "error",
  pending: "pending",
};

/**
 * Closed status → CSS-class-suffix map. Combined with the cell base
 * class to produce `engine-cell engine-cell-status-${suffix}`.
 *
 * The Record<EngineStatus, ...> type means TypeScript will surface a
 * compile error if a new status is added to ENGINE_STATUSES without
 * a matching key here.
 */
const STATUS_CLASS: Record<EngineStatus, string> = {
  active: "engine-cell-status-active",
  inactive: "engine-cell-status-inactive",
  error: "engine-cell-status-error",
  pending: "engine-cell-status-pending",
};

/**
 * Closed status → aria-label fragment map (R-T1). The dot indicator's
 * accessible name is derived ONLY from this map.
 */
const STATUS_ARIA: Record<EngineStatus, string> = {
  active: "engine armed",
  inactive: "engine stood down",
  error: "engine error",
  pending: "engine pending",
};

/**
 * Closed band → CSS-class-suffix map. Bands group cells visually and
 * drive the band-tint hairline above each cell.
 */
const BAND_CLASS: Record<EngineBand, string> = {
  PROTECT: "engine-cell-band-protect",
  TEST: "engine-cell-band-test",
  GOVERN: "engine-cell-band-govern",
  INTEL: "engine-cell-band-intel",
};

/** Empty-string fallback when a widened `defs` entry's `band` is not
 * a member of `EngineBand`. The closed-enum prop type rules this out
 * for typed callers; the fallback is defensive against runtime
 * widening (callers using `as`). Matches the `R-T1` boundary
 * discipline of `buildStatusIndex` for `engineId` / `status`. */
const FALLBACK_BAND_CLASS = "";

// ---------------------------------------------------------------------------
// Inline-style maps — co-located so the primitive renders without a global
// stylesheet import. Mirrors the EngineFilterChips (D-204) pattern. Token
// vars only (R-T1 §10.16); zero inline hex literals.
// ---------------------------------------------------------------------------

const BAND_TINT: Readonly<Record<EngineBand, string>> = Object.freeze({
  PROTECT: "var(--steel-lg)",
  TEST: "var(--torii-lg)",
  GOVERN: "var(--violet-lg)",
  INTEL: "var(--gold-lg)",
});

const STATUS_DOT_COLOR: Readonly<Record<EngineStatus, string>> = Object.freeze({
  active: "var(--jade)",
  error: "var(--torii)",
  pending: "var(--gold)",
  inactive: "var(--fg-mute)",
});

const STATUS_FOOT_COLOR: Readonly<Record<EngineStatus, string>> = Object.freeze(
  {
    active: "var(--jade-lg)",
    error: "var(--torii-lg)",
    pending: "var(--gold-lg)",
    inactive: "var(--fg-mute)",
  },
);

const ROOT_STYLE: CSSProperties = Object.freeze({
  display: "block",
  padding: "10px 12px",
  border: "1px solid var(--b-1)",
  borderRadius: 8,
  background: "var(--bg-2)",
  marginBottom: 16,
});

const HEAD_STYLE: CSSProperties = Object.freeze({
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 8,
});

const TITLE_STYLE: CSSProperties = Object.freeze({
  display: "flex",
  flexDirection: "column",
  gap: 2,
  minWidth: 0,
});

const KICKER_STYLE: CSSProperties = Object.freeze({
  fontFamily: "var(--mono)",
  fontSize: 11,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "var(--fg-dim)",
});

const SUB_STYLE: CSSProperties = Object.freeze({
  fontSize: 12,
  color: "var(--fg-dim)",
});

const COUNT_STYLE: CSSProperties = Object.freeze({
  display: "inline-flex",
  alignItems: "baseline",
  gap: 2,
  fontFamily: "var(--mono)",
  fontSize: 11,
  letterSpacing: "0.1em",
  color: "var(--fg-dim)",
  whiteSpace: "nowrap",
});

const COUNT_NUM_STYLE: CSSProperties = Object.freeze({
  fontWeight: 600,
  color: "var(--fg)",
});

const COUNT_LABEL_STYLE: CSSProperties = Object.freeze({
  marginLeft: 4,
  textTransform: "uppercase",
  color: "var(--fg-dim)",
});

const ROW_BASE_STYLE: CSSProperties = Object.freeze({
  display: "grid",
  gap: 6,
});

const CELL_BASE_STYLE: CSSProperties = Object.freeze({
  position: "relative",
  display: "flex",
  flexDirection: "column",
  gap: 4,
  padding: "8px 6px 6px",
  border: "1px solid var(--b-1)",
  borderRadius: 6,
  background: "var(--bg-1)",
  textAlign: "left",
  cursor: "default",
  overflow: "hidden",
  minWidth: 0,
});

const CELL_BUTTON_RESET: CSSProperties = Object.freeze({
  font: "inherit",
  color: "inherit",
  appearance: "none",
});

const BAND_TINT_STRIPE_STYLE: CSSProperties = Object.freeze({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  height: 2,
  display: "block",
});

const IDX_STYLE: CSSProperties = Object.freeze({
  fontFamily: "var(--mono)",
  fontSize: 11,
  letterSpacing: "0.08em",
  color: "var(--fg-dim)",
});

const ROW_INNER_STYLE: CSSProperties = Object.freeze({
  display: "flex",
  alignItems: "center",
  gap: 6,
  minWidth: 0,
});

const DOT_BASE_STYLE: CSSProperties = Object.freeze({
  width: 6,
  height: 6,
  borderRadius: "50%",
  flex: "0 0 auto",
  display: "inline-block",
});

const LABEL_STYLE: CSSProperties = Object.freeze({
  fontSize: 11,
  fontFamily: "var(--mono)",
  letterSpacing: "0.04em",
  color: "var(--fg)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  minWidth: 0,
});

const FOOT_BASE_STYLE: CSSProperties = Object.freeze({
  fontFamily: "var(--mono)",
  fontSize: 11,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
});

function cellStyle(opts: {
  readonly status: EngineStatus;
  readonly isSelected: boolean;
  readonly isInteractive: boolean;
}): CSSProperties {
  const merged: CSSProperties = {
    ...CELL_BASE_STYLE,
    ...(opts.isInteractive ? CELL_BUTTON_RESET : null),
    cursor: opts.isInteractive ? "pointer" : "default",
    // Design .eng (wave-d Scanner): chrome stays NEUTRAL in every state —
    // border --line (b-0), selected fill bg-2; the status dot alone
    // carries the colour. The old dotTint border painted 13 steel boxes.
    borderColor: "var(--b-0)",
    background: opts.isSelected ? "var(--bg-2)" : "var(--bg-1)",
    opacity: opts.status === "inactive" ? 0.7 : 1,
  };
  return merged;
}

function bandStripeStyle(band: EngineBand): CSSProperties {
  return { ...BAND_TINT_STRIPE_STYLE, background: BAND_TINT[band] };
}

function dotStyle(status: EngineStatus): CSSProperties {
  return { ...DOT_BASE_STYLE, background: STATUS_DOT_COLOR[status] };
}

function footStyle(status: EngineStatus): CSSProperties {
  return { ...FOOT_BASE_STYLE, color: STATUS_FOOT_COLOR[status] };
}

/**
 * Build a Map<engineId, status> from caller-supplied entries.
 * Drops entries whose engineId is not one of the 13 canonical ids
 * AND drops entries whose status is not one of the 4 canonical
 * statuses. The pattern mirrors `sanitizeFinding` in ScannerClient —
 * the primitive is the last R-T1 gate before status strings touch
 * the DOM, so we re-validate even though the type signature implies
 * the caller already narrowed.
 */
function buildStatusIndex(
  entries: readonly EngineStatusEntry[],
): ReadonlyMap<ScannerEngineId, EngineStatus> {
  const m = new Map<ScannerEngineId, EngineStatus>();
  for (const entry of entries.slice(0, ENGINE_STATUS_BAR_MAX)) {
    if (!entry || typeof entry !== "object") continue;
    if (!isScannerEngineId(entry.engineId)) continue;
    if (!isEngineStatus(entry.status)) continue;
    m.set(entry.engineId, entry.status);
  }
  return m;
}

/**
 * EngineStatusBar — pure-presentational 13-cell engine status bar.
 *
 * Renders cells in canonical `DEFAULT_ENGINES` order regardless of
 * caller-supplied entry order. Engines absent from the entries list
 * render as `inactive` (the safe default — a missing entry must not
 * silently render as `active`).
 */
export function EngineStatusBar({
  engines,
  defs = DEFAULT_ENGINES,
  sub,
  testId,
  className,
  compact = false,
  bare = false,
  onChange,
  selected,
}: EngineStatusBarProps) {
  const safeDefs = useMemo(() => defs.slice(0, ENGINE_STATUS_BAR_MAX), [defs]);
  const statusByEngineId = useMemo(() => buildStatusIndex(engines), [engines]);

  if (safeDefs.length === 0) return null;

  const total = safeDefs.length;
  const activeCount = safeDefs.reduce(
    (n, d) => n + (statusByEngineId.get(d.id) === "active" ? 1 : 0),
    0,
  );
  const errorCount = safeDefs.reduce(
    (n, d) => n + (statusByEngineId.get(d.id) === "error" ? 1 : 0),
    0,
  );

  const rootTestId = testId ?? "engine-status-bar";
  const rootClass = `engine-status-bar${bare ? " engine-status-bar-bare" : ""}${className ? ` ${className}` : ""}`;

  // Active count chip class — tri-state derived from a closed
  // comparison, never from a raw count string. R-T1.
  const countTone =
    activeCount === total ? "all" : activeCount === 0 ? "none" : "partial";

  const rowStyle: CSSProperties = {
    ...ROW_BASE_STYLE,
    gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))`,
  };

  return (
    <section
      className={rootClass}
      style={bare ? { display: "block" } : ROOT_STYLE}
      data-testid={rootTestId}
      data-active={activeCount}
      data-total={total}
      data-error={errorCount}
      data-count-tone={countTone}
      role="group"
      aria-label="Scanner engine stack"
    >
      {!bare ? (
        <header className="engine-status-bar-head" style={HEAD_STYLE}>
          <div className="engine-status-bar-title" style={TITLE_STYLE}>
            <span className="engine-status-bar-kicker" style={KICKER_STYLE}>
              Scanner · engine stack
            </span>
            <span className="engine-status-bar-sub" style={SUB_STYLE}>
              {sub ?? `${total} modules · status reflects last probe`}
            </span>
          </div>
          <span
            className={`engine-status-bar-count engine-status-bar-count-${countTone}`}
            style={COUNT_STYLE}
            aria-live="polite"
          >
            <span
              className="engine-status-bar-count-num"
              style={COUNT_NUM_STYLE}
            >
              {String(activeCount).padStart(2, "0")}
            </span>
            <span className="engine-status-bar-count-slash">/</span>
            <span className="engine-status-bar-count-tot">
              {String(total).padStart(2, "0")}
            </span>
            <span
              className="engine-status-bar-count-label"
              style={COUNT_LABEL_STYLE}
            >
              active
            </span>
          </span>
        </header>
      ) : null}

      <div className="engine-status-bar-row" style={rowStyle}>
        {safeDefs.map((d, i) => {
          const status: EngineStatus = statusByEngineId.get(d.id) ?? "inactive";
          // Defensive — if a future caller passes a defs entry whose id
          // is not one of the 13 canonical ids, fall back to ENGINE_BY_ID
          // lookup which TS narrowed to `ScannerEngineId`. Both paths
          // are equivalent at compile time; the runtime guard is here
          // because `defs` is a `readonly ScannerEngine[]` prop and a
          // caller could theoretically widen via `as`.
          const verifiedDef = ENGINE_BY_ID[d.id] ?? d;
          const displayName = engineDisplayName(
            verifiedDef.id,
            verifiedDef.name,
          );
          // BAND_CLASS lookup defended with FALLBACK_BAND_CLASS so a
          // widened `defs` entry whose `band` isn't a valid EngineBand
          // can't leak the literal string `"undefined"` into className.
          const bandClass = BAND_CLASS[verifiedDef.band] ?? FALLBACK_BAND_CLASS;
          const isSelected = selected?.has(verifiedDef.id) === true;
          const cellClass = [
            "engine-cell",
            STATUS_CLASS[status],
            bandClass,
            isSelected ? "engine-cell-selected" : "",
          ]
            .filter(Boolean)
            .join(" ");
          const cellTestId = `${rootTestId}-cell-${i}`;
          const ariaLabel = onChange
            ? `${displayName} — ${isSelected ? "selected locally" : "not selected locally"}`
            : `${displayName} — ${STATUS_ARIA[status]}`;
          const cellTitle = `${displayName} · ${verifiedDef.description}`;
          const isInteractive = onChange !== undefined;
          const computedCellStyle = cellStyle({
            status,
            isSelected,
            isInteractive,
          });
          // Inner content shared by both the read-only div and the
          // interactive button cell — defined once so toggle vs.
          // status mode stays pixel-equivalent.
          const cellContent = (
            <>
              {!bare ? (
                <span
                  className="engine-cell-band-tint"
                  style={bandStripeStyle(verifiedDef.band)}
                  aria-hidden="true"
                />
              ) : null}
              <span
                className="engine-cell-idx"
                style={IDX_STYLE}
                aria-hidden="true"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="engine-cell-row" style={ROW_INNER_STYLE}>
                <span
                  className={`engine-cell-dot engine-cell-dot-${status}`}
                  style={dotStyle(status)}
                  aria-hidden="true"
                />
                <span className="engine-cell-label" style={LABEL_STYLE}>
                  {displayName}
                </span>
              </span>
              {!compact ? (
                <span
                  className="engine-cell-foot"
                  style={footStyle(status)}
                  aria-hidden="true"
                >
                  {STATUS_LABEL[status]}
                </span>
              ) : null}
            </>
          );
          // Toggle-grid mode (A-405 consumer): interactive button cell.
          // Read-only mode (current Scanner mount): plain div cell.
          // `role="status"` is dropped from div cells per WAI-ARIA: 13
          // simultaneous live regions would announce concurrently on
          // any data update; the outer `role="group"` + `aria-label`
          // already supplies context, and per-cell `aria-label` carries
          // the engine + status without invoking live-region semantics.
          if (isInteractive) {
            return (
              <button
                type="button"
                key={verifiedDef.id}
                className={cellClass}
                style={computedCellStyle}
                data-testid={cellTestId}
                data-engine-id={verifiedDef.id}
                data-status={status}
                data-band={verifiedDef.band}
                data-selected={isSelected ? "true" : "false"}
                aria-label={ariaLabel}
                aria-pressed={isSelected}
                title={cellTitle}
                onClick={() => onChange?.(verifiedDef.id)}
              >
                {cellContent}
              </button>
            );
          }
          return (
            <div
              key={verifiedDef.id}
              className={cellClass}
              style={computedCellStyle}
              data-testid={cellTestId}
              data-engine-id={verifiedDef.id}
              data-status={status}
              data-band={verifiedDef.band}
              aria-label={ariaLabel}
              title={cellTitle}
            >
              {cellContent}
            </div>
          );
        })}
      </div>
    </section>
  );
}
