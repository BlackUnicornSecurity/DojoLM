// SPDX-License-Identifier: Apache-2.0
/**
 * HaikuLicenseModules — TICKET-D-205 dashboard license-catalog primitive.
 *
 * Restores the V1 dashboard's "Haiku License Modules" section: a
 * structured list of every license-gated surface the operator's tier
 * unlocks, grouped by category, with each row carrying a category chip
 * and an active/inactive status indicator.
 *
 * Pure presentational. No fetches, no mutations, no state. Reads
 * exclusively from `lib/licensing/haiku-modules.ts` (the closed-enum
 * catalog) and renders 35 rows by default. Caller may override via the
 * `modules` prop for fixture/test scenarios — every untrusted id is
 * re-verified through `HAIKU_MODULE_BY_ID` before className / aria-
 * label emission.
 *
 * Closed-enum discipline (R-T1 §10.16):
 *   - `CATEGORY_BAND_COLOR` — closed `Record<HaikuModuleCategory,
 *     string>` for category-chip tint. Mirrors the band-tint convention
 *     used by other dashboard primitives so dashboard-wide visual
 *     grammar stays consistent.
 *   - `STATUS_LABEL` + `STATUS_ARIA` — closed maps for the
 *     enabled/disabled status copy. Boolean → 'active' | 'inactive'
 *     never reaches the DOM as raw text except through these maps.
 *   - Every module id is validated against `HAIKU_MODULE_BY_ID` before
 *     emission. Unknown ids are skipped silently.
 *
 * Defensive caps:
 *   - `HAIKU_LICENSE_MODULES_MAX = 64` — render-time cap. Canonical
 *     catalog is 35; ~1.8x headroom for malformed `modules` prop.
 *
 * Empty state:
 *   - When the post-validation list is empty (every entry filtered out)
 *     the primitive renders an explicit empty-state message instead of
 *     `null` so the dashboard slot doesn't collapse silently.
 *
 * Color + tint: `var(--*)` tokens only. Zero inline hex.
 *
 * Wiring on dashboard (D-205): the section mounts as a full-width row
 * between the TrainingScroll row and the 7/5 activity grid so it sits
 * at the bottom of the dashboard's "what is provisioned" zone.
 * Visibility is gated by a new `'haiku-license-modules'` widget id in
 * `DashboardCustomizer`.
 */

"use client";

import { useMemo, type CSSProperties, type ReactElement } from "react";
import {
  HAIKU_MODULES,
  HAIKU_MODULE_BY_ID,
  HAIKU_MODULE_CATEGORIES,
  HAIKU_MODULE_COUNT,
  groupHaikuModulesByCategory,
  type HaikuModule,
  type HaikuModuleCategory,
  type HaikuModuleId,
} from "@/lib/licensing/haiku-modules";

/** Render-time cap. ~1.8x headroom over the canonical 35. */
export const HAIKU_LICENSE_MODULES_MAX = 64;

/**
 * Closed category → color-token map. Mirrors the band convention used
 * by the dashboard's other category-tinted primitives.
 */
// Pass-2 fold-in:
//   - Sensei moved to a distinct token (`--crimson-lg`) so the
//     command-layer category is visually distinguishable from Test
//     orange. Sister `Test` keeps `torii-lg` (orange).
//   - Inline hex fallbacks dropped — `var(--*)` only, matching the
//     `EngineFilterChips` (D-204) primitive's pass-2 cleanup.
const CATEGORY_BAND_COLOR: Readonly<Record<HaikuModuleCategory, string>> =
  Object.freeze({
    Sensei: "var(--crimson-lg)",
    Test: "var(--torii-lg)",
    Protect: "var(--steel-lg)",
    Intel: "var(--gold-lg)",
    Operations: "var(--violet-lg)",
    Member: "var(--jade-lg)",
  });

/**
 * Closed boolean → status-label map. Status strings never hit aria-
 * label or className except through this map.
 */
const STATUS_LABEL: Readonly<Record<"true" | "false", string>> = Object.freeze({
  true: "Active",
  false: "Inactive",
});

const STATUS_ARIA: Readonly<Record<"true" | "false", string>> = Object.freeze({
  true: "License module active",
  false: "License module inactive — gated behind add-on entitlement",
});

const ROOT_STYLE: CSSProperties = Object.freeze({
  border: "1px solid var(--b-1)",
  borderRadius: 8,
  padding: 16,
  background: "var(--bg-2)",
});

