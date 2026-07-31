// SPDX-License-Identifier: Apache-2.0
/**
 * AttackLog — design primitive (TICKET-L-702).
 *
 * Pure-presentational tabular log of adversarial attack events for the
 * Adversarial / Atemi-Lab surface. Surfaces the (timestamp, attack
 * class, severity, target, outcome) tuple per event so operators can
 * audit which probes fired and how the model responded — read-only,
 * with closed-enum discipline on every column-driven token.
 *
 * Read-only consumer of attack-log data sourced from
 * `lib/atemi-session-storage.ts` or the future `/api/atemi/attack-log`
 * route. The primitive performs no fetches; the consuming page passes
 * a `readonly AttackLogEntry[]` after server-side or library-side
 * sanitization.
 *
 * Discriminant-redaction (R-T1 §10.16):
 *   - SEVERITY_LABEL / SEVERITY_CLASS / SEVERITY_ARIA are closed
 *     `Record<AttackLogSeverity, ...>` maps. The severity token NEVER
 *     reaches an aria-label or className except through these maps.
 *   - OUTCOME_LABEL / OUTCOME_CLASS / OUTCOME_ARIA mirror the same
 *     discipline for the outcome column.
 *   - ATTACK_CLASS_LABEL is a closed
 *     `Record<AttackLogAttackClass, ...>` map — the same 8-vocab
 *     adopted by AtemiTabs.
 *   - All free-text fields (`target`, `notes`) pass through
 *     `cap(...)` before display.
 *
 * Defensive caps:
 *   - `MAX_ROWS` caps rendered rows at 200 (R-T1 array-DoS gate).
 *   - Per-row malformed entries (bad severity / outcome / class /
 *     missing id) are dropped silently.
 *   - String fields capped at content-specific limits.
 *
 * Renders an empty-state row when no entries pass the closed-enum
 * filter — never falls through to raw strings.
 */

'use client';

export const ATTACK_LOG_SEVERITIES = [
  'CRITICAL',
  'HIGH',
  'MEDIUM',
  'LOW',
  'INFO',
] as const;

export type AttackLogSeverity = (typeof ATTACK_LOG_SEVERITIES)[number];

export const ATTACK_LOG_OUTCOMES = [
  'blocked',
  'flagged',
  'allowed',
  'partial',
  'error',
] as const;

export type AttackLogOutcome = (typeof ATTACK_LOG_OUTCOMES)[number];

export const ATTACK_LOG_ATTACK_CLASSES = [
  'prompt-injection',
  'jailbreak',
  'extraction',
  'tool-abuse',
  'multi-modal',
  'agentic-loop',
  'compliance-bypass',
  'reconnaissance',
] as const;

export type AttackLogAttackClass = (typeof ATTACK_LOG_ATTACK_CLASSES)[number];

export interface AttackLogEntry {
  /** Unique row id. Capped at 64 chars. */
  readonly id: string;
  /** ISO-8601 timestamp string. Capped at 40 chars (full ISO + ms). */
  readonly ts: string;
  /** Closed-enum attack class. */
  readonly attackClass: AttackLogAttackClass;
  /** Closed-enum severity. */
  readonly severity: AttackLogSeverity;
  /** Closed-enum outcome. */
  readonly outcome: AttackLogOutcome;
  /** Free-text target. Capped at 120 chars. */
  readonly target: string;
  /** Free-text notes. Capped at 240 chars. */
  readonly notes?: string;
}

export interface AttackLogProps {
  /** Attack log entries. Sliced to `ATTACK_LOG_MAX_ROWS`. */
  readonly entries: readonly AttackLogEntry[];
  /** Optional caption above the table. Capped at 80 chars. */
  readonly caption?: string;
  /** Test id stem. */
  readonly testId?: string;
  /** Wrapper className for layout overrides. */
  readonly className?: string;
}

