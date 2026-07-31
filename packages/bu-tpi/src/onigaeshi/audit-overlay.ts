// SPDX-License-Identifier: Apache-2.0
/**
 * File: onigaeshi/audit-overlay.ts
 * Purpose: Read-side overlay that masks audit entries belonging to a data
 *          subject who has been erased via DSR (GDPR Art. 17, Recital 26).
 *
 * Spec: PR-E4 (#134), the Phase E DSR cascade execution plan §4
 *       Path B (operator-signed-off 2026-05-03).
 *
 * Why an overlay (not a delete):
 *   The OnigaeshiAuditRecord chain is WORM (S3 Object Lock in Compliance
 *   mode); rows cannot be modified or removed. DSR erasure is implemented
 *   as a special-typed APPEND — `type: 'dsr.erasure'` — that carries the
 *   HMAC-derived `userHash` of the erased subject. Every consumer of the
 *   chain runs through `applyOverlay()` before surfacing entries. The
 *   overlay re-derives the hash of each candidate entry's `actor` /
 *   pii_-prefixed `detail` value under the active key and masks those that
 *   match an erasure marker. Recital 26 erasure-by-overlay rationale lives
 *   in ADR-0093 (DSR onigaeshi WORM erasure overlay).
 *
 * Key versioning:
 *   Each erasure marker carries the `keyId` (12-hex prefix derived from the
 *   active key — see `dojolm-web/src/lib/dsr/key-version.ts`). When the
 *   active key rotates, markers written under the prior key cannot be
 *   reproduced. Such markers are treated as OPAQUE: they remain visible
 *   in the chain but the overlay does not mask anything against them and
 *   emits a one-time warning. Re-pseudonymisation post-rotation is an
 *   operator runbook procedure (see runbook §7).
 *
 * Immutability (R-X4):
 *   The overlay never mutates the input array or any entry. Masked
 *   entries are new frozen objects; unmasked entries pass through by
 *   reference. The output array itself is frozen. The original WORM bucket
 *   bytes are unchanged — masking is a runtime projection.
 */

import { createHmac } from 'node:crypto';
import { deriveDsrKeyId } from '../compliance/dsr-cascade.js';
import type { OnigaeshiAuditEntry } from './audit.js';

/** Sentinel value used to replace masked actor strings. */
export const REDACTED_ACTOR = '[REDACTED]' as const;

/**
 * Closed legacy allowlist of detail keys that historically carried
 * data-subject identifiers. Retained for backward compatibility with
 * audit entries written before the `pii_` prefix convention. New code
 * should use the `pii_` prefix; see `audit.ts` `freezeDetail` docs.
 */
const LEGACY_PII_KEYS: readonly string[] = ['user_id', 'data_subject', 'subject_email'];

/** Marker type emitted by `appendDsrErasureMarker`. */
const DSR_ERASURE_TYPE = 'dsr.erasure' as const;

export interface ApplyOverlayOptions {
  /**
   * The active HMAC pseudonymisation key. Required because the overlay
   * must hash candidate `actor` / pii detail values to compare against
   * the marker's `actor` (which itself is the userHash).
   */
  readonly key: string;
  /**
   * Optional warning sink — invoked at most once per `applyOverlay()`
   * call when one or more markers are opaque (keyId mismatch). Defaults
   * to `console.warn`. Tests inject to assert the warn-once contract.
   */
  readonly onWarn?: (message: string) => void;
}

function hmacHex(value: string, key: string): string {
  return createHmac('sha256', key).update(value).digest('hex');
}

function isPiiKey(k: string): boolean {
  return k.startsWith('pii_') || LEGACY_PII_KEYS.includes(k);
}

/**
 * Apply the DSR erasure overlay to an audit-entry stream.
 *
 * Returns a NEW array. The output is frozen; masked entries are new
 * frozen objects; unmasked entries pass through by reference. The input
 * array is never mutated.
 *
 * Position-independent: a marker masks entries written before AND after
 * it. The chain is append-only, so once a marker exists for a hash,
 * every entry that hashes to the same value is masked by every reader
 * that runs the overlay.
 */
