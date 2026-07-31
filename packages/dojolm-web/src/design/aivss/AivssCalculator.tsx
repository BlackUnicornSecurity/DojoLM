// SPDX-License-Identifier: Apache-2.0
/**
 * AivssCalculator — interactive 11-row form + live AIVSS calculation.
 *
 * Phase G.2 / TICKET-G2 — V1→V2 Restoration program.
 *
 * Renders 8 required base metrics + 3 optional (1 temporal + 2 environmental)
 * as closed-enum `<select>` controls. Live `useMemo`-cached calculation drives
 * the score panel + severity chip. Read-only mode disables all selects and
 * hides Copy controls. Vector + JSON copy via `navigator.clipboard`.
 *
 * @see ADR-0097 — AIVSS spec
 * @see canvas-amendments-2026-Q2.md CA-1 — full-word band keys
 */

'use client';

import type { ChangeEvent, ReactElement } from 'react';
import { useCallback, useMemo, useState } from 'react';
import {
  AIVSS_ATTACK_COMPLEXITIES,
  AIVSS_ATTACK_VECTORS,
  AIVSS_DS_LEVELS,
  AIVSS_EXPLOITABILITIES,
  AIVSS_IMPACT_LEVELS,
  AIVSS_MC_TIERS,
  AIVSS_PIS_RATES,
  AIVSS_REMEDIATION_LEVELS,
  AIVSS_SCOPES,
  BAND_CSS_KEY,
  calculate,
  serializeVector,
  type AivssAttackComplexity,
  type AivssAttackVector,
  type AivssBand,
  type AivssDs,
  type AivssExploitability,
  type AivssImpact,
  type AivssMc,
  type AivssMetrics,
  type AivssPis,
  type AivssRl,
  type AivssScope,
  type AivssScore,
} from 'bu-tpi/aivss';

// ───────────────────────────────────────────────────────────────────────────────
// Closed-enum field labels — single source of truth for form rows + tests.
// ───────────────────────────────────────────────────────────────────────────────

type RequiredMetricKey =
  | 'attackVector'
  | 'attackComplexity'
  | 'promptInjectionSuccess'
  | 'modelCriticality'
  | 'dataSensitivity'
  | 'confidentialityImpact'
  | 'integrityImpact'
  | 'availabilityImpact';

type OptionalMetricKey = 'exploitability' | 'scope' | 'remediationLevel';

type AnyMetricKey = RequiredMetricKey | OptionalMetricKey;

export const FIELD_LABEL: Readonly<Record<AnyMetricKey, string>> = Object.freeze({
  attackVector: 'Attack Vector',
  attackComplexity: 'Attack Complexity',
  promptInjectionSuccess: 'Prompt Injection Success Rate',
  modelCriticality: 'Model Criticality',
  dataSensitivity: 'Data Sensitivity',
  confidentialityImpact: 'Confidentiality Impact',
  integrityImpact: 'Integrity Impact',
  availabilityImpact: 'Availability Impact',
  exploitability: 'Exploitability',
  scope: 'Scope',
  remediationLevel: 'Remediation Level',
});

// Sentinel value used for the "(unset)" option on optional metrics. Distinct
// from any closed-enum short-code so it never collides with a real value.
const UNSET = '__unset__' as const;

const BAND_LABEL: Readonly<Record<AivssBand, string>> = Object.freeze({
  none: 'NONE',
  low: 'LOW',
  medium: 'MEDIUM',
  high: 'HIGH',
  critical: 'CRITICAL',
});

const DEFAULT_METRICS: AivssMetrics = Object.freeze({
  attackVector: 'network',
  attackComplexity: 'low',
  promptInjectionSuccess: 'medium',
  modelCriticality: 'tier-2',
  dataSensitivity: 'internal',
  confidentialityImpact: 'low',
  integrityImpact: 'low',
  availabilityImpact: 'none',
});