const HEADER_STYLE: CSSProperties = Object.freeze({
  display: "flex",
  alignItems: "baseline",
  gap: 12,
  marginBottom: 12,
});

const TITLE_STYLE: CSSProperties = Object.freeze({
  fontSize: 14,
  fontWeight: 600,
  color: "var(--fg)",
  margin: 0,
});

const SUB_STYLE: CSSProperties = Object.freeze({
  fontSize: 11,
  color: "var(--fg-dim)",
  fontFamily: "var(--mono, monospace)",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
});

const COUNT_STYLE: CSSProperties = Object.freeze({
  marginLeft: "auto",
  fontSize: 11,
  color: "var(--fg-dim)",
  fontFamily: "var(--mono, monospace)",
  letterSpacing: "0.1em",
});

const CATEGORY_GROUP_STYLE: CSSProperties = Object.freeze({
  marginTop: 12,
});

const CATEGORY_HEADER_STYLE: CSSProperties = Object.freeze({
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 11,
  fontFamily: "var(--mono, monospace)",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--fg-dim)",
  marginBottom: 6,
});

const CATEGORY_DOT_STYLE = (color: string): CSSProperties => ({
  width: 6,
  height: 6,
  borderRadius: "50%",
  background: color,
  display: "inline-block",
});

const ROW_LIST_STYLE: CSSProperties = Object.freeze({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
  gap: 6,
  margin: 0,
  padding: 0,
  listStyle: "none",
});

const ROW_STYLE: CSSProperties = Object.freeze({
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "6px 8px",
  border: "1px solid var(--b-1)",
  borderRadius: 6,
  fontSize: 12,
});

const ROW_NAME_STYLE: CSSProperties = Object.freeze({
  flex: 1,
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  color: "var(--fg)",
});

const CATEGORY_CHIP_STYLE = (color: string): CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  fontSize: 11,
  fontFamily: "var(--mono, monospace)",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color,
  border: `1px solid ${color}`,
  padding: "1px 6px",
  borderRadius: 999,
  whiteSpace: "nowrap",
});

const STATUS_BASE_STYLE: CSSProperties = Object.freeze({
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  fontSize: 11,
  fontFamily: "var(--mono, monospace)",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  padding: "1px 6px",
  borderRadius: 4,
  whiteSpace: "nowrap",
});

const STATUS_DOT_STYLE = (active: boolean): CSSProperties => ({
  width: 5,
  height: 5,
  borderRadius: "50%",
  background: active ? "var(--jade-lg)" : "var(--fg-mute)",
  display: "inline-block",
});

function statusStyle(active: boolean): CSSProperties {
  return {
    ...STATUS_BASE_STYLE,
    color: active ? "var(--jade-lg)" : "var(--fg-mute)",
    // Pass-2 fold-in: raw rgba literals replaced with the canonical
    // `--bg-3` token so dark/light/high-contrast modes resolve
    // correctly. Matches D-204 EngineFilterChips and the rest of the
    // dashboard primitives.
    background: "var(--bg-3)",
  };
}

const EMPTY_STYLE: CSSProperties = Object.freeze({
  padding: "20px 12px",
  textAlign: "center",
  color: "var(--fg-dim)",
  fontSize: 12,
  fontStyle: "italic",
});

export interface HaikuLicenseModulesProps {
  /**
   * Module catalog override. Defaults to the canonical 35. Each entry
   * is validated against `HAIKU_MODULE_BY_ID` — unknown ids are
   * dropped, so a malformed prop cannot inject arbitrary strings into
   * the DOM.
   */
  readonly modules?: readonly HaikuModule[];
  /** Test id stem. Rows suffix with `-row-${moduleId}`. */
  readonly testId?: string;
  /** Optional title override; default is "Haiku License Modules". */
  readonly title?: string;
  /** Optional kicker subtitle; default is "License catalog". */
  readonly kicker?: string;
}

/**
 * Build the verified, capped, deduplicated list of modules. Drops any
 * id absent from the closed `HAIKU_MODULE_BY_ID` index, clamps to
 * `HAIKU_LICENSE_MODULES_MAX`, and emits each id at most once
 * (prevents duplicate React `key` warnings + inflated `data-total`
 * counts when a caller-supplied `modules` prop contains repeated ids).
 */
