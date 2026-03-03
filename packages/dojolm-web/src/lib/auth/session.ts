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

function getSessionTtlHours(): number {
  const envVal = process.env.TPI_SESSION_TTL_HOURS;
  if (envVal) {
    const parsed = parseInt(envVal, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return DEFAULT_TTL_HOURS;
}

export interface SessionUser {
  id: string;
  username: string;
  email: string;
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
  const ttlHours = getSessionTtlHours();
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();

  db.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, ip_address, user_agent, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(sessionId, userId, tokenHash, ipAddress, userAgent, expiresAt);

  return token;
}

/**
 * Validate a session token and return the associated user, or null.
 */
export function validateSession(token: string): SessionUser | null {
  const db = getDatabase();
  const tokenHash = hashSessionToken(token);

  // Include expiry check in the query to avoid TOCTOU race
  const row = db.prepare(
    `SELECT u.id, u.username, u.email, u.role, u.display_name, u.enabled
     FROM sessions s
     JOIN users u ON s.user_id = u.id
     WHERE s.token_hash = ? AND s.expires_at >= datetime('now')`
  ).get(tokenHash) as Pick<UserRow, 'id' | 'username' | 'email' | 'role' | 'display_name' | 'enabled'> | undefined;

  if (!row) {
    // Clean up any expired sessions for this hash
    db.prepare("DELETE FROM sessions WHERE token_hash = ? AND expires_at < datetime('now')").run(tokenHash);
    return null;
  }
  if (!row.enabled) return null;

  return {
    id: row.id,
    username: row.username,
    email: row.email,
    role: row.role,
    displayName: row.display_name,
  };
}

/**
 * Destroy a session by token.
 */
export function destroySession(token: string): void {
  const db = getDatabase();
  const tokenHash = hashSessionToken(token);
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
