// SPDX-License-Identifier: Apache-2.0
/**
 * Admin-Settings Repository (YR.14.1 / G-001 + G-008).
 *
 * Persists the admin-editable knobs surfaced by /admin/settings. The
 * keyspace is locked down to a strict whitelist (`ADMIN_SETTING_KEYS`)
 * with per-key value validation:
 *
 *   - session_ttl_minutes : integer 5..1440
 *   - retention_days      : one of {7, 14, 30, 60, 90}
 *   - guard_mode          : one of GUARD_MODES
 *   - export_targets      : JSON array of ExportTarget (closed shape)
 *
 * Validation runs at the repository boundary, not just the route boundary,
 * so defense-in-depth holds even if a future caller skips the route's
 * input schema. SQL persistence is read/write of `(key, value)` text
 * pairs; type coercion is the repo's job, not the DB's.
 */

import { BaseRepository } from './base.repository';
import {
  ADMIN_SETTING_KEYS,
  EXPORT_TARGET_PATH_RE,
  EXPORT_TARGETS_MAX,
  GUARD_MODES,
  isExportCadenceMinutes,
  isExportDestination,
  isExportFormat,
  isGuardMode,
  type AdminSettingKey,
  type AdminSettingRow,
  type ExportTarget,
  type GuardMode,
} from '../types';

const SESSION_TTL_MIN = 5;
const SESSION_TTL_MAX = 1440;
const RETENTION_DAYS_ALLOWED: readonly number[] = [7, 14, 30, 60, 90] as const;
// YR.16 / G-066 — default guard posture is 'shinobi' (log-only). Matches
// the existing `lib/storage/guard-storage.ts` default so a fresh deploy
// behaves identically pre- and post-this migration.
const GUARD_MODE_DEFAULT: GuardMode = 'shinobi';
const EXPORT_TARGETS_DEFAULT: readonly ExportTarget[] = [] as const;

export class AdminSettingsValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AdminSettingsValidationError';
  }
}

export interface AdminSettingsSnapshot {
  readonly session_ttl_minutes: number;
  readonly retention_days: number;
  /**
   * YR.16 / G-066 — current platform-wide guard posture. Defaults to
   * 'shinobi' (log-only) when no row has been written yet.
   */
  readonly guard_mode: GuardMode;
  /**
   * YR.17 / G-007 — telemetry export targets. Empty array when no row
   * has been written yet (a fresh deploy does no telemetry export).
   */
  readonly export_targets: readonly ExportTarget[];
  /**
   * Active Model Switcher (Story E) — org-wide fallback model id used
   * by the resolver chain when the request has no explicit modelId and
   * the caller has no per-user pref cookie. `null` when unset (the
   * resolver then falls back further to the first enabled model).
   */
  readonly active_model_default_id: string | null;
  /**
   * Sensei Rework (Pillar B) — pointer at the model config that drives
   * the Sensei brain. `null` when unset (the Sensei resolver then falls
   * through to the first enabled model). Distinct from
   * `active_model_default_id`, which steers red-team TARGETS, not the
   * brain.
   */
  readonly sensei_model_config_id: string | null;
  /**
   * Sensei Rework (Pillar C) — the pinned Sensei persona id (the Layer-0
   * identity + skill-visibility gate). `null` when unset (the resolver then
   * falls through to the default persona). Persisted so the chat route and
   * the in-app MCP tool source share one persona governance state.
   */
  readonly sensei_persona_id: string | null;
}

/**
 * YR.17 / G-007 — pure validator for one ExportTarget. Returns the
 * canonicalised value or throws AdminSettingsValidationError. The
 * canonicalisation freezes the object so the caller can store the
 * reference without worrying about downstream mutation.
 */
