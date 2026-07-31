// SPDX-License-Identifier: Apache-2.0
/**
 * tatami/types — canonical Tatami evidence object (OSS, Epic 1).
 *
 * Defined ONCE here; every module maps its native record into these shapes via
 * `TatamiSourceAdapter`. Proofs reference source evidence by id/hash — they never
 * duplicate raw payloads. Seal/Replay/Export schemas are intentionally NOT here
 * (deferred to Epics 6/9, EE `tatami-vault`); this file is the OSS core only.
 *
 * String-literal unions over enums; `interface` for shapes; all fields readonly
 * (immutability is a hard project rule — update via spread, never mutate).
 */

import type { TatamiHashLink } from './hash-chain';

/** Bump when a persisted shape changes; the store read-upgrades on this. */
export const TATAMI_SCHEMA_VERSION = 1;

// ── Enums (string-literal unions) ────────────────────────────────────────────

/** OSS modules + EE (kagami, bushido) that can source a proof. */
export type TatamiSourceModule =
  | 'scanner'
  | 'buki'
  | 'jutsu'
  | 'arena'
  | 'hattori'
  | 'kotoba'
  | 'sengoku'
  | 'kagami'
  | 'bushido';

export type TatamiCaseStatus =
  | 'open'
  | 'investigating'
  | 'mitigating'
  | 'verified'
  | 'closed'
  | 'archived';

export type TatamiTrustState =
  | 'draft'
  | 'sealed'
  | 'verified'
  | 'partially_verified'
  | 'redacted'
  | 'exported'
  | 'challenged'
  | 'superseded'
  | 'broken_chain';

export type TatamiTrustTier = 'local' | 'hashed' | 'worm' | 'signed' | 'attested';

/**
 * Redaction tier. `regulator_legal` was renamed `sealed_evidence_packet` (O3 —
 * no "legal-grade" claim while the attested seal is not GA).
 */
export type TatamiRedactionTier =
  | 'raw_sealed'
  | 'internal_redacted'
  | 'customer_safe'
  | 'sealed_evidence_packet';

/**
 * Redaction class. `attack_technique` masks the operative payload (the winning
 * jailbreak/mutation) — distinct from PII so a red-teamer's technique is not
 * exposed across operators or in exports (audit F-Red-team F3).
 */
export type TatamiRedactionClass = 'pii' | 'secret' | 'attack_technique';

/** Reproducibility axis — orthogonal to trust (audit F-Eval). */
export type TatamiReproducibility =
  | 'deterministic'
  | 'stochastic-characterized'
  | 'stochastic-single'
  | 'non-reproducible';

/** The user must never wonder which of these a proof is. */
export type TatamiMaturity = 'live' | 'synthetic' | 'fixture' | 'stub' | 'replay';

export type TatamiReplaySafety = 'replayable' | 'replayable_redacted' | 'not_replayable';

export type TatamiReplaySafetyReason =
  | 'pii_present'
  | 'secret_present'
  | 'retention_expired'
  | 'missing_seed'
  | 'missing_prompt_snapshot'
  | 'missing_model_config'
  | 'live_side_effect_risk'
  | 'provider_unavailable'
  | 'policy_restricted'
  | 'stub_or_fixture_only';

/** How a replay was executed — `cached_no_reexecution` proves nothing (F-Eval). */
export type TatamiReplayExecution =
  | 'cached_no_reexecution'
  | 'deterministic_reexecuted'
  | 'live_reexecuted';

export type TatamiRetentionClass = 'ephemeral' | 'standard' | 'extended' | 'legal_hold';

// ── Records ──────────────────────────────────────────────────────────────────

/** Reference into a source module's evidence — ids/hashes only, never payloads. */
export interface TatamiSourceRef {
  readonly module: TatamiSourceModule;
  readonly route?: string;
  readonly runId?: string;
  readonly evidenceId?: string;
  readonly auditId?: string;
  readonly executionId?: string;
}

/** A redacted, shareable preview. Text is pseudonymous (salted/keyed/truncated)
 *  — NEVER call it "anonymous" (GDPR Recital 26, audit F-Compliance F8). */
export interface TatamiRedactedPreview {
  readonly tier: TatamiRedactionTier;
  readonly text: string;
  readonly applied: readonly TatamiRedactionClass[];
}

