// SPDX-License-Identifier: Apache-2.0
import type { ReactNode } from 'react';

// B.3 anchor primitive — V1-restoration SeverityBar. A compact horizontal
// severity / confidence bar used inside Buki fixture, Mitsuke IOC, and
// Ronin program cards. Discriminated-union props keep three render paths
// behind one primitive without the call site picking the wrong shape:
//
//   variant="stacked"     → 3-segment (crit / warn / clean) proportion bar
//   variant="confidence"  → single-color fill from 0% to value%
//   variant="four-level"  → 5-segment (info / low / medium / high / critical)
//
// Color-blind safety has two layers — (a) an always-visible text
// alternative below the bar that reads the counts in plain language and
// (b) a forced-colors pattern overlay defined in primitives.css that swaps
// author tints for CanvasText / Highlight + border-style variation. The
// bar itself is `role="img"` with an auto-derived aria-label; inner
// segments are `aria-hidden` so AT consumers never hear the same data
// twice.

export type SeverityBarVariant = 'stacked' | 'confidence' | 'four-level';
export type SeverityBarSize = 'default' | 'compact';

/** Confidence-tier thresholds (low + high cut-points, inclusive lower bound).
 *  Defaults match the V1 Mitsuke IOC banding from the design brief
 *  reference screenshots: ≥90 = jade, 70–89 = gold, <70 = red. */
export interface ConfidenceThresholds {
  /** Below this value the fill renders in the red/critical tone. Default: 70. */
  low: number;
  /** At or above this value the fill renders in the jade/clean tone. Default: 90. */
  high: number;
}

export interface StackedCounts {
  crit: number;
  warn: number;
  clean: number;
}

export interface FourLevelCounts {
  info: number;
  low: number;
  medium: number;
  high: number;
  critical: number;
}

interface CommonProps {
  /** Render size — default = 6px tall, compact = 4px tall. */
  size?: SeverityBarSize;
  /** Toggle the auto-generated text alternative below the bar. Default: true. */
  showText?: boolean;
  /** Optional aria-label override; falls back to an auto-derived summary. */
  ariaLabel?: string;
  /** Renders the skeleton variant in place of the bar. */
  loading?: boolean;
  /** Render the text-alternative tokens inline-colored to match each
   *  segment tone (V1 Buki style: red "1 crit", gold "1 warn", jade "1 clean").
   *  Default: false (uniform `--fg-dim` mono — primary a11y default).
   *  Only applies to `stacked` + `four-level` variants; the `confidence`
   *  variant's text alt is a single statement and ignores this prop. */
  colorize?: boolean;
  className?: string;
  testId?: string;
}

export interface StackedSeverityBarProps extends CommonProps {
  variant: 'stacked';
  counts: StackedCounts;
}

export interface ConfidenceSeverityBarProps extends CommonProps {
  variant: 'confidence';
  /** Confidence percentage in 0-100 (clamped). */
  value: number;
  /** Optional override for low/high tier cut-points. */
  thresholds?: ConfidenceThresholds;
}

export interface FourLevelSeverityBarProps extends CommonProps {
  variant: 'four-level';
  counts: FourLevelCounts;
}

export type SeverityBarProps =
  | StackedSeverityBarProps
  | ConfidenceSeverityBarProps
  | FourLevelSeverityBarProps;

export const DEFAULT_CONFIDENCE_THRESHOLDS: ConfidenceThresholds = {
  low: 70,
  high: 90,
};

const STACKED_LABELS: Record<keyof StackedCounts, string> = {
  crit: 'critical',
  warn: 'warning',
  clean: 'clean',
};

const STACKED_SHORT: Record<keyof StackedCounts, string> = {
  crit: 'crit',
  warn: 'warn',
  clean: 'clean',
};

const FOUR_LEVEL_LABELS: Record<keyof FourLevelCounts, string> = {
  info: 'info',
  low: 'low',
  medium: 'medium',
  high: 'high',
  critical: 'critical',
};

const FOUR_LEVEL_ORDER: (keyof FourLevelCounts)[] = [
  'info',
  'low',
  'medium',
  'high',
  'critical',
];

const STACKED_ORDER: (keyof StackedCounts)[] = ['crit', 'warn', 'clean'];

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