/** Render-time cap. R-T1 §10.16 array-DoS gate. */
export const ATTACK_LOG_MAX_ROWS = 200;
const ID_MAX = 64;
const TS_MAX = 40;
const TARGET_MAX = 120;
const NOTES_MAX = 240;
const CAPTION_MAX = 80;

const VALID_SEVERITIES: ReadonlySet<AttackLogSeverity> = new Set(ATTACK_LOG_SEVERITIES);
const VALID_OUTCOMES: ReadonlySet<AttackLogOutcome> = new Set(ATTACK_LOG_OUTCOMES);
const VALID_ATTACK_CLASSES: ReadonlySet<AttackLogAttackClass> = new Set(
  ATTACK_LOG_ATTACK_CLASSES,
);

export function isAttackLogSeverity(v: unknown): v is AttackLogSeverity {
  return typeof v === 'string' && VALID_SEVERITIES.has(v as AttackLogSeverity);
}

export function isAttackLogOutcome(v: unknown): v is AttackLogOutcome {
  return typeof v === 'string' && VALID_OUTCOMES.has(v as AttackLogOutcome);
}

export function isAttackLogAttackClass(v: unknown): v is AttackLogAttackClass {
  return typeof v === 'string' && VALID_ATTACK_CLASSES.has(v as AttackLogAttackClass);
}

const SEVERITY_LABEL: Readonly<Record<AttackLogSeverity, string>> = Object.freeze({
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
  INFO: 'INFO',
});

const SEVERITY_CLASS: Readonly<Record<AttackLogSeverity, string>> = Object.freeze({
  CRITICAL: 'attack-log-sev-critical',
  HIGH: 'attack-log-sev-high',
  MEDIUM: 'attack-log-sev-medium',
  LOW: 'attack-log-sev-low',
  INFO: 'attack-log-sev-info',
});

const SEVERITY_ARIA: Readonly<Record<AttackLogSeverity, string>> = Object.freeze({
  CRITICAL: 'critical severity',
  HIGH: 'high severity',
  MEDIUM: 'medium severity',
  LOW: 'low severity',
  INFO: 'info severity',
});

const OUTCOME_LABEL: Readonly<Record<AttackLogOutcome, string>> = Object.freeze({
  blocked: 'Blocked',
  flagged: 'Flagged',
  allowed: 'Allowed',
  partial: 'Partial',
  error: 'Error',
});

const OUTCOME_CLASS: Readonly<Record<AttackLogOutcome, string>> = Object.freeze({
  blocked: 'attack-log-outcome-blocked',
  flagged: 'attack-log-outcome-flagged',
  allowed: 'attack-log-outcome-allowed',
  partial: 'attack-log-outcome-partial',
  error: 'attack-log-outcome-error',
});

const OUTCOME_ARIA: Readonly<Record<AttackLogOutcome, string>> = Object.freeze({
  blocked: 'attack blocked',
  flagged: 'attack flagged',
  allowed: 'attack allowed',
  partial: 'attack partially blocked',
  error: 'attack errored',
});

const ATTACK_CLASS_LABEL: Readonly<Record<AttackLogAttackClass, string>> =
  Object.freeze({
    'prompt-injection': 'Prompt injection',
    jailbreak: 'Jailbreak',
    extraction: 'Extraction',
    'tool-abuse': 'Tool abuse',
    'multi-modal': 'Multi-modal',
    'agentic-loop': 'Agentic loop',
    'compliance-bypass': 'Compliance bypass',
    reconnaissance: 'Reconnaissance',
  });

