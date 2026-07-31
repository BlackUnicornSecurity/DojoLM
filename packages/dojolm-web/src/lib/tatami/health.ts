// SPDX-License-Identifier: Apache-2.0
/**
 * tatami/health — dev-store disk + retention health for the Tatami evidence store
 * (OSS, P2.5 / F-SRE F11: "filesystem store grows unbounded → make growth observable").
 *
 * Reports COUNTS + BYTES only — it never echoes a proof/case body, id, org, or
 * operator (the same counts-only posture as the retention sweeper). Read by the admin
 * `GET /api/admin/tatami/health` endpoint.
 *
 * Reads the on-disk leaf dir DIRECTLY (not via the store singleton): the metric is a
 * physical disk view, and reading the filesystem keeps it identical under the jsonl
 * store (prod) and in a test that writes `*.jsonl` to a temp `TPI_DATA_DIR` — with no
 * dependency on which `TATAMI_STORE` backend the process selected. The leaf dir +
 * filenames are imported from the stores (single-sourced — a rename can't drift this).
 *
 * Semantics, stated honestly:
 *   - `proofs` / `cases`  — DISTINCT valid rows (parsed, type-guarded, de-duplicated
 *     by id; cases are append-versioned upserts, so the on-disk line count exceeds the
 *     distinct count — we report the distinct count an operator means by "cases").
 *   - `storeBytes` / `files` — PHYSICAL bytes of every `*.jsonl` in the leaf dir
 *     (the actual disk consumption, including not-yet-compacted case versions and any
 *     malformed rows). This is the growth signal F11 cares about.
 *   - `wouldExpire` — the dry-run retention sweep's eligible count over the same
 *     parsed proof set (deletes nothing; see `./retention`).
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { getDataPath } from '@/lib/runtime-paths';
import { evaluateTatamiRetention, loadTatamiRetentionConfig } from './retention';
import { isTatamiCase, isTatamiProof, type TatamiProof } from './types';
import { CASES_FILENAME } from './store/case-jsonl-store';
import { PROOFS_FILENAME, STORE_LEAF_DIR } from './store/jsonl-store';

const JSONL_SUFFIX = '.jsonl';

export interface TatamiStoreFile {
  readonly name: string;
  readonly bytes: number;
}

export interface TatamiStoreHealth {
  /** Distinct valid proofs on disk. */
  readonly proofs: number;
  /** Distinct valid cases on disk (de-duplicated by id across append-versioned upserts). */
  readonly cases: number;
  /** Physical bytes of every `*.jsonl` in the leaf dir. */
  readonly storeBytes: number;
  /** Dry-run retention: proofs whose class TTL has expired and are not held. */
  readonly wouldExpire: number;
  /** Per-file physical byte breakdown (sorted by name). */
  readonly files: readonly TatamiStoreFile[];
}

/** Read a file, treating "not there yet" (ENOENT) as empty rather than an error. */
async function readOrNull(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
}

/** Parse + type-guard + de-duplicate proof rows by id (last write wins — proofs are
 *  immutable, so this only guards against an accidental duplicate row). */
function parseDistinctProofs(raw: string | null): TatamiProof[] {
  if (raw === null) return [];
  const byId = new Map<string, TatamiProof>();
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (isTatamiProof(parsed)) byId.set(parsed.id, parsed);
    } catch {
      // Malformed row — counts toward storeBytes (it's on disk) but not the logical count.
    }
  }
  return [...byId.values()];
}

/** Count DISTINCT valid case ids (append-versioned upserts repeat an id on disk). */
function countDistinctCases(raw: string | null): number {
  if (raw === null) return 0;
  const ids = new Set<string>();
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (isTatamiCase(parsed)) ids.add(parsed.id);
    } catch {
      // Malformed row — physical-only, see above.
    }
  }
  return ids.size;
}

/**
 * Collect store health. `now` is injectable (deterministic retention eval in tests).
 * Never throws on an absent store dir/files — a fresh deployment that has captured
 * nothing reports all-zero, not a 500.
 */
export async function collectTatamiStoreHealth(now: Date = new Date()): Promise<TatamiStoreHealth> {
  const dir = getDataPath(STORE_LEAF_DIR);

  // Physical bytes over every *.jsonl (skip the `.rewrite` temp + any non-jsonl).
  // Dir absent (nothing captured yet) → empty, not an error.
  let entries: string[] = [];
  try {
    entries = await readdir(dir);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }
  const files: TatamiStoreFile[] = [];
  let storeBytes = 0;
  for (const name of [...entries].sort()) {
    if (!name.endsWith(JSONL_SUFFIX)) continue;
    try {
      const s = await stat(join(dir, name));
      if (!s.isFile()) continue;
      files.push({ name, bytes: s.size });
      storeBytes += s.size;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }
  }

  const proofs = parseDistinctProofs(await readOrNull(join(dir, PROOFS_FILENAME)));
  const cases = countDistinctCases(await readOrNull(join(dir, CASES_FILENAME)));
  const wouldExpire = evaluateTatamiRetention(proofs, loadTatamiRetentionConfig(), now).eligible;

  return { proofs: proofs.length, cases, storeBytes, wouldExpire, files };
}
