// SPDX-License-Identifier: Apache-2.0
/**
 * File: lib/members/magic-link-store.ts
 * Purpose: E4B.1 S4B.1.2 — in-memory WORM-ish store for magic-link
 *          tokens. Every row holds only the SHA-256 hash of the raw
 *          token (R-T1 — raw token never stored, never logged in full).
 *          Every status transition replaces the record with a freshly-
 *          built object.
 *
 * Lifecycle:
 *    pending -> consumed   (GET /api/auth/members/magic-link?token=…)
 *    pending -> revoked    (admin/operator-triggered; not wired in E4B.1)
 * Terminal states never transition back.
 *
 * TTL is absolute, not sliding (R-T2): a `createdAt + 10min` expiry is
 * baked in at creation and never extended. Reuse of a consumed token
 * inside the 10-minute window still returns 410 — `consumed` takes
 * precedence over `expired`.
 */

import { randomBytes, timingSafeEqual } from 'node:crypto';

// SHA-256 digests are 64 hex chars. Comparing two fixed-length hex
// strings with `!==` is functionally correct, but the spec (rule 5)
// mandates a timing-safe path for the token-hash lookup to defend
// against any cache-timing oracle on the stored-hash set. The buffer
// length below is fixed at 32 bytes so `timingSafeEqual` always
// executes on same-sized inputs.
const TOKEN_HASH_BYTES = 32;

function tokenHashEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const aBuf = Buffer.alloc(TOKEN_HASH_BYTES);
  const bBuf = Buffer.alloc(TOKEN_HASH_BYTES);
  Buffer.from(a, 'hex').copy(aBuf);
  Buffer.from(b, 'hex').copy(bBuf);
  try {
    return timingSafeEqual(aBuf, bBuf);
  } catch {
    return false;
  }
}

export const MAGIC_LINK_TTL_MS = 10 * 60 * 1000;

export type MagicLinkStatus = 'pending' | 'consumed' | 'expired' | 'revoked';

export interface MagicLink {
  readonly id: string;
  readonly tokenHash: string;
  readonly inviteId: string;
  readonly email: string;
  readonly status: MagicLinkStatus;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly consumedAt: string | null;
}

export interface CreateMagicLinkInput {
  readonly tokenHash: string;
  readonly inviteId: string;
  readonly email: string;
  readonly now?: () => Date;
}

export class MagicLinkStoreError extends Error {
  constructor(
    message: string,
    readonly code: 'not-found' | 'terminal-state' | 'expired' | 'consumed',
  ) {
    super(message);
    this.name = 'MagicLinkStoreError';
  }
}

// Module-level store — see invite-store.ts for the rationale.
const links = new Map<string, MagicLink>();
// Secondary index: inviteId -> Set of magic-link ids. Keeps
// `hasAnyLinkForInvite` O(1) instead of linear-scanning every row,
// closing the DoS-amplification gap flagged in the E4B.1 security
// audit (MEDIUM-2). Every state-changing helper in this file updates
// both `links` and `linksByInvite` so the two never diverge.
const linksByInvite = new Map<string, Set<string>>();

function generateMagicLinkId(): string {
  return `ml-${randomBytes(6).toString('hex')}`;
}

function registerInviteIndex(linkId: string, inviteId: string): void {
  let bucket = linksByInvite.get(inviteId);
  if (!bucket) {
    bucket = new Set<string>();
    linksByInvite.set(inviteId, bucket);
  }
  bucket.add(linkId);
}

export function createMagicLink(input: CreateMagicLinkInput): MagicLink {
  const id = generateMagicLinkId();
  const now = input.now?.() ?? new Date();
  const record: MagicLink = {
    id,
    tokenHash: input.tokenHash,
    inviteId: input.inviteId,
    email: input.email,
    status: 'pending',
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + MAGIC_LINK_TTL_MS).toISOString(),
    consumedAt: null,
  };
  links.set(id, record);
  registerInviteIndex(id, record.inviteId);
  return record;
}

/**
 * Look up a magic-link row by the SHA-256 hash of the raw token and
 * return a redeem verdict. The function never returns a row whose
 * status could silently be re-used — the caller sees either:
 *   - `{ kind: 'ok', link }` — pending + within TTL; safe to consume
 *   - `{ kind: 'consumed' }` — already redeemed (consumed wins over expired)
 *   - `{ kind: 'expired' }` — past TTL
 *   - `{ kind: 'revoked' }` — admin-revoked
 *   - `{ kind: 'not-found' }` — no row matches the supplied hash
 *
 * The GET redeem handler maps every non-ok verdict to a single fixed
 * 410 body — R-T2/R-T3 forbid disclosing which reason applied.
 */