// ───────────────────────────────────────────────────────────────────────────────
// Public surface
// ───────────────────────────────────────────────────────────────────────────────

export interface AivssCalculatorProps {
  readonly initialMetrics?: AivssMetrics;
  readonly readOnly?: boolean;
  readonly onChange?: (metrics: AivssMetrics, score: AivssScore) => void;
  readonly testId?: string;
}

/**
 * Closed-enum option list per metric. The select onChange handlers narrow the
 * raw string back into the corresponding union via includes-check below.
 */
const METRIC_OPTIONS: Readonly<Record<AnyMetricKey, readonly string[]>> = Object.freeze({
  attackVector: AIVSS_ATTACK_VECTORS,
  attackComplexity: AIVSS_ATTACK_COMPLEXITIES,
  promptInjectionSuccess: AIVSS_PIS_RATES,
  modelCriticality: AIVSS_MC_TIERS,
  dataSensitivity: AIVSS_DS_LEVELS,
  confidentialityImpact: AIVSS_IMPACT_LEVELS,
  integrityImpact: AIVSS_IMPACT_LEVELS,
  availabilityImpact: AIVSS_IMPACT_LEVELS,
  exploitability: AIVSS_EXPLOITABILITIES,
  scope: AIVSS_SCOPES,
  remediationLevel: AIVSS_REMEDIATION_LEVELS,
});

// Type-narrowing predicates — closed-list `includes` checks. Required because
// HTMLSelectElement.value is `string`, but our metric setters demand the
// closed-enum union.
function isAttackVector(v: string): v is AivssAttackVector {
  return (AIVSS_ATTACK_VECTORS as readonly string[]).includes(v);
}
function isAttackComplexity(v: string): v is AivssAttackComplexity {
  return (AIVSS_ATTACK_COMPLEXITIES as readonly string[]).includes(v);
}
function isPis(v: string): v is AivssPis {
  return (AIVSS_PIS_RATES as readonly string[]).includes(v);
}
function isMc(v: string): v is AivssMc {
  return (AIVSS_MC_TIERS as readonly string[]).includes(v);
}
function isDs(v: string): v is AivssDs {
  return (AIVSS_DS_LEVELS as readonly string[]).includes(v);
}
function isImpact(v: string): v is AivssImpact {
  return (AIVSS_IMPACT_LEVELS as readonly string[]).includes(v);
}
function isExploitability(v: string): v is AivssExploitability {
  return (AIVSS_EXPLOITABILITIES as readonly string[]).includes(v);
}
function isScope(v: string): v is AivssScope {
  return (AIVSS_SCOPES as readonly string[]).includes(v);
}
function isRl(v: string): v is AivssRl {
  return (AIVSS_REMEDIATION_LEVELS as readonly string[]).includes(v);
}

// ───────────────────────────────────────────────────────────────────────────────
// Component
// ───────────────────────────────────────────────────────────────────────────────

