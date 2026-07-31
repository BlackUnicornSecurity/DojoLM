// SPDX-License-Identifier: Apache-2.0
/**
 * TypeScript row types matching the database schema 1:1.
 *
 * These types represent raw database rows. Domain types in llm-types.ts
 * use camelCase; these use the column names from the SQL schema.
 */

// --- Migration 001: Core Schema ---

export interface ModelConfigRow {
  id: string;
  name: string;
  provider: string;
  model: string;
  api_key_encrypted: string | null;
  base_url: string | null;
  enabled: number; // SQLite boolean: 0 | 1
  config_json: string | null;
  max_tokens: number | null;
  organization_id: string | null;
  project_id: string | null;
  custom_headers_json: string | null;
  temperature: number | null;
  top_p: number | null;
  created_at: string;
  updated_at: string;
}

export interface TestCaseRow {
  id: string;
  name: string;
  category: string;
  prompt: string;
  expected_behavior: string | null;
  severity: string;
  scenario: string | null;
  owasp_category: string | null;
  tpi_story: string | null;
  tags_json: string | null;
  enabled: number;
  created_at: string;
}

export interface BatchExecutionRow {
  id: string;
  name: string;
  model_config_id: string | null;
  status: string;
  total_tests: number;
  completed_tests: number;
  passed_tests: number;
  failed_tests: number;
  avg_resilience_score: number | null;
  avg_injection_success: number | null;
  avg_harmfulness: number | null;
  started_at: string | null;
  completed_at: string | null;
  metadata_json: string | null;
}

export interface BatchTestCaseRow {
  batch_id: string;
  test_case_id: string;
}

export interface TestExecutionRow {
  id: string;
  test_case_id: string | null;
  model_config_id: string | null;
  batch_id: string | null;
  status: string;
  prompt: string | null;
  response: string | null;
  error: string | null;
  duration_ms: number | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  injection_success: number | null;
  harmfulness: number | null;
  resilience_score: number | null;
  estimated_cost_usd: number | null;
  content_hash: string | null;
  cached: number;
  executed_at: string;
}

export interface ScanFindingRow {
  id: string;
  execution_id: string;
  category: string;
  severity: string;
  description: string | null;
  match_text: string | null;
  source: string | null;
  engine: string | null;
  pattern_name: string | null;
  weight: number | null;
  created_at: string;
}

export interface EvidenceRecordRow {
  id: string;
  execution_id: string;
  evidence_type: string;
  content: string | null;
  content_type: string | null;
  size_bytes: number | null;
  checksum: string | null;
  created_at: string;
}

// --- Migration 002: Coverage Tables ---

export interface ExecutionOwaspCoverageRow {
  execution_id: string;
  category: string;
  passed: number;
}

export interface ExecutionTpiCoverageRow {
  execution_id: string;
  story: string;
  passed: number;
}

export interface ModelScoreRow {
  id: string;
  model_config_id: string;
  score_date: string;
  avg_resilience_score: number | null;
  avg_injection_success: number | null;
  avg_harmfulness: number | null;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  category_scores_json: string | null;
  calculated_at: string;
}

export interface ComplianceScoreRow {
  id: string;
  model_config_id: string;
  framework: string;
  version: string | null;
  score_percent: number | null;
  gaps_json: string | null;
  assessed_at: string;
}

// --- Migration 003: Audit & Users ---

export interface UserRow {
  id: string;
  username: string;
  // Nullable since migration 010: email is optional at setup (the wizard
  // marks only username/password required). Callers must handle null.
  email: string | null;
  password_hash: string;
  role: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  enabled: number;
}

/**
 * User role — canonical 5-role matrix per parent plan §0.1 (#138 closed
 * 2026-04-22). Mirrors `bu-tpi/rbac`'s `Role`; kept local as a DB row
 * type so the repository layer does not pull bu-tpi's full RBAC barrel.
 *
 * Legacy values (`analyst`, `viewer`) were migrated to (`operator`,
 * `member`) by migration 005. See migration file for the SQL.
 */
