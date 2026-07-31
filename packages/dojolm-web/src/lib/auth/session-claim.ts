// SPDX-License-Identifier: Apache-2.0
/**
 * Session-claim cookie format (YR.13.2 — RBAC edge enforcement).
 *
 * The session cookie carries a self-contained, HMAC-signed claim so the
 * Edge-runtime middleware can enforce role at the request boundary without
 * a DB lookup. Pattern (a) per the v1-v2-restore-rbac-edge-enforcement
 * backlog item, pass-3 CRIT-1 (Edge runtime cannot execute `better-sqlite3`).
 *
 * Wire format:
 *
 *     <rawToken>.<base64url(payload)>.<hex(hmac)>
 *
 * - `rawToken`: 64-char hex (32 bytes), the existing session token shape.
 * - `payload`:  base64url-encoded JSON `{ v, th, r, iat, exp }`.
 *   - `v`   schema version (current: 1).
 *   - `th`  SHA-256 hex of the raw token — binds the claim to the session
 *           row so a stolen-and-grafted claim from a different session
 *           fails verification at the route boundary.
 *   - `r`   user role at issuance time.
 *   - `iat` issued-at, unix seconds.
 *   - `exp` expires-at, unix seconds. Strict — no skew tolerance.
 * - `hmac`: HMAC-SHA256(payload-as-base64url, signing key) hex-encoded.
 *
 * Two-key rotation (pass-4 NEW MEDIUM):
 * - `TPI_COOKIE_SIGNING_KEY_CURRENT` — signs new claims AND verifies.
 * - `TPI_COOKIE_SIGNING_KEY_PREVIOUS` — verifies only; lets sessions issued
 *   before a rotation continue to validate during the rollover window.
 * - Both keys are 64+ hex chars (32+ bytes random). Production must set at
 *   least `_CURRENT`; `_PREVIOUS` is optional.
 *
 * Edge-safe: uses Web Crypto only (`globalThis.crypto.subtle`). No `node:crypto`
 * imports. The same module runs unchanged in Edge middleware and Node.js
 * route handlers.
 */

import type { UserRole } from '../db/types';

/**
 * Session cookie name. Defined here (in the Edge-safe module) so the
 * middleware can import it without pulling in `route-guard.ts`'s
 * `node:crypto` + `better-sqlite3` chain. `route-guard.ts` re-exports the
 * same symbol for backwards-compatible imports across the rest of the app.
 */
export const SESSION_COOKIE_NAME = 'tpi_session';

export const CLAIM_VERSION = 1;
const ALG_HMAC_SHA256 = { name: 'HMAC', hash: 'SHA-256' } as const;
const MIN_KEY_HEX_LENGTH = 64; // 32 bytes
const RAW_TOKEN_REGEX = /^[0-9a-f]{64}$/i;

interface SessionClaim {
  readonly v: number;
  readonly th: string;
  readonly r: UserRole;
  readonly iat: number;
  readonly exp: number;
}

export interface ParsedSessionCookie {
  readonly rawToken: string;
  readonly claim: SessionClaim;
}

const VALID_ROLES: ReadonlySet<UserRole> = new Set<UserRole>([
  'admin',
  'engagement-approver',
  'moderator',
  'operator',
  'member',
]);

