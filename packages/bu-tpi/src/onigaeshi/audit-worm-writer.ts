/**
 * File: onigaeshi/audit-worm-writer.ts
 * Purpose: Gap 6 v1-deferred — S3-compatible WORM audit writer with
 *          Object Lock semantics and a Merkle-root integrity anchor.
 *          Replaces the in-memory `audit.ts` scaffold for production.
 * Story: Industry-tools parity plan §Gap 6 "Audit log storage" (WORM S3
 *        with Object Lock in Compliance mode, Merkle root emitted
 *        periodically).
 *
 * =====================================================================
 *  DESIGN
 * =====================================================================
 *  The writer depends on an abstract `WormObjectStore` interface — it
 *  does NOT import an S3 SDK directly. In production, a thin adapter
 *  wraps `@aws-sdk/client-s3` and constructs a client whose PUT calls
 *  include `ObjectLockMode=COMPLIANCE` and `ObjectLockRetainUntilDate`
 *  set to seven years out. In tests, `InMemoryWormObjectStore` provides
 *  a deterministic mock that rejects overwrites (mirrors Object Lock).
 *
 *  Each appended entry is serialised to JSON, hashed, chained with the
 *  previous entry's hash, and written under a monotonically-increasing
 *  sequence-numbered key. Anchors (Merkle roots over a batch of
 *  entries) are periodically emitted to a separate prefix so tampering
 *  can be detected by walking the anchor chain.
 *
 *  `verifyAuditIntegrity()` walks the entries from sequence 0 up,
 *  recomputes the chain + Merkle root, and flags any rotation, drop,
 *  or insertion.
 *
 *  R-T1: the record format stores only the same length+hash shape used
 *  by the in-memory audit (no raw seed/response content).
 */

import { createHash } from 'node:crypto';
import type { OnigaeshiAuditEntry } from './audit.js';
import {
  buildOnigaeshiAuditStatement,
  ONIGAESHI_AUDIT_PREDICATE_TYPE,
} from './audit-predicate.js';
import type {
  DsseEnvelope,
  RekorInclusionProof,
  SignerPort,
  SignerResult,
} from './cosign-signer.js';
import { verifyRekorInclusionProof } from './rekor-inclusion-proof.js';

// ---------------------------------------------------------------------------
// Store interface — injected; tests use an in-memory mock
// ---------------------------------------------------------------------------

/**
 * Abstract WORM object store. Production impl wraps S3 with Object Lock
 * in Compliance mode. Any `put` to an existing key MUST throw
 * `WormOverwriteError` — the store must never silently overwrite.
 */
export interface WormObjectStore {
  /** Put a single object; reject overwrites (one-way append semantics). */
  put(key: string, body: string): Promise<void>;

  /** Read an object by key. Returns null when absent. */
  get(key: string): Promise<string | null>;

  /** List keys under a prefix, sorted lexicographically ascending. */
  list(prefix: string): Promise<readonly string[]>;
}

export class WormOverwriteError extends Error {
  readonly code = 'ONIGAESHI.WORM.OVERWRITE' as const;
  constructor(key: string) {
    super(`WORM store rejected overwrite for key "${key}"`);
    this.name = 'WormOverwriteError';
  }
}

/**
 * Deterministic in-memory mock. Rejects overwrites so Object Lock
 * semantics are enforced in tests.
 */
export class InMemoryWormObjectStore implements WormObjectStore {
  private readonly objects = new Map<string, string>();

  async put(key: string, body: string): Promise<void> {
    if (this.objects.has(key)) {
      throw new WormOverwriteError(key);
    }
    this.objects.set(key, body);
  }

  async get(key: string): Promise<string | null> {
    return this.objects.get(key) ?? null;
  }

  async list(prefix: string): Promise<readonly string[]> {
    const keys = Array.from(this.objects.keys()).filter((k) =>
      k.startsWith(prefix),
    );
    keys.sort();
    return keys;
  }

  /**
   * TEST-ONLY: force a tamper by replacing an existing key's body.
   * Production stores in Compliance mode cannot do this. Used by the
   * verification tests to assert tamper detection.
   */
  __testTamper(key: string, newBody: string): void {
    if (!this.objects.has(key)) {
      throw new Error(`__testTamper: key "${key}" does not exist`);
    }
    this.objects.set(key, newBody);
  }

  /** TEST-ONLY: drop a key to simulate an out-of-band delete. */
  __testDrop(key: string): void {
    this.objects.delete(key);
  }
}

// ---------------------------------------------------------------------------
// Record shape + keying
// ---------------------------------------------------------------------------

export const WORM_ENTRY_PREFIX = 'onigaeshi/audit/entries/';
export const WORM_ANCHOR_PREFIX = 'onigaeshi/audit/anchors/';

