// SPDX-License-Identifier: Apache-2.0
/**
 * API-Key Repository (YR.14.2 / G-002).
 *
 * Persists DB-backed API keys as the authoritative source of truth for
 * X-API-Key header validation. Replaces the env-only API_KEY_PERMISSIONS
 * + TPI_API_KEY_ROLE (legacy NODA_API_KEY_ROLE) pair (sunset fallback only
 * — see route-guard).
 *
 * Key invariants:
 *   * `key_hash` is SHA-256 hex (64 chars) of the raw key. The raw secret
 *     is returned to the operator exactly once at create time and never
 *     persisted in plaintext.
 *   * `revoked_at IS NULL` is the active-row predicate.
 *   * `findByKeyHash` returns null for revoked or expired rows. The
 *     route-guard treats null as "DB miss" and falls back to the env-var
 *     path (with a one-time deprecation warn).
 *   * `findByIdSafe` returns the row WITHOUT the `key_hash` column — UI
 *     consumers should never see the hash. Internal hot-path callers
 *     (route-guard) use `findByKeyHash` directly.
 */

import { BaseRepository } from './base.repository';
import type { ApiKeyRow } from '../types';
import type { UserRole } from '../types';

/** Public-safe projection of `ApiKeyRow` — never includes `key_hash`. */
export interface SafeApiKey {
  readonly id: string;
  readonly label: string;
  readonly scopes: readonly string[];
  readonly created_by_operator_id: string;
  readonly created_at: string;
  readonly expires_at: string | null;
  readonly revoked_at: string | null;
  readonly last_used_at: string | null;
}

/** Cap how many scope strings + how long each can be before we error out. */
export const SCOPE_MAX_COUNT = 64;
export const SCOPE_ELEMENT_MAX_LENGTH = 128;

export class ApiKeyValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiKeyValidationError';
  }
}

/**
 * Validate scopes_json on read. A malformed row should never crash the
 * route-guard hot path — return an empty scope set and let the caller
 * decide. The route layer rejects empty/oversize on write.
 */
function parseScopes(scopesJson: string): string[] {
  try {
    const parsed = JSON.parse(scopesJson);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((s): s is string => typeof s === 'string')
      .slice(0, SCOPE_MAX_COUNT)
      .map((s) => s.slice(0, SCOPE_ELEMENT_MAX_LENGTH));
  } catch {
    return [];
  }
}

function toSafe(row: ApiKeyRow): SafeApiKey {
  return {
    id: row.id,
    label: row.label,
    scopes: parseScopes(row.scopes_json),
    created_by_operator_id: row.created_by_operator_id,
    created_at: row.created_at,
    expires_at: row.expires_at,
    revoked_at: row.revoked_at,
    last_used_at: row.last_used_at,
  };
}

export interface CreateApiKeyInput {
  readonly id: string;
  readonly label: string;
  readonly key_hash: string;
  readonly scopes: readonly string[];
  readonly created_by_operator_id: string;
  readonly created_at: string;
  readonly expires_at: string | null;
}

export class ApiKeyRepository extends BaseRepository<ApiKeyRow> {
  constructor() {
    super('api_keys');
  }

  /**
   * Insert a fresh API key row. Caller supplies the SHA-256 hash —
   * the raw secret is never seen at the repo boundary.
   */
  createKey(input: CreateApiKeyInput): SafeApiKey {
    if (input.scopes.length > SCOPE_MAX_COUNT) {
      throw new ApiKeyValidationError(
        `scopes array too large (${input.scopes.length} > ${SCOPE_MAX_COUNT})`,
      );
    }
    for (const s of input.scopes) {
      if (typeof s !== 'string') {
        throw new ApiKeyValidationError('scope element must be a string');
      }
      if (s.length > SCOPE_ELEMENT_MAX_LENGTH) {
        throw new ApiKeyValidationError(
          `scope element exceeds ${SCOPE_ELEMENT_MAX_LENGTH}-char cap`,
        );
      }
    }
    const row: ApiKeyRow = {
      id: input.id,
      label: input.label,
      key_hash: input.key_hash,
      scopes_json: JSON.stringify([...input.scopes]),
      created_by_operator_id: input.created_by_operator_id,
      created_at: input.created_at,
      expires_at: input.expires_at,
      revoked_at: null,
      last_used_at: null,
    };
    this.create(row);
    return toSafe(row);
  }

  /**
   * Hot-path lookup by SHA-256 hash. Returns null for missing, revoked,
   * or expired rows so the route-guard can treat them all as "DB miss"
   * and fall back to the env-var path.
   *
   * Pass-1 code-review HIGH fold-in: explicit column allowlist instead
   * of `SELECT *`. The hash itself is not surfaced here; the route-
   * guard's hot path only needs id + scopes_json. Mirrors the
   * YR.14.1 `findByIdSafe` discipline that hides `password_hash` even
   * inside the repo's authentication code path.
   *
   * The repo does NOT update `last_used_at` here — that is a separate
   * call (`markUsed`) so the lookup remains a pure read and the write
   * can be best-effort / fire-and-forget at the route boundary.
   */
  findByKeyHash(keyHash: string): Omit<ApiKeyRow, 'key_hash'> | null {
    const db = this.getDb();
    const row = db.prepare(
      `SELECT id, label, scopes_json, created_by_operator_id,
              created_at, expires_at, revoked_at, last_used_at
       FROM api_keys
       WHERE key_hash = ?`,
    ).get(keyHash) as Omit<ApiKeyRow, 'key_hash'> | undefined;
    if (!row) return null;
    if (row.revoked_at !== null) return null;
    if (row.expires_at !== null && row.expires_at <= new Date().toISOString()) {
      return null;
    }
    return row;
  }

