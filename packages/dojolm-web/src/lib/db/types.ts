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
  email: string;
  password_hash: string;
  role: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  enabled: number;
}

export type UserRole = 'admin' | 'analyst' | 'viewer';

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

// --- Pagination ---

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}
