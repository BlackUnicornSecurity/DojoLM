// SPDX-License-Identifier: Apache-2.0
/**
 * EngineFilterChips — TICKET-D-204 dashboard chip strip primitive.
 *
 * Filter-style chip strip that lets the operator narrow which scanner
 * engines' findings appear in the dashboard widgets. One chip per
 * canonical engine, plus "All" + "None" bulk-action chips. Toggling a
 * chip flips that engine id in the caller-owned `selected` set.
 *
 * Single source of truth for engine ids + metadata is the lib at
 * `lib/scanner/engines.ts` (TICKET-S-301 / CA-6). This primitive is a
 * pure consumer — it does NOT mutate `DEFAULT_ENGINES`, does NOT
 * fetch, and does NOT persist state. Caller owns the `Set<engineId>`
 * and the `onChange` reducer.
 *
 * Closed-enum discipline (R-T1 §10.16):
 *   - `BAND_CLASS` — closed `Record<EngineBand, string>` for chip
 *     band-tint className (mirrors the EngineStatusBar discipline so
 *     PROTECT cells in the chip strip share the steel hairline with
 *     the status bar).
 *   - `BULK_ACTION_LABEL` + `BULK_ACTION_ARIA` — closed maps for the
 *     two bulk-action chips. The action ids never reach the DOM as
 *     raw strings; they always flow through the closed maps.
 *   - Engine ids are validated against `ENGINE_BY_ID` before any
 *     className / aria-label / data-attr emission.
 *
 * Discriminant-redaction: status / band strings NEVER hit aria-label
 * or className except through the closed maps.
 *
 * Color + tint: `var(--*)` tokens only. Zero inline hex.
 *
 * Defensive caps:
 *   - Render-time cap mirrors the EngineStatusBar primitive
 *     (`ENGINE_FILTER_CHIPS_MAX = 32`) — the canonical fleet is 13;
 *     2.5x headroom for malformed `engines` overrides.
 *   - Engine ids absent from `ENGINE_BY_ID` are skipped silently —
 *     a corrupt prop cannot inject arbitrary strings into the DOM.
 *
 * Renders nothing (`null`) when `engines` is empty — caller owns the
 * empty-state copy.
 *
 * Wiring on dashboard (D-204): the chip strip mounts ABOVE the 4-KPI
 * grid as a full-width row. Selected state is local-only in this
 * ticket (no server persistence) — follow-up will route the selected
 * Set through finding-aware widgets (KPI cards, Hattori block trend,
 * coverage heatmap) once those widgets gain finding-driven data flow.
 */

"use client";

import {
  useCallback,
  useMemo,
  type CSSProperties,
  type ReactElement,
} from "react";
import {
  DEFAULT_ENGINES,
  ENGINE_BY_ID,
  type EngineBand,
  type ScannerEngine,
  type ScannerEngineId,
} from "@/lib/scanner/engines";
import { engineDisplayName } from "@/design/scanner/engine-display-names";

/**
 * Render-time cap. Canonical fleet is 13; 2.5x headroom for malformed
 * input. Mirrors `ENGINE_STATUS_BAR_MAX` discipline (R-T1 array-DoS
 * gate, primitive boundary).
 */
export const ENGINE_FILTER_CHIPS_MAX = 32;

/**
 * Closed band → CSS-class-suffix map. Mirrors EngineStatusBar's
 * BAND_CLASS so band hairline rendering stays consistent across the
 * two consumers when both surfaces are visible.
 */
const BAND_CLASS: Readonly<Record<EngineBand, string>> = Object.freeze({
  PROTECT: "engine-filter-chip-band-protect",
  TEST: "engine-filter-chip-band-test",
  GOVERN: "engine-filter-chip-band-govern",
  INTEL: "engine-filter-chip-band-intel",
});

/** Closed bulk-action id type. The design's Platform filter carries a
 *  single ALL toggle (select-all / clear-all); the NONE chip retired. */
type BulkActionId = "all";