/**
 * Chained record as persisted. `entry` carries the same fields as the
 * in-memory `OnigaeshiAuditEntry`. `prevHash` links to the previous
 * record; `hash` is sha256 over the canonical JSON of
 * `{seq, prevHash, entry}`.
 */
export interface WormAuditRecord {
  readonly seq: number;
  readonly prevHash: string;
  readonly hash: string;
  readonly entry: OnigaeshiAuditEntry;
  /**
   * B-14a Slice 2b: optional cosign / Rekor inclusion-proof URI emitted
   * when the writer is constructed with `sigstoreEnabled: true` and a
   * `signer: SignerPort`. The URI is OUTSIDE the canonical-hashed
   * envelope (canonicalJson + sha256Hex never see this field), so chain
   * integrity is unaffected when the URI is added, missing, or dropped.
   * Slice 3 makes cosign verification load-bearing when a verifier is
   * supplied to `verifyAuditIntegrity`.
   */
  readonly cosignAttestationUri?: string;
  /**
   * B-14a Slice 3: the DSSE envelope produced by the signer at write
   * time. Persisted alongside the URI so verification is offline +
   * deterministic — no Rekor round-trip required for routine integrity
   * checks. OUTSIDE the canonical-hashed envelope (same back-compat
   * rule as `cosignAttestationUri`); chain integrity is unaffected when
   * the envelope is added, missing, or dropped.
   */
  readonly cosignEnvelope?: DsseEnvelope;
  /**
   * B-14a Slice 3: the Rekor inclusion proof returned by the signer at
   * write time. Persisted for external auditors who want to confirm the
   * row was witnessed by Rekor without re-fetching from the log.
   * OUTSIDE the canonical-hashed envelope.
   */
  readonly cosignInclusionProof?: RekorInclusionProof;
  /**
   * B-14a Slice 3b: the raw cosign bundle (new-bundle-format) captured at
   * write time (`SignerResult.bundle`). REQUIRED for offline re-verification
   * through the cosign CLI adapter — the DSSE envelope alone is rejected
   * ("missing verification material"). `verifyAuditIntegrity` passes this as
   * the `VerifyContext.bundle` so verification needs no Rekor round-trip.
   * OUTSIDE the canonical-hashed envelope (same back-compat rule as the other
   * cosign fields); chain integrity is unaffected when it is added, missing,
   * or dropped. Records written before Slice 3b carry an envelope but no
   * bundle — `verifyAuditIntegrity` falls back to the envelope-only call.
   */
  readonly cosignBundle?: string;
}

export interface WormAnchor {
  readonly fromSeq: number;
  readonly toSeq: number;
  readonly merkleRoot: string;
  readonly writtenAt: string;
}

/**
 * Input for `WormAuditWriter.appendDsrErasureMarker`. PR-E4 (#134).
 *
 * The userHash is HMAC-SHA-256(rawUserId, key) — see
 * `packages/bu-tpi/src/compliance/dsr-cascade.ts:userHmac`. The keyId is
 * the 12-hex-prefix derived from the same key — see
 * `packages/dojolm-web/src/lib/dsr/key-version.ts:getActiveKeyId`. Both
 * are computed up-stack; the WORM writer takes them as opaque strings
 * and validates only their shape.
 */
export interface AppendDsrErasureMarkerInput {
  readonly userHash: string;
  readonly ticketId: string;
  readonly keyId: string;
  readonly now?: () => Date;
}

const ZERO_HASH = '0'.repeat(64);

/**
 * Slice 3b defense-in-depth cap on a persisted `cosignBundle` before it is
 * handed to `signer.verify`. Mirrors the cosign CLI adapter's own bundle cap
 * so a non-CLI `SignerPort` (future adapters, doubles) is protected too. A
 * present-but-oversized/empty bundle degrades to the envelope-only call.
 * Exported (downstream-wiring slice) as the single source of truth so the
 * Bushido sign-off verify path reuses the exact same cap instead of mirroring
 * the literal.
 */
export const MAX_PERSISTED_BUNDLE_BYTES = 256 * 1024;

const DSR_USER_HASH_RE = /^[a-f0-9]{64}$/;
const DSR_KEY_ID_RE = /^[a-f0-9]{12}$/;
const DSR_TICKET_ID_RE = /^[a-z0-9][a-z0-9._-]*$/i;
const DSR_TICKET_ID_MAX_LEN = 128;

function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

