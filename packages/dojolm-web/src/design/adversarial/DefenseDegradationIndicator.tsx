// SPDX-License-Identifier: Apache-2.0
/**
 * DefenseDegradationIndicator — design primitive (TICKET-L-702).
 *
 * Pure-presentational degradation indicator for the Adversarial /
 * Atemi-Lab surface. Surfaces the model's defense posture as a closed
 * 5-state strength signal so operators can see, at a glance, whether
 * adversarial probes are currently breaking through the guardrails.
 *
 * Read-only. No fetches, no internal data lookup beyond the props.
 * Caller passes a degradation entry sourced from probe-history
 * aggregation — the primitive translates it through closed
 * `Record<DefenseDegradationLevel, ...>` maps before any string
 * touches a className or aria-label.
 *
 * Discriminant-redaction (R-T1 §10.16):
 *   - LEVEL_LABEL / LEVEL_CLASS / LEVEL_ARIA are closed
 *     `Record<DefenseDegradationLevel, ...>` maps. The level token
 *     NEVER reaches an aria-label or className except through these
 *     maps. The narrowing happens once at `isDefenseDegradationLevel`.
 *   - `score` is clamped to [0, 100] before any percent display so a
 *     malformed payload cannot inject `Infinity`/`NaN` into the DOM.
 *
 * Defensive caps:
 *   - `breachCount` clamped to [0, 9999] — the worst-case display is
 *     "9999+", protecting against array-DoS-style numeric inputs that
 *     would balloon the chip width.
 *   - `lastIncident` capped at 80 chars (R-T1 string-cap).
 *
 * Emits `null` when `level` fails closed-enum narrowing — operators
 * see the EmptyState from the page wrapper, never raw level strings.
 */

'use client';

export const DEFENSE_DEGRADATION_LEVELS = [
  'stable',
  'minor',
  'moderate',
  'severe',
  'critical',
] as const;

export type DefenseDegradationLevel = (typeof DEFENSE_DEGRADATION_LEVELS)[number];

export interface DefenseDegradationIndicatorProps {
  /** Closed-enum degradation level. Drives label/class/aria via maps. */
  readonly level: DefenseDegradationLevel;
  /**
   * Numeric degradation score 0–100. Higher = more degradation.
   * Clamped at the prop boundary to defend against `Infinity`/`NaN`.
   */
  readonly score: number;
  /**
   * Number of breach events observed in the active window. Clamped to
   * `BREACH_COUNT_MAX` so a malformed payload cannot balloon the chip.
   */
  readonly breachCount: number;
  /** Optional last-incident summary. Capped at 80 chars. */
  readonly lastIncident?: string;
  /** Test id stem. */
  readonly testId?: string;
  /** Wrapper className for layout overrides. */
  readonly className?: string;
}

/** Score clamp ceiling — percent display never exceeds 100. */
export const DEFENSE_DEGRADATION_SCORE_MAX = 100;
/** Breach-count clamp — caps display at "9999+". */
export const DEFENSE_DEGRADATION_BREACH_MAX = 9999;
/** Incident-text cap — R-T1 string-cap discipline. */
export const DEFENSE_DEGRADATION_INCIDENT_MAX = 80;

const VALID_LEVELS: ReadonlySet<DefenseDegradationLevel> = new Set(
  DEFENSE_DEGRADATION_LEVELS,
);

export function isDefenseDegradationLevel(
  v: unknown,
): v is DefenseDegradationLevel {
  return typeof v === 'string' && VALID_LEVELS.has(v as DefenseDegradationLevel);
}

const LEVEL_LABEL: Readonly<Record<DefenseDegradationLevel, string>> = Object.freeze({
  stable: 'Stable',
  minor: 'Minor',
  moderate: 'Moderate',
  severe: 'Severe',
  critical: 'Critical',
});

const LEVEL_CLASS: Readonly<Record<DefenseDegradationLevel, string>> = Object.freeze({
  stable: 'defense-deg-level-stable',
  minor: 'defense-deg-level-minor',
  moderate: 'defense-deg-level-moderate',
  severe: 'defense-deg-level-severe',
  critical: 'defense-deg-level-critical',
});