export interface TatamiCase {
  readonly schemaVersion: number;
  readonly id: string;
  /** B5 — org-scoped; required on every create. */
  readonly orgId: string;
  readonly title: string;
  readonly hypothesis: string;
  readonly status: TatamiCaseStatus;
  /** Operator-attributed (hashed operator id, never a raw bearer). */
  readonly owner: string;
  readonly severity?: string;
  readonly tags: readonly string[];
  readonly linkedModules: readonly TatamiSourceModule[];
  readonly proofIds: readonly string[];
  /** RFC-3339 UTC. */
  readonly createdAt: string;
  readonly updatedAt: string;
  /**
   * RFC-3339 UTC instant the case was first marked `closed`. Stable across a
   * later `closed → archived` move (cold-storage doesn't reset "when was this
   * resolved"). Absent if the case skipped `closed` and went straight to
   * `archived` from a non-terminal status (only `archivedAt` is set then).
   */
  readonly closedAt?: string;
  /**
   * HC-2.C Lane B (Product-2) — RFC-3339 UTC instant the case was first
   * marked `archived`. Once `archived` is terminal (HC-2.C Lane B Product-1
   * blocks `archived → *`), this stamp is never cleared. Independent from
   * `closedAt`: `open → archived` direct stamps ONLY `archivedAt`.
   * Additive optional field; absent on rows written before HC-2.C.
   */
  readonly archivedAt?: string;
  /**
   * §9.10 Risk-Receipt — operator's investigation conclusions. These three are
   * CUSTOMER-SAFE annotations (unlike the internal `hypothesis`, which the case
   * read-route drops for view-only members): they are surfaced verbatim in a
   * linked proof's customer-safe receipt, so the operator authoring them MUST
   * keep them buyer-safe — no raw payload, no PII, no secrets (same contract as
   * a proof's `title`/`summary`). Live on the CASE (mutable, PATCH-authored)
   * because a proof is immutable; a case-level conclusion applies to every proof
   * the case links. Bounded at the parse boundary ({@link MAX_CASE_RISK_NOTE_LEN}).
   * Additive optional fields; absent on rows written before §9.10.
   */
  readonly mitigation?: string;
  readonly residualRisk?: string;
  readonly verifierNote?: string;
}

/**
 * P1.9 — bounded, scalar-only inference-config snapshot for a proof's model run.
 *
 * ADAPTER CONTRACT (HC-2.C Lane A, Theme A — Privacy-3 / Privacy-4 / Product-4
 * / Infra-3). The three new provenance fields on {@link TatamiProof}
 * (`modelRef` / `providerRef` / `configSnapshot`) are intentionally OPAQUE
 * strings/scalars so adapters can pass through whatever native model address
 * they already use. Opacity is also a footgun — adapters MUST observe:
 *
 *   1. NO PII. `configSnapshot.system_prompt = "user alice@acme.com said …"`
 *      is FORBIDDEN. Hash long prompts upstream and pass
 *      `system_prompt_hash`.
 *   2. NO secrets / bearers / API keys. `modelRef = "sk-…"` /
 *      `providerRef = "Bearer …"` / `configSnapshot.api_key = …` are
 *      FORBIDDEN. `isTatamiProof` rejects values shaped like common bearer
 *      tokens via {@link looksLikeSecret} as a backstop, but the adapter is
 *      the real chokepoint.
 *   3. NO per-user identifiers. Use the route's hashed `capturedBy` /
 *      `owner` for operator attribution; provenance fields are MODEL routing
 *      only, not subject routing.
 *
 * Advisory `configSnapshot` keys (non-exhaustive; pick what your adapter
 * actually knows): `temperature` · `top_p` · `top_k` · `seed` ·
 * `max_tokens` · `stop` (as a single joined string — arrays are rejected) ·
 * `system_prompt_hash` · `tool_choice` · `response_format` · `quantization`.
 *
 * Carries the deterministic knobs a verifier needs to reason about
 * reproducibility WITHOUT raw payload: values must be scalar
 * (string | number | boolean | null) and a string value is additionally
 * length-bounded. Bounded entry count + per-key length keep a hostile or
 * sloppy adapter from blowing up the persisted row beyond MAX_ROW_BYTES.
 *
 * Validated by {@link isTatamiModelConfigSnapshot}; the proof guard
 * {@link isTatamiProof} delegates to it when the field is present (additive —
 * proofs written before P1.9 simply lack it and remain valid).
 */
export type TatamiModelConfigSnapshot = Readonly<Record<string, string | number | boolean | null>>;