function canonicalJson(record: {
  readonly seq: number;
  readonly prevHash: string;
  readonly entry: OnigaeshiAuditEntry;
}): string {
  // Canonicalise: sort keys within the entry.detail and stable key order.
  const detailKeys = Object.keys(record.entry.detail).sort();
  const detailCanon: Record<string, string | number | boolean | null> = {};
  for (const k of detailKeys) {
    detailCanon[k] = record.entry.detail[k];
  }
  const canonEntry = {
    actor: record.entry.actor,
    detail: detailCanon,
    engagementId: record.entry.engagementId,
    outcome: record.entry.outcome,
    targetModel: record.entry.targetModel,
    timestamp: record.entry.timestamp,
    type: record.entry.type,
  };
  return JSON.stringify({
    prevHash: record.prevHash,
    seq: record.seq,
    entry: canonEntry,
  });
}

function canonicalDetailKeys(
  detail: Readonly<Record<string, string | number | boolean | null>>,
): Record<string, string | number | boolean | null> {
  const keys = Object.keys(detail).sort();
  const out: Record<string, string | number | boolean | null> = {};
  for (const k of keys) out[k] = detail[k];
  return out;
}

function seqToKey(seq: number): string {
  return `${WORM_ENTRY_PREFIX}${seq.toString().padStart(16, '0')}.json`;
}

function parseSeqFromKey(key: string): number {
  if (!key.startsWith(WORM_ENTRY_PREFIX)) return NaN;
  const tail = key.slice(WORM_ENTRY_PREFIX.length).replace(/\.json$/, '');
  return Number(tail);
}

// ---------------------------------------------------------------------------
// Merkle root
// ---------------------------------------------------------------------------

/**
 * Compute a Merkle root over an ordered list of leaf hashes. Duplicates
 * the last leaf when a level has odd length (Bitcoin-style). Empty
 * list yields the zero-hash sentinel.
 */
export function computeMerkleRoot(leafHashes: readonly string[]): string {
  if (leafHashes.length === 0) return ZERO_HASH;
  let level = [...leafHashes];
  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = i + 1 < level.length ? level[i + 1] : left;
      next.push(sha256Hex(left + right));
    }
    level = next;
  }
  return level[0];
}

// ---------------------------------------------------------------------------
// Writer
// ---------------------------------------------------------------------------

export interface WormAuditWriterOptions {
  readonly store: WormObjectStore;
  readonly now?: () => Date;
  /**
   * B-14a Slice 2b: optional signer for dual-write cosign attestation
   * alongside the HMAC chain. When omitted, behavior is identical to
   * pre-Slice-2b. When present AND `sigstoreEnabled` is true, every
   * `append()` builds an in-toto Statement from the entry, calls
   * `signer.sign(predicate)`, and persists the returned bundle URI on
   * the WORM record.
   */
  readonly signer?: SignerPort;
  /**
   * B-14a Slice 2b: feature flag gating the cosign dual-write path.
   * Defaults to `false`. Operators flip to `true` via the
   * `SIGSTORE_AUDIT_ENABLED=true` env var (read by callers; the writer
   * itself does NOT read process.env to keep this module pure).
   */
  readonly sigstoreEnabled?: boolean;
  /**
   * B-14a Slice 2b: optional telemetry emitter for signer failures.
   * When a signer throws, the writer falls back to HMAC-only and emits
   * a one-shot warning via this callback so operators see the failure
   * in observability without the chain blocking.
   */
  readonly onSignerError?: (err: unknown, seq: number) => void;
  /**
   * Optional telemetry emitter for a FAILED self-heal (the tail re-read
   * after a lost conditional-PUT race threw). Without it the writer
   * degrades to uninitialised silently — callers only see a cascade of
   * generic init-required errors. Mirrors `onSignerError`.
   */
  readonly onHealError?: (err: unknown) => void;
}

export class WormAuditWriter {
  private readonly store: WormObjectStore;
  private readonly now: () => Date;
  private readonly signer: SignerPort | undefined;
  private readonly sigstoreEnabled: boolean;
  private readonly onSignerError: ((err: unknown, seq: number) => void) | undefined;
  private readonly onHealError: ((err: unknown) => void) | undefined;
  private seq = 0;
  private lastHash = ZERO_HASH;
  private initialised = false;
  private inflight: Promise<unknown> = Promise.resolve();

  constructor(opts: WormAuditWriterOptions) {
    this.store = opts.store;
    this.now = opts.now ?? (() => new Date());
    this.signer = opts.signer;
    this.sigstoreEnabled = opts.sigstoreEnabled ?? false;
    this.onSignerError = opts.onSignerError;
    this.onHealError = opts.onHealError;
  }

  /**
   * Load the tail state from the store. Required before `append()` so
   * the writer continues the existing chain. Idempotent.
   */
  async init(): Promise<void> {
    if (this.initialised) return;
    const keys = await this.store.list(WORM_ENTRY_PREFIX);
    if (keys.length === 0) {
      this.seq = 0;
      this.lastHash = ZERO_HASH;
      this.initialised = true;
      return;
    }
    const tailKey = keys[keys.length - 1];
    const body = await this.store.get(tailKey);
    if (!body) {
      throw new Error(
        `WormAuditWriter.init: tail key "${tailKey}" is listed but empty`,
      );
    }
    const parsed = JSON.parse(body) as WormAuditRecord;
    this.seq = parsed.seq + 1;
    this.lastHash = parsed.hash;
    this.initialised = true;
  }