function validateOneExportTarget(raw: unknown): ExportTarget {
  if (!raw || typeof raw !== 'object') {
    throw new AdminSettingsValidationError('export target must be an object');
  }
  const r = raw as Record<string, unknown>;
  if (!isExportDestination(r.destination)) {
    throw new AdminSettingsValidationError(
      `export target destination must be one of {datadog, prometheus, file}`,
    );
  }
  if (!isExportFormat(r.format)) {
    throw new AdminSettingsValidationError(
      `export target format must be one of {json, otel, prom}`,
    );
  }
  if (!isExportCadenceMinutes(r.cadenceMinutes)) {
    throw new AdminSettingsValidationError(
      `export target cadenceMinutes must be one of {1, 5, 15, 60}`,
    );
  }
  if (typeof r.enabled !== 'boolean') {
    throw new AdminSettingsValidationError(
      'export target enabled must be a boolean',
    );
  }
  // Path: required when destination is 'file', forbidden otherwise. The
  // whitelist regex rejects absolute paths, traversal, and shell
  // metacharacters at the boundary so the consumer can resolve via
  // getDataPath() without a second pass.
  if (r.destination === 'file') {
    if (typeof r.path !== 'string') {
      throw new AdminSettingsValidationError(
        'export target with destination=file must include a path string',
      );
    }
    if (!EXPORT_TARGET_PATH_RE.test(r.path)) {
      throw new AdminSettingsValidationError(
        'export target path must match ^[a-z0-9][a-z0-9_./-]{0,63}$ (no absolute paths, no traversal)',
      );
    }
    if (r.path.includes('..')) {
      throw new AdminSettingsValidationError(
        'export target path must not contain ".."',
      );
    }
    return Object.freeze({
      destination: r.destination,
      format: r.format,
      cadenceMinutes: r.cadenceMinutes,
      enabled: r.enabled,
      path: r.path,
    });
  }
  if (r.path !== undefined) {
    throw new AdminSettingsValidationError(
      'export target path is only valid when destination=file',
    );
  }
  return Object.freeze({
    destination: r.destination,
    format: r.format,
    cadenceMinutes: r.cadenceMinutes,
    enabled: r.enabled,
  });
}

function validateExportTargetsArray(raw: unknown): readonly ExportTarget[] {
  if (!Array.isArray(raw)) {
    throw new AdminSettingsValidationError('export_targets value must be an array');
  }
  if (raw.length > EXPORT_TARGETS_MAX) {
    throw new AdminSettingsValidationError(
      `export_targets must contain at most ${EXPORT_TARGETS_MAX} entries`,
    );
  }
  const targets: ExportTarget[] = [];
  for (const entry of raw) {
    targets.push(validateOneExportTarget(entry));
  }
  return Object.freeze(targets);
}

export function isAdminSettingKey(value: unknown): value is AdminSettingKey {
  return typeof value === 'string'
    && (ADMIN_SETTING_KEYS as readonly string[]).includes(value);
}

/**
 * Validate a `(key, value)` pair before it reaches the DB. Throws
 * `AdminSettingsValidationError` on whitelist or range violation.
 *
 * Returns the canonicalised string form (e.g. `'  90 '` → `'90'`) so the
 * row's `value` column never carries operator whitespace.
 */
