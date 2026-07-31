// SPDX-License-Identifier: Apache-2.0
'use client';

/**
 * ScannerTracePanel — the Trace-tab body for the Scanner Tatami Rail.
 *
 * Extracted from `ScannerEvidenceRail` so it ships as its own `next/dynamic`
 * chunk (a collapsed Rail loads ~0 JS for the panel bodies). Pure +
 * presentational. The scanner adapter yields a SINGLE synthetic read-view
 * event — a multi-step event stream is a new write path and is out of OSS v0.
 * Imports only a TYPE from `@/lib/tatami/types` (erased) — never the
 * `@/lib/tatami` barrel (server-only fs stores) and never any EE surface.
 */

import { type ReactNode } from 'react';
import type { TatamiTraceEvent } from '@/lib/tatami/types';

const TRACE_LEVEL_TONE = {
  info: 'steel',
  warn: 'warn',
  error: 'red',
} as const satisfies Record<TatamiTraceEvent['level'], string>;

export interface ScannerTracePanelProps {
  readonly events: readonly TatamiTraceEvent[];
}

/** The single synthetic read-view trace event (no multi-step timeline — a real
 *  event stream is a new write path, out of OSS v0). */
export function ScannerTracePanel({ events }: ScannerTracePanelProps): ReactNode {
  if (events.length === 0) {
    return (
      <p className="wb-hint" data-testid="scanner-tatami-trace-empty">
        No trace events.
      </p>
    );
  }
  return (
    <ol
      data-testid="scanner-tatami-trace"
      style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 'var(--space-2)' }}
    >
      {events.map((e) => (
        <li key={e.id} className="drow feed-row">
          <span className="ts">{e.ts || '—'}</span>
          <span className="flex1 ellipsis">{e.message}</span>
          <span className={`chip ${TRACE_LEVEL_TONE[e.level]}`}>
            <span className="dot" aria-hidden="true" />
            {e.type}
          </span>
        </li>
      ))}
    </ol>
  );
}