  /**
   * Append an entry to the chain. Writes a single WORM object under a
   * monotonically-increasing sequence key. Each record stores the
   * previous hash so integrity verification can detect any rotation or
   * drop.
   *
   * Concurrent calls on the same writer are serialised (single-flight
   * queue, mirroring `WormEvidenceWriter.append`) so two callers can
   * never race to the same `seq`, and the overwrite self-heal below can
   * never interleave with another in-flight append's tail mutation.
   * Multiple writer instances against the same store remain a hazard;
   * single-writer semantics are enforced by deployment (one replica).
   */
  async append(entry: OnigaeshiAuditEntry): Promise<WormAuditRecord> {
    const next = this.inflight.then(() => this.doAppend(entry));
    // Swallow rejection on the chained promise so a single failure
    // doesn't poison the queue for subsequent callers.
    this.inflight = next.catch(() => undefined);
    return next;
  }

  private async doAppend(entry: OnigaeshiAuditEntry): Promise<WormAuditRecord> {
    if (!this.initialised) {
      throw new Error('WormAuditWriter: call init() before append()');
    }
    const seq = this.seq;
    const prevHash = this.lastHash;
    const canon = canonicalJson({ seq, prevHash, entry });
    const hash = sha256Hex(canon);

    // B-14a Slice 2b dual-write: when sigstore is on AND a signer is
    // configured, sign the in-toto Statement BEFORE persisting so the
    // entry URI + envelope + inclusion proof can be embedded in the
    // WORM record. Failures fall back to HMAC-only (chain never blocks
    // on cosign).
    let cosignAttestationUri: string | undefined;
    let cosignEnvelope: DsseEnvelope | undefined;
    let cosignInclusionProof: RekorInclusionProof | undefined;
    let cosignBundle: string | undefined;
    if (this.sigstoreEnabled && this.signer) {
      try {
        const detailJson = JSON.stringify(canonicalDetailKeys(entry.detail));
        const detailHash = sha256Hex(detailJson);
        const statement = buildOnigaeshiAuditStatement({
          engagementId: entry.engagementId,
          eventType: entry.type,
          actor: entry.actor,
          targetModel: entry.targetModel,
          outcome: entry.outcome,
          timestamp: entry.timestamp,
          detailHash,
          wormPayloadHash: hash,
        });
        // CRIT-1 fix (omnibus audit): pass the canonical WORM-record
        // bytes as `subjectBytes` so cosign hashes them to derive
        // subject.digest.sha256 = hash (= this WORM record's hash).
        // Without this, cosign would hash an arbitrary input and the
        // attestation would not bind to the WORM record at all.
        const signResult: SignerResult = await this.signer.sign(
          statement,
          Buffer.from(canon, 'utf8'),
        );
        cosignAttestationUri = signResult.entryUri;
        // Slice 3: persist envelope + inclusion proof inline so
        // verifyAuditIntegrity can re-verify offline without a Rekor
        // round-trip. Both stay OUTSIDE the canonical hash.
        cosignEnvelope = signResult.envelope;
        cosignInclusionProof = signResult.inclusionProof;
        // Slice 3b: persist the raw cosign bundle too — the CLI adapter's
        // verify path needs it (the envelope alone lacks verificationMaterial).
        // Undefined for signers that don't shell to cosign (in-process test).
        cosignBundle = signResult.bundle;
      } catch (err) {
        // Single-attempt try/catch — Slice 3 introduces retry policy.
        // The writer continues with HMAC-only chain; observability hook
        // surfaces the failure.
        if (this.onSignerError) {
          try {
            this.onSignerError(err, seq);
          } catch {
            // Swallow callback errors so the chain advances.
          }
        }
      }
    }

    const record: WormAuditRecord = Object.freeze(
      cosignAttestationUri !== undefined
        ? {
            seq,
            prevHash,
            hash,
            entry,
            cosignAttestationUri,
            ...(cosignEnvelope ? { cosignEnvelope } : {}),
            ...(cosignInclusionProof ? { cosignInclusionProof } : {}),
            ...(cosignBundle ? { cosignBundle } : {}),
          }
        : { seq, prevHash, hash, entry },
    );
    const key = seqToKey(seq);
    try {
      await this.store.put(key, JSON.stringify(record));
    } catch (err) {
      // Cross-replica seq-race self-heal (DA KALITAS HIGH, 2026-07-02):
      // losing a conditional-PUT race means another writer already owns
      // this seq — our in-memory tail is stale. Re-read the chain tail so
      // the NEXT append continues from the true head instead of colliding
      // forever. This append still fails (rethrow); the store never forks.
      // When sigstore was on, this seq's attestation was already witnessed
      // by Rekor (sign-before-put is required — the URI is embedded in the
      // stored record), leaving an orphan Rekor entry with no WORM record.
      // Pre-existing on any failed put; harmless — verifyAuditIntegrity
      // walks the chain only, and auditors must not read orphans as
      // tampering.
      if (err instanceof WormOverwriteError) {
        this.initialised = false;
        try {
          // ponytail: re-init is O(entries-list) per lost race with no
          // backoff — fine at single-writer/crash-safety scope; add
          // backoff if replicas ever race sustainedly.
          await this.init();
        } catch (healErr) {
          // Heal failed (store read error mid-outage). Surface the
          // ORIGINAL WormOverwriteError — it is the actionable failure
          // and callers key off its type. Writer stays uninitialised;
          // the next append reports init-required honestly. Emit via
          // the observability hook so operators see the degradation.
          if (this.onHealError) {
            try {
              this.onHealError(healErr);
            } catch {
              // Swallow callback errors so the original error surfaces.
            }
          }
        }
      }
      throw err;
    }
    this.seq = seq + 1;
    this.lastHash = hash;
    return record;
  }