export function applyOverlay(
  entries: readonly OnigaeshiAuditEntry[],
  opts: ApplyOverlayOptions,
): readonly OnigaeshiAuditEntry[] {
  if (typeof opts.key !== 'string' || opts.key.trim().length === 0) {
    throw new Error('audit-overlay: key must be a non-empty string');
  }
  const activeKeyId = deriveDsrKeyId(opts.key);
  const onWarn = opts.onWarn ?? ((m: string) => console.warn(m));

  // Collect erasure-marker hashes (only markers whose keyId matches the
  // active key). Markers with mismatched keyIds are noted for the
  // warn-once branch and otherwise ignored.
  const erasedHashes = new Set<string>();
  let opaqueMarkerCount = 0;
  for (const e of entries) {
    if (e.type !== DSR_ERASURE_TYPE) continue;
    const markerKeyId =
      typeof e.detail.keyId === 'string' ? e.detail.keyId : null;
    if (markerKeyId !== activeKeyId) {
      opaqueMarkerCount += 1;
      continue;
    }
    erasedHashes.add(e.actor);
  }
  if (opaqueMarkerCount > 0) {
    onWarn(
      `audit-overlay: ${opaqueMarkerCount} DSR erasure marker(s) under a ` +
        'different key version; treating as opaque (no mask). ' +
        'Operator runbook §7 covers re-pseudonymisation under a rotated key.',
    );
  }

  if (erasedHashes.size === 0) {
    // No active markers → nothing to mask. Still return a new frozen
    // array so callers cannot mutate module state via the returned
    // reference.
    return Object.freeze([...entries]);
  }

  const out = entries.map((e) => maskOne(e, erasedHashes, opts.key));
  return Object.freeze(out);
}

function maskOne(
  e: OnigaeshiAuditEntry,
  erasedHashes: ReadonlySet<string>,
  key: string,
): OnigaeshiAuditEntry {
  // Markers themselves are never masked — they ARE the audit trail of
  // erasure and must remain visible. The marker's `actor` IS a userHash
  // that may also appear in `erasedHashes`; without this early return,
  // the body below would otherwise replace the marker's actor with
  // REDACTED_ACTOR and lose the audit trail. Self-mask invariant is
  // tested in audit-overlay.test.ts §"marker self-reference".
  if (e.type === DSR_ERASURE_TYPE) return e;

  const actorMatched =
    typeof e.actor === 'string' &&
    e.actor.length > 0 &&
    erasedHashes.has(hmacHex(e.actor, key));

  // Compute the masked detail map. Walk every key; for pii-eligible keys
  // with a string value that hashes to an erased value, replace with null.
  // If the actor matched, also null every pii-eligible key as a defensive
  // measure (the entry is bound to the erased subject, so any pii field
  // is presumed to reference them).
  let maskedDetail: Record<string, string | number | boolean | null> | null = null;
  for (const [k, v] of Object.entries(e.detail)) {
    const piiKey = isPiiKey(k);
    let mask = false;
    if (piiKey && actorMatched) {
      mask = true;
    } else if (
      piiKey &&
      typeof v === 'string' &&
      v.length > 0 &&
      erasedHashes.has(hmacHex(v, key))
    ) {
      mask = true;
    }
    if (!mask) continue;
    if (!maskedDetail) maskedDetail = { ...e.detail };
    maskedDetail[k] = null;
  }

  if (!actorMatched && !maskedDetail) {
    return e;
  }

  // When actor matched but no pii detail keys needed masking, we can
  // reuse the original (already-frozen) detail map by reference — the
  // values are unchanged. Only when masking actually altered values do
  // we publish the new map.
  const finalDetail = maskedDetail ? Object.freeze(maskedDetail) : e.detail;
  // TICKET-G5: aivss is not PII (a CVSS-aligned severity score). Propagate
  // through the overlay unchanged via conditional spread so masked entries
  // retain the score for downstream dashboards / compliance enrichment.
  return Object.freeze({
    engagementId: e.engagementId,
    type: e.type,
    actor: actorMatched ? REDACTED_ACTOR : e.actor,
    targetModel: e.targetModel,
    outcome: e.outcome,
    timestamp: e.timestamp,
    detail: finalDetail,
    ...(e.aivss !== undefined ? { aivss: Object.freeze({ ...e.aivss }) } : {}),
  }) as OnigaeshiAuditEntry;
}
