// SPDX-License-Identifier: Apache-2.0
/**
 * ProgramCard — single `<article>` card render for the Ronin Bounty
 * programs grid.
 *
 * Extracted from `RoninAdminClient.tsx` per the >800 LOC split (PR #3).
 * Pure presentational — caller owns the filter / sort state. testId
 * discipline preserved byte-identical so EA9-* tests stay green.
 *
 * Narrow direct-component-path imports per
 * the darwin-perf import rule.
 */

import type { ReactElement } from "react";
import { cap } from "@/design/primitives/_caps";
import {
  COMPANY_MAX,
  NAME_MAX,
  PLATFORM_LABEL,
  PROGRAM_SEVERITY_TO_SEV_LEVEL,
  PROGRAM_STATUS_ACCENT_VAR,
  PROGRAM_STATUS_CHIP_TONE,
  PROGRAM_STATUS_LABEL,
  SCOPE_MAX,
  type ProgramLite,
} from "./types";

export interface ProgramCardProps {
  readonly program: ProgramLite;
  /**
   * Formatter for the payout-range badge — injected so the orchestrator
   * keeps the single `payoutFmt` / `rangeFmt` source of truth + locale
   * variance defence in one place.
   */
  readonly formatRange: (min: number, max: number, currency: string) => string;
}

export function ProgramCard({
  program: p,
  formatRange,
}: ProgramCardProps): ReactElement {
  const chipTone = PROGRAM_STATUS_CHIP_TONE[p.status];
  const accentVar = PROGRAM_STATUS_ACCENT_VAR[p.status];
  return (
    <article
      role="listitem"
      data-testid={`ronin-program-card-${p.id}`}
      className="ronin-program-card"
      style={{
        padding: "20px 22px 20px 26px",
        background: "linear-gradient(180deg, var(--bg-2) 0%, var(--bg-1) 100%)",
        border: "1px solid var(--b-1)",
        borderLeft: `4px solid ${accentVar}`,
        borderRadius: 12,
        boxShadow: "var(--shadow-card)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        minWidth: 0,
        position: "relative",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "var(--fg-dim)",
              marginBottom: 6,
              fontWeight: 600,
            }}
          >
            {PLATFORM_LABEL[p.platform]}
          </div>
          <h3
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 700,
              color: "var(--fg)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              letterSpacing: "-0.01em",
            }}
            title={p.name}
          >
            {cap(p.name, NAME_MAX)}
          </h3>
        </div>
        <span
          className="chip gold"
          data-testid={`ronin-program-payout-${p.id}`}
          style={{
            whiteSpace: "nowrap",
            fontFamily: "var(--mono)",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.04em",
          }}
        >
          {formatRange(p.rewardMin, p.rewardMax, p.currency)}
        </span>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <span
          className={`chip ${chipTone}`}
          data-sev={PROGRAM_SEVERITY_TO_SEV_LEVEL[p.status]}
          data-testid={`ronin-program-status-${p.id}`}
        >
          <span className="dot" aria-hidden="true" />
          {PROGRAM_STATUS_LABEL[p.status]}
        </span>
      </div>
      {p.owaspLlmCoverage && p.owaspLlmCoverage.length > 0 && (
        // Adversarial-review HIGH-1 fix — `role="group"` rather than
        // nested `role="list"` inside the outer `role="listitem"` card.
        // macOS VoiceOver mis-announces nested lists by walking through
        // the article landmark; `group` + label is the canonical pattern
        // for a set of related chips inside a card.
        <div
          className="ronin-program-owasp-row"
          role="group"
          aria-label="OWASP LLM categories"
          data-testid={`ronin-program-owasp-${p.id}`}
          style={{ display: "flex", gap: 4, flexWrap: "wrap" }}
        >
          {p.owaspLlmCoverage.map((cat) => (
            <span
              key={cat}
              className="chip steel"
              data-testid={`ronin-program-owasp-chip-${p.id}-${cat}`}
              style={{
                fontSize: 11,
                padding: "3px 7px",
                letterSpacing: "0.08em",
              }}
            >
              {cat}
            </span>
          ))}
        </div>
      )}
      <div
        style={{
          fontSize: 13,
          lineHeight: 1.5,
          color: "var(--fg-dim)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical",
        }}
        title={p.scopeSummary}
      >
        {cap(p.scopeSummary, SCOPE_MAX)}
      </div>
      <div
        style={{
          fontSize: 12,
          color: "var(--fg-dim)",
          marginTop: "auto",
          paddingTop: 6,
          borderTop: "1px solid var(--b-1)",
        }}
      >
        {cap(p.company, COMPANY_MAX)}
      </div>
    </article>
  );
}