export interface TatamiProof {
  readonly schemaVersion: number;
  readonly id: string;
  readonly orgId: string;
  readonly caseId?: string;
  readonly source: TatamiSourceRef;
  readonly title: string;
  readonly summary: string;
  readonly severity?: string;
  readonly verdict?: string;
  readonly refusalClass?: string;
  /** Hash references to source input/output — never the raw bodies. */
  readonly inputHash?: string;
  readonly outputHash?: string;
  readonly previews: readonly TatamiRedactedPreview[];
  readonly maturity: TatamiMaturity;
  readonly trustState: TatamiTrustState;
  readonly trustTier: TatamiTrustTier;
  readonly reproducibility: TatamiReproducibility;
  readonly replaySafety: TatamiReplaySafety;
  readonly replaySafetyReasons: readonly TatamiReplaySafetyReason[];
  readonly retentionClass: TatamiRetentionClass;
  /** B4 — when true, delete/erase is blocked downstream (enforced, not advisory). */
  readonly legalHold: boolean;
  readonly capturedBy: string;
  readonly createdAt: string;
  /**
   * P1.9 — opaque model identifier the adapter resolved (e.g. an ollama tag, a
   * provider snapshot id, a router-emitted slug). Tatami does NOT define a
   * canonical model registry; the value is whatever the source module already
   * uses to address its model so a verifier can reproduce the run. Bounded to
   * {@link MAX_TATAMI_MODEL_REF_LEN}. **MUST NOT carry secrets / per-user
   * identifiers / PII** — see {@link TatamiModelConfigSnapshot} adapter
   * contract. `isTatamiProof` backstops via {@link looksLikeSecret}.
   */
  readonly modelRef?: string;
  /**
   * P1.9 — opaque provider identifier (e.g. 'anthropic' / 'openai' / 'ollama' /
   * 'hf' / 'vertex' / a self-hosted gateway id). Same opaque/no-registry posture
   * as {@link modelRef}. Bounded to {@link MAX_TATAMI_PROVIDER_REF_LEN}. **MUST
   * NOT carry secrets / tenant tokens / per-user identifiers** — see the
   * {@link TatamiModelConfigSnapshot} adapter contract.
   */
  readonly providerRef?: string;
  /**
   * P1.9 — bounded scalar-only inference-config snapshot (temperature, seed,
   * top_p, max_tokens, …). NEVER raw payload, never nested objects/arrays,
   * NEVER PII / secrets / per-user identifiers — see the {@link
   * TatamiModelConfigSnapshot} adapter contract. Validated by
   * {@link isTatamiModelConfigSnapshot}; absent on proofs written before P1.9
   * (additive — no schema bump).
   */
  readonly configSnapshot?: TatamiModelConfigSnapshot;
  /**
   * §7.2 — opaque model-RESOLUTION provenance: how the requested model mapped to
   * the served one (e.g. `'requested=fast served=llama3.1:8b'`, `'alias resolved'`,
   * `'fallback: primary unavailable'`). Complements {@link modelRef} (the resolved
   * identifier) by recording the resolution PATH a verifier needs to reason about
   * reproducibility. Opaque/no-registry, same posture as {@link modelRef}: bounded
   * to {@link MAX_TATAMI_MODEL_RESOLUTION_LEN}, **MUST NOT carry secrets / per-user
   * identifiers / PII** (the scanner adapter resolves no model and leaves it unset;
   * model-calling adapters — buki/jutsu — populate it). `isTatamiProof` backstops
   * via {@link looksLikeSecret}. Absent on proofs written before this field
   * (additive — no schema bump).
   */
  readonly modelResolution?: string;
  /** B7 self-verifiable integrity link for this proof. */
  readonly hashLink?: TatamiHashLink;
}

// P1.9 bounds — fail-fast at the lib boundary, mirror the case-input posture.
/** Max length of an opaque model identifier (`modelRef`). */
export const MAX_TATAMI_MODEL_REF_LEN = 256;
/** Max length of an opaque provider identifier (`providerRef`). */
export const MAX_TATAMI_PROVIDER_REF_LEN = 128;
/** Max entries in a `configSnapshot` map. */
export const MAX_TATAMI_CONFIG_SNAPSHOT_ENTRIES = 32;
/** Max length of any single `configSnapshot` KEY. */
export const MAX_TATAMI_CONFIG_SNAPSHOT_KEY_LEN = 64;
/** Max length of a STRING value in `configSnapshot`. Numbers/booleans/null
 *  are inherently bounded; strings carry the only unbounded growth risk. */
export const MAX_TATAMI_CONFIG_SNAPSHOT_STRING_LEN = 512;
/** §7.2 — max length of an opaque model-resolution string (`modelResolution`). */
export const MAX_TATAMI_MODEL_RESOLUTION_LEN = 256;

