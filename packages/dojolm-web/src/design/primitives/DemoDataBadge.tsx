// SPDX-License-Identifier: Apache-2.0
/**
 * DemoDataBadge — YR.13.0.3 (G-A3) primitive.
 *
 * Mark a region of the UI as rendering fixture (not live) data. The badge
 * pairs with the `data-fixture="true"` HTML attribute the
 * `bu-tpi/explicit-data-source` ESLint rule expects on demo containers,
 * so reviewers can see at a glance that a metric / list / chart is canned.
 *
 * Usage:
 *   <div data-fixture="true">
 *     <DemoDataBadge />
 *     <Ticker items={demoTickerItems} />
 *   </div>
 *
 * Visual: small steel chip, 10px font, role="status" so screen-readers
 * announce it once. Non-interactive.
 */
import type { CSSProperties } from 'react';

export interface DemoDataBadgeProps {
  /** Override the default "Demo data" label. */
  label?: string;
  /** Optional ticket / cross-reference for the data origin. */
  ticket?: string;
  /** Inline style overrides for narrow placements. */
  style?: CSSProperties;
  /** Extra className appended to the base chip styling. */
  className?: string;
}

export function DemoDataBadge({
  label = 'Demo data',
  ticket,
  style,
  className,
}: DemoDataBadgeProps) {
  const cls = ['chip', 'steel', 'demo-data-badge', className].filter(Boolean).join(' ');
  const title = ticket ? `Demo data — see ${ticket}` : 'Demo data';
  return (
    <span
      className={cls}
      role="status"
      aria-label={title}
      data-testid="demo-data-badge"
      title={title}
      style={style}
    >
      <span className="dot" aria-hidden="true" />
      {label}
    </span>
  );
}
