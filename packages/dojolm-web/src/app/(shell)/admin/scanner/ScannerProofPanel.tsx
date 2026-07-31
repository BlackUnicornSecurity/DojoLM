// SPDX-License-Identifier: Apache-2.0
'use client';

/**
 * ScannerProofPanel — the Proof-tab body for the Scanner Tatami Rail.
 *
 * Extracted from `ScannerEvidenceRail` so it ships as its own `next/dynamic`
 * chunk (a collapsed Rail loads ~0 JS for the panel bodies). Pure +
 * presentational: renders only the proof fields the scanner adapter actually
 * populated — no invented values, and never the raw matched payload (the
 * adapter withholds `finding.match`). Imports only a TYPE from
 * `@/lib/tatami/types` (erased at build) — never the `@/lib/tatami` barrel
 * (which re-exports the fs-backed, server-only stores) and never any EE
 * `tatami-vault` surface.
 */

import { Fragment, type ReactNode } from 'react';
import type { TatamiProof } from '@/lib/tatami/types';

export interface ScannerProofPanelProps {
  readonly proof: Partial<TatamiProof>;
}

/** A read-only, summary-level view of the derived proof. Renders only fields
 *  the adapter actually populated — no invented values, no raw payloads. */
export function ScannerProofPanel({ proof }: ScannerProofPanelProps): ReactNode {
  const rows: { readonly k: string; readonly v: string }[] = [
    proof.severity ? { k: 'Top severity', v: proof.severity } : null,
    proof.capturedBy ? { k: 'Captured by', v: proof.capturedBy } : null,
    proof.createdAt ? { k: 'Captured at', v: proof.createdAt } : null,
    proof.replaySafetyReasons && proof.replaySafetyReasons.length > 0
      ? { k: 'Replay', v: proof.replaySafetyReasons.join(', ') }
      : null,
  ].filter((r): r is { k: string; v: string } => r !== null);

  return (
    <div data-testid="scanner-tatami-proof">
      {proof.title ? (
        <p style={{ margin: '0 0 var(--space-2)', fontWeight: 600 }}>{proof.title}</p>
      ) : null}
      {proof.summary ? (
        <p className="wb-hint" style={{ margin: '0 0 var(--space-3)' }}>
          {proof.summary}
        </p>
      ) : null}
      {rows.length > 0 ? (
        <dl
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            gap: 'var(--space-1) var(--space-3)',
            margin: 0,
          }}
        >
          {rows.map((r) => (
            <Fragment key={r.k}>
              <dt className="wb-hint" style={{ margin: 0 }}>
                {r.k}
              </dt>
              <dd className="mono" style={{ margin: 0, wordBreak: 'break-word' }}>
                {r.v}
              </dd>
            </Fragment>
          ))}
        </dl>
      ) : null}
    </div>
  );
}
