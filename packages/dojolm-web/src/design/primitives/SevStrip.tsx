// SPDX-License-Identifier: Apache-2.0
export type SevStripLevel = 'crit' | 'high' | 'med' | 'low';

export interface SevStripProps {
  level: SevStripLevel;
  /** Optional accessible label override (e.g. "Critical severity"). */
  ariaLabel?: string;
  className?: string;
}

const LABELS: Record<SevStripLevel, string> = {
  crit: 'Critical severity',
  high: 'High severity',
  med: 'Medium severity',
  low: 'Low severity',
};

/**
 * 4px vertical strip with color by severity. Token-driven via the
 * `.sev-strip.{crit|high|med|low}` rules in primitives.css. Because
 * the strip is purely decorative chrome paired with text data
 * elsewhere in the row, it is `aria-hidden` by default — pass
 * `ariaLabel` explicitly when the strip is the only severity signal
 * in its row (a11y per S1.2.2 rule 10).
 */
export function SevStrip({ level, ariaLabel, className }: SevStripProps) {
  const cls = ['sev-strip', level, className].filter(Boolean).join(' ');
  if (ariaLabel) {
    return (
      <span
        className={cls}
        role="img"
        aria-label={ariaLabel === 'auto' ? LABELS[level] : ariaLabel}
      />
    );
  }
  return <span className={cls} aria-hidden="true" />;
}