const BULK_ACTION_LABEL: Readonly<Record<BulkActionId, string>> = Object.freeze(
  {
    all: "All",
  },
);

const BULK_ACTION_ARIA: Readonly<Record<BulkActionId, string>> = Object.freeze({
  all: "Toggle all engines",
});

const ROOT_STYLE: CSSProperties = Object.freeze({
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  alignItems: "center",
  padding: "8px 10px",
  border: "1px solid var(--b-1)",
  borderRadius: 8,
  background: "var(--bg-2)",
  marginBottom: 16,
});

const COUNT_STYLE: CSSProperties = Object.freeze({
  fontFamily: "var(--mono)",
  fontSize: 11,
  letterSpacing: "0.1em",
  color: "var(--fg-dim)",
  marginLeft: "auto",
});

const CHIP_BASE_STYLE: CSSProperties = Object.freeze({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "4px 10px",
  fontSize: 11,
  fontFamily: "var(--mono)",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  borderRadius: 999,
  border: "1px solid var(--b-1)",
  background: "transparent",
  color: "var(--fg-dim)",
  cursor: "pointer",
  whiteSpace: "nowrap",
});

// Phase 4.3 conformity (Command Center v2.html:230-236 / audit D1+D3): the
// filter strip is a CALM neutral row of mono-caps outline pills — NOT a
// rainbow of per-band category colors (which also splashed torii-red on the
// TEST-band Leak/Jailbreak/PII chips, breaking the one-red law). Selection is
// signalled with a neutral fill + ink, never a band tint.
function chipStyle(isSelected: boolean): CSSProperties {
  return {
    ...CHIP_BASE_STYLE,
    borderColor: isSelected ? "var(--fg-mute)" : "var(--b-1)",
    color: isSelected ? "var(--fg)" : "var(--fg-dim)",
    background: isSelected ? "var(--bg-3)" : "transparent",
    fontWeight: isSelected ? 600 : 500,
  };
}

function bulkChipStyle(isActive: boolean): CSSProperties {
  return {
    ...CHIP_BASE_STYLE,
    borderColor: isActive ? "var(--fg)" : "var(--b-1)",
    color: isActive ? "var(--fg)" : "var(--fg-dim)",
    fontWeight: isActive ? 600 : 500,
  };
}

const ALL_DOT_STYLE: CSSProperties = Object.freeze({
  width: 6,
  height: 6,
  borderRadius: "50%",
  display: "inline-block",
  background: "var(--steel)",
});

export interface EngineFilterChipsProps {
  /**
   * Engine defs to render. Defaults to the canonical 13. Override
   * exists for fixture/test scenarios; the primitive validates each
   * id against `ENGINE_BY_ID` before emission.
   */
  readonly engines?: readonly ScannerEngine[];
  /**
   * Set of engine ids currently included by the filter. Caller owns
   * this state; the primitive is purely controlled.
   */
  readonly selected: ReadonlySet<ScannerEngineId>;
  /**
   * Called with the next `Set<ScannerEngineId>` after a chip toggle
   * or an All/None bulk action. The primitive always passes a NEW
   * Set instance — never mutates the input (immutability rule).
   */
  readonly onChange: (next: ReadonlySet<ScannerEngineId>) => void;
  /** Test id stem. Chips suffix with `-chip-${engineId}`. */
  readonly testId?: string;
}

/**
 * Build a frozen Set restricted to the canonical 13 ids. Drops any id
 * that isn't in `ENGINE_BY_ID` (defensive — a malformed `selected`
 * prop cannot leak unknown ids back through onChange).
 */
function sanitizeSelected(
  input: ReadonlySet<ScannerEngineId>,
): ReadonlySet<ScannerEngineId> {
  const out = new Set<ScannerEngineId>();
  input.forEach((id) => {
    if (ENGINE_BY_ID[id] !== undefined) {
      out.add(id);
    }
  });
  return out;
}