  /**
   * Append a DSR erasure marker for the given user-hash + ticketId.
   *
   * PR-E4 (#134, Path B). The marker is an ordinary `OnigaeshiAuditEntry`
   * with `type: 'dsr.erasure'`, `actor: userHash` (HMAC-SHA-256 hex), and
   * `detail: { ticketId, keyId }`. Read-side consumers run
   * `applyOverlay()` from `audit-overlay.ts` to mask prior entries that
   * resolve to the same hash under the active key.
   *
   * Critically: the marker NEVER carries the raw userId — only the
   * keyed-HMAC hash. The `keyId` field anchors the marker to the key
   * version that produced the hash, so future readers can detect when a
   * marker was written under a now-rotated key (treated as opaque).
   *
   * The marker is hashed into the WORM chain via the same `append()`
   * path as every other entry — chain integrity (`verifyAuditIntegrity`)
   * is unaffected by erasure markers.
   */
  async appendDsrErasureMarker(input: AppendDsrErasureMarkerInput): Promise<WormAuditRecord> {
    // No up-front `initialised` check: the load-bearing guard lives in
    // doAppend() and is re-evaluated at queue-execution time, so a heal
    // that de-initialises the writer mid-queue is reported honestly.
    if (
      typeof input.userHash !== 'string' ||
      !DSR_USER_HASH_RE.test(input.userHash)
    ) {
      throw new Error(
        'appendDsrErasureMarker: userHash must be a 64-char lowercase hex string',
      );
    }
    if (
      typeof input.ticketId !== 'string' ||
      input.ticketId.length === 0 ||
      input.ticketId.length > DSR_TICKET_ID_MAX_LEN ||
      !DSR_TICKET_ID_RE.test(input.ticketId)
    ) {
      throw new Error(
        'appendDsrErasureMarker: ticketId must be a non-empty bounded id (1..128 chars, [a-z0-9._-])',
      );
    }
    if (typeof input.keyId !== 'string' || !DSR_KEY_ID_RE.test(input.keyId)) {
      throw new Error(
        'appendDsrErasureMarker: keyId must be a 12-char lowercase hex string',
      );
    }
    const timestamp = (input.now ? input.now() : this.now()).toISOString();
    const entry: OnigaeshiAuditEntry = Object.freeze({
      engagementId: 'dsr.erasure',
      type: 'dsr.erasure' as const,
      actor: input.userHash,
      targetModel: 'dsr.erasure',
      outcome: 'n/a' as const,
      timestamp,
      detail: Object.freeze({
        ticketId: input.ticketId,
        keyId: input.keyId,
      }),
    });
    return this.append(entry);
  }

