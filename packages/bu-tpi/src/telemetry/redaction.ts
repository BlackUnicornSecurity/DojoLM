// SPDX-License-Identifier: Apache-2.0
/**
 * Telemetry redaction layer — R-T1 compliance.
 *
 * Before any event reaches a sink, redactEvent() must be applied to
 * every field that could carry raw payload text (attackerPayload,
 * targetResponse, seedPayload, payload).  These fields must already
 * appear as RedactedPayload shapes by the time they reach the emitter;
 * this module provides helpers for callers to build them.
 *
 * rejectIfRaw() is the schema gate: it throws if a plain object
 * contains any of the forbidden raw-string field names, providing a
 * last-resort guard against accidental leaks.
 */

import { createHash } from 'node:crypto';
import type { RedactedPayload } from './types.js';

/** Field names that must never appear as raw strings in telemetry. */
const BLOCKED_RAW_FIELDS = [
  'attackerPayload',
  'targetResponse',
  'seedPayload',
  'rawPayload',
  'promptText',
  'responseText',
] as const;

export type BlockedRawField = (typeof BLOCKED_RAW_FIELDS)[number];

export class TelemetryRedactionError extends Error {
  readonly code = 'TELEMETRY.REDACTION.RAW_FIELD' as const;
  constructor(fieldName: string) {
    super(
      `Telemetry event contains raw payload in field "${fieldName}". ` +
        'Redact it to { hash, len } before emitting (R-T1).',
    );
    this.name = 'TelemetryRedactionError';
  }
}

/**
 * Build a RedactedPayload from a raw string.
 * Use this in the call-site BEFORE constructing an event object.
 */
export function redactString(text: string): RedactedPayload {
  const hash = 'sha256:' + createHash('sha256').update(text).digest('hex');
  return { hash, len: text.length };
}

/**
 * Scan a flat event object for any raw-string value in a blocked field.
 * Throws TelemetryRedactionError if found.
 * Call this inside TelemetryEmitter.emit() as a last-resort fence.
 */
export function rejectIfRaw(event: Record<string, unknown>): void {
  for (const field of BLOCKED_RAW_FIELDS) {
    const value = event[field];
    if (typeof value === 'string') {
      throw new TelemetryRedactionError(field);
    }
  }
}

/**
 * Recursively strip any blocked raw-string fields from a plain object.
 * Returns a new object (no mutation).  Use this as a fallback sanitiser
 * when you cannot guarantee the caller redacted before emit.
 *
 * NOTE: Prefer `redactString()` at the call-site — this function is a
 * safety net, not the primary mechanism.
 */
export function deepRedact(
  obj: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (
      (BLOCKED_RAW_FIELDS as readonly string[]).includes(key) &&
      typeof value === 'string'
    ) {
      result[key] = redactString(value);
    } else if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value)
    ) {
      result[key] = deepRedact(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}
