// SPDX-License-Identifier: Apache-2.0
export type HattoriMode = "shinobi" | "samurai" | "sensei" | "hattori";

export interface HattoriModeDef {
  /** Mode id (one of the four canonical guard modes). */
  readonly mode: HattoriMode;
  /** Display title (e.g. `"Samurai · block in"`). Capped at 80 chars. */
  readonly title: string;
  /** One-line summary shown in the collapsed row. Capped at 200 chars. */
  readonly summary: string;
  /**
   * Detail body shown when the row is the active accordion panel.
   * Capped at 1000 chars at the prop boundary.
   */
  readonly detail: string;
}

export interface HattoriGuardModesProps {
  /** All four mode definitions. Pass exactly 4 (one per HattoriMode id). */
  readonly modes: readonly HattoriModeDef[];
  /** Currently-selected (open) mode id. */
  readonly active: HattoriMode;
  /** Click handler. Receives the new mode id. */
  readonly onSelect?: (mode: HattoriMode) => void;
  /** Caption above the accordion. Capped at 80 chars. */
  readonly caption?: string;
  /** Accessible label override for the wrapper. */
  readonly ariaLabel?: string;
  readonly className?: string;
  readonly testId?: string;
}

const MAX_TITLE = 80;
const MAX_SUMMARY = 200;
const MAX_DETAIL = 1000;
const MAX_CAPTION = 80;
/**
 * Render-time cap. The four canonical guard modes are the only valid
 * inputs (TypeScript enforces it at compile time), but a defensive
 * slice mirrors the rest of the YR.6 array-DoS gates.
 */
export const HATTORI_GUARD_MODES_MAX = 4;

function cap(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

/**
 * Hattori guard-mode accordion (v2.1 update). Renders the four
 * canonical modes (Shinobi log / Samurai block-in / Sensei block-out
 * / Hattori block-both) as a vertical accordion. Active row expands
 * to show detail text; inactive rows show summary only. Used by
 * `/admin/hattori` posture-selection surface.
 *
 * Distinct from the v1 `<GuardModes>` (in `design/command/`) which
 * is a static posture-display card with flag chips. v2.1 is the
 * interactive selector required by the v2.1 Hattori page contract.
 */
export function HattoriGuardModes({
  modes,
  active,
  onSelect,
  caption,
  ariaLabel,
  className,
  testId,
}: HattoriGuardModesProps) {
  const safeModes = modes.slice(0, HATTORI_GUARD_MODES_MAX);
  const cappedCaption =
    caption !== undefined ? cap(caption, MAX_CAPTION) : undefined;
  const tablistLabel = ariaLabel ?? cappedCaption ?? "Guard modes";
  const rootClass = `hattori-guard-modes${className ? ` ${className}` : ""}`;
  return (
    <section
      className={rootClass}
      data-testid={testId ?? "hattori-guard-modes"}
      data-active={active}
    >
      {cappedCaption ? (
        <div className="hattori-guard-modes-caption">{cappedCaption}</div>
      ) : null}
      <div
        className="hattori-guard-modes-list"
        role="group"
        aria-label={tablistLabel}
      >
        {safeModes.map((m) => {
          const isActive = m.mode === active;
          const cappedTitle = cap(m.title, MAX_TITLE);
          const cappedSummary = cap(m.summary, MAX_SUMMARY);
          const cappedDetail = cap(m.detail, MAX_DETAIL);
          const tabId = `hattori-guard-modes-tab-${m.mode}`;
          const panelId = `hattori-guard-modes-panel-${m.mode}`;
          return (
            <div
              key={m.mode}
              className={`hattori-guard-modes-row mode-${m.mode}${isActive ? " active" : ""}`}
              data-mode={m.mode}
              /* HAGANE E6.S3 (axe aria-required-children): the wrapper
                 is layout-only — presentation keeps the tablist's
                 accessibility children = the tab buttons. */
              role="presentation"
            >
              {/* HAGANE remediation R6 — the E6.S3 tablist→group re-
                  semantics kept a roving tabIndex (active 0 / rest −1)
                  but a group of disclosure buttons has no arrow-key
                  manager, so inactive modes were UNREACHABLE by
                  keyboard. Natural tab order is the correct pattern
                  for a non-composite button group. */}
              <button
                type="button"
                id={tabId}
                aria-expanded={isActive}
                aria-controls={panelId}
                className="hattori-guard-modes-row-head"
                onClick={() => onSelect?.(m.mode)}
              >
                <span className="hattori-guard-modes-row-title">
                  {cappedTitle}
                </span>
                <span className="hattori-guard-modes-row-summary">
                  {cappedSummary}
                </span>
              </button>
              {isActive ? (
                <div
                  className="hattori-guard-modes-row-detail"
                  role="region"
                  id={panelId}
                  aria-labelledby={tabId}
                >
                  {cappedDetail}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