const LEVEL_ARIA: Readonly<Record<DefenseDegradationLevel, string>> = Object.freeze({
  stable: 'defense posture stable',
  minor: 'minor degradation',
  moderate: 'moderate degradation',
  severe: 'severe degradation',
  critical: 'critical degradation',
});

function clampScore(n: number): number {
  // NaN → 0 (defensive default — never echo a malformed payload).
  if (Number.isNaN(n)) return 0;
  if (n < 0) return 0;
  // +Infinity or any over-cap → ceiling (worst-case display).
  if (n >= DEFENSE_DEGRADATION_SCORE_MAX) return DEFENSE_DEGRADATION_SCORE_MAX;
  return Math.round(n);
}

function clampBreach(n: number): { value: number; overflow: boolean } {
  if (Number.isNaN(n) || n < 0) return { value: 0, overflow: false };
  if (n >= DEFENSE_DEGRADATION_BREACH_MAX) {
    return { value: DEFENSE_DEGRADATION_BREACH_MAX, overflow: true };
  }
  return { value: Math.floor(n), overflow: false };
}

function cap(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

/**
 * DefenseDegradationIndicator — closed-state degradation chip + bar.
 *
 * Returns `null` when the supplied level fails the closed-enum guard;
 * the page wrapper renders the empty-state copy in that case.
 */
export function DefenseDegradationIndicator({
  level,
  score,
  breachCount,
  lastIncident,
  testId,
  className,
}: DefenseDegradationIndicatorProps) {
  if (!isDefenseDegradationLevel(level)) return null;

  const safeScore = clampScore(score);
  const breach = clampBreach(breachCount);
  const breachLabel = breach.overflow
    ? `${DEFENSE_DEGRADATION_BREACH_MAX}+`
    : String(breach.value);
  const cappedIncident =
    typeof lastIncident === 'string' && lastIncident.length > 0
      ? cap(lastIncident, DEFENSE_DEGRADATION_INCIDENT_MAX)
      : null;

  const rootTestId = testId ?? 'defense-degradation';
  const rootClass = `defense-deg ${LEVEL_CLASS[level]}${className ? ` ${className}` : ''}`;
  const ariaLabel = `${LEVEL_ARIA[level]} — score ${safeScore} of 100, ${breachLabel} breaches`;

  return (
    <section
      className={rootClass}
      data-testid={rootTestId}
      data-level={level}
      data-score={safeScore}
      data-breach-count={breach.value}
      role="group"
      aria-label={ariaLabel}
    >
      <header className="defense-deg-head">
        <span className="defense-deg-kicker">Defense posture</span>
        <span
          className={`defense-deg-chip ${LEVEL_CLASS[level]}`}
          data-testid={`${rootTestId}-chip`}
          aria-label={LEVEL_ARIA[level]}
        >
          {LEVEL_LABEL[level]}
        </span>
      </header>
      <div className="defense-deg-bar-wrap" aria-hidden="true">
        <div
          className={`defense-deg-bar ${LEVEL_CLASS[level]}`}
          data-testid={`${rootTestId}-bar`}
          style={{ width: `${safeScore}%` }}
        />
      </div>
      <footer className="defense-deg-foot">
        <span className="defense-deg-score" data-testid={`${rootTestId}-score`}>
          {safeScore}
          <span className="defense-deg-score-unit">/100</span>
        </span>
        <span className="defense-deg-breach" data-testid={`${rootTestId}-breach`}>
          <span className="defense-deg-breach-num">{breachLabel}</span>
          <span className="defense-deg-breach-label"> breaches</span>
        </span>
      </footer>
      {cappedIncident !== null ? (
        <p
          className="defense-deg-incident"
          data-testid={`${rootTestId}-incident`}
        >
          <span className="defense-deg-incident-kicker">Last incident:</span>{' '}
          {cappedIncident}
        </p>
      ) : null}
    </section>
  );
}
