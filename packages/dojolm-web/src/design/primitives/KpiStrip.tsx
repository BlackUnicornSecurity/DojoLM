// SPDX-License-Identifier: Apache-2.0
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Metric, type MetricDelta, type MetricTone } from '../shell/Metric';

// B.1 anchor primitive — V1-restoration KpiStrip. Renders the at-a-glance row
// of 3-5 metric cards that sits at the top of every Yamabushi module page.
// KpiStrip is layout chrome — each card composes the existing `<Metric>`
// primitive (frozen API). Loading and error per-card states are handled here
// because Metric does not own those — they are KpiStrip's strip-level concern.

export type KpiStripTone = MetricTone;

/** Visual density. `comfortable` (default) renders labels in mono-uppercase
 *  with the 0.18em letter-spacing that matches V1 Scanner / Hattori chrome.
 *  `loose` renders labels in Inter sans sentence-case for the V1
 *  Atemi / Sengoku / Amaterasu personality. Both share the same dimensions —
 *  density only flips typography so a page may switch on a per-module basis
 *  without re-laying out. */
export type KpiStripDensity = 'comfortable' | 'loose';

export interface KpiStripDelta {
  direction: 'up' | 'down' | 'flat';
  value: ReactNode;
  label?: ReactNode;
}

export interface KpiStripItem {
  label: ReactNode;
  value: ReactNode;
  unit?: ReactNode;
  delta?: KpiStripDelta;
  tone?: KpiStripTone;
  icon?: ReactNode;
  href?: string;
  loading?: boolean;
  error?: string | boolean;
  /**
   * Per-cell `data-testid`. Additive opt-in for consumers that need to
   * pin individual KPI cells from tests (e.g. Scanner's S302 per-tile
   * test contract). Existing consumers that omit this render unchanged.
   */
  testId?: string;
  /**
   * Per-cell `aria-label` override. Additive opt-in for consumers that
   * need richer AT context than the visible label provides (e.g.
   * Scanner's S302 closed-enum aria contract). Defaults to the existing
   * loading/error-state derivations when omitted.
   */
  ariaLabel?: string;
  /** Dim sub-caption under the value (design `.kpi .d`). Passed through
   *  to `<Metric sub>`; ignored while loading/error. */
  sub?: ReactNode;
}

export interface KpiStripProps {
  module: string;
  items: KpiStripItem[];
  actions?: ReactNode;
  density?: KpiStripDensity;
  className?: string;
  testId?: string;
}

export const KPI_STRIP_MIN_ITEMS = 3;
export const KPI_STRIP_MAX_ITEMS = 5;

function isNumericValue(value: ReactNode): boolean {
  if (value === null || value === undefined || value === '') return false;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'string') return false;
  // Mirrors design canvas heuristic: leading number = numeric (covers
  // "13/13", "50.8%", "1 of 18"). Strings like "Samurai", "B+", "N/A"
  // fall through to the sans family.
  return /^[\d.\-+]/.test(value.trim());
}

function isZeroValue(value: ReactNode): boolean {
  // SKIN-SPEC §5.2 value-color law: zero counts and unsourced "—" dashes
  // render dim (--fg-dim), never a tone color.
  // ponytail: exact 0 / "0" / "—" only; formatted zeros ("0%") stay toned.
  if (typeof value === 'number') return value === 0;
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return trimmed === '0' || trimmed === '—';
}

function deltaKind(direction: KpiStripDelta['direction']): MetricDelta['kind'] {
  if (direction === 'down') return 'neg';
  if (direction === 'flat') return 'flat';
  return '';
}

function deltaText(delta: KpiStripDelta): ReactNode {
  if (delta.label != null) {
    return (
      <>
        {delta.value}
        <span className="kpi-strip__delta-label"> {delta.label}</span>
      </>
    );
  }
  return delta.value;
}

function metricLabelText(label: ReactNode): string {
  if (typeof label === 'string' && label.trim().length > 0) return label;
  return 'metric';
}

export function KpiStrip({
  module,
  items,
  actions,
  density = 'comfortable',
  className,
  testId,
}: KpiStripProps) {
  if (
    process.env.NODE_ENV !== 'production' &&
    (items.length < KPI_STRIP_MIN_ITEMS || items.length > KPI_STRIP_MAX_ITEMS)
  ) {
    console.warn(
      `[KpiStrip] ${module}: items length is ${items.length}; expected ${KPI_STRIP_MIN_ITEMS}-${KPI_STRIP_MAX_ITEMS}.`,
    );
  }

  const classes = [
    'kpi-strip',
    density === 'loose' && 'kpi-strip--loose',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  const count = items.length;

  return (
    <div
      className={classes}
      role="group"
      aria-label={`At-a-glance metrics for ${module}`}
      data-density={density}
      data-testid={testId}
    >
      <div className="kpi-strip__inner">
        <div className="kpi-strip__row" data-count={count}>
        {items.map((item, idx) => {
          const key = `${idx}`;
          const labelText = metricLabelText(item.label);

          if (item.loading) {
            return (
              <div
                key={key}
                className="kpi-strip__cell kpi-strip__cell--loading"
                aria-busy="true"
                aria-label={`${labelText} loading`}
                data-testid={item.testId}
              >
                <div className="kpi-strip__skel kpi-strip__skel--k" />
                <div className="kpi-strip__skel kpi-strip__skel--v" />
                <div className="kpi-strip__skel kpi-strip__skel--d" />
              </div>
            );
          }

          if (item.error) {
            const errMsg = typeof item.error === 'string' ? item.error : 'Failed to load';
            return (
              <div
                key={key}
                className="mcard red kpi-strip__cell kpi-strip__cell--error"
                role="group"
                aria-label={`${labelText}, error`}
                data-testid={item.testId}
              >
                <div className="k">
                  <span>{item.label}</span>
                  {item.icon && (
                    <span style={{ color: 'var(--torii-hi)' }} aria-hidden="true">
                      {item.icon}
                    </span>
                  )}
                </div>
                <div className="kpi-strip__err-pill" role="status">
                  <span className="kpi-strip__err-dot" aria-hidden="true" />
                  <span>{errMsg}</span>
                </div>
              </div>
            );
          }

          const numeric = isNumericValue(item.value);
          const metric = (
            <Metric
              k={item.label}
              v={item.value}
              unit={item.unit}
              delta={
                item.delta
                  ? { kind: deltaKind(item.delta.direction), text: deltaText(item.delta) }
                  : undefined
              }
              tone={item.tone}
              icon={item.icon}
              sub={item.sub}
            />
          );

          const wrapperClass = [
            'kpi-strip__cell',
            !numeric && 'kpi-strip__cell--string',
            isZeroValue(item.value) && 'kpi-strip__cell--zero',
            item.href && 'kpi-strip__cell--link',
          ]
            .filter(Boolean)
            .join(' ');

          if (item.href) {
            return (
              <Link
                key={key}
                href={item.href}
                className={wrapperClass}
                data-testid={item.testId}
                aria-label={item.ariaLabel}
              >
                {metric}
              </Link>
            );
          }
          return (
            <div
              key={key}
              className={wrapperClass}
              data-testid={item.testId}
              aria-label={item.ariaLabel}
              role={item.ariaLabel ? 'group' : undefined}
            >
              {metric}
            </div>
          );
        })}
      </div>
        {actions && (
          <div className="kpi-strip__actions" role="group" aria-label={`${module} actions`}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
