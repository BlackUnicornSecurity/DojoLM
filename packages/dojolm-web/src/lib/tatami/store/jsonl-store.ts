// SPDX-License-Identifier: Apache-2.0
/**
 * tatami/store/jsonl-store — append-only JSONL proof store (OSS, Epic 1 / PR-3).
 *
 * Persists `TatamiProof` rows in a PRIVATE 0o700 leaf dir this store OWNS,
 * mirroring scan-runs/jsonl-store (founder-fired Rule-15 layout):
 *   - validate-BEFORE-write with `isTatamiProof`; reject rows over MAX_ROW_BYTES
 *     (append-atomicity bound);
 *   - validate-ON-read with the same guard, dropping (and counting) malformed
 *     rows rather than throwing;
 *   - **B5 — `getById`/`list` are org-scoped; a proof owned by a different org is
 *     never returned.**
 *
 * Append is kept cheap (no compaction-to-cap): Tatami retention is record-level
 * (retentionClass / legalHold) and lives in the dry-run sweeper (`../retention`),
 * not on the write path.
 */

import { appendFile, chmod, mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getDataPath } from '@/lib/runtime-paths';
import { planProofErasure } from '../erasure';
import { isTatamiProof, type TatamiProof } from '../types';
import {
  matchesProofFilter,
  toProofSummary,
  type TatamiEraseOptions,
  type TatamiEraseResult,
  type TatamiProofListFilter,
  type TatamiProofPage,
  type TatamiProofRetentionSource,
  type TatamiProofStore,
} from './types';

const LEAF_DIR = 'tatami';
const FILENAME = 'proofs.jsonl';
export const MAX_ROW_BYTES = 262_144; // 256 KiB

/**
 * Exported for the P2.5 health collector (`lib/tatami/health`) so the disk-usage
 * metric reads the SAME leaf dir + filename this store owns — single-sourced here,
 * never re-typed at the call site (a rename can't silently drift the metric).
 */
export const STORE_LEAF_DIR = LEAF_DIR;
export const PROOFS_FILENAME = FILENAME;

/**
 * HC-2.C Lane B (Infra-2) — module-level once-flag for the multi-worker
 * footgun warning. Emitted at the FIRST construction of a jsonl store in
 * a process where the runtime concurrency hint (`WEB_CONCURRENCY`) is > 1
 * AND `TATAMI_STORE` is jsonl (or unset → jsonl is the default).
 *
 * Why a warn (not an assert): a hard assert would break dev / preview /
 * test workflows that happen to run on a clustered Node entrypoint with
 * jsonl as the default. The single-instance topology
 * (WONTFIX by design) is the documented invariant; this
 * warn surfaces it loudly in container logs the moment the assumption is
 * actually violated, without breaking unrelated work. Replicas → swap to
 * the EE postgres-backed store before flipping WEB_CONCURRENCY.
 */
let MULTI_WORKER_WARNED = false;
function warnIfMultiWorkerJsonl(): void {
  if (MULTI_WORKER_WARNED) return;
  const concurrency = Number.parseInt(process.env.WEB_CONCURRENCY ?? '', 10);
  if (!Number.isFinite(concurrency) || concurrency <= 1) return;
  const store = (process.env.TATAMI_STORE ?? 'jsonl').toLowerCase();
  if (store !== 'jsonl') return;
  MULTI_WORKER_WARNED = true;
  console.warn(
    `[tatami] JsonlTatamiProofStore is single-instance ONLY (WEB_CONCURRENCY=${concurrency}). `
    + 'Concurrent appendFile/rewrite from multiple workers loses writes. '
    + 'Set TATAMI_STORE to a multi-process-safe backend before scaling.',
  );
}

export class JsonlTatamiProofStore implements TatamiProofStore, TatamiProofRetentionSource {
  constructor() {
    warnIfMultiWorkerJsonl();
  }

  private droppedRows = 0;
  /**
   * HC-2.C Lane A (Infra-1) — process-lifetime flag for the lazy boot-time
   * sweep of any stale `proofs.jsonl.rewrite` left by a SIGKILL/oom-kill
   * mid-rewrite. Done ONCE per process on the first `dirPath()` call so the
   * next eraseByIds writes its temp to a clean slot AND any external rsync /
   * backup cron that globs `proofs.jsonl*` doesn't pick up a partial file.
   * ENOENT swallowed (the common case).
   */
  private bootSweptStaleTemp = false;