  /**
   * Public-safe lookup by id. Never materialises `key_hash` into the
   * returned shape — UI consumers should never see the hash.
   */
  findByIdSafe(id: string): SafeApiKey | null {
    const row = this.findById(id);
    return row ? toSafe(row) : null;
  }

  /**
   * Internal-only id lookup that includes `key_hash`. Used by the rotate
   * executor inside a transaction; never returned to a route response.
   */
  findByIdInternal(id: string): ApiKeyRow | null {
    return this.findById(id);
  }

  /**
   * List active (non-revoked, non-expired) keys, newest first. Capped
   * at 200 rows so a runaway operator cannot DoS the admin UI.
   *
   * Pass-1 code-review HIGH fold-in: also filter `expires_at` so the
   * UI does not surface keys that the auth layer would reject — an
   * operator who saw an "active" expired key would waste a TPA slot
   * revoking what is already inoperative.
   *
   * Pass-2 security LOW fold-in: explicit column allowlist instead of
   * `SELECT *` so the `key_hash` is never materialised into the
   * intermediate `ApiKeyRow[]` array, even though `toSafe` would strip
   * it from the returned `SafeApiKey` shape. Mirrors the YR.14.1
   * `listUsersPaginated` discipline that hides `password_hash` at the
   * SQL layer.
   */
  listActive(limit: number = 200): SafeApiKey[] {
    const db = this.getDb();
    const rows = db.prepare(
      `SELECT id, label, scopes_json, created_by_operator_id,
              created_at, expires_at, revoked_at, last_used_at
       FROM api_keys
       WHERE revoked_at IS NULL
         AND (expires_at IS NULL OR expires_at > ?)
       ORDER BY created_at DESC
       LIMIT ?`,
    ).all(new Date().toISOString(), limit) as Omit<ApiKeyRow, 'key_hash'>[];
    return rows.map((row) => ({
      id: row.id,
      label: row.label,
      scopes: parseScopes(row.scopes_json),
      created_by_operator_id: row.created_by_operator_id,
      created_at: row.created_at,
      expires_at: row.expires_at,
      revoked_at: row.revoked_at,
      last_used_at: row.last_used_at,
    }));
  }

  /**
   * Mark a key revoked. Returns `true` when a row transitioned from
   * active → revoked, `false` if the row was already revoked or did
   * not exist (idempotent caller-side handling).
   *
   * The per-key revocation reason + operator id live in the audit log,
   * not the row — this method only flips the `revoked_at` flag.
   */
  revoke(id: string): boolean {
    const db = this.getDb();
    const result = db.prepare(
      `UPDATE api_keys
         SET revoked_at = ?
       WHERE id = ?
         AND revoked_at IS NULL`,
    ).run(new Date().toISOString(), id);
    return result.changes > 0;
  }

  /**
   * Update `last_used_at` to the supplied ISO timestamp. Best-effort:
   * route-guard hot-path callers must wrap this in a try/catch so a
   * transient DB lock never 503s a valid request.
   */
  markUsed(id: string, ts: string = new Date().toISOString()): void {
    const db = this.getDb();
    db.prepare(
      `UPDATE api_keys SET last_used_at = ? WHERE id = ?`,
    ).run(ts, id);
  }
}

export const apiKeyRepo = new ApiKeyRepository();

/**
 * Map an api-key scope set to a UserRole. Scopes correspond loosely to
 * RBAC roles for the X-API-Key path — `admin` scope yields admin role,
 * `mutate` yields operator, `metrics` and `read` yield member (read-
 * only). The mapping intentionally errs toward LEAST privilege when a
 * scope is missing or unrecognised: a caller without an explicit
 * scope match falls through to `member`.
 *
 * Why a map and not the bu-tpi/rbac role helper: the rbac helper takes
 * a role and answers permission questions; this function takes a scope
 * set and answers "what role does this caller act as." They're inverse
 * questions that share the role vocabulary.
 */
export function deriveRoleFromScopes(scopes: readonly string[]): UserRole {
  if (scopes.includes('admin')) return 'admin';
  if (scopes.includes('mutate')) return 'operator';
  if (scopes.includes('metrics') || scopes.includes('read')) return 'member';
  return 'member';
}

/** Allowed scope vocabulary for the YR.14.2 surface. UI binds against this. */
export const API_KEY_SCOPES: readonly string[] = ['read', 'mutate', 'admin', 'metrics'] as const;
