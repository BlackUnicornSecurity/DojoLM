// SPDX-License-Identifier: Apache-2.0
/**
 * attack-log-mapping — pure helper mapping `AtemiSession.events`
 * (storage shape) to `AttackLogEntry[]` (the closed-enum input to the
 * `AttackLog` design primitive).
 *
 * Phase B / TICKET-L-702 consumer wiring (Atemi-PR-1 of the Atemi
 * Phase 2 wave). The `AttackLog` primitive expects entries with a
 * closed 5-value UPPERCASE severity + closed 5-value outcome + closed
 * 8-value attack-class. The atemi-session storage emits events with
 * lowercase severity + a more granular `type` enum, so a per-event
 * mapping is required.
 *
 * Mapping strategy:
 *   - severity: lowercase `low` / `medium` / `high` / `critical` →
 *     UPPERCASE `LOW` / `MEDIUM` / `HIGH` / `CRITICAL`. Events with
 *     missing / invalid severity are dropped (the primitive's own
 *     sanitizer would drop them at render-time; doing it here keeps
 *     the wire-shape disciplined). `INFO` has no storage counterpart;
 *     never emitted.
 *   - outcome: derived from event.type:
 *       - `attack_result` → `'allowed'` (storage type carries no
 *         per-result success bit today; default working hypothesis
 *         is "the attack reached the model and returned a response").
 *         Future evolution can split this into blocked/flagged/allowed
 *         when the storage event grows an outcome field.
 *       - `error` → `'error'`.
 *       - `attack_start` / `mode_change` / `info` → entry dropped
 *         (these are control events, not attack outcomes; surfacing
 *         them on the attack log would dilute the per-attack signal).
 *   - attackClass: best-effort derivation from event.toolId via the
 *     closed `TOOL_ID_TO_ATTACK_CLASS` table. Unknown toolIds fall
 *     through to `'reconnaissance'` (the most conservative default
 *     — no known concrete attack class, treat as recon).
 *   - target: session.config.targetModel (capped at 120 chars by the
 *     primitive's own sanitizer).
 *   - notes: event.message.
 *
 * Pure / deterministic / no I/O.
 *
 * @see packages/dojolm-web/src/design/adversarial/AttackLog.tsx
 * @see packages/dojolm-web/src/lib/atemi-session-types.ts
 */

import type {
  AttackLogAttackClass,
  AttackLogEntry,
  AttackLogOutcome,
  AttackLogSeverity,
} from '@/design/adversarial/AttackLog';
import type {
  AtemiSession,
  AtemiSessionEvent,
} from '@/lib/atemi-session-types';

/**
 * Lowercase storage severity → UPPERCASE primitive severity. Closed
 * 4-value map (the storage shape has 4 severities, the primitive has
 * 5 including INFO; INFO has no storage counterpart so it never
 * surfaces from this mapping).
 */
const SEVERITY_TO_PRIMITIVE: Readonly<
  Record<AtemiSessionEvent['severity'], AttackLogSeverity>
> = Object.freeze({
  low: 'LOW',
  medium: 'MEDIUM',
  high: 'HIGH',
  critical: 'CRITICAL',
});

/**
 * Closed mapping of known toolIds to the AttackLog primitive's
 * 8-value attack-class enum. Unknown toolIds resolve to
 * `'reconnaissance'` via `bucketAttackClass()` — the conservative
 * default (no concrete known attack class, treat as recon).
 *
 * UPDATING: when a new Atemi tool ships, add a row mapping its
 * toolId to one of the 8 attack-class buckets.
 */
