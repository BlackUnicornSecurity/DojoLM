// SPDX-License-Identifier: Apache-2.0
/**
 * JutsuModelCard — single `<article>` card render for the Jutsu Models
 * tab grid, reproducing the design reference (wave-g3 "Models v2.html"
 * `.mdl`): provider eyebrow → mono name + belt-rank chip → status /
 * guard / risk chips → the `UPDATED · MAX TOKENS · RESILIENCE` meta
 * triple → a single-row `Edit · Test · Delete` action cluster.
 *
 * P4 D2/D8/D10/D13/D15 remediation: the prior invented ember
 * `HIGH · 7.5 (self-attested)` pill + duplicate mono model-id line +
 * stacked actions were replaced with the reference anatomy. Resilience
 * is the same on-wire AIVSS signal, reformatted into the meta cell and
 * captioned self-attested by the below-grid registry note (JutsuClient);
 * absent signal renders an em-dash (honest not-measured), never a
 * fabricated score.
 *
 * Pure presentational — all state lives on the parent. testId discipline
 * preserved so the E-A5 / page suites pass unchanged.
 *
 * Narrow direct-component-path imports per the darwin-perf import rule.
 */

import type { CSSProperties, ReactElement } from "react";
import { cap } from "@/design/primitives/_caps";
import type { AivssScore } from "bu-tpi/aivss";
import { getBeltRank } from "@/components/ui/BeltBadge";
import { providerColor, providerLogo } from "./providerColor";
import {
  SAFETY_LABEL,
  SAFETY_RISK_RAMP,
  SAFETY_TO_SEV_LEVEL,
  NAME_MAX,
  PROVIDER_MAX,
  type SafeModelConfig,
} from "./types";

export interface JutsuModelCardProps {
  readonly model: SafeModelConfig;
  readonly testingId: string | null;
  readonly deleting: boolean;
  readonly onDetail: (id: string) => void;
  readonly onTest: (id: string) => void;
  readonly onDelete: (id: string) => void;
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/** Design meta cell shows a short `15 Apr`. UTC-based so the value is
 *  deterministic across runner time zones. Missing/invalid → em-dash. */
function formatUpdated(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

export function JutsuModelCard({
  model: m,
  testingId,
  deleting,
  onDetail,
  onTest,
  onDelete,
}: JutsuModelCardProps): ReactElement {
  const aivss: AivssScore | null = m.aivss ?? null;
  // Belt rank + resilience derive from the same on-wire AIVSS signal only
  // (E1-A-RB-15.5): operator-attested safetyRisk alone is NOT a measured
  // score. AIVSS base is 0-10 risk (higher = worse); resilience inverts it
  // (higher = better). No signal → the belt chip is omitted and the
  // resilience cell shows an em-dash.
  const belt =
    aivss && typeof aivss.base === "number"
      ? getBeltRank(Math.max(0, Math.min(95, 95 - Math.round(aivss.base * 9.5))))
      : null;
  const resilience =
    aivss && typeof aivss.base === "number"
      ? Math.max(0, Math.min(10, 10 - aivss.base)).toFixed(1)
      : "—";
  const maxTokens =
    typeof m.maxTokens === "number" && Number.isFinite(m.maxTokens)
      ? m.maxTokens.toLocaleString("en-US")
      : "—";
  const updated = formatUpdated(m.updatedAt);
  const sevLevel = m.safetyRisk ? SAFETY_TO_SEV_LEVEL[m.safetyRisk] : undefined;
  const riskRamp = m.safetyRisk ? SAFETY_RISK_RAMP[m.safetyRisk] : null;
  const accent = providerColor(m.provider, m.model);
  const logo = providerLogo(m.provider, m.model);
  return (
    <article
      data-testid={`jutsu-model-card-${m.id}`}
      className={`jutsu-model-card${accent.glass ? " glass" : ""}`}
      style={
        {
          ...accent.vars,
          padding: "28px 30px 26px",
          background: "var(--bg-2)",
          border: "1px solid var(--b-1)",
          borderRadius: 16,
          boxShadow: "none",
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        } as CSSProperties
      }
    >
      {logo.src &&
        (logo.glass ? (
          // eslint-disable-next-line @next/next/no-img-element -- tiny static decorative mark; next/image adds no value
          <img
            className="mdl-logo mdl-logo-bu"
            src={logo.src}
            alt=""
            aria-hidden="true"
          />
        ) : (
          <span
            className="mdl-logo"
            aria-hidden="true"
            style={
              {
                WebkitMaskImage: `url("${logo.src}")`,
                maskImage: `url("${logo.src}")`,
              } as CSSProperties
            }
          />
        ))}
      <div className="prov">{cap(m.provider, PROVIDER_MAX)}</div>
      <div className="mdl-hd">
        <span className="nm" title={m.name}>
          {cap(m.name, NAME_MAX)}
        </span>
        {belt && (
          <span
            className={`belt ${belt.short.toLowerCase()}`}
            data-testid={`jutsu-model-belt-${m.id}`}
          >
            {belt.short}
          </span>
        )}
      </div>
      <div className="chips">
        <span
          className={`chip ${m.enabled ? "jade" : "ghost"}`}
          data-status={m.enabled ? "enabled" : "standby"}
          data-testid={`jutsu-model-status-${m.id}`}
        >
          <span className="dot" aria-hidden="true" />
          {m.enabled ? "Enabled" : "Standby"}
        </span>
        {m.requiresGuard && (
          <span className="chip steel">
            <span className="dot" aria-hidden="true" />
            Guard required
          </span>
        )}
        {m.safetyRisk && riskRamp && (
          <span
            className={`rchip ${riskRamp}`}
            data-sev={sevLevel}
            data-testid={`jutsu-model-risk-${m.id}`}
          >
            {SAFETY_LABEL[m.safetyRisk]}
          </span>
        )}
      </div>
      <div className="mdl-meta">
        <span>
          <span className="l">Updated</span>
          <span className="v">{updated}</span>
        </span>
        <span>
          <span className="l">Max tokens</span>
          <span className="v">{maxTokens}</span>
        </span>
        <span>
          <span className="l">Resilience</span>
          <span className="v" data-testid={`jutsu-model-resilience-${m.id}`}>
            {resilience}
          </span>
        </span>
      </div>
      <div className="acts">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          data-testid={`jutsu-model-detail-${m.id}`}
          onClick={() => onDetail(m.id)}
          aria-label={`Open detail for ${m.name}`}
        >
          Edit
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          data-testid={`jutsu-model-test-${m.id}`}
          onClick={() => onTest(m.id)}
          disabled={testingId !== null}
          aria-busy={testingId === m.id}
        >
          {testingId === m.id ? "Testing…" : "Test"}
        </button>
        <button
          type="button"
          className="btn btn-danger btn-sm"
          data-testid={`jutsu-model-delete-${m.id}`}
          onClick={() => onDelete(m.id)}
          disabled={deleting}
        >
          Delete
        </button>
      </div>
    </article>
  );
}