const ENCODER = new TextEncoder();

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  if (hex.length % 2 !== 0) {
    throw new Error('hexToBytes: input must be even-length');
  }
  const len = hex.length / 2;
  // TS 5.7+ generic Uint8Array<TArrayBuffer> + lib.dom.d.ts BufferSource
  // require backing storage to be a plain ArrayBuffer (not the wider
  // ArrayBufferLike union which includes SharedArrayBuffer). Allocate
  // the buffer explicitly so WebCrypto importKey/verify accept the result.
  const buf = new ArrayBuffer(len);
  const out = new Uint8Array(buf);
  for (let i = 0; i < len; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function bytesToHex(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let out = '';
  for (let i = 0; i < view.length; i++) {
    out += view[i].toString(16).padStart(2, '0');
  }
  return out;
}

function base64UrlEncode(input: string): string {
  // btoa expects binary string; encode UTF-8 first
  const utf8 = ENCODER.encode(input);
  let bin = '';
  for (let i = 0; i < utf8.length; i++) bin += String.fromCharCode(utf8[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(input: string): string | null {
  try {
    const padded = input.replace(/-/g, '+').replace(/_/g, '/');
    const padLen = (4 - (padded.length % 4)) % 4;
    const bin = atob(padded + '='.repeat(padLen));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', ENCODER.encode(input));
  return bytesToHex(buf);
}

interface SigningKeys {
  readonly current: CryptoKey;
  readonly previous: CryptoKey | null;
}

// In-process key cache. Effective in long-lived Node.js workers (the API
// route-guard path); in the Edge runtime, isolates may be torn down
// per-request, in which case the cache simply re-imports each time —
// correct, just no perf gain (code pass-1 medium).
let cachedKeys: SigningKeys | null = null;
let cachedKeySources: { current: string | undefined; previous: string | undefined } | null = null;

function readKeyEnv(): { current: string | undefined; previous: string | undefined } {
  return {
    current: process.env.TPI_COOKIE_SIGNING_KEY_CURRENT,
    previous: process.env.TPI_COOKIE_SIGNING_KEY_PREVIOUS,
  };
}

function isValidKeyHex(key: string | undefined): key is string {
  return typeof key === 'string' && key.length >= MIN_KEY_HEX_LENGTH && /^[0-9a-fA-F]+$/.test(key);
}

async function importKey(rawHex: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', hexToBytes(rawHex), ALG_HMAC_SHA256, false, ['sign', 'verify']);
}

async function loadKeys(): Promise<SigningKeys> {
  const sources = readKeyEnv();
  if (
    cachedKeys
    && cachedKeySources
    && cachedKeySources.current === sources.current
    && cachedKeySources.previous === sources.previous
  ) {
    return cachedKeys;
  }
  if (!isValidKeyHex(sources.current)) {
    throw new Error('TPI_COOKIE_SIGNING_KEY_CURRENT must be set to ≥64 hex chars (32 bytes)');
  }
  const current = await importKey(sources.current);
  const previous = isValidKeyHex(sources.previous) ? await importKey(sources.previous) : null;
  const keys: SigningKeys = { current, previous };
  cachedKeys = keys;
  cachedKeySources = sources;
  return keys;
}

/**
 * Test-only escape hatch: clear the in-process key cache so tests can
 * mutate `process.env` between cases. NOT for production use.
 */
export function __resetSigningKeyCacheForTests(): void {
  cachedKeys = null;
  cachedKeySources = null;
}

async function signPayload(payloadB64: string, key: CryptoKey): Promise<string> {
  const sig = await crypto.subtle.sign(ALG_HMAC_SHA256, key, ENCODER.encode(payloadB64));
  return bytesToHex(sig);
}

async function verifyWithKey(payloadB64: string, sigHex: string, key: CryptoKey): Promise<boolean> {
  // HMAC-SHA256 outputs are 32 bytes / 64 hex chars — anything else is
  // malformed and cannot match a real signature. Tightening the guard to
  // exact length closes a fast-path that was previously accepting any
  // even-length hex string (code pass-1 medium).
  if (!/^[0-9a-fA-F]{64}$/.test(sigHex)) return false;
  return crypto.subtle.verify(ALG_HMAC_SHA256, key, hexToBytes(sigHex), ENCODER.encode(payloadB64));
}

/**
 * Build the full cookie value `<token>.<payload>.<sig>` for a freshly created
 * session. Called from the login site after `createSession()` returns the
 * raw token and the user's role is in hand.
 */
export async function buildSignedSessionCookieValue(
  rawToken: string,
  role: UserRole,
  ttlSec: number,
): Promise<string> {
  if (!RAW_TOKEN_REGEX.test(rawToken)) {
    throw new Error('rawToken must be 64 hex chars');
  }
  if (!VALID_ROLES.has(role)) {
    throw new Error(`Unknown role: ${role}`);
  }
  if (!Number.isInteger(ttlSec) || ttlSec <= 0) {
    throw new Error('ttlSec must be a positive integer (seconds)');
  }
  const keys = await loadKeys();
  const now = Math.floor(Date.now() / 1000);
  const claim: SessionClaim = {
    v: CLAIM_VERSION,
    th: await sha256Hex(rawToken),
    r: role,
    iat: now,
    exp: now + ttlSec,
  };
  const payloadB64 = base64UrlEncode(JSON.stringify(claim));
  const sigHex = await signPayload(payloadB64, keys.current);
  return `${rawToken}.${payloadB64}.${sigHex}`;
}

/**
 * Parse and verify a session-claim cookie value.
 *
 * Returns null on:
 * - missing or malformed format (not exactly 3 dot-separated parts)
 * - signature mismatch under both CURRENT and PREVIOUS keys
 * - expired claim
 * - mismatched token-hash binding (claim's `th` ≠ sha256(rawToken))
 * - unknown claim version
 * - unknown role
 *
 * The Edge middleware runs this on every gated request; the route-handler
 * `withAuth` runs it again for `/api/*` routes (which never see middleware).
 */
export async function parseAndVerifySessionCookie(cookieValue: string): Promise<ParsedSessionCookie | null> {
  if (typeof cookieValue !== 'string' || cookieValue.length === 0) return null;
  const parts = cookieValue.split('.');
  if (parts.length !== 3) return null;
  const [rawToken, payloadB64, sigHex] = parts;
  if (!RAW_TOKEN_REGEX.test(rawToken)) return null;
  if (payloadB64.length === 0 || sigHex.length === 0) return null;

  let keys: SigningKeys;
  try {
    keys = await loadKeys();
  } catch (err) {
    // Surface the operational failure — silent fail-closed verification
    // would otherwise look like every cookie is expired (security pass-1
    // M-02). The error includes which env var is missing or malformed.
    console.error('[session-claim] loadKeys failed — session verification blocked:', err);
    return null;
  }

  const verifiedCurrent = await verifyWithKey(payloadB64, sigHex, keys.current);
  if (!verifiedCurrent) {
    if (!keys.previous) return null;
    const verifiedPrevious = await verifyWithKey(payloadB64, sigHex, keys.previous);
    if (!verifiedPrevious) return null;
  }

  const json = base64UrlDecode(payloadB64);
  if (!json) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const candidate = parsed as Partial<SessionClaim>;
  if (candidate.v !== CLAIM_VERSION) return null;
  if (typeof candidate.th !== 'string' || !/^[0-9a-f]{64}$/i.test(candidate.th)) return null;
  if (typeof candidate.r !== 'string' || !VALID_ROLES.has(candidate.r as UserRole)) return null;
  if (typeof candidate.iat !== 'number' || !Number.isFinite(candidate.iat)) return null;
  if (typeof candidate.exp !== 'number' || !Number.isFinite(candidate.exp)) return null;

  const nowSec = Math.floor(Date.now() / 1000);
  if (candidate.exp <= nowSec) return null;
  if (candidate.iat > nowSec + 60) return null; // clock skew guardrail (future-dated)

  const expectedHash = await sha256Hex(rawToken);
  if (expectedHash !== candidate.th.toLowerCase()) return null;

  const claim: SessionClaim = {
    v: candidate.v,
    th: candidate.th.toLowerCase(),
    r: candidate.r as UserRole,
    iat: candidate.iat,
    exp: candidate.exp,
  };
  return { rawToken, claim };
}

/**
 * Test-only helper: produce a cookie value with arbitrary claim fields,
 * signed with the current key. Used to exercise tampered-claim rejection.
 */
export async function __forgeCookieForTests(
  rawToken: string,
  claim: Partial<SessionClaim> & { r: UserRole; exp: number; iat: number },
  options: { signWithPreviousKey?: boolean } = {},
): Promise<string> {
  const keys = await loadKeys();
  const fullClaim: SessionClaim = {
    v: claim.v ?? CLAIM_VERSION,
    th: claim.th ?? (await sha256Hex(rawToken)),
    r: claim.r,
    iat: claim.iat,
    exp: claim.exp,
  };
  const payloadB64 = base64UrlEncode(JSON.stringify(fullClaim));
  const signingKey = options.signWithPreviousKey && keys.previous ? keys.previous : keys.current;
  const sigHex = await signPayload(payloadB64, signingKey);
  return `${rawToken}.${payloadB64}.${sigHex}`;
}