const TOOL_ID_TO_ATTACK_CLASS: Readonly<Record<string, AttackLogAttackClass>> =
  Object.freeze({
    // Prompt-injection family
    'prompt-injection': 'prompt-injection',
    'pi-classic': 'prompt-injection',
    'pi-indirect': 'prompt-injection',
    // Jailbreak family
    jailbreak: 'jailbreak',
    'dan-persona': 'jailbreak',
    crescendo: 'jailbreak',
    // Extraction family
    extraction: 'extraction',
    'system-prompt-leak': 'extraction',
    'pii-extraction': 'extraction',
    // Tool-abuse family
    'tool-abuse': 'tool-abuse',
    'function-call-hijack': 'tool-abuse',
    // Multi-modal family
    'multi-modal': 'multi-modal',
    'image-injection': 'multi-modal',
    // Agentic-loop family
    'agentic-loop': 'agentic-loop',
    'runaway-tool-call': 'agentic-loop',
    // Compliance-bypass family
    'compliance-bypass': 'compliance-bypass',
    'role-play-bypass': 'compliance-bypass',
    // Reconnaissance family (also the unknown-fallback bucket)
    reconnaissance: 'reconnaissance',
    'concept-recon': 'reconnaissance',
  });

/**
 * Bucket a free-text `toolId` into the closed 8-value attack-class
 * taxonomy. Returns `'reconnaissance'` for any toolId not present in
 * `TOOL_ID_TO_ATTACK_CLASS` (conservative default — no known concrete
 * attack class, treat as recon).
 *
 * Uses `Object.hasOwn` to guard against prototype-chain pollution
 * (`'__proto__'` / `'constructor'` would otherwise resolve to a
 * prototype-walk object). Mirrors the Buki / Ronin sister
 * `bucketCategory()` hardening.
 */
export function bucketAttackClass(toolId: string): AttackLogAttackClass {
  if (!Object.hasOwn(TOOL_ID_TO_ATTACK_CLASS, toolId)) return 'reconnaissance';
  const cls = TOOL_ID_TO_ATTACK_CLASS[toolId];
  return cls ?? 'reconnaissance';
}

/**
 * Map a single `AtemiSessionEvent` to an `AttackLogEntry`, or `null`
 * when the event is not an attack-outcome event (e.g. control events
 * like `attack_start` / `mode_change` / `info`).
 *
 * `target` defaults to the empty string when no `targetModel` is
 * available on the session config — the primitive's own sanitizer
 * caps it at 120 chars and accepts empty strings.
 */
export function eventToAttackLogEntry(
  event: AtemiSessionEvent,
  targetModel: string,
): AttackLogEntry | null {
  let outcome: AttackLogOutcome;
  switch (event.type) {
    case 'attack_result':
      outcome = 'allowed';
      break;
    case 'error':
      outcome = 'error';
      break;
    case 'attack_start':
    case 'mode_change':
    case 'info':
      return null;
    // Adversarial HIGH-2 in Atemi-PR-1 — explicit default arm so a
    // hostile localStorage payload (event.type outside the closed
    // union) returns null instead of leaving `outcome` undefined and
    // emitting a corrupted row to the AttackLog primitive.
    default:
      return null;
  }

  // Adversarial MED-1 — defensive string-typeof guard before the
  // Record lookup so a hostile payload with `severity: 42` (number)
  // doesn't rely on TS types alone. Record lookup with non-string key
  // returns undefined anyway, but explicit narrowing documents intent.
  if (typeof event.severity !== 'string') return null;
  const severity = SEVERITY_TO_PRIMITIVE[event.severity];
  if (severity === undefined) return null;

  const attackClass = bucketAttackClass(event.toolId ?? '');

  return {
    id: event.id,
    ts: event.timestamp,
    attackClass,
    severity,
    outcome,
    target: targetModel,
    notes: event.message,
  };
}

/**
 * Flatten a collection of `AtemiSession`s into a single
 * chronologically-sorted `AttackLogEntry[]` (newest first). Drops
 * control events + invalid-severity events per the mapping rules
 * above.
 *
 * Pure. Caller decides what to render (e.g. slice for pagination).
 */
export function sessionsToAttackLogEntries(
  sessions: readonly AtemiSession[],
): readonly AttackLogEntry[] {
  const out: AttackLogEntry[] = [];
  for (const session of sessions) {
    const target = session.config.targetModel;
    for (const event of session.events) {
      const entry = eventToAttackLogEntry(event, target);
      if (entry !== null) out.push(entry);
    }
  }
  // Newest first — primitive renders rows in array order. Sort by
  // `ts` string; ISO-8601 sorts lexicographically the same as
  // chronologically.
  return out.slice().sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0));
}