  /**
   * Emit a Merkle-root anchor over all entries written since the last
   * anchor (or genesis). Callers should schedule this on an interval —
   * the authoritative contract is "hourly" per the plan, but the
   * scheduling is left to the caller.
   */
  async anchor(): Promise<WormAnchor> {
    const keys = await this.store.list(WORM_ENTRY_PREFIX);
    if (keys.length === 0) {
      throw new Error('WormAuditWriter.anchor: no entries to anchor');
    }
    const anchorKeys = await this.store.list(WORM_ANCHOR_PREFIX);
    let fromSeq = 0;
    if (anchorKeys.length > 0) {
      const lastAnchorBody = await this.store.get(
        anchorKeys[anchorKeys.length - 1],
      );
      if (lastAnchorBody) {
        const last = JSON.parse(lastAnchorBody) as WormAnchor;
        fromSeq = last.toSeq + 1;
      }
    }
    const hashes: string[] = [];
    let toSeq = fromSeq;
    for (const k of keys) {
      const s = parseSeqFromKey(k);
      if (s < fromSeq) continue;
      const body = await this.store.get(k);
      if (!body) continue;
      const rec = JSON.parse(body) as WormAuditRecord;
      hashes.push(rec.hash);
      if (rec.seq > toSeq) toSeq = rec.seq;
    }
    if (hashes.length === 0) {
      throw new Error(
        'WormAuditWriter.anchor: no new entries since last anchor',
      );
    }
    const merkleRoot = computeMerkleRoot(hashes);
    const writtenAt = this.now().toISOString();
    const anchor: WormAnchor = Object.freeze({
      fromSeq,
      toSeq,
      merkleRoot,
      writtenAt,
    });
    const anchorKey = `${WORM_ANCHOR_PREFIX}${writtenAt.replace(/[:.]/g, '-')}-${fromSeq}-${toSeq}.json`;
    await this.store.put(anchorKey, JSON.stringify(anchor));
    return anchor;
  }
}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

export type AuditIntegrityFailure =
  | { readonly kind: 'missing-entry'; readonly expectedSeq: number }
  | { readonly kind: 'out-of-order'; readonly seq: number }
  | { readonly kind: 'hash-mismatch'; readonly seq: number }
  | { readonly kind: 'chain-break'; readonly seq: number }
  | { readonly kind: 'anchor-mismatch'; readonly anchorFromSeq: number; readonly anchorToSeq: number }
  // Slice 3 cosign-side failures — only reported when `options.signer`
  // is supplied to `verifyAuditIntegrity`. Records without a
  // `cosignAttestationUri` are treated as legacy HMAC-only and skip the
  // cosign branch entirely so the 7-year retention horizon keeps
  // verifying.
  | { readonly kind: 'cosign-verify-failed'; readonly seq: number }
  | { readonly kind: 'cosign-binding-mismatch'; readonly seq: number }
  | { readonly kind: 'cosign-envelope-missing'; readonly seq: number }
  // Slice 3b: a cosign attestation whose signature verifies but whose
  // predicate omits a string `wormPayloadHash` cannot anchor to the WORM
  // record. Distinct from `cosign-binding-mismatch` (a present-but-wrong
  // hash = swap attack) so callers can tell a malformed predicate apart.
  | { readonly kind: 'cosign-binding-missing'; readonly seq: number }
  // Downstream-wiring slice (PROD-FLIP gate): the persisted Rekor inclusion
  // proof does not independently reconstruct (RFC 6962 Merkle path → root)
  // against the witnessed leaf in the bundle — a stripped / tampered / never-
  // witnessed proof. The cosign CLI adapter cannot catch this (it verifies the
  // private Rekor with `--insecure-ignore-tlog`).
  | { readonly kind: 'cosign-inclusion-proof-invalid'; readonly seq: number };

export interface AuditIntegrityReport {
  readonly ok: boolean;
  readonly entryCount: number;
  readonly anchorCount: number;
  readonly failures: readonly AuditIntegrityFailure[];
}

/**
 * Slice 3 verification options. When `signer` is supplied,
 * verifyAuditIntegrity ALSO verifies the cosign attestation for every
 * record that carries a `cosignAttestationUri`. Both the HMAC chain
 * AND the cosign verification must pass; either failure surfaces in
 * `failures` and flips `ok` to false. When `signer` is omitted (the
 * Slice 2b call shape), only the HMAC chain is verified — preserves
 * back-compat for callers that have not yet wired the signer.
 */
export interface VerifyAuditIntegrityOptions {
  readonly signer?: SignerPort;
  /**
   * Expected predicate-type URI passed to `signer.verify`. Defaults to
   * `ONIGAESHI_AUDIT_PREDICATE_TYPE` (the Onigaeshi `dojolm.audit/v1`
   * pin). Future predicate-version migrations bump the default; callers
   * pinning a specific version can override.
   */
  readonly predicateType?: string;
}

/**
 * Walk the entry chain from seq 0 up, recomputing the hash at each
 * step, and verify every anchored Merkle root against the live chain.
 * Returns an `AuditIntegrityReport` with `ok=false` on any discrepancy.
 *
 * Slice 3: when `options.signer` is supplied, ALSO verifies every
 * row's cosign attestation (predicate-type match + signature valid +
 * `predicate.wormPayloadHash === record.hash` binding). Both paths
 * must pass for `ok=true`. Rows without `cosignAttestationUri` skip
 * the cosign branch — legacy HMAC-only rows remain verifiable through
 * the 7-year SOC 2 retention horizon.
 */