export type MagicLinkLookup =
  | { readonly kind: 'ok'; readonly link: MagicLink }
  | { readonly kind: 'consumed' }
  | { readonly kind: 'expired' }
  | { readonly kind: 'revoked' }
  | { readonly kind: 'not-found' };

export function lookupByTokenHash(
  tokenHash: string,
  opts?: { readonly now?: () => Date },
): MagicLinkLookup {
  const nowMs = (opts?.now?.() ?? new Date()).getTime();
  for (const row of links.values()) {
    // Timing-safe compare (spec rule 5) so a cache-timing oracle on
    // the stored hash set cannot leak information about other tokens.
    if (!tokenHashEquals(row.tokenHash, tokenHash)) continue;
    // `consumed` wins over `expired` even if the TTL has passed.
    if (row.status === 'consumed') return { kind: 'consumed' };
    if (row.status === 'revoked') return { kind: 'revoked' };
    const expiryMs = Date.parse(row.expiresAt);
    if (row.status === 'pending' && nowMs < expiryMs) {
      return { kind: 'ok', link: row };
    }
    return { kind: 'expired' };
  }
  return { kind: 'not-found' };
}

/**
 * Returns true if ANY magic-link row (pending / consumed / expired /
 * revoked) has been created for the given invite. Callers use this to
 * enforce the "invite code is rotated on every POST" rule — a second
 * magic-link POST for an invite that has already issued one must
 * 410 regardless of whether the first link was consumed, expired, or
 * simply still pending. Backed by the `linksByInvite` secondary index
 * so this is O(1) (audit MEDIUM-2 — DoS amplification fix).
 */
export function hasAnyLinkForInvite(inviteId: string): boolean {
  const bucket = linksByInvite.get(inviteId);
  return !!bucket && bucket.size > 0;
}

/**
 * @internal — only `lookupAndConsume` is the sanctioned redeem path.
 * Kept un-exported so a future caller cannot accidentally split the
 * lookup + mark into two ticks and reintroduce the race this module
 * was designed to close. Direct callers would also bypass the
 * timing-safe `lookupByTokenHash` path.
 */
function markMagicLinkConsumed(
  id: string,
  opts?: { readonly now?: () => Date },
): MagicLink {
  const row = links.get(id);
  if (!row) throw new MagicLinkStoreError('magic link not found', 'not-found');
  if (row.status !== 'pending') {
    throw new MagicLinkStoreError(
      'magic link is in a terminal state',
      'terminal-state',
    );
  }
  const consumedAt = (opts?.now?.() ?? new Date()).toISOString();
  const updated: MagicLink = { ...row, status: 'consumed', consumedAt };
  links.set(id, updated);
  return updated;
}

/**
 * Atomic lookup-and-consume. Runs as a single synchronous critical
 * section — Node.js's single-threaded event loop guarantees no other
 * microtask interleaves between the `lookupByTokenHash` read and the
 * `markMagicLinkConsumed` write. Returns the same verdict union as
 * `lookupByTokenHash` BUT when `{kind: 'ok'}` is returned the row has
 * already been flipped to `consumed` — the caller receives the
 * post-transition record so it can read `consumedLink.inviteId`
 * without a second lookup.
 *
 * Closes audit MEDIUM-1 — prior code called lookup + mark on separate
 * lines with an `await` boundary in between, admitting a theoretical
 * race where two concurrent GET requests could both observe pending
 * before either flipped the row. The combined helper eliminates the
 * gap by construction.
 */
export type MagicLinkConsumeResult =
  | { readonly kind: 'ok'; readonly link: MagicLink }
  | { readonly kind: 'consumed' }
  | { readonly kind: 'expired' }
  | { readonly kind: 'revoked' }
  | { readonly kind: 'not-found' };

export function lookupAndConsume(
  tokenHash: string,
  opts?: { readonly now?: () => Date },
): MagicLinkConsumeResult {
  const verdict = lookupByTokenHash(tokenHash, opts);
  if (verdict.kind !== 'ok') return verdict;
  try {
    const consumed = markMagicLinkConsumed(verdict.link.id, opts);
    return { kind: 'ok', link: consumed };
  } catch (err) {
    // Narrow: only treat the race-loser case (row already consumed
    // by a concurrent invocation) as a 410-worthy signal. Any other
    // exception (e.g., a future refactor that throws an unrelated
    // error inside the state transition) must propagate so the
    // route renders 500 rather than silently collapsing to 410 —
    // audit MEDIUM-1 followup (prior catch was too broad).
    if (err instanceof MagicLinkStoreError && err.code === 'terminal-state') {
      return { kind: 'consumed' };
    }
    throw err;
  }
}

/** Test-only reset helper. See invite-store.ts for the caveat. */
export function _resetMagicLinkStoreForTests(): void {
  links.clear();
  linksByInvite.clear();
}