export function validateSettingPair(key: AdminSettingKey, rawValue: unknown): string {
  // YR.16 / G-066 — `guard_mode` is enum-shaped, NOT integer. Validate
  // it before the integer pre-flight below so a string like "shinobi"
  // doesn't fall through the `^-?\d+$` regex check and reject as
  // non-integer.
  if (key === 'guard_mode') {
    if (typeof rawValue !== 'string') {
      throw new AdminSettingsValidationError(`value must be a string for key "${key}"`);
    }
    const trimmed = rawValue.trim().toLowerCase();
    if (!isGuardMode(trimmed)) {
      throw new AdminSettingsValidationError(
        `guard_mode must be one of {${GUARD_MODES.join(', ')}}`,
      );
    }
    return trimmed;
  }

  // Active Model Switcher (Story A) — opaque short string. We do NOT
  // validate "model exists + enabled" here because that requires async
  // storage access; the repo's `setDefaultModelId(id)` does that check
  // before calling through to `setValue`. This branch only enforces
  // the syntactic gate (non-empty, length-bounded, no control chars).
  //
  // Sensei Rework (Pillar B) — `sensei_model.config_id` shares the
  // EXACT syntactic gate (opaque id, non-empty, ≤200, no control chars).
  // The exists/enabled check lives in `setSenseiModelId`; the ≤40B target
  // cap is deliberately NOT applied (the brain may be a large model).
  //
  // Sensei Rework (Pillar C) — `sensei_persona.id` shares the same
  // syntactic gate (a registered persona slug, non-empty, ≤200, no control
  // chars). The registry-membership check lives in `setSenseiPersonaId`.
  if (
    key === 'active_model.default_id' ||
    key === 'sensei_model.config_id' ||
    key === 'sensei_persona.id'
  ) {
    if (typeof rawValue !== 'string') {
      throw new AdminSettingsValidationError(
        `value must be a string for key "${key}"`,
      );
    }
    const trimmed = rawValue.trim();
    if (trimmed.length === 0) {
      throw new AdminSettingsValidationError(
        `value must not be empty for key "${key}"`,
      );
    }
    if (trimmed.length > 200) {
      throw new AdminSettingsValidationError(
        `value must be 200 chars or fewer for key "${key}"`,
      );
    }
    if (/[\x00-\x1f\x7f]/.test(trimmed)) {
      throw new AdminSettingsValidationError(
        `value must not contain control characters for key "${key}"`,
      );
    }
    return trimmed;
  }

  // YR.17 / G-007 — `export_targets` is JSON-shaped. The wire form is a
  // plain object/array; the persisted form is JSON.stringify'd. Accept
  // either an already-parsed array OR a JSON string (both shapes show up
  // depending on whether the caller went through the route handler or
  // wrote directly).
  if (key === 'export_targets') {
    let parsed: unknown;
    if (typeof rawValue === 'string') {
      try {
        parsed = JSON.parse(rawValue);
      } catch {
        throw new AdminSettingsValidationError(
          'export_targets value must be valid JSON when supplied as a string',
        );
      }
    } else {
      parsed = rawValue;
    }
    const targets = validateExportTargetsArray(parsed);
    // Canonical persisted form: JSON.stringify with sorted keys per
    // entry would be ideal, but JSON.stringify on the frozen array is
    // deterministic enough — every field is required (or guarded by
    // discriminant) and keys appear in the same insertion order on
    // every freeze.
    return JSON.stringify(targets);
  }

  if (typeof rawValue !== 'string' && typeof rawValue !== 'number') {
    throw new AdminSettingsValidationError(`value must be string or number for key "${key}"`);
  }
  const asString = typeof rawValue === 'number' ? String(rawValue) : rawValue.trim();
  if (asString.length === 0) {
    throw new AdminSettingsValidationError(`value must not be empty for key "${key}"`);
  }
  // Strict integer parse — reject `1.5`, `1e3`, `0x10`, ` 5`. Negative
  // integers and `-0` ARE matched by the `-?\d+` shape but fail the
  // per-key range checks below (`-0` parses to 0, which fails both
  // `>= MIN` for session_ttl and the {7,14,30,60,90} whitelist for
  // retention). The regex is the syntactic gate; range is the
  // semantic gate.
  if (!/^-?\d+$/.test(asString)) {
    throw new AdminSettingsValidationError(`value must be an integer for key "${key}"`);
  }
  const asInt = parseInt(asString, 10);
  if (!Number.isFinite(asInt)) {
    throw new AdminSettingsValidationError(`value must be a finite integer for key "${key}"`);
  }

  // `guard_mode` and `export_targets` are handled in the early-return
  // branches above; by this point the key has narrowed to one of the
  // integer-valued keys.
  switch (key) {
    case 'session_ttl_minutes':
      if (asInt < SESSION_TTL_MIN || asInt > SESSION_TTL_MAX) {
        throw new AdminSettingsValidationError(
          `session_ttl_minutes must be between ${SESSION_TTL_MIN} and ${SESSION_TTL_MAX}`,
        );
      }
      return String(asInt);
    case 'retention_days':
      if (!RETENTION_DAYS_ALLOWED.includes(asInt)) {
        throw new AdminSettingsValidationError(
          `retention_days must be one of {${RETENTION_DAYS_ALLOWED.join(', ')}}`,
        );
      }
      return String(asInt);
  }

  // Defensive: TypeScript exhaustiveness already covered every key, but
  // a future key added to the union without a switch arm would land
  // here. Throw rather than fall through to an unguarded write.
  throw new AdminSettingsValidationError(`unknown admin-setting key: "${String(key)}"`);
}

