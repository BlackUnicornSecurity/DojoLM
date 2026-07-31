// SPDX-License-Identifier: Apache-2.0
/**
 * HubSummaryPanel — Ronin Hub bottom-of-page summary block.
 *
 * Extracted from `RoninAdminClient.tsx` per architect Q4 (PR #3 of
 * the Phase 2 polish wave) — lands the orchestrator cleanly under
 * the 800-LOC cap. Renders the KV summary table (top program / top
 * platform / open / paid totals) + the per-status mix list.
 *
 * Pure presentational — caller derives the rows and passes them in.
 * No state owned here.
 */

import type { ReactElement } from 'react';
import { KV, type KVRow } from '@/design/primitives/KV';
import {
  PROGRAM_STATUS_LABEL,
  type ProgramLite,
  type ProgramStatus,
} from './types';

export interface HubSummaryPanelProps {
  readonly kvRows: readonly KVRow[];
  readonly programs: readonly ProgramLite[];
}

export function HubSummaryPanel({
  kvRows,
  programs,
}: HubSummaryPanelProps): ReactElement {
  return (
    <>
      <KV rows={[...kvRows]} />
      {programs.length > 0 && (
        <ul
          className="wb-hint"
          data-testid="ronin-status-mix"
          aria-label="Per-program-status totals"
        >
          {(Object.keys(PROGRAM_STATUS_LABEL) as ProgramStatus[]).map((s) => {
            const count = programs.filter((p) => p.status === s).length;
            if (count === 0) return null;
            return (
              <li key={s}>
                <span aria-label={`status ${PROGRAM_STATUS_LABEL[s]}`}>
                  {PROGRAM_STATUS_LABEL[s]}
                </span>{' '}
                · {count}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
