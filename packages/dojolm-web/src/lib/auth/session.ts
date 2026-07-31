// SPDX-License-Identifier: Apache-2.0
/**
 * Session management: create, validate, destroy, and clean up sessions.
 *
 * Sessions stored as SHA-256 hashes in DB. Tokens sent via HTTP-only cookies.
 * Default TTL: 24 hours, configurable via TPI_SESSION_TTL_HOURS.
 */

import { getDatabase } from '../db/database';
import { generateSessionToken, hashSessionToken } from './auth';
import crypto from 'node:crypto';
import type { UserRow, SessionRow } from '../db/types';

const DEFAULT_TTL_HOURS = 24;
const DEFAULT_TTL_MINUTES = DEFAULT_TTL_HOURS * 60;
const MIN_TTL_MINUTES = 5;
const MAX_TTL_MINUTES = 1440;

/**
 * YR.14.1 — resolve effective session TTL in minutes. Priority:
 *   1. `admin_settings` row for `session_ttl_minutes` (admin-edited via
 *      the /admin/settings UI; persisted by `adminSettingsRepo.setValue`).
 *   2. `process.env.TPI_SESSION_TTL_HOURS` (legacy env-var path; treated
 *      as hours and converted to minutes for compatibility with
 *      pre-YR.14.1 deployments).
 *   3. Hard-coded `DEFAULT_TTL_HOURS` (24h) fallback.
 *
 * The DB read is wrapped in try/catch so a missing/un-migrated
 * admin_settings table cannot break session creation — the fallback chain
 * still works.
 */
function getSessionTtlMinutes(): number {
  try {
    const db = getDatabase();
    const row = db.prepare(
      'SELECT value FROM admin_settings WHERE key = ?',
    ).get('session_ttl_minutes') as { value: string } | undefined;
    if (row?.value) {
      const fromDb = parseInt(row.value, 10);
      if (Number.isFinite(fromDb) && fromDb >= MIN_TTL_MINUTES && fromDb <= MAX_TTL_MINUTES) {
        return fromDb;
      }
    }
  } catch (err) {
    // Table missing (pre-migration-007 environment) or DB unavailable —
    // fall through to env-var path. Audit-stream-relevant: session
    // creation must never throw because of a missing settings row.
    // Logged so operators can detect the fallback activation without
    // blocking session creation (pass-2 MED fold-in).
    console.error('[session] getSessionTtlMinutes DB read failed; using env/default fallback:', err);
  }
  const envVal = process.env.TPI_SESSION_TTL_HOURS;
  if (envVal) {
    const hours = parseInt(envVal, 10);
    if (Number.isFinite(hours) && hours > 0) {
      // Pass-2 security MED fold-in: clamp the env-var path to the same
      // bounds the DB path enforces. Without this, a misconfigured or
      // adversarial `TPI_SESSION_TTL_HOURS=999999` produces ~115-year
      // sessions, bypassing the 1440-minute (24h) ceiling the
      // /admin/settings UI advertises.
      const minutes = hours * 60;
      if (minutes >= MIN_TTL_MINUTES && minutes <= MAX_TTL_MINUTES) {
        return minutes;
      }
      console.error(
        `[session] TPI_SESSION_TTL_HOURS=${envVal} exceeds bounds (${MIN_TTL_MINUTES}..${MAX_TTL_MINUTES} min); using default`,
      );
    }
  }
  return DEFAULT_TTL_MINUTES;
}

export interface SessionUser {
  id: string;
  username: string;
  email: string | null;
  role: string;
  displayName: string | null;
}

/**
 * Create a new session for the user.
 * Returns the raw session token to be sent to the client.
 */
export function createSession(
  userId: string,
  ipAddress: string | null,
  userAgent: string | null
): string {
  const db = getDatabase();
  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const sessionId = crypto.randomUUID();
  const ttlMinutes = getSessionTtlMinutes();
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();

  db.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, ip_address, user_agent, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(sessionId, userId, tokenHash, ipAddress, userAgent, expiresAt);

  return token;
}

/**
 * Extract the raw session token from a cookie value.
 *
 * After YR.13.2 the session cookie carries an HMAC-signed claim alongside
 * the raw token: `<rawToken>.<base64url(payload)>.<hex(sig)>`. Route handlers
 * and RSC pages still need the raw token to perform DB lookups; this helper
 * pulls the token portion out without verifying the claim. The Edge
 * middleware and `withAuth` are responsible for the cryptographic
 * verification step — by the time `validateSession` runs, those gates have
 * either already passed (RSC pages) or are about to (API routes).
 */
function extractRawTokenFromCookie(cookieValue: string): string | null {
  if (typeof cookieValue !== 'string' || cookieValue.length === 0) return null;
  const parts = cookieValue.split('.');
  if (parts.length !== 3) return null;
  const [rawToken, payload, sig] = parts;
  if (!/^[0-9a-f]{64}$/i.test(rawToken)) return null;
  if (payload.length === 0 || sig.length === 0) return null;
  return rawToken;
}

/**
 * Validate a session cookie and return the associated user, or null.
 *
 * Accepts the post-YR.13.2 signed cookie value `<token>.<payload>.<sig>`.
 * Pre-YR.13.2 cookies (a bare 64-char token with no claim) are rejected
 * here so the only path through is one signed by the server — this
 * prevents claim downgrade by truncating to the raw token.
 */
export function validateSession(cookieValue: string): SessionUser | null {
  const result = validateSessionWithExpiry(cookieValue);
  return result ? result.user : null;
}