/**
 * HC-2.C Lane A (Theme A — Privacy-4, Infra-3 backstop). Heuristic guard for
 * the most common bearer-token shapes that should never land in `modelRef` /
 * `providerRef`. Not a security boundary on its own — the adapter contract is
 * the real chokepoint — but rejects the obvious "I pasted the wrong variable"
 * mistakes at write time so a bearer never reaches the durable store.
 *
 * Catches: `Bearer …`, `sk-…` / `sk_…` (OpenAI shape), `AIza…` (Google),
 * `ghp_…` / `gho_…` / `ghs_…` / `ghu_…` (GitHub PATs/oauth), `hf_…`
 * (HuggingFace — a model-registry adapter's most likely mis-paste), `AKIA…`
 * (AWS access-key id), JWT `eyJ…\.…\.…` shape. Case-sensitive on the prefix
 * tokens that are case-sensitive in their native APIs.
 */
export function looksLikeSecret(s: string): boolean {
  if (s.length === 0) return false;
  if (/^Bearer\s/i.test(s)) return true;
  // Real-world API-key bodies carry `-` and `_` (e.g. `sk-ant-…`, `sk_live_…`);
  // the body class must mirror the upstream charset, not the strict `[A-Za-z0-9]`.
  if (/^sk[-_][A-Za-z0-9_-]{16,}/.test(s)) return true;
  if (/^AIza[0-9A-Za-z_-]{20,}/.test(s)) return true;
  if (/^gh[posu]_[A-Za-z0-9_-]{20,}/.test(s)) return true;
  if (/^hf_[A-Za-z0-9]{20,}/.test(s)) return true;
  if (/^AKIA[0-9A-Z]{16}/.test(s)) return true;
  if (/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(s)) return true;
  return false;
}

/**
 * Guard for {@link TatamiModelConfigSnapshot}. Flat, scalar-only, bounded.
 * A nested object/array, an unknown value, an over-long string, or an over-large
 * map fails the check — the proof guard treats that as a write rejection.
 */
export function isTatamiModelConfigSnapshot(v: unknown): v is TatamiModelConfigSnapshot {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  const keys = Object.keys(v as object);
  if (keys.length > MAX_TATAMI_CONFIG_SNAPSHOT_ENTRIES) return false;
  for (const k of keys) {
    if (k.length === 0 || k.length > MAX_TATAMI_CONFIG_SNAPSHOT_KEY_LEN) return false;
    const val = (v as Record<string, unknown>)[k];
    if (val === null) continue;
    const t = typeof val;
    if (t === 'string') {
      if ((val as string).length > MAX_TATAMI_CONFIG_SNAPSHOT_STRING_LEN) return false;
      continue;
    }
    if (t === 'number') {
      if (!Number.isFinite(val)) return false; // reject NaN / ±Infinity
      continue;
    }
    if (t === 'boolean') continue;
    return false; // nested object/array/function/etc.
  }
  return true;
}

// ── Trace (read-only projection, B3) ─────────────────────────────────────────

export type TatamiTraceEventType =
  | 'run.started'
  | 'model.resolved'
  | 'guard.checked'
  | 'scanner.executed'
  | 'llm.call.completed'
  | 'tool.call'
  | 'evaluator.verdict'
  | 'refusal.classified'
  | 'evidence.written'
  | 'proof.captured'
  | 'error';

export interface TatamiTraceEvent {
  readonly id: string;
  readonly proofId?: string;
  readonly caseId?: string;
  readonly ts: string;
  readonly type: TatamiTraceEventType;
  readonly level: 'info' | 'warn' | 'error';
  readonly source: TatamiSourceModule;
  readonly message: string;
  /** Derived/redacted scalar detail — never raw payloads. */
  readonly details?: Readonly<Record<string, string | number | boolean>>;
}

/**
 * A trace is ASSEMBLED from existing persisted records at read time (B3) — Tatami
 * never emits trace events as a new write path. `partial` flags a trace built
 * from an interrupted/incomplete source (audit F-SRE).
 */
export interface TatamiTrace {
  readonly proofId: string;
  readonly events: readonly TatamiTraceEvent[];
  readonly partial: boolean;
}

// ── Adapter contract (Epic 1 spine) ──────────────────────────────────────────

/**
 * Every module maps its native record → Tatami via this contract. Adapters are
 * pure (no I/O); they read already-captured records and must never dereference
 * EE/raw payloads from an OSS context. Returns `Partial` so missing fields can
 * degrade trust state rather than crash (conformance suite, Epic 1).
 */
export interface TatamiSourceAdapter<TSourceRecord = unknown> {
  readonly module: TatamiSourceModule;
  toProof(record: TSourceRecord): Partial<TatamiProof>;
  toTrace(record: TSourceRecord): readonly TatamiTraceEvent[];
}

// ── Read-side guard ──────────────────────────────────────────────────────────