export class AdminSettingsRepository extends BaseRepository<AdminSettingRow> {
  constructor() {
    super('admin_settings');
  }

  /**
   * Read the current value for a single key. Returns the raw stored string
   * — caller is expected to coerce, but at this point the row has already
   * been through `validateSettingPair` on write so the format is trusted.
   */
  getValue(key: AdminSettingKey): string | null {
    const db = this.getDb();
    const row = db.prepare(
      'SELECT value FROM admin_settings WHERE key = ?',
    ).get(key) as { value: string } | undefined;
    return row?.value ?? null;
  }

  /**
   * Read both keys as a typed snapshot, falling back to seeded defaults if
   * a row is missing (defensive — migration 007 inserts both seeds, but
   * a partial state shouldn't crash the route).
   */
  getSnapshot(): AdminSettingsSnapshot {
    const sessionTtlRaw = this.getValue('session_ttl_minutes') ?? '1440';
    const retentionRaw = this.getValue('retention_days') ?? '90';
    // YR.16 / G-066 — guard_mode default is 'shinobi'. The repo coerces
    // through `isGuardMode` so a corrupt row (manual SQL edit, etc.)
    // collapses to the safe-default rather than poisoning enforcement.
    const guardModeRaw = this.getValue('guard_mode');
    const guardMode = isGuardMode(guardModeRaw) ? guardModeRaw : GUARD_MODE_DEFAULT;
    return {
      session_ttl_minutes: parseInt(sessionTtlRaw, 10),
      retention_days: parseInt(retentionRaw, 10),
      guard_mode: guardMode,
      export_targets: this.getExportTargets(),
      active_model_default_id: (() => {
        const raw = this.getValue('active_model.default_id');
        return raw && raw.length > 0 ? raw : null;
      })(),
      sensei_model_config_id: (() => {
        const raw = this.getValue('sensei_model.config_id');
        return raw && raw.length > 0 ? raw : null;
      })(),
      sensei_persona_id: (() => {
        const raw = this.getValue('sensei_persona.id');
        return raw && raw.length > 0 ? raw : null;
      })(),
    };
  }

  /**
   * YR.17 / G-007 — typed read for export_targets. Returns the validated
   * array or the empty default. A row that fails validation collapses
   * to the empty default rather than crashing the snapshot.
   */
  getExportTargets(): readonly ExportTarget[] {
    const raw = this.getValue('export_targets');
    if (raw === null) return EXPORT_TARGETS_DEFAULT;
    try {
      const parsed = JSON.parse(raw);
      return validateExportTargetsArray(parsed);
    } catch {
      // Malformed row — defensive fallback. The route validates on
      // write, so this branch only fires on hand-edited SQL.
      return EXPORT_TARGETS_DEFAULT;
    }
  }

  /**
   * YR.16 / G-066 — typed read for guard_mode. Returns the enum value
   * directly; falls back to 'shinobi' when no row is present or the
   * stored value fails the closed-set check (defensive against manual
   * DB edits).
   */
  getGuardMode(): GuardMode {
    const raw = this.getValue('guard_mode');
    return isGuardMode(raw) ? raw : GUARD_MODE_DEFAULT;
  }

  /**
   * Active Model Switcher (Story A; sync signature post-merge fold-in
   * 2026-05-08) — typed read for the org-wide fallback default model id.
   * Returns null when no row has been written yet (a fresh deploy has no
   * admin default and lets `resolveModelId` fall through to the first-
   * enabled tier).
   *
   * The repo does NOT verify the id still points at an existing,
   * enabled model — that check belongs to the resolver, which
   * re-validates every fallback tier against the live model list.
   *
   * The body is fully synchronous (`getValue` hits better-sqlite3
   * synchronously). The `async` declaration that originally shipped
   * with Story A was dropped post-merge to match the rest of the typed
   * getters on this class (`getGuardMode`, `getExportTargets`). All
   * existing callers used `await`, which is a no-op on non-Promise
   * return values, so the change is backwards compatible.
   */
  getDefaultModelId(): string | null {
    const raw = this.getValue('active_model.default_id');
    return raw && raw.length > 0 ? raw : null;
  }