export type UserRole =
  | 'admin'
  | 'engagement-approver'
  | 'moderator'
  | 'operator'
  | 'member';

export const USER_ROLES: readonly UserRole[] = [
  'admin',
  'engagement-approver',
  'moderator',
  'operator',
  'member',
] as const;

export interface SessionRow {
  id: string;
  user_id: string;
  token_hash: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  expires_at: string;
}

export interface AuditLogRow {
  id: string;
  entity_type: string;
  entity_id: string | null;
  action: string;
  old_values_json: string | null;
  new_values_json: string | null;
  user_id: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface RetentionConfigRow {
  entity_type: string;
  retention_days: number;
  last_run_at: string | null;
}

// --- Migration 004: Future Stubs ---

export interface SageGeneratedAttackRow {
  id: string;
  parent_id: string | null;
  generation: number;
  category: string;
  prompt: string;
  fitness_score: number | null;
  technique: string | null;
  status: string;
  created_at: string;
}

export interface BattleArenaMatchRow {
  id: string;
  model_a_id: string | null;
  model_b_id: string | null;
  test_case_id: string | null;
  winner_id: string | null;
  model_a_score: number | null;
  model_b_score: number | null;
  elo_delta: number | null;
  match_type: string | null;
  created_at: string;
}

export interface BattleArenaEloRow {
  model_config_id: string;
  elo_rating: number;
  matches_played: number;
  wins: number;
  losses: number;
  draws: number;
  updated_at: string;
}

export interface ThreatFeedEntryRow {
  id: string;
  source: string;
  threat_type: string;
  title: string;
  description: string | null;
  indicators_json: string | null;
  severity: string;
  confidence: number | null;
  first_seen: string | null;
  last_seen: string | null;
  created_at: string;
}

export interface AttackDnaLineageRow {
  id: string;
  attack_id: string;
  parent_id: string | null;
  mutation_type: string | null;
  similarity_score: number | null;
  generation: number;
  technique_chain_json: string | null;
  created_at: string;
}

export interface ProviderHealthLogRow {
  id: string;
  provider: string;
  endpoint: string | null;
  status_code: number | null;
  latency_ms: number | null;
  error: string | null;
  checked_at: string;
}

// --- Migration 007: Admin User-Management Settings ---

/**
 * YR.14.1 — admin-editable knobs (session TTL, retention days). The full
 * keyspace is open-ended at the schema level; the repo enforces a strict
 * whitelist (`AdminSettingKey`) + per-key range validation.
 */
export interface AdminSettingRow {
  id: number;
  key: string;
  value: string;
  updated_at: string;
  updated_by_operator_id: string;
}

export type AdminSettingKey =
  | 'session_ttl_minutes'
  | 'retention_days'
  | 'guard_mode'
  // YR.17 / G-007 — telemetry export targets (JSON-shaped value). The
  // repo persists the JSON-stringified array; consumers (E6 telemetry)
  // read via `getExportTargets()` and apply the cadence. Live cadence
  // wiring is OUT OF SCOPE for YR.17 — this key only persists the
  // operator's intent.
  | 'export_targets'
  // Active Model Switcher (Story A) — org-wide fallback default
  // model id. String value, max 200 chars, must point at a model
  // that exists + is enabled at write time. Used as the third tier
  // in `resolveModelId`'s priority chain.
  | 'active_model.default_id'
  // Sensei Rework (Pillar B) — pointer at the model config that drives
  // the Sensei brain (tool-calling persona), SEPARATE from the target
  // registry. Same syntactic shape + exists/enabled gate as
  // `active_model.default_id`, but EXEMPT from the ≤40B target cap (the
  // brain may legitimately be a large model). Resolved by
  // `lib/sensei/resolve-sensei-model.ts`; the target switcher tiers
  // (cookie / active_model.default_id) must NOT steer it.
  | 'sensei_model.config_id'
  // Sensei Rework (Pillar C) — pointer at the active Sensei PERSONA (the
  // Layer-0 identity that opens the prompt + gates skill visibility). String
  // value (a registered persona id, e.g. 'red-teamer'), validated against the
  // persona registry at write time. `null` when unset (the resolver then
  // falls through to the default persona). Persisted server-side so the
  // chat route and the in-app MCP tool source read IDENTICAL persona
  // governance — plan Pillar C data model.
  | 'sensei_persona.id';

export const ADMIN_SETTING_KEYS: readonly AdminSettingKey[] = [
  'session_ttl_minutes',
  'retention_days',
  // YR.16 / G-066 — platform-wide guard posture. One of:
  //   shinobi  — log-only (observe; no enforcement)
  //   samurai  — block inbound (reject prompt-injection candidates)
  //   sensei   — block outbound (gate responses)
  //   hattori  — block both (full bilateral enforcement)
  // Default is 'shinobi' (log-only) so a fresh deploy never blocks
  // requests before an operator opts into stricter postures.
  'guard_mode',
  // YR.17 / G-007 — see ExportTarget below for the closed-shape schema.
  'export_targets',
  // Active Model Switcher (Story A) — see resolve-model.ts.
  'active_model.default_id',
  // Sensei Rework (Pillar B) — see resolve-sensei-model.ts.
  'sensei_model.config_id',
  // Sensei Rework (Pillar C) — see resolve-sensei-persona.ts.
  'sensei_persona.id',
] as const;

/**
 * YR.16 / G-066 — runtime guard-mode enum. The selector on `/admin/hattori`
 * and the server-side enforcement helper in `lib/guard-mode.ts` both
 * coerce string inputs through `GUARD_MODES` so a route can never accept
 * a value outside this closed set.
 */
export type GuardMode = 'shinobi' | 'samurai' | 'sensei' | 'hattori';

export const GUARD_MODES: readonly GuardMode[] = [
  'shinobi',
  'samurai',
  'sensei',
  'hattori',
] as const;

export function isGuardMode(value: unknown): value is GuardMode {
  return typeof value === 'string' && (GUARD_MODES as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// YR.17 / G-007 — telemetry export targets (closed-shape schema).
//
// `destination` selects the downstream sink, `format` is the on-the-wire
// shape, `cadenceMinutes` is the polling interval (closed set so an
// operator cannot configure a sub-minute hammer or a 24-hour stale gap),
// `enabled` toggles the target without removing the row, and `path` is a
// data-dir-relative file path that ONLY participates when destination is
// 'file'. The path is whitelisted to a tight regex (no leading slash, no
// '..', no shell metacharacters) — never an absolute path. The route
// boundary is the only validation site; the consumer-side cadence read
// is YR.18+ territory and is NOT wired in YR.17.
// ---------------------------------------------------------------------------

export type ExportDestination = 'datadog' | 'prometheus' | 'file';
export const EXPORT_DESTINATIONS: readonly ExportDestination[] = ['datadog', 'prometheus', 'file'] as const;

export type ExportFormat = 'json' | 'otel' | 'prom';
export const EXPORT_FORMATS: readonly ExportFormat[] = ['json', 'otel', 'prom'] as const;

export type ExportCadenceMinutes = 1 | 5 | 15 | 60;
export const EXPORT_CADENCE_MINUTES: readonly ExportCadenceMinutes[] = [1, 5, 15, 60] as const;

export interface ExportTarget {
  readonly destination: ExportDestination;
  readonly format: ExportFormat;
  readonly cadenceMinutes: ExportCadenceMinutes;
  readonly enabled: boolean;
  /**
   * Relative path within the data dir. Required when `destination === 'file'`,
   * forbidden otherwise. Whitelisted to `^[a-z0-9][a-z0-9_./-]{0,63}$` —
   * no absolute paths, no traversal, no shell metacharacters. The actual
   * sink resolves the path against `getDataPath(...)` so a malicious
   * absolute path can never escape the data-dir prefix.
   */
  readonly path?: string;
}

/** Hard cap on the array length so the JSON column doesn't bloat. */
export const EXPORT_TARGETS_MAX = 16;

/** Path regex — see `ExportTarget.path` doc. */
export const EXPORT_TARGET_PATH_RE = /^[a-z0-9][a-z0-9_./-]{0,63}$/;

export function isExportDestination(value: unknown): value is ExportDestination {
  return typeof value === 'string' && (EXPORT_DESTINATIONS as readonly string[]).includes(value);
}

export function isExportFormat(value: unknown): value is ExportFormat {
  return typeof value === 'string' && (EXPORT_FORMATS as readonly string[]).includes(value);
}

export function isExportCadenceMinutes(value: unknown): value is ExportCadenceMinutes {
  return typeof value === 'number' && (EXPORT_CADENCE_MINUTES as readonly number[]).includes(value);
}

// --- Migration 008: Admin-Managed API Keys ---

/**
 * YR.14.2 — DB-backed API key. The `key_hash` is SHA-256 hex (64 chars)
 * of the raw `sk-…` secret; the secret itself is returned to the operator
 * exactly once at creation time and never persisted in plaintext.
 *
 * `revoked_at IS NULL` is the active-row predicate. `expires_at` is an
 * optional ISO-8601 timestamp; absent means the key never expires.
 * `scopes_json` is the raw JSON string from the route's input schema —
 * the repo parses + caps on read so a malformed row cannot OOM the
 * route-guard hot path.
 */
export interface ApiKeyRow {
  id: string;
  label: string;
  key_hash: string;
  scopes_json: string;
  created_by_operator_id: string;
  created_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  last_used_at: string | null;
}

// --- Migration 009: Setup-State (first-boot wizard ack tracking) ---

/**
 * E6.S3 / F-8-006 — singleton row that captures wizard-completion
 * timestamps the legal layer needs to prove explicit consent.
 *
 * `acknowledged_telemetry_at` is the ISO-8601 timestamp at which an admin
 * acknowledged the build-channel telemetry-disclosure step. The
 * `/admin/*` proxy gate refuses navigation until the column is non-null.
 *
 * `build_channel_at_ack` records which channel ('cloud' | 'self-host')
 * was disclosed at ack time, so a later channel flip cannot retroactively
 * reframe what the operator agreed to.
 */
export interface SetupStateRow {
  id: number;
  acknowledged_telemetry_at: string | null;
  acknowledged_telemetry_by_user_id: string | null;
  build_channel_at_ack: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Build channel disclosed at ack time. Drives the wizard step copy
 * ("hosted on Black Unicorn infrastructure" vs "this deployment runs on
 * your hardware") and is persisted alongside the ack timestamp.
 */
export type BuildChannel = 'cloud' | 'self-host';

export const BUILD_CHANNELS: readonly BuildChannel[] = ['cloud', 'self-host'] as const;

export function isBuildChannel(value: unknown): value is BuildChannel {
  return typeof value === 'string' && (BUILD_CHANNELS as readonly string[]).includes(value);
}

// --- Migration 006: Two-Person-Approval Pending-Action State Machine ---

/**
 * YR.13.3 — pending two-person-approval row. The `code_hash` column stores
 * SHA-256(code) hex; the raw code is returned exactly once to the primary
 * operator and never persisted in the database. `consumed_at` is the
 * single source of truth for "this approval has executed its wrapped
 * action"; `rejected_at` + `rejection_reason` are recorded separately so
 * an audit viewer can distinguish auto-expire from explicit reject.
 */
export interface PendingApprovalRow {
  id: string;
  action_type: string;
  payload_json: string;
  primary_operator_id: string;
  code_hash: string;
  submitted_at: string;
  expires_at: string;
  consumed_at: string | null;
  consumed_by_operator_id: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  created_at: string;
}

// --- Pagination ---

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}