function safeCatalog(input: readonly HaikuModule[]): readonly HaikuModule[] {
  const out: HaikuModule[] = [];
  const seen = new Set<HaikuModuleId>();
  for (const m of input) {
    if (out.length >= HAIKU_LICENSE_MODULES_MAX) break;
    if (seen.has(m.id)) continue;
    const verified = HAIKU_MODULE_BY_ID[m.id];
    if (verified !== undefined) {
      out.push(verified);
      seen.add(m.id);
    }
  }
  return out;
}

/**
 * HaikuLicenseModules — pure-presentational license catalog list.
 *
 * Renders 35 license-gated module rows grouped by category, with a
 * category chip + active/inactive status indicator on each row.
 */
export function HaikuLicenseModules({
  modules = HAIKU_MODULES,
  testId = "haiku-license-modules",
  title = "Haiku License Modules",
  kicker = "License catalog",
}: HaikuLicenseModulesProps): ReactElement {
  const verified = useMemo(() => safeCatalog(modules), [modules]);
  const grouped = useMemo(
    () => groupHaikuModulesByCategory(verified),
    [verified],
  );

  const total = verified.length;
  const activeCount = verified.reduce((n, m) => n + (m.enabled ? 1 : 0), 0);

  return (
    <section
      role="region"
      aria-label="Haiku License Modules — license catalog"
      data-testid={testId}
      data-total={total}
      data-active={activeCount}
      style={ROOT_STYLE}
    >
      <header style={HEADER_STYLE}>
        <h2 style={TITLE_STYLE} data-testid={`${testId}-title`}>
          {title}
        </h2>
        <span style={SUB_STYLE} aria-hidden="true">
          {kicker}
        </span>
        <span
          style={COUNT_STYLE}
          aria-live="polite"
          data-testid={`${testId}-count`}
        >
          {String(activeCount).padStart(2, "0")}
          {" / "}
          {String(total).padStart(2, "0")}
          {" active"}
        </span>
      </header>

      {total === 0 ? (
        <div role="status" data-testid={`${testId}-empty`} style={EMPTY_STYLE}>
          No license modules to display.
        </div>
      ) : (
        // Iterate the canonical category order so groups always appear
        // in the same order even if the input mixes them. `grouped`
        // already preserves canonical order via the Map insertion in
        // `groupHaikuModulesByCategory`, but iterating the closed-enum
        // tuple here is an extra R-T1 boundary.
        HAIKU_MODULE_CATEGORIES.map((category) => {
          const subset = grouped.get(category);
          if (subset === undefined || subset.length === 0) return null;
          const color = CATEGORY_BAND_COLOR[category];
          const groupTestId = `${testId}-group-${category.toLowerCase()}`;
          return (
            <div
              key={category}
              data-testid={groupTestId}
              data-category={category}
              data-count={subset.length}
              style={CATEGORY_GROUP_STYLE}
            >
              <div style={CATEGORY_HEADER_STYLE}>
                <span style={CATEGORY_DOT_STYLE(color)} aria-hidden="true" />
                <span>{category}</span>
                <span style={{ color: "var(--fg-dim)" }}>
                  · {String(subset.length).padStart(2, "0")}
                </span>
              </div>
              <ul style={ROW_LIST_STYLE}>
                {subset.map((m) => {
                  const enabledKey: "true" | "false" = m.enabled
                    ? "true"
                    : "false";
                  const statusLabel = STATUS_LABEL[enabledKey];
                  const ariaLabel = `${m.name} — ${m.category} — ${STATUS_ARIA[enabledKey]} — route ${m.route}`;
                  const rowTestId = `${testId}-row-${m.id}`;
                  return (
                    <li
                      key={m.id}
                      data-testid={rowTestId}
                      data-module-id={m.id}
                      data-category={m.category}
                      data-enabled={enabledKey}
                      title={`${m.name} · ${m.route}`}
                      aria-label={ariaLabel}
                      style={ROW_STYLE}
                    >
                      <span style={ROW_NAME_STYLE}>{m.name}</span>
                      <span
                        data-testid={`${rowTestId}-category-chip`}
                        style={CATEGORY_CHIP_STYLE(color)}
                      >
                        {m.category}
                      </span>
                      <span
                        data-testid={`${rowTestId}-status`}
                        data-status={enabledKey}
                        style={statusStyle(m.enabled)}
                      >
                        <span
                          style={STATUS_DOT_STYLE(m.enabled)}
                          aria-hidden="true"
                        />
                        {statusLabel}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })
      )}
    </section>
  );
}

/** Re-exported for callers that want the catalog count without re-importing the lib. */
export { HAIKU_MODULE_COUNT };