  /**
   * Active Model Switcher (post-merge fold-in 2026-05-08) — clear the
   * org-wide default. Mirrors the GuardMode reset pattern: the row is
   * physically removed so the snapshot reads `null` and the resolver
   * chain falls through to the first-enabled tier.
   *
   * Returns the previous value (or null) so the route layer can emit a
   * typed audit event with the prev→new diff. No validation is needed —
   * clearing is always safe.
   */
  clearDefaultModelId(): { prev: string | null; next: null } {
    const prev = this.getValue('active_model.default_id');
    const db = this.getDb();
    db.prepare(
      `DELETE FROM admin_settings WHERE key = 'active_model.default_id'`,
    ).run();
    return { prev: prev && prev.length > 0 ? prev : null, next: null };
  }

  /**
   * Active Model Switcher (Story A) — typed write for the org-wide
   * default. Validates the id points at a model that exists AND is
   * `enabled === true` BEFORE persisting. Throws
   * `AdminSettingsValidationError` on mismatch so the route layer
   * can surface a 400 with a clear message ("model not found" vs
   * "model is disabled").
   *
   * The async signature is unavoidable because the validation hits
   * the storage backend (file or sqlite) which is async-only.
   */
  async setDefaultModelId(
    id: string,
    operatorId: string,
  ): Promise<{ prev: string | null; next: string }> {
    if (typeof id !== 'string' || id.trim().length === 0) {
      throw new AdminSettingsValidationError(
        'active_model.default_id must be a non-empty string',
      );
    }
    const trimmed = id.trim();
    const { getStorage } = await import('../../storage/storage-interface');
    const storage = await getStorage();
    const config = await storage.getModelConfig(trimmed);
    if (!config) {
      throw new AdminSettingsValidationError(
        `Model "${trimmed}" not found`,
      );
    }
    if (config.enabled !== true) {
      throw new AdminSettingsValidationError(
        `Model "${trimmed}" is disabled — enable at /admin/jutsu first`,
      );
    }
    return this.setValue('active_model.default_id', trimmed, operatorId);
  }

  /**
   * Sensei Rework (Pillar B) — typed read for the Sensei brain pointer.
   * Returns null when no row has been written yet (the Sensei resolver
   * then falls through to the first enabled model). Mirrors
   * `getDefaultModelId` but reads the `sensei_model.config_id` slot.
   *
   * The repo does NOT verify the id still points at an existing, enabled
   * model — that check belongs to `resolveSenseiModelId`, which
   * re-validates every fallback tier against the live model list.
   */
  getSenseiModelId(): string | null {
    const raw = this.getValue('sensei_model.config_id');
    return raw && raw.length > 0 ? raw : null;
  }

  /**
   * Sensei Rework (Pillar B) — clear the Sensei brain pointer. Mirrors
   * `clearDefaultModelId`: the row is physically removed so the snapshot
   * reads `null` and the resolver falls through to the first enabled
   * model. Returns the previous value (or null) for the route's audit
   * diff.
   */
  clearSenseiModelId(): { prev: string | null; next: null } {
    const prev = this.getValue('sensei_model.config_id');
    const db = this.getDb();
    db.prepare(
      `DELETE FROM admin_settings WHERE key = 'sensei_model.config_id'`,
    ).run();
    return { prev: prev && prev.length > 0 ? prev : null, next: null };
  }

