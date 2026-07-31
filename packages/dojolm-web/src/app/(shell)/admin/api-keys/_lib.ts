// SPDX-License-Identifier: Apache-2.0
/**
 * api-keys/_lib — HAGANE E5.S3 verbatim extraction (page was 1,225 LOC
 * over the 800 cap). Wire types + shared constants, MOVED UNCHANGED;
 * the api-keys-main visual pin guards equivalence (register D12).
 */

export const ALLOWED_SCOPES = ['read', 'mutate', 'admin', 'metrics'] as const;
export type Scope = (typeof ALLOWED_SCOPES)[number];

export interface ApiKeyRow {
  readonly id: string;
  readonly label: string;
  readonly scopes: readonly string[];
  readonly created_by_operator_id: string;
  readonly created_at: string;
  readonly expires_at: string | null;
  readonly revoked_at: string | null;
  readonly last_used_at: string | null;
}

export interface KeysListResponse {
  readonly keys?: readonly ApiKeyRow[];
  readonly total?: number;
  readonly error?: string;
}

export interface CreateKeyResponse {
  readonly key?: string;
  readonly record?: ApiKeyRow;
  readonly error?: string;
}

export interface ApprovalResponse {
  readonly approvalId?: string;
  readonly code?: string;
  readonly expiresAt?: string;
  readonly error?: string;
}

export const CLIPBOARD_AUTO_CLEAR_MS = 30_000;

export function formatTimestamp(ts: string | null): string {
  if (ts === null) return 'never';
  return ts;
}

// E3.S5 (F-7-007 P0) — page-state defaults for the API-keys directory. The
// server now honors `?page=&limit=` (50/100/200) so virtualization can
// kick in on a Token-heavy enterprise that has hundreds of keys.
export const DEFAULT_API_KEYS_PAGE_LIMIT = 50;
