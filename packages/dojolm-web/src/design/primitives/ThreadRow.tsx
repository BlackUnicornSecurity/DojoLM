// SPDX-License-Identifier: Apache-2.0
import type { ReactNode, CSSProperties } from 'react';

export interface ThreadRowProps {
  children: ReactNode;
  /**
   * grid-template-columns value passed inline (the source design lets
   * each table set its own column shape). Falls back to a single
   * stretch column when omitted.
   */
  gridTemplateColumns?: string;
  /** Render as the table head row (uppercase mono labels). */
  head?: boolean;
  className?: string;
}

/**
 * Generic table-row primitive. The grid shape is set per call so the
 * primitive composes across leaderboards, audit logs, and posture
 * tables without an opinionated default. `head=true` swaps the
 * row-style for the canonical header treatment.
 */
export function ThreadRow({
  children,
  gridTemplateColumns,
  head,
  className,
}: ThreadRowProps) {
  const cls = ['drow', head ? 'thead' : '', className].filter(Boolean).join(' ');
  const style: CSSProperties | undefined = gridTemplateColumns
    ? { gridTemplateColumns }
    : undefined;
  return (
    <div className={cls} role={head ? 'row' : undefined} style={style}>
      {children}
    </div>
  );
}