  /**
   * Sensei Rework (Pillar B) — typed write for the Sensei brain pointer.
   * Validates the id points at a model that exists AND is
   * `enabled === true` BEFORE persisting, mirroring `setDefaultModelId`.
   *
   * Crucially, this does NOT apply the ≤40B target size cap: the brain is
   * deliberately exempt (that cap is a target-selection policy, enforced
   * only at the model-list route, not at brain designation). Throws
   * `AdminSettingsValidationError` on a missing or disabled model.
   */
  async setSenseiModelId(
    id: string,
    operatorId: string,
  ): Promise<{ prev: string | null; next: string }> {
    if (typeof id !== 'string' || id.trim().length === 0) {
      throw new AdminSettingsValidationError(
        'sensei_model.config_id must be a non-empty string',
      );
    }
    const trimmed = id.trim();
    const { getStorage } = await import('../../storage/storage-interface');
    const storage = await getStorage();
    const config = await storage.getModelConfig(trimmed);
    if (!config) {
      throw new AdminSettingsValidationError(
        `Model "${trimmed}" not found`,
      );
    }
    if (config.enabled !== true) {
      throw new AdminSettingsValidationError(
        `Model "${trimmed}" is disabled — enable at /admin/jutsu first`,
      );
    }
    return this.setValue('sensei_model.config_id', trimmed, operatorId);
  }

  /**
   * Sensei Rework (Pillar C) — typed read for the active persona pointer.
   * Returns null when no row has been written yet (the resolver then falls
   * through to the default persona). The repo does NOT verify the id still
   * names a registered persona — that check belongs to
   * `resolveSenseiPersona`, which collapses a stale pin to the default.
   */
  getSenseiPersonaId(): string | null {
    const raw = this.getValue('sensei_persona.id');
    return raw && raw.length > 0 ? raw : null;
  }

  /**
   * Sensei Rework (Pillar C) — clear the persona pointer. Mirrors
   * `clearSenseiModelId`: the row is physically removed so the snapshot
   * reads `null` and the resolver falls through to the default persona.
   * Returns the previous value (or null) for the route's audit diff.
   */
  clearSenseiPersonaId(): { prev: string | null; next: null } {
    const prev = this.getValue('sensei_persona.id');
    const db = this.getDb();
    db.prepare(
      `DELETE FROM admin_settings WHERE key = 'sensei_persona.id'`,
    ).run();
    return { prev: prev && prev.length > 0 ? prev : null, next: null };
  }

  /**
   * Sensei Rework (Pillar C) — typed write for the persona pointer.
   * Validates the id names a REGISTERED persona BEFORE persisting (the
   * persona-registry analog of `setSenseiModelId`'s exists+enabled gate).
   * Throws `AdminSettingsValidationError` on an unknown id so the route
   * layer can surface a 400. The persona registry is a tiny frozen map
   * imported dynamically to keep the DB layer free of a static edge into
   * `lib/sensei`.
   */
  async setSenseiPersonaId(
    id: string,
    operatorId: string,
  ): Promise<{ prev: string | null; next: string }> {
    if (typeof id !== 'string' || id.trim().length === 0) {
      throw new AdminSettingsValidationError(
        'sensei_persona.id must be a non-empty string',
      );
    }
    const trimmed = id.trim();
    const { getPersona, listPersonaIds } = await import('../../sensei/personas');
    if (!getPersona(trimmed)) {
      throw new AdminSettingsValidationError(
        `Persona "${trimmed}" is not a registered persona (one of {${listPersonaIds().join(', ')}})`,
      );
    }
    return this.setValue('sensei_persona.id', trimmed, operatorId);
  }

  /**
   * Write a single `(key, value)` pair. Throws on whitelist / range
   * violation. Returns the row's previous string value so the route layer
   * can emit `auditLog.adminSettingsChange` with the prev→new diff.
   */
  setValue(key: AdminSettingKey, rawValue: unknown, operatorId: string): { prev: string | null; next: string } {
    if (!isAdminSettingKey(key)) {
      throw new AdminSettingsValidationError(`unknown admin-setting key: "${String(key)}"`);
    }
    const canonical = validateSettingPair(key, rawValue);
    const prev = this.getValue(key);
    const db = this.getDb();
    db.prepare(
      `INSERT INTO admin_settings (key, value, updated_at, updated_by_operator_id)
       VALUES (?, ?, datetime('now'), ?)
       ON CONFLICT(key) DO UPDATE SET
         value = excluded.value,
         updated_at = excluded.updated_at,
         updated_by_operator_id = excluded.updated_by_operator_id`,
    ).run(key, canonical, operatorId);
    return { prev, next: canonical };
  }
}

export const adminSettingsRepo = new AdminSettingsRepository();
