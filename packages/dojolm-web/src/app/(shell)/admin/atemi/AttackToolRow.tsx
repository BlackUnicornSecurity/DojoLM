// SPDX-License-Identifier: Apache-2.0
/**
 * AttackToolRow — co-located row component for the Atemi skills-library tab.
 *
 * Extracted from AtemiTabs.tsx (TICKET-G3-ATEMI — keeps the host tab below the
 * 800-line ceiling and isolates the per-row AIVSS derivation so the row
 * concern is unit-testable in isolation; mirrors the
 * `IndicatorRow.tsx` pattern from the Mitsuke G-3 wiring).
 *
 * Per ADR-0097 §7 — derives AIVSS client-side from the closed
 * `attackClass` + `severity` enums via `findingToAivssMetrics` +
 * `calculate`. When `/api/atemi/attack-tools` begins emitting
 * `tool.aivss` directly (TICKET-G3-API), the server-supplied value
 * wins over the client derivation.
 *
 * Defensive try/catch — a malformed tool can never crash the table; the
 * row falls back to a `band='none'` chip and logs to the console so the
 * regression is visible in dev tools.
 */

import type { ReactElement } from 'react';
// Atemi-PR-2 — narrow sub-path import per
// the darwin-perf import rule.
import { AivssPill } from '@/design/aivss/AivssPill';
import { calculate, type AivssScore } from 'bu-tpi/aivss';
import { findingToAivssMetrics } from '@/lib/atemi/aivss-mapping';
import {
  ATTACK_CLASS_LABEL,
  SEVERITY_CHIP,
  SEVERITY_LABEL,
  type AttackToolLite,
} from './AtemiTabs';

export interface AttackToolRowProps {
  readonly tool: AttackToolLite;
}

export function AttackToolRow({ tool: t }: AttackToolRowProps): ReactElement {
  // ADR-0097 §7 — derive AIVSS client-side from attackClass + severity.
  // Server-supplied `t.aivss` wins when present (TICKET-G3-API future).
  // Wrapped in try/catch so a malformed tool can never crash the table —
  // falls back to band='none' chip + console.error for diagnostics.
  // Mirrors the pattern in
  // `packages/dojolm-web/src/app/(shell)/admin/mitsuke/IndicatorRow.tsx`.
  let aivss: AivssScore | null = t.aivss ?? null;
  if (aivss === null) {
    try {
      aivss = calculate(
        findingToAivssMetrics({
          category: t.attackClass,
          severity: t.severity,
        }),
      );
    } catch (err) {
      // Defensive fallback — preserves the row but flags the regression.
      // A throw here means findingToAivssMetrics or calculate broke for a
      // shape that should have been narrowed by sanitizeTool upstream.
      // eslint-disable-next-line no-console
      console.error('[atemi] AIVSS derivation failed for finding', {
        category: t.attackClass,
        severity: t.severity,
        err,
      });
      aivss = null;
    }
  }

  return (
    <tr data-testid={`atemi-skill-row-${t.id}`}>
      <td>{t.name}</td>
      <td>
        <span aria-label={`Attack class ${ATTACK_CLASS_LABEL[t.attackClass]}`}>
          {ATTACK_CLASS_LABEL[t.attackClass]}
        </span>
      </td>
      <td>
        <span
          className={SEVERITY_CHIP[t.severity]}
          aria-label={`Severity ${SEVERITY_LABEL[t.severity]}`}
        >
          {SEVERITY_LABEL[t.severity]}
        </span>
      </td>
      <td>
        {aivss !== null ? (
          <AivssPill selfAttested
            band={aivss.severity}
            score={aivss.base}
            testId={`atemi-aivss-pill-${t.id}`}
          />
        ) : (
          <AivssPill selfAttested
            band="none"
            testId={`atemi-aivss-pill-${t.id}`}
          />
        )}
      </td>
      <td>{t.target}</td>
      <td style={{ fontSize: 12 }}>{t.summary}</td>
    </tr>
  );
}