  private async dirPath(): Promise<string> {
    // getDataPath is path-traversal-guarded — never hand-join TPI_DATA_DIR.
    const dir = getDataPath(LEAF_DIR);
    await mkdir(dir, { recursive: true, mode: 0o700 });
    // mkdir mode is umask-subject; chmod makes the contract deterministic.
    await chmod(dir, 0o700);
    if (!this.bootSweptStaleTemp) {
      this.bootSweptStaleTemp = true;
      try {
        await unlink(join(dir, `${FILENAME}.rewrite`));
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
      }
    }
    return dir;
  }

  private async filePath(): Promise<string> {
    return join(await this.dirPath(), FILENAME);
  }

  async put(proof: TatamiProof): Promise<void> {
    if (!isTatamiProof(proof)) {
      throw new Error('tatami proof failed validation before write');
    }
    const row = `${JSON.stringify(proof)}\n`;
    if (Buffer.byteLength(row, 'utf8') > MAX_ROW_BYTES) {
      throw new Error(`tatami proof row exceeds ${MAX_ROW_BYTES} bytes`);
    }
    const file = await this.filePath();
    await appendFile(file, row, { encoding: 'utf8', mode: 0o600 });
    // appendFile's create-mode is umask-subject; chmod makes the file contract
    // deterministic (same posture as the 0o700 dir) and keeps it owner-writable.
    await chmod(file, 0o600);
  }

  private async readAll(): Promise<TatamiProof[]> {
    let raw: string;
    try {
      raw = await readFile(await this.filePath(), 'utf8');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw err;
    }
    const out: TatamiProof[] = [];
    for (const line of raw.split('\n')) {
      if (line.trim().length === 0) continue;
      try {
        const parsed: unknown = JSON.parse(line);
        if (isTatamiProof(parsed)) {
          out.push(parsed);
        } else {
          this.recordDroppedRow('schema');
        }
      } catch {
        this.recordDroppedRow('json');
      }
    }
    return out;
  }

  /**
   * HC-2.C Lane A (SRE-3) — surface dropped rows to ops. The
   * `droppedRows` counter is in-memory and process-lifetime; pre-fix this
   * was silent on read. The P1.9 guard tightening (modelRef / providerRef
   * shape, looksLikeSecret backstop, configSnapshot bounds) means a buggy
   * adapter that emits malformed optional fields loses rows on read with
   * no signal. One warn per drop is the lightest observable change that
   * lets `grep '[tatami] dropped invalid proof row'` work in container
   * logs. The `reason` tag lets ops split JSON-parse failures from
   * schema-guard failures.
   */
  private recordDroppedRow(reason: 'json' | 'schema'): void {
    this.droppedRows += 1;
    console.warn(`[tatami] dropped invalid proof row (reason=${reason}; lifetime=${this.droppedRows})`);
  }

  async getById(orgId: string, id: string): Promise<TatamiProof | null> {
    const all = await this.readAll();
    for (let i = all.length - 1; i >= 0; i -= 1) {
      const p = all[i];
      // B5 — both id AND org must match; a cross-org id never leaks.
      if (p.id === id && p.orgId === orgId) return p;
    }
    return null;
  }

  async getByIds(orgId: string, ids: readonly string[]): Promise<readonly TatamiProof[]> {
    if (ids.length === 0) return [];
    // ONE readAll() resolves the WHOLE batch — never a readAll per id (the N+1 fix).
    // B5 — id ∈ requested set AND org must match; a cross-org id never leaks.
    const wanted = new Set(ids);
    return (await this.readAll()).filter((p) => p.orgId === orgId && wanted.has(p.id));
  }

  async list(
    orgId: string,
    opts: { limit: number; before?: string } & TatamiProofListFilter,
  ): Promise<TatamiProofPage> {
    // B5 org-scope + the closed P1.2 filter, then newest-first (file order is append
    // order). Filter BEFORE the cursor so nextCursor stays correct over the filtered
    // set. Spread before reverse — never mutate (immutability is a hard project rule).
    const scoped = (await this.readAll()).filter(
      (p) => p.orgId === orgId && matchesProofFilter(p, opts),
    );
    const newestFirst = [...scoped].reverse();
    let start = 0;
    if (opts.before !== undefined) {
      const i = newestFirst.findIndex((p) => p.id === opts.before);
      start = i === -1 ? 0 : i + 1;
    }
    const limit = Math.max(1, Math.min(100, opts.limit));
    const page = newestFirst.slice(start, start + limit);
    // S6 — nextCursor = the last row's id when rows remain past this page, else null.
    // (page is empty only when start ≥ length, where the condition is false ⇒ null.)
    const nextCursor = start + page.length < newestFirst.length ? page[page.length - 1].id : null;
    return { items: page.map(toProofSummary), nextCursor };
  }

