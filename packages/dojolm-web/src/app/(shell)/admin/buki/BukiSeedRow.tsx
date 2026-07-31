// SPDX-License-Identifier: Apache-2.0
/**
 * BukiSeedRow — co-located row component for the Buki SAGE-seed corpus
 * findings table.
 *
 * Extracted from BukiClient.tsx (TICKET-G3-BUKI — keeps the host
 * client below the 800-line ceiling and isolates the per-row AIVSS
 * presentation; mirrors the `KagamiFindingRow.tsx` (Kagami) +
 * `AttackToolRow.tsx` (Atemi) + `IndicatorRow.tsx` (Mitsuke) patterns
 * from the prior G-3 wirings).
 *
 * AIVSS source — `seed.aivss` is the canonical server-supplied score
 * per ADR-0097 §7. PR #843 wired TICKET-G3-API-BUKI so
 * `/api/buki/sage/seeds` GET + POST now attach the score per-row.
 * The previous client-side derivation via `findingToAivssMetrics` +
 * `calculate` was a Phase 1 fallback and was removed in PR-3 of the
 * Buki Phase 2 wave (the wire shape is the single source of truth).
 *
 * Empty AIVSS — when `seed.aivss` is absent or `null` (server returned
 * a row with missing/invalid criticity that couldn't be scored), the
 * row renders a `band='none'` chip as the explicit "no signal" slot.
 */

import type { ReactElement } from 'react';
import { AivssPill } from '@/design/aivss';
import type { SageCriticity } from '@/lib/sage/fixtures';
import type { AivssScore } from 'bu-tpi/aivss';

const SEVERITY_CHIP: Readonly<Record<SageCriticity, string>> = Object.freeze({
  CRITICAL: 'wb-badge alert',
  HIGH: 'wb-badge warn',
  MEDIUM: 'wb-badge muted',
  LOW: 'wb-badge ok',
  INFO: 'wb-badge muted',
});

const SEVERITY_LABEL: Readonly<Record<SageCriticity, string>> = Object.freeze({
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
  INFO: 'INFO',
});

const NAME_MAX = 120;

function cap(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 1))}…`;
}

/**
 * Narrow shape consumed by the row — sufficient subset of the
 * `SeedRecord` declared in `BukiClient.tsx` to keep this component
 * decoupled from the host client's full type. The `category` field is
 * widened to `string` here to mirror the client-edge sanitization layer
 * (the server-side route enforces the closed `SeedCategory` enum;
 * `'unknown'` is the explicit fallback in the AIVSS mapper for any
 * value that bypasses the server gate).
 */
export interface BukiSeedLite {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly criticity: SageCriticity;
  readonly generation: number;
  /**
   * ADR-0097 §7 — server-supplied AIVSS field. Populated by
   * `/api/buki/sage/seeds` per TICKET-G3-API-BUKI (PR #843). Optional
   * because the route returns `null` when criticity is missing or
   * outside the closed enum — that null flows through here and renders
   * a `band='none'` chip as the explicit "no signal" slot.
   */
  readonly aivss?: AivssScore | null;
}

export interface BukiSeedRowProps {
  readonly seed: BukiSeedLite;
}

export function BukiSeedRow({ seed: s }: BukiSeedRowProps): ReactElement {
  // ADR-0097 §7 — server-supplied score is canonical. PR #843
  // (TICKET-G3-API-BUKI) attaches `seed.aivss` per-row on the GET
  // response; the previous client-side `findingToAivssMetrics` +
  // `calculate` fallback was removed in PR-3 of the Buki Phase 2 wave
  // (single source of truth). `null` is the explicit "no signal"
  // slot when the server couldn't score the row.
  const aivss: AivssScore | null = s.aivss ?? null;

  return (
    <div
      role="row"
      data-testid={`buki-seed-row-${s.id}`}
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 100px 90px 130px',
        gap: 8,
        alignItems: 'center',
        padding: '6px 0',
        borderTop: '1px solid var(--b-1, #222)',
        fontSize: 12,
      }}
    >
      <span
        role="cell"
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        aria-label={`Seed ${s.id} generation ${s.generation}`}
      >
        {cap(s.name, NAME_MAX)}
      </span>
      <span role="cell" aria-label={`Category ${s.category}`}>
        {s.category}
      </span>
      <span
        role="cell"
        className={SEVERITY_CHIP[s.criticity]}
        aria-label={`Severity ${SEVERITY_LABEL[s.criticity]}`}
      >
        {SEVERITY_LABEL[s.criticity]}
      </span>
      <span role="cell">
        {aivss !== null ? (
          <AivssPill
            band={aivss.severity}
            score={aivss.base}
            testId={`buki-aivss-pill-${s.id}`}
          />
        ) : (
          <AivssPill band="none" testId={`buki-aivss-pill-${s.id}`} />
        )}
      </span>
    </div>
  );
}