export function AivssCalculator({
  initialMetrics = DEFAULT_METRICS,
  readOnly = false,
  onChange,
  testId = 'aivss-calculator',
}: AivssCalculatorProps): ReactElement {
  const [metrics, setMetrics] = useState<AivssMetrics>(initialMetrics);

  // Live calculation — invalidates whenever metrics change.
  const score = useMemo<AivssScore>(() => calculate(metrics), [metrics]);

  // Single update path — builds a new immutable metrics object then notifies.
  const updateMetrics = useCallback(
    (next: AivssMetrics): void => {
      setMetrics(next);
      if (onChange) {
        onChange(next, calculate(next));
      }
    },
    [onChange],
  );

  // ─── Required-metric handlers (8) ─────────────────────────────────────────────
  const onChangeAttackVector = useCallback(
    (e: ChangeEvent<HTMLSelectElement>): void => {
      const v = e.target.value;
      if (isAttackVector(v)) updateMetrics({ ...metrics, attackVector: v });
    },
    [metrics, updateMetrics],
  );
  const onChangeAttackComplexity = useCallback(
    (e: ChangeEvent<HTMLSelectElement>): void => {
      const v = e.target.value;
      if (isAttackComplexity(v)) updateMetrics({ ...metrics, attackComplexity: v });
    },
    [metrics, updateMetrics],
  );
  const onChangePis = useCallback(
    (e: ChangeEvent<HTMLSelectElement>): void => {
      const v = e.target.value;
      if (isPis(v)) updateMetrics({ ...metrics, promptInjectionSuccess: v });
    },
    [metrics, updateMetrics],
  );
  const onChangeMc = useCallback(
    (e: ChangeEvent<HTMLSelectElement>): void => {
      const v = e.target.value;
      if (isMc(v)) updateMetrics({ ...metrics, modelCriticality: v });
    },
    [metrics, updateMetrics],
  );
  const onChangeDs = useCallback(
    (e: ChangeEvent<HTMLSelectElement>): void => {
      const v = e.target.value;
      if (isDs(v)) updateMetrics({ ...metrics, dataSensitivity: v });
    },
    [metrics, updateMetrics],
  );
  const onChangeCi = useCallback(
    (e: ChangeEvent<HTMLSelectElement>): void => {
      const v = e.target.value;
      if (isImpact(v)) updateMetrics({ ...metrics, confidentialityImpact: v });
    },
    [metrics, updateMetrics],
  );
  const onChangeIi = useCallback(
    (e: ChangeEvent<HTMLSelectElement>): void => {
      const v = e.target.value;
      if (isImpact(v)) updateMetrics({ ...metrics, integrityImpact: v });
    },
    [metrics, updateMetrics],
  );
  const onChangeAi = useCallback(
    (e: ChangeEvent<HTMLSelectElement>): void => {
      const v = e.target.value;
      if (isImpact(v)) updateMetrics({ ...metrics, availabilityImpact: v });
    },
    [metrics, updateMetrics],
  );

  // ─── Optional-metric handlers (3) — UNSET sentinel removes the field ──────────
  const onChangeExploit = useCallback(
    (e: ChangeEvent<HTMLSelectElement>): void => {
      const v = e.target.value;
      if (v === UNSET) {
        const { exploitability: _omit, ...rest } = metrics;
        void _omit;
        updateMetrics(rest);
      } else if (isExploitability(v)) {
        updateMetrics({ ...metrics, exploitability: v });
      }
    },
    [metrics, updateMetrics],
  );
  const onChangeScope = useCallback(
    (e: ChangeEvent<HTMLSelectElement>): void => {
      const v = e.target.value;
      if (v === UNSET) {
        const { scope: _omit, ...rest } = metrics;
        void _omit;
        updateMetrics(rest);
      } else if (isScope(v)) {
        updateMetrics({ ...metrics, scope: v });
      }
    },
    [metrics, updateMetrics],
  );
  const onChangeRl = useCallback(
    (e: ChangeEvent<HTMLSelectElement>): void => {
      const v = e.target.value;
      if (v === UNSET) {
        const { remediationLevel: _omit, ...rest } = metrics;
        void _omit;
        updateMetrics(rest);
      } else if (isRl(v)) {
        updateMetrics({ ...metrics, remediationLevel: v });
      }
    },
    [metrics, updateMetrics],
  );

  // ─── Copy buttons — best-effort; no-op if clipboard unavailable ───────────────
  const onCopyJson = useCallback((): void => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(JSON.stringify(metrics, null, 2));
    }
  }, [metrics]);
  const onCopyVector = useCallback((): void => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(serializeVector(metrics));
    }
  }, [metrics]);

  // ─── Render ───────────────────────────────────────────────────────────────────
  const requiredKeys: readonly RequiredMetricKey[] = [
    'attackVector',
    'attackComplexity',
    'promptInjectionSuccess',
    'modelCriticality',
    'dataSensitivity',
    'confidentialityImpact',
    'integrityImpact',
    'availabilityImpact',
  ];
  const optionalKeys: readonly OptionalMetricKey[] = ['exploitability', 'scope', 'remediationLevel'];

  const handlerByKey: Readonly<Record<AnyMetricKey, (e: ChangeEvent<HTMLSelectElement>) => void>> = {
    attackVector: onChangeAttackVector,
    attackComplexity: onChangeAttackComplexity,
    promptInjectionSuccess: onChangePis,
    modelCriticality: onChangeMc,
    dataSensitivity: onChangeDs,
    confidentialityImpact: onChangeCi,
    integrityImpact: onChangeIi,
    availabilityImpact: onChangeAi,
    exploitability: onChangeExploit,
    scope: onChangeScope,
    remediationLevel: onChangeRl,
  };

  // Optional-key helper: returns the current value or UNSET sentinel.
  const optionalValue = (key: OptionalMetricKey): string => {
    const v = metrics[key];
    return typeof v === 'string' ? v : UNSET;
  };

  return (
    <div data-testid={testId} className="aivss-calculator">
      <fieldset
        disabled={readOnly}
        className="aivss-calculator-fields"
        aria-label="AIVSS metrics"
      >
        <legend className="visually-hidden">AIVSS metrics</legend>

        {requiredKeys.map((key) => (
          <div key={key} className="aivss-row" data-testid={`aivss-row-${key}`}>
            <label htmlFor={`aivss-${key}`} className="aivss-label">
              {FIELD_LABEL[key]}
            </label>
            <select
              id={`aivss-${key}`}
              data-testid={`aivss-select-${key}`}
              className="aivss-select"
              value={metrics[key]}
              onChange={handlerByKey[key]}
            >
              {METRIC_OPTIONS[key].map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        ))}

        {optionalKeys.map((key) => (
          <div key={key} className="aivss-row aivss-row-optional" data-testid={`aivss-row-${key}`}>
            <label htmlFor={`aivss-${key}`} className="aivss-label">
              {FIELD_LABEL[key]}
            </label>
            <select
              id={`aivss-${key}`}
              data-testid={`aivss-select-${key}`}
              className="aivss-select"
              value={optionalValue(key)}
              onChange={handlerByKey[key]}
            >
              <option value={UNSET}>(not set)</option>
              {METRIC_OPTIONS[key].map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        ))}
      </fieldset>

      <div className="aivss-result" aria-live="polite">
        <span
          data-testid="aivss-severity-chip"
          className={`av-band ${BAND_CSS_KEY[score.severity]}`}
          aria-label={`AIVSS severity ${BAND_LABEL[score.severity]}`}
        >
          {BAND_LABEL[score.severity]}
        </span>
        <dl className="aivss-scores">
          <div>
            <dt>Base</dt>
            <dd data-testid="aivss-base">{score.base.toFixed(1)}</dd>
          </div>
          <div>
            <dt>Temporal</dt>
            <dd data-testid="aivss-temporal">
              {score.temporal === null ? '—' : score.temporal.toFixed(1)}
            </dd>
          </div>
          <div>
            <dt>Environmental</dt>
            <dd data-testid="aivss-environmental">
              {score.environmental === null ? '—' : score.environmental.toFixed(1)}
            </dd>
          </div>
        </dl>
        <pre data-testid="aivss-vector" className="aivss-vector">
          {score.vector}
        </pre>
      </div>

      {!readOnly && (
        <div className="aivss-actions">
          <button
            type="button"
            data-testid="aivss-copy-json"
            className="aivss-action"
            onClick={onCopyJson}
          >
            Copy as JSON
          </button>
          <button
            type="button"
            data-testid="aivss-copy-vector"
            className="aivss-action"
            onClick={onCopyVector}
          >
            Copy AIVSS vector string
          </button>
        </div>
      )}
    </div>
  );
}
