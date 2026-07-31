// SPDX-License-Identifier: Apache-2.0
import type { ReactNode } from 'react';

export type CountPillTone = '' | 'jade' | 'steel' | 'gold' | 'red' | 'violet';

export interface CountPillProps {
  n: number;
  label: ReactNode;
  tone?: CountPillTone;
}

/**
 * Number + label pill, sized to sit next to an H1. Uses tabular-nums
 * via the .pill class so the digit width stays stable across counts.
 * No --bu-cyan tone — G10 forbids cross-brand cyan on archetype chrome.
 */
export function CountPill({ n, label, tone = '' }: CountPillProps) {
  return (
    <span
      className={`pill count-pill ${tone}`.trim()}
      role="status"
      aria-label={typeof label === 'string' ? `${n} ${label}` : undefined}
    >
      <b aria-hidden="true">{n}</b>
      <span className="count-pill-label" aria-hidden="true">
        {label}
      </span>
    </span>
  );
}