export async function verifyAuditIntegrity(
  store: WormObjectStore,
  options?: VerifyAuditIntegrityOptions,
): Promise<AuditIntegrityReport> {
  const keys = await store.list(WORM_ENTRY_PREFIX);
  const failures: AuditIntegrityFailure[] = [];
  const records: WormAuditRecord[] = [];
  let expectedSeq = 0;
  let prevHash = ZERO_HASH;
  for (const key of keys) {
    const body = await store.get(key);
    if (!body) continue;
    let rec: WormAuditRecord;
    try {
      const parsed: unknown = JSON.parse(body);
      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        typeof (parsed as Record<string, unknown>)['seq'] !== 'number' ||
        typeof (parsed as Record<string, unknown>)['prevHash'] !== 'string' ||
        typeof (parsed as Record<string, unknown>)['hash'] !== 'string' ||
        typeof (parsed as Record<string, unknown>)['entry'] !== 'object' ||
        (parsed as Record<string, unknown>)['entry'] === null
      ) {
        failures.push({ kind: 'hash-mismatch', seq: expectedSeq });
        continue;
      }
      rec = parsed as WormAuditRecord;
    } catch {
      failures.push({ kind: 'hash-mismatch', seq: expectedSeq });
      continue;
    }
    if (rec.seq !== expectedSeq) {
      if (rec.seq > expectedSeq) {
        failures.push({ kind: 'missing-entry', expectedSeq });
      } else {
        failures.push({ kind: 'out-of-order', seq: rec.seq });
      }
      // Do not attempt to continue walking after a sequence break —
      // subsequent hashes would all mismatch.
      return {
        ok: false,
        entryCount: keys.length,
        anchorCount: 0,
        failures,
      };
    }
    const canon = canonicalJson({
      seq: rec.seq,
      prevHash: rec.prevHash,
      entry: rec.entry,
    });
    const computed = sha256Hex(canon);
    if (computed !== rec.hash) {
      failures.push({ kind: 'hash-mismatch', seq: rec.seq });
    }
    if (rec.prevHash !== prevHash) {
      failures.push({ kind: 'chain-break', seq: rec.seq });
    }

    // Slice 3 cosign cutover: when caller supplied a signer AND the
    // record carries a cosignAttestationUri, verify the embedded DSSE
    // envelope and re-check the binding (predicate.wormPayloadHash ===
    // record.hash). Records without a URI are treated as legacy
    // HMAC-only and skip the cosign branch entirely so the 7-year
    // retention horizon keeps verifying. Records with a URI but no
    // embedded envelope = Slice 2b legacy under strict verification =
    // reported as cosign-envelope-missing (so the caller can decide to
    // re-attest or accept the gap).
    if (options?.signer && rec.cosignAttestationUri !== undefined) {
      if (!rec.cosignEnvelope) {
        failures.push({ kind: 'cosign-envelope-missing', seq: rec.seq });
      } else {
        const expectedPredicateType =
          options.predicateType ?? ONIGAESHI_AUDIT_PREDICATE_TYPE;
        // Slice 3b: when the raw cosign bundle was persisted, hand the
        // verifier a VerifyContext = { bundle, subjectBytes } so the cosign
        // CLI adapter can run `verify-blob-attestation --bundle` offline.
        // `subjectBytes` are the exact bytes that were signed — the canonical
        // WORM-record bytes (`canon` above), whose sha256 IS `rec.hash`.
        // Records written before Slice 3b carry an envelope but no bundle:
        // pass no ctx (the in-process signer + envelope-only legacy still
        // verify; the real CLI adapter reports a verify failure, surfacing
        // the gap rather than a false pass).
        //
        // Defense in depth (review): only build a ctx from a well-formed,
        // bounded bundle. A present-but-empty or oversized cosignBundle
        // degrades to the envelope-only call (which the real CLI adapter
        // rejects, surfacing the gap) rather than handing garbage / an
        // unbounded write to the verifier. This protects non-CLI adapters
        // that lack the CLI adapter's own cap.
        const usableBundle =
          typeof rec.cosignBundle === 'string' &&
          rec.cosignBundle.length > 0 &&
          Buffer.byteLength(rec.cosignBundle, 'utf8') <= MAX_PERSISTED_BUNDLE_BYTES;
        const ctx = usableBundle
          ? {
              bundle: rec.cosignBundle as string,
              subjectBytes: Buffer.from(canon, 'utf8'),
            }
          : undefined;
        // SCOPE (B-14a Slice 3b + downstream-wiring slice) — the three tracked
        // verify-path follow-ups all landed in the downstream-wiring
        // slice:
        //  • Bushido mirror — signoff-store.ts now persists cosignBundle on
        //    AttestationRecord and passes the same VerifyContext.
        //  • Rekor inclusion-proof — independently re-verified just below
        //    (verifyRekorInclusionProof), since the CLI adapter verifies the
        //    private Rekor with --insecure-ignore-tlog.
        //  • Hardening — OnigaeshiAuditPredicate.wormPayloadHash is now required;
        //    CLI-adapter decodeVerifiedPredicate has mocked-execFile coverage.
        let predicate;
        try {
          predicate = await options.signer.verify(
            rec.cosignEnvelope,
            expectedPredicateType,
            ctx,
          );
        } catch {
          // SignerPort.verify is contracted to return null on failure
          // and never throw; defensive catch in case a third-party
          // adapter violates the contract — treat as verify failure.
          predicate = null;
        }
        if (predicate === null) {
          failures.push({ kind: 'cosign-verify-failed', seq: rec.seq });
        } else {
          // Slice 3b MED: type-guard the binding field before comparing. A
          // valid-signature attestation whose predicate lacks a string
          // `wormPayloadHash` cannot anchor to this record — distinct kind so
          // "malformed predicate" is not conflated with a swap attack.
          const wph = (predicate as { wormPayloadHash?: unknown }).wormPayloadHash;
          if (typeof wph !== 'string') {
            failures.push({ kind: 'cosign-binding-missing', seq: rec.seq });
          } else if (wph !== rec.hash) {
            // CRIT-1 binding check: a valid cosign attestation that
            // commits to a DIFFERENT WORM record hash is a swap attack.
            // Reject even when the signature itself verifies.
            failures.push({ kind: 'cosign-binding-mismatch', seq: rec.seq });
          }
        }
      }

      // Downstream-wiring slice (PROD-FLIP gate): independently re-verify the
      // persisted Rekor inclusion proof. cosign verified the private Rekor with
      // --insecure-ignore-tlog, so witnessing is NOT checked there — recompute
      // the RFC 6962 Merkle path → root from the leaf in the persisted bundle.
      // Called UNCONDITIONALLY (no `cosignInclusionProof !== undefined` guard):
      // a real witnessed bundle whose inclusion-proof field was stripped must
      // surface as `invalid`, not silently skip. `no-witness` (a stub /
      // pre-witness bundle with no real tlog leaf) is the only skip, mirroring
      // the legacy-row skip above.
      // Residual (accepted): `cosignBundle` is OUTSIDE the chained hash (by the
      // 7-year-retention back-compat design), so a store-write attacker could
      // strip the bundle's tlog material to force `no-witness`. In production the
      // WORM store's Object Lock (Compliance mode) precludes post-write tamper,
      // and the DSSE signature + the chain-bound CRIT-1 wormPayloadHash binding
      // still anchor the record. Binding the bundle into the chain is a tracked
      // follow-up, not this slice.
      const proofVerdict = verifyRekorInclusionProof(
        rec.cosignInclusionProof,
        rec.cosignBundle,
      );
      if (proofVerdict === 'invalid') {
        failures.push({ kind: 'cosign-inclusion-proof-invalid', seq: rec.seq });
      }
    }

    records.push(rec);
    prevHash = rec.hash;
    expectedSeq += 1;
  }

  const anchorKeys = await store.list(WORM_ANCHOR_PREFIX);
  for (const key of anchorKeys) {
    const body = await store.get(key);
    if (!body) continue;
    let anchor: WormAnchor;
    try {
      const parsed: unknown = JSON.parse(body);
      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        typeof (parsed as Record<string, unknown>)['fromSeq'] !== 'number' ||
        typeof (parsed as Record<string, unknown>)['toSeq'] !== 'number' ||
        typeof (parsed as Record<string, unknown>)['merkleRoot'] !== 'string'
      ) {
        // Malformed anchor — treat as anchor-mismatch with sentinel range.
        failures.push({ kind: 'anchor-mismatch', anchorFromSeq: -1, anchorToSeq: -1 });
        continue;
      }
      anchor = parsed as WormAnchor;
    } catch {
      failures.push({ kind: 'anchor-mismatch', anchorFromSeq: -1, anchorToSeq: -1 });
      continue;
    }
    const slice = records.filter(
      (r) => r.seq >= anchor.fromSeq && r.seq <= anchor.toSeq,
    );
    const computed = computeMerkleRoot(slice.map((r) => r.hash));
    if (computed !== anchor.merkleRoot) {
      failures.push({
        kind: 'anchor-mismatch',
        anchorFromSeq: anchor.fromSeq,
        anchorToSeq: anchor.toSeq,
      });
    }
  }

  return {
    ok: failures.length === 0,
    entryCount: records.length,
    anchorCount: anchorKeys.length,
    failures,
  };
}