function cap(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function sanitizeEntry(raw: AttackLogEntry): AttackLogEntry | null {
  if (typeof raw.id !== 'string' || raw.id.length === 0) return null;
  if (typeof raw.ts !== 'string' || raw.ts.length === 0) return null;
  if (!isAttackLogSeverity(raw.severity)) return null;
  if (!isAttackLogOutcome(raw.outcome)) return null;
  if (!isAttackLogAttackClass(raw.attackClass)) return null;
  return {
    id: cap(raw.id, ID_MAX),
    ts: cap(raw.ts, TS_MAX),
    attackClass: raw.attackClass,
    severity: raw.severity,
    outcome: raw.outcome,
    target: cap(typeof raw.target === 'string' ? raw.target : 'unknown', TARGET_MAX),
    notes:
      typeof raw.notes === 'string' && raw.notes.length > 0
        ? cap(raw.notes, NOTES_MAX)
        : undefined,
  };
}

/**
 * AttackLog — closed-enum tabular log of adversarial attack events.
 *
 * Drops malformed rows silently (R-T1 boundary discipline). Renders an
 * empty-state row when no entries pass the closed-enum filter.
 */
export function AttackLog({
  entries,
  caption,
  testId,
  className,
}: AttackLogProps) {
  const cappedCaption =
    typeof caption === 'string' && caption.length > 0
      ? cap(caption, CAPTION_MAX)
      : null;

  const safeRows: AttackLogEntry[] = [];
  for (const raw of entries.slice(0, ATTACK_LOG_MAX_ROWS)) {
    const sanitized = sanitizeEntry(raw);
    if (sanitized !== null) safeRows.push(sanitized);
  }

  const rootTestId = testId ?? 'attack-log';
  const rootClass = `attack-log${className ? ` ${className}` : ''}`;

  return (
    <section
      className={rootClass}
      data-testid={rootTestId}
      data-row-count={safeRows.length}
      role="group"
      aria-label={cappedCaption ?? 'Attack log'}
    >
      {cappedCaption !== null ? (
        <header className="attack-log-head">
          <span className="attack-log-kicker">{cappedCaption}</span>
          <span
            className="attack-log-count"
            data-testid={`${rootTestId}-count`}
            aria-live="polite"
          >
            {safeRows.length} {safeRows.length === 1 ? 'event' : 'events'}
          </span>
        </header>
      ) : null}
      {safeRows.length === 0 ? (
        <p
          className="attack-log-empty"
          data-testid={`${rootTestId}-empty`}
          role="status"
        >
          No attack events recorded.
        </p>
      ) : (
        <table
          className="attack-log-table"
          aria-label="Adversarial attack log"
          data-testid={`${rootTestId}-table`}
        >
          <thead>
            <tr>
              <th scope="col">Timestamp</th>
              <th scope="col">Class</th>
              <th scope="col">Severity</th>
              <th scope="col">Outcome</th>
              <th scope="col">Target</th>
              <th scope="col">Notes</th>
            </tr>
          </thead>
          <tbody>
            {safeRows.map((row) => (
              <tr
                key={row.id}
                data-testid={`${rootTestId}-row-${row.id}`}
                data-severity={row.severity}
                data-outcome={row.outcome}
                data-attack-class={row.attackClass}
              >
                <td className="attack-log-cell-ts">
                  <code>{row.ts}</code>
                </td>
                <td className="attack-log-cell-class">
                  {ATTACK_CLASS_LABEL[row.attackClass]}
                </td>
                <td className="attack-log-cell-sev">
                  <span
                    className={`attack-log-sev-chip ${SEVERITY_CLASS[row.severity]}`}
                    aria-label={SEVERITY_ARIA[row.severity]}
                  >
                    {SEVERITY_LABEL[row.severity]}
                  </span>
                </td>
                <td className="attack-log-cell-outcome">
                  <span
                    className={`attack-log-outcome-chip ${OUTCOME_CLASS[row.outcome]}`}
                    aria-label={OUTCOME_ARIA[row.outcome]}
                  >
                    {OUTCOME_LABEL[row.outcome]}
                  </span>
                </td>
                <td className="attack-log-cell-target">{row.target}</td>
                <td className="attack-log-cell-notes">
                  {row.notes ?? <span className="attack-log-cell-empty">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