/**
 * EngineFilterChips — pure-presentational filter chip strip.
 *
 * One chip per canonical engine plus All/None bulk-action chips.
 * Chips never carry status — only inclusion state. The chip strip is
 * the FILTER surface; the EngineStatusBar primitive is the STATUS
 * surface. Both consume the same `engines.ts` lib.
 */
export function EngineFilterChips({
  engines = DEFAULT_ENGINES,
  selected,
  onChange,
  testId = "engine-filter-chips",
}: EngineFilterChipsProps): ReactElement | null {
  const safeDefs = useMemo(
    () =>
      engines
        .slice(0, ENGINE_FILTER_CHIPS_MAX)
        .filter((d) => ENGINE_BY_ID[d.id] !== undefined),
    [engines],
  );

  const selectedSafe = useMemo(() => sanitizeSelected(selected), [selected]);

  const total = safeDefs.length;
  const selectedCount = safeDefs.reduce(
    (n, d) => n + (selectedSafe.has(d.id) ? 1 : 0),
    0,
  );

  const allActive = total > 0 && selectedCount === total;

  const handleChipToggle = useCallback(
    (id: ScannerEngineId) => {
      const next = new Set<ScannerEngineId>(selectedSafe);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      onChange(next);
    },
    [selectedSafe, onChange],
  );

  // Design (wave-a Platform filter) has no NONE chip — ALL is a toggle:
  // click when fully selected clears the filter, otherwise selects all.
  const handleAll = useCallback(() => {
    const next = allActive
      ? new Set<ScannerEngineId>()
      : new Set<ScannerEngineId>(safeDefs.map((d) => d.id));
    onChange(next);
  }, [allActive, safeDefs, onChange]);

  if (total === 0) return null;

  return (
    // <section> with `aria-label` produces an implicit `region` landmark
    // that screen-reader users can jump to. Pass-2 fold-in: the prior
    // explicit `role="group"` overrode the landmark unintentionally.
    <section
      aria-label="Scanner engine filter"
      data-testid={testId}
      data-selected={selectedCount}
      data-total={total}
      style={ROOT_STYLE}
    >
      <button
        type="button"
        data-testid={`${testId}-bulk-all`}
        data-active={allActive ? "true" : "false"}
        aria-label={BULK_ACTION_ARIA.all}
        aria-pressed={allActive}
        style={bulkChipStyle(allActive)}
        onClick={handleAll}
      >
        <span style={ALL_DOT_STYLE} aria-hidden="true" />
        {BULK_ACTION_LABEL.all}
      </button>

      {safeDefs.map((d) => {
        // Defensive — re-resolve through ENGINE_BY_ID so a widened
        // `engines` prop entry whose id isn't one of the 13 canonical
        // ids cannot leak its band into BAND_CLASS / BAND_COLOR. The
        // pre-filter above already drops these, but the lookup is a
        // R-T1 boundary so we keep the second guard.
        const verified = ENGINE_BY_ID[d.id] ?? d;
        const displayName = engineDisplayName(verified.id, verified.name);
        const isSelected = selectedSafe.has(verified.id);
        const bandClass = BAND_CLASS[verified.band] ?? "";
        const ariaLabel = `${displayName} filter — ${
          isSelected ? "included" : "excluded"
        }`;
        return (
          <button
            key={verified.id}
            type="button"
            className={`engine-filter-chip ${bandClass}`}
            data-testid={`${testId}-chip-${verified.id}`}
            data-engine-id={verified.id}
            data-band={verified.band}
            data-selected={isSelected ? "true" : "false"}
            aria-label={ariaLabel}
            aria-pressed={isSelected}
            title={`${displayName} · ${verified.description}`}
            style={chipStyle(isSelected)}
            onClick={() => handleChipToggle(verified.id)}
          >
            <span>{displayName}</span>
          </button>
        );
      })}

      <span style={COUNT_STYLE} aria-live="polite">
        <span data-testid={`${testId}-count`}>
          {selectedCount}
          {" of "}
          {total}
        </span>
        {" selected"}
      </span>
    </section>
  );
}