  /** Retention-only global read (NOT org-scoped) — see TatamiProofRetentionSource. */
  async listAllForRetention(): Promise<readonly TatamiProof[]> {
    return this.readAll();
  }

  /**
   * P1.7 / F7 ENFORCE — operator erase via atomic rewrite (the first non-append
   * path on this store). Sequence: read-all → split into kept/erased → write a
   * temp sibling in the SAME 0o700 leaf dir → fsync-on-write → atomic `rename`
   * over `proofs.jsonl` → re-`chmod 0o600`. The temp file lives in the same dir
   * so `rename` is same-filesystem (atomic) and inherits the 0o700 directory
   * mode. On failure mid-flight the temp is unlinked and the original is
   * untouched.
   *
   * ⚠ Single-instance concurrency. There is no file lock today; a concurrent
   * `appendFile` from another worker could land BETWEEN our `readAll` and our
   * `rename` and be lost. The single-instance topology
   * (WONTFIX by design) makes this acceptable for the SaaS
   * cut; if multi-process replicas are introduced, this writer needs a flock
   * or a write-ahead tombstone log.
   *
   * B5 — only proofs whose `orgId` matches are eligible for removal; other
   * orgs' rows are written back to disk untouched. Held proofs (legalHold or
   * `legal_hold` class) are NEVER removed — that's enforced by
   * `planProofErasure`'s gate.
   *
   * HC-2.C Lane B (SRE-2) — soft store-size ceiling. The rewrite materialises
   * the FULL kept set as one in-memory string before `writeFile`. Worst case
   * = N rows × {@link MAX_ROW_BYTES} (256 KiB); at the documented soft cap
   * of ~10k rows the working set is single-digit MB. Beyond that, swap to
   * a streaming rewrite (open temp / pipe filtered readAll iterator / close)
   * before the rewrite latency / heap pressure becomes operationally
   * relevant. Today's call sites (DSR + retention sweep) operate on bounded
   * batches and never approach the ceiling.
   */
  async eraseByIds(
    orgId: string,
    ids: readonly string[],
    opts: TatamiEraseOptions,
  ): Promise<TatamiEraseResult> {
    const wanted = new Set(ids);
    const all = await this.readAll();
    const resolved = all.filter((p) => p.orgId === orgId && wanted.has(p.id));
    const { audit } = planProofErasure(resolved, {
      orgId,
      erasureKind: opts.erasureKind,
      requestedIds: ids,
      requestedAt: opts.requestedAt,
      ...(opts.requestedBy !== undefined ? { requestedBy: opts.requestedBy } : {}),
      ...(opts.reason !== undefined ? { reason: opts.reason } : {}),
    });
    // Nothing to do — skip the rewrite entirely (read-only path, no temp file).
    if (audit.erasedIds.length === 0) {
      return {
        erased: audit.erasedIds,
        blockedLegalHold: audit.blockedLegalHoldIds,
        audit,
      };
    }
    const erasedSet = new Set(audit.erasedIds);
    const kept = all.filter((p) => !(p.orgId === orgId && erasedSet.has(p.id)));
    const dir = await this.dirPath();
    const finalPath = join(dir, FILENAME);
    // Temp filename: stable per-call, NO clock/random (project rule against
    // wall-clock IDs in shared paths). `proofs.jsonl.rewrite` is a single fixed
    // sibling — the rewrite path is single-instance (see invariant above), so a
    // collision-free deterministic name is sufficient; a prior crashed rewrite
    // is unconditionally overwritten by `writeFile`.
    const tempPath = `${finalPath}.rewrite`;
    const payload = kept.map((p) => `${JSON.stringify(p)}\n`).join('');
    try {
      await writeFile(tempPath, payload, { encoding: 'utf8', mode: 0o600 });
      await chmod(tempPath, 0o600);
      await rename(tempPath, finalPath);
      await chmod(finalPath, 0o600);
    } catch (err) {
      // Best-effort cleanup; swallow only ENOENT (the temp may not exist).
      try {
        await unlink(tempPath);
      } catch (cleanupErr) {
        if ((cleanupErr as NodeJS.ErrnoException).code !== 'ENOENT') throw cleanupErr;
      }
      throw err;
    }
    return {
      erased: audit.erasedIds,
      blockedLegalHold: audit.blockedLegalHoldIds,
      audit,
    };
  }

  getDroppedRowCount(): number {
    return this.droppedRows;
  }
}