/**
 * Defense-in-depth row guard (mirrors the sibling stores' validate-on-read), and
 * the store's validate-BEFORE-write gate. Validates every non-optional field the
 * store + retention sweeper rely on — `retentionClass` is checked as a *string*
 * (not the exact union) on purpose: an evidence row carrying an unrecognised class
 * is retained and treated conservatively (never eligible) by the sweeper rather
 * than silently dropped on read.
 */
export function isTatamiProof(v: unknown): v is TatamiProof {
  if (typeof v !== 'object' || v === null) return false;
  const p = v as Record<string, unknown>;
  const baseline =
    typeof p.schemaVersion === 'number'
    && typeof p.id === 'string'
    && p.id.length > 0
    && typeof p.orgId === 'string'
    && p.orgId.length > 0
    && typeof p.source === 'object'
    && p.source !== null
    && typeof p.title === 'string'
    && typeof p.summary === 'string'
    && Array.isArray(p.previews)
    && typeof p.maturity === 'string'
    && typeof p.trustState === 'string'
    && typeof p.trustTier === 'string'
    && typeof p.retentionClass === 'string'
    && typeof p.legalHold === 'boolean'
    && typeof p.capturedBy === 'string'
    && typeof p.createdAt === 'string';
  if (!baseline) return false;
  // P1.9 — optional provenance: if present, validate. Absent fields stay valid
  // (additive change — proofs written before P1.9 must continue to load).
  if (p.modelRef !== undefined) {
    if (typeof p.modelRef !== 'string' || p.modelRef.length === 0 || p.modelRef.length > MAX_TATAMI_MODEL_REF_LEN) {
      return false;
    }
    // HC-2.C Lane A (Theme A) backstop — adapter contract violation.
    if (looksLikeSecret(p.modelRef)) return false;
  }
  if (p.providerRef !== undefined) {
    if (typeof p.providerRef !== 'string' || p.providerRef.length === 0 || p.providerRef.length > MAX_TATAMI_PROVIDER_REF_LEN) {
      return false;
    }
    if (looksLikeSecret(p.providerRef)) return false;
  }
  if (p.configSnapshot !== undefined && !isTatamiModelConfigSnapshot(p.configSnapshot)) {
    return false;
  }
  if (p.modelResolution !== undefined) {
    if (
      typeof p.modelResolution !== 'string'
      || p.modelResolution.length === 0
      || p.modelResolution.length > MAX_TATAMI_MODEL_RESOLUTION_LEN
    ) {
      return false;
    }
    if (looksLikeSecret(p.modelResolution)) return false;
  }
  return true;
}

/**
 * Read-side guard for cases (symmetry with isTatamiProof; B5 org-scope check), and
 * the case store's validate-BEFORE-write gate. Checks the presence and type of every
 * non-optional field, plus non-emptiness of `id` and `orgId` (the lookup + B5 keys).
 * Like isTatamiProof it does NOT non-empty-check the other strings (`title`/`owner`):
 * the create route (PR-6) is the upstream guard — `parseTatamiCaseInput` rejects a
 * blank `title`, and `owner` is always `op-<hex>` from `hashTatamiOwner`; this guard
 * stays type-only for those (defense-in-depth, symmetry with isTatamiProof). PR-3b
 * added the previously-skipped `hypothesis` / `updatedAt` / `linkedModules` checks and
 * the `id` non-emptiness check.
 */
export function isTatamiCase(v: unknown): v is TatamiCase {
  if (typeof v !== 'object' || v === null) return false;
  const c = v as Record<string, unknown>;
  const baseline =
    typeof c.schemaVersion === 'number'
    && typeof c.id === 'string'
    && c.id.length > 0
    && typeof c.orgId === 'string'
    && c.orgId.length > 0
    && typeof c.title === 'string'
    && typeof c.hypothesis === 'string'
    && typeof c.status === 'string'
    && typeof c.owner === 'string'
    && Array.isArray(c.tags)
    && Array.isArray(c.linkedModules)
    && Array.isArray(c.proofIds)
    && typeof c.createdAt === 'string'
    && typeof c.updatedAt === 'string';
  if (!baseline) return false;
  // §9.10 — optional customer-safe risk annotations: type-only when present
  // (length is enforced at the parse boundary, mirroring `hypothesis`). Absent
  // fields stay valid (additive — cases written before §9.10 must still load).
  if (c.mitigation !== undefined && typeof c.mitigation !== 'string') return false;
  if (c.residualRisk !== undefined && typeof c.residualRisk !== 'string') return false;
  if (c.verifierNote !== undefined && typeof c.verifierNote !== 'string') return false;
  return true;
}