function safeCount(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

function sumStacked(counts: StackedCounts): number {
  return safeCount(counts.crit) + safeCount(counts.warn) + safeCount(counts.clean);
}

function sumFourLevel(counts: FourLevelCounts): number {
  return FOUR_LEVEL_ORDER.reduce((acc, k) => acc + safeCount(counts[k]), 0);
}

function pluralCount(n: number, singular: string): string {
  return `${n} ${singular}`;
}

function stackedAriaSummary(counts: StackedCounts): string {
  const total = sumStacked(counts);
  if (total === 0) {
    return 'Severity breakdown: no findings';
  }
  const parts = STACKED_ORDER.filter((k) => safeCount(counts[k]) > 0).map((k) =>
    pluralCount(safeCount(counts[k]), STACKED_LABELS[k]),
  );
  return `Severity breakdown: ${parts.join(', ')}`;
}

function stackedTextSummary(counts: StackedCounts): string {
  const total = sumStacked(counts);
  if (total === 0) return 'No findings';
  const parts = STACKED_ORDER.filter((k) => safeCount(counts[k]) > 0).map(
    (k) => `${safeCount(counts[k])} ${STACKED_SHORT[k]}`,
  );
  return parts.join(' · ');
}

/** Render the stacked text alternative as inline-colored tokens. Each non-zero
 *  tier renders in its own segment color, separated by a neutral middle-dot.
 *  Mirrors V1 Buki's per-token coloring while keeping the same DOM contract
 *  (`<p class="severity-bar__text">…`) so consumers can still query the text. */
function StackedColorizedTokens({ counts }: { counts: StackedCounts }) {
  const total = sumStacked(counts);
  if (total === 0) return <>No findings</>;
  const tokens = STACKED_ORDER.filter((k) => safeCount(counts[k]) > 0);
  return (
    <>
      {tokens.map((k, idx) => (
        <span key={k}>
          {idx > 0 ? (
            <span className="severity-bar__text-sep" aria-hidden="true">
              {' · '}
            </span>
          ) : null}
          <span className={`severity-bar__text-token severity-bar__text-token--${k}`}>
            {safeCount(counts[k])} {STACKED_SHORT[k]}
          </span>
        </span>
      ))}
    </>
  );
}

/** Mirror of StackedColorizedTokens for the four-level variant. Same DOM
 *  contract, five-tier tone mapping. */
function FourLevelColorizedTokens({ counts }: { counts: FourLevelCounts }) {
  const total = sumFourLevel(counts);
  if (total === 0) return <>No findings</>;
  const tokens = FOUR_LEVEL_ORDER.filter((k) => safeCount(counts[k]) > 0);
  return (
    <>
      {tokens.map((k, idx) => (
        <span key={k}>
          {idx > 0 ? (
            <span className="severity-bar__text-sep" aria-hidden="true">
              {' · '}
            </span>
          ) : null}
          <span className={`severity-bar__text-token severity-bar__text-token--${k}`}>
            {safeCount(counts[k])} {FOUR_LEVEL_LABELS[k]}
          </span>
        </span>
      ))}
    </>
  );
}

export type ConfidenceTier = 'red' | 'gold' | 'jade';

/** Map a 0-100 confidence value to its color tier. Exported so downstream
 *  consumers (badges, callouts) can render a matching tier label without
 *  duplicating the threshold logic. */
export function confidenceTier(
  value: number,
  thresholds: ConfidenceThresholds = DEFAULT_CONFIDENCE_THRESHOLDS,
): ConfidenceTier {
  const v = Number.isFinite(value) ? value : 0;
  if (v < thresholds.low) return 'red';
  if (v < thresholds.high) return 'gold';
  return 'jade';
}

function confidenceAriaSummary(value: number, tier: 'red' | 'gold' | 'jade'): string {
  const word = tier === 'red' ? 'low' : tier === 'gold' ? 'medium' : 'high';
  return `Confidence ${Math.round(value)} percent (${word})`;
}

function confidenceTextSummary(value: number): string {
  return `${Math.round(value)}% confidence`;
}

function fourLevelAriaSummary(counts: FourLevelCounts): string {
  const total = sumFourLevel(counts);
  if (total === 0) return 'Severity breakdown: no findings';
  const parts = FOUR_LEVEL_ORDER.filter((k) => safeCount(counts[k]) > 0).map((k) =>
    pluralCount(safeCount(counts[k]), FOUR_LEVEL_LABELS[k]),
  );
  return `Severity breakdown: ${parts.join(', ')}`;
}

function fourLevelTextSummary(counts: FourLevelCounts): string {
  const total = sumFourLevel(counts);
  if (total === 0) return 'No findings';
  const parts = FOUR_LEVEL_ORDER.filter((k) => safeCount(counts[k]) > 0).map(
    (k) => `${safeCount(counts[k])} ${FOUR_LEVEL_LABELS[k]}`,
  );
  return parts.join(' · ');
}

function joinClass(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

function BarWrapper({
  size,
  loading,
  className,
  testId,
  ariaLabel,
  children,
  toneClass,
}: {
  size: SeverityBarSize;
  loading: boolean;
  className?: string;
  testId?: string;
  ariaLabel: string;
  children: ReactNode;
  toneClass?: string;
}) {
  const rootClass = joinClass(
    'severity-bar',
    size === 'compact' && 'severity-bar--compact',
    loading && 'severity-bar--loading',
    toneClass,
    className,
  );
  if (loading) {
    return (
      <div
        className={rootClass}
        role="img"
        aria-busy="true"
        aria-label={ariaLabel}
        data-testid={testId}
      >
        <span className="severity-bar__track severity-bar__track--skel" aria-hidden="true" />
      </div>
    );
  }
  return (
    <div
      className={rootClass}
      role="img"
      aria-label={ariaLabel}
      data-testid={testId}
    >
      {children}
    </div>
  );
}

export function SeverityBar(props: SeverityBarProps) {
  const size = props.size ?? 'default';
  const showText = props.showText ?? true;
  const loading = props.loading === true;

  const colorize = props.colorize === true;

  if (props.variant === 'stacked') {
    const safe: StackedCounts = {
      crit: safeCount(props.counts.crit),
      warn: safeCount(props.counts.warn),
      clean: safeCount(props.counts.clean),
    };
    const total = sumStacked(safe);
    const ariaLabel =
      props.ariaLabel ?? (loading ? 'Severity loading' : stackedAriaSummary(safe));

    return (
      <div className="severity-bar-wrap">
        <BarWrapper
          size={size}
          loading={loading}
          className={props.className}
          testId={props.testId}
          ariaLabel={ariaLabel}
        >
          <span className="severity-bar__track" aria-hidden="true">
            {total === 0 ? (
              <span
                className="severity-bar__seg severity-bar__seg--empty"
                style={{ width: '100%' }}
                aria-hidden="true"
              />
            ) : (
              STACKED_ORDER.map((key) => {
                const count = safe[key];
                if (count === 0) return null;
                const width = (count / total) * 100;
                return (
                  <span
                    key={key}
                    className={`severity-bar__seg severity-bar__seg--${key}`}
                    style={{ width: `${width}%` }}
                    aria-hidden="true"
                  />
                );
              })
            )}
          </span>
        </BarWrapper>
        {showText && !loading && (
          <p
            className={`severity-bar__text${colorize ? ' severity-bar__text--colorized' : ''}`}
            data-empty={total === 0 ? 'true' : 'false'}
          >
            {colorize ? <StackedColorizedTokens counts={safe} /> : stackedTextSummary(safe)}
          </p>
        )}
      </div>
    );
  }

  if (props.variant === 'confidence') {
    const thresholds = props.thresholds ?? DEFAULT_CONFIDENCE_THRESHOLDS;
    const value = clampPercent(props.value);
    const tier = confidenceTier(value, thresholds);
    const ariaLabel =
      props.ariaLabel ?? (loading ? 'Severity loading' : confidenceAriaSummary(value, tier));
    const textSummary = confidenceTextSummary(value);

    return (
      <div className="severity-bar-wrap">
        <BarWrapper
          size={size}
          loading={loading}
          className={props.className}
          testId={props.testId}
          ariaLabel={ariaLabel}
          toneClass={`severity-bar--conf-${tier}`}
        >
          <span className="severity-bar__track" aria-hidden="true">
            <span
              className={`severity-bar__fill severity-bar__fill--${tier}`}
              style={{ width: `${value}%` }}
              aria-hidden="true"
            />
          </span>
        </BarWrapper>
        {showText && !loading && (
          <p className="severity-bar__text severity-bar__text--conf">{textSummary}</p>
        )}
      </div>
    );
  }

  // variant === 'four-level'
  const safe: FourLevelCounts = {
    info: safeCount(props.counts.info),
    low: safeCount(props.counts.low),
    medium: safeCount(props.counts.medium),
    high: safeCount(props.counts.high),
    critical: safeCount(props.counts.critical),
  };
  const total = sumFourLevel(safe);
  const ariaLabel =
    props.ariaLabel ?? (loading ? 'Severity loading' : fourLevelAriaSummary(safe));

  return (
    <div className="severity-bar-wrap">
      <BarWrapper
        size={size}
        loading={loading}
        className={props.className}
        testId={props.testId}
        ariaLabel={ariaLabel}
      >
        <span className="severity-bar__track" aria-hidden="true">
          {total === 0 ? (
            <span
              className="severity-bar__seg severity-bar__seg--empty"
              style={{ width: '100%' }}
              aria-hidden="true"
            />
          ) : (
            FOUR_LEVEL_ORDER.map((key) => {
              const count = safe[key];
              if (count === 0) return null;
              const width = (count / total) * 100;
              return (
                <span
                  key={key}
                  className={`severity-bar__seg severity-bar__seg--${key}`}
                  style={{ width: `${width}%` }}
                  aria-hidden="true"
                />
              );
            })
          )}
        </span>
      </BarWrapper>
      {showText && !loading && (
        <p
          className={`severity-bar__text${colorize ? ' severity-bar__text--colorized' : ''}`}
          data-empty={total === 0 ? 'true' : 'false'}
        >
          {colorize ? <FourLevelColorizedTokens counts={safe} /> : fourLevelTextSummary(safe)}
        </p>
      )}
    </div>
  );
}