/**
 * F-8-008 (Wave 3hh) — variant that returns BOTH the user and the
 * session row's `expires_at` (ISO-8601 string) so callers can surface
 * a proactive "session expiring soon" warning N minutes before the
 * cookie dies. Returns null in exactly the same shapes as
 * `validateSession` (no row, no user, disabled user).
 *
 * The `expiresAt` value is the same column that gates the SQL
 * predicate immediately above — by the time we return, the row is
 * known-valid (expires_at >= now). It is safe to expose to the
 * authenticated client; it carries no secret material.
 */
export interface SessionUserWithExpiry {
  readonly user: SessionUser;
  readonly expiresAt: string;
}

export function validateSessionWithExpiry(
  cookieValue: string,
): SessionUserWithExpiry | null {
  const token = extractRawTokenFromCookie(cookieValue);
  if (!token) return null;

  const db = getDatabase();
  const tokenHash = hashSessionToken(token);

  // Include expiry check in the query to avoid TOCTOU race
  const row = db.prepare(
    `SELECT u.id, u.username, u.email, u.role, u.display_name, u.enabled, s.expires_at
     FROM sessions s
     JOIN users u ON s.user_id = u.id
     WHERE s.token_hash = ? AND s.expires_at >= datetime('now')`
  ).get(tokenHash) as
    | (Pick<UserRow, 'id' | 'username' | 'email' | 'role' | 'display_name' | 'enabled'> & {
        expires_at: string;
      })
    | undefined;

  if (!row) {
    // Clean up any expired sessions for this hash
    db.prepare("DELETE FROM sessions WHERE token_hash = ? AND expires_at < datetime('now')").run(tokenHash);
    return null;
  }
  if (!row.enabled) return null;

  return {
    user: {
      id: row.id,
      username: row.username,
      email: row.email,
      role: row.role,
      displayName: row.display_name,
    },
    expiresAt: row.expires_at,
  };
}

/**
 * Destroy a session by raw token (the unsigned 64-char hex). Callers that
 * have a full signed cookie value should pass it directly — the helper
 * accepts both shapes (`<token>` or `<token>.<payload>.<sig>`) so the logout
 * path doesn't need to know the cookie format.
 */
export function destroySession(token: string): void {
  const rawToken = extractRawTokenFromCookie(token) ?? token;
  const db = getDatabase();
  const tokenHash = hashSessionToken(rawToken);
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
}

/**
 * Remove all expired sessions.
 */
export function cleanExpiredSessions(): number {
  const db = getDatabase();
  const result = db.prepare(
    "DELETE FROM sessions WHERE expires_at < datetime('now')"
  ).run();
  return result.changes;
}

/**
 * Destroy all sessions for a specific user (e.g., after password change).
 */
export function destroyUserSessions(userId: string): number {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
  return result.changes;
}

/**
 * EPIC-D (F-QA-024) — single-operator self-service session helpers.
 *
 * The OSS `/admin/account` surface lists the caller's own sessions and
 * revokes individual or all-other sessions. All three helpers are
 * USER-scoped: callers can never see or revoke another user's sessions
 * through this API.
 */
export interface SelfSessionRow {
  /** Session id (PK). Used as the revoke handle. */
  readonly id: string;
  /** Last 8 hex chars of the token hash — opaque label for the UI. */
  readonly tokenLabel: string;
  /** `inet_pton`-style string captured at login; nullable. */
  readonly ipAddress: string | null;
  /** UA captured at login; nullable. */
  readonly userAgent: string | null;
  /** ISO-8601 timestamp the session was minted. */
  readonly createdAt: string;
  /** ISO-8601 timestamp the session expires. */
  readonly expiresAt: string;
  /** True iff this row matches the cookie-bearing session for the request. */
  readonly current: boolean;
}

/**
 * List the active (non-expired) sessions for one user, marking the one
 * matching `currentTokenHash` (if any). Pure DB read — no audit emit.
 */
export function listSessionsForUser(
  userId: string,
  currentTokenHash: string | null,
): SelfSessionRow[] {
  const db = getDatabase();
  const rows = db.prepare(
    `SELECT id, token_hash, ip_address, user_agent, created_at, expires_at
     FROM sessions
     WHERE user_id = ? AND expires_at >= datetime('now')
     ORDER BY created_at DESC`,
  ).all(userId) as Array<{
    id: string;
    token_hash: string;
    ip_address: string | null;
    user_agent: string | null;
    created_at: string;
    expires_at: string;
  }>;
  return rows.map((r) => ({
    id: r.id,
    tokenLabel: r.token_hash.slice(-8),
    ipAddress: r.ip_address,
    userAgent: r.user_agent,
    createdAt: r.created_at,
    expiresAt: r.expires_at,
    current: currentTokenHash !== null && r.token_hash === currentTokenHash,
  }));
}

/**
 * Revoke a single session BY ID, scoped to one user. Returns the number
 * of rows deleted (0 = unknown id OR owned by another user). The two
 * negative cases collapse on purpose: leaking the difference would let a
 * caller enumerate other operators' session ids.
 */
export function revokeSessionByIdForUser(sessionId: string, userId: string): number {
  const db = getDatabase();
  const result = db.prepare(
    'DELETE FROM sessions WHERE id = ? AND user_id = ?',
  ).run(sessionId, userId);
  return result.changes;
}

/**
 * Revoke every session for a user EXCEPT the one matching
 * `keepTokenHash`. Used by the "revoke all others" affordance so the
 * caller never logs themselves out from the action that triggered it.
 */
export function revokeOtherSessionsForUser(userId: string, keepTokenHash: string): number {
  const db = getDatabase();
  const result = db.prepare(
    'DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?',
  ).run(userId, keepTokenHash);
  return result.changes;
}
