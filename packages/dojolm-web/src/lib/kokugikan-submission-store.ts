/**
 * File: kokugikan-submission-store.ts
 * Purpose: Phase-3-A — append-only JSONL store for Bushido bypass-rate
 * submissions, replacing the in-memory `DEV_SUBMISSIONS = []` fixture at
 * /api/admin/eval/leaderboard.
 *
 * Spec: Industry-Tools-Parity §Gap 13.7 line 1019 (kokugikan.ts).
 *
 * Storage shape: one JSONL row per submission at
 *   `<TPI_DATA_DIR or cwd/data>/kokugikan/submissions.jsonl`.
 * Each line is a `KokugikanSubmissionRecord`. Appends use `fs.appendFile`
 * — the same atomic single-write pattern the audit logger relies on
 * (rows are < 1 KB so the POSIX page-atomicity guarantee applies).
 *
 * R-T1 (closed enums, defense-in-depth):
 *   - `refusalClass` is narrowed to the 5-value `RefusalClass` enum on
 *     ingest and on read; unknown values are rejected (ingest) or
 *     dropped (read).
 *   - All three ids (`id`, `techniqueId`, `modelId`) are validated
 *     against the same filename-safe `ID_PATTERN` used by
 *     `bu-tpi/catalog/bypass-rate.ts` — defense-in-depth for any caller
 *     that might bypass server-side Zod (e.g. retention scripts,
 *     direct-write tools).
 *
 * proofRef? (E1-PHASE-4-M1 slice 2, additive — §9 carve-out):
 *   An optional `proofRef` on `KokugikanSubmissionRecord` points to a row id in
 *   the co-located `signed-runs.jsonl` store (`signed-runs-store.ts`), letting a
 *   submission reference a cosign-attestable `dojolm.eval/v1` run. It is
 *   validated by the SAME `assertSafeId` / `ID_PATTERN` as the ids — the grammar
 *   is byte-identical to the signed-runs store's row-id grammar, so any accepted
 *   `proofRef` is a valid `readSignedRunById(proofRef)` key. The key is OMITTED
 *   from the persisted row when absent, so legacy 5-field rows + proof-less rows
 *   stay byte-identical (no migration). Referential existence is intentionally
 *   NOT enforced on write (a submission may precede its signed run; a dangling
 *   ref resolves to null at read time and the consumer decides how to render
 *   it). `readAllSubmissions` does NOT surface `proofRef` — the §9-frozen
 *   `BypassSubmission` leaderboard projection is unchanged.
 *
 *   NOTE (slice boundary): slice 2 adds the field + store-side validation ONLY.
 *   `proofRef` is accepted by `appendSubmission` but is NOT yet wired from the
 *   HTTP route — the submission route's Zod schema is `.strict()` and omits it,
 *   so today `proofRef` is reachable only by direct/internal callers (retention
 *   scripts, tests). Slice 3 adds the wire ingest + cosign-attest step.
 *
 * Public API:
 *   - `appendSubmission(input)` — validates + appends, returns the
 *     persisted record.
 *   - `readAllSubmissions()` — full-file scan, returns the rows in the
 *     shape `buildBypassMatrix` consumes (drops the `id` +
 *     `submittedAt` fields the aggregator does not use).
 */

import { appendFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { getDataPath } from '@/lib/runtime-paths';
import type { BypassSubmission } from 'bu-tpi/catalog';

export const REFUSAL_CLASSES = [
  'compliant',
  'partial',
  'soft-refuse',
  'hard-refuse',
  'error',
] as const satisfies readonly BypassSubmission['refusalClass'][];

export type RefusalClass = (typeof REFUSAL_CLASSES)[number];

const REFUSAL_CLASS_SET: ReadonlySet<string> = new Set(REFUSAL_CLASSES);

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/;
const RESERVED_PROTO_IDS = new Set(['constructor', 'prototype', '__proto__']);

const SUBMISSIONS_FILENAME = 'submissions.jsonl';
const SUBMISSIONS_SUBDIR = 'kokugikan';

export interface KokugikanSubmissionRecord {
  readonly id: string;
  readonly techniqueId: string;
  readonly modelId: string;
  readonly refusalClass: RefusalClass;
  readonly submittedAt: string;
  /**
   * Additive (E1-PHASE-4-M1 slice 2): row id in the co-located
   * `signed-runs.jsonl` store this submission's cosign-attestable
   * `dojolm.eval/v1` run was recorded under. Optional + omitted when absent so
   * legacy 5-field rows stay byte-identical. Always a valid
   * `readSignedRunById` key (shares `ID_PATTERN` with the signed-runs store).
   */
  readonly proofRef?: string;
}

export interface AppendSubmissionInput {
  readonly id: string;
  readonly techniqueId: string;
  readonly modelId: string;
  readonly refusalClass: string;
  readonly submittedAt?: string;
  /**
   * Optional signed-run row id (see `KokugikanSubmissionRecord.proofRef`).
   * Shape-aligned to the SDK's forward-declared `SubmissionInput.proofRef?`.
   * Validated by `assertSafeId` on append; omitted from the row when undefined.
   */
  readonly proofRef?: string;
}

function submissionsPath(): string {
  return getDataPath(SUBMISSIONS_SUBDIR, SUBMISSIONS_FILENAME);
}

function assertSafeId(raw: unknown, field: string): string {
  if (typeof raw !== 'string') {
    throw new TypeError(`${field} must be a string`);
  }
  // Error messages deliberately omit the raw value so an upstream caller that
  // logs the exception cannot leak attacker-controlled input (parity with
  // signed-runs-store's assertSafeId; §9 carve-out extended 2026-05-29 to cover
  // this defense-in-depth hardening alongside the additive proofRef field).
  if (!ID_PATTERN.test(raw)) {
    throw new Error(`${field} is not filename-safe`);
  }
  if (RESERVED_PROTO_IDS.has(raw)) {
    throw new Error(`${field} is a reserved prototype name`);
  }
  return raw;
}

function assertRefusalClass(raw: unknown): RefusalClass {
  if (typeof raw !== 'string' || !REFUSAL_CLASS_SET.has(raw)) {
    throw new Error(
      `refusalClass must be one of ${REFUSAL_CLASSES.join(',')}`,
    );
  }
  return raw as RefusalClass;
}

function assertIsoTimestamp(raw: unknown): string {
  if (typeof raw !== 'string') {
    throw new TypeError('submittedAt must be a string');
  }
  const parsed = Date.parse(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error('submittedAt is not a valid ISO 8601 timestamp');
  }
  return raw;
}

/**
 * Validate + append a single submission. Throws on invalid input
 * (caller — typically a route handler that already ran Zod — is
 * expected to surface the error as a 4xx).
 */
export async function appendSubmission(
  input: AppendSubmissionInput,
): Promise<KokugikanSubmissionRecord> {
  const base: Omit<KokugikanSubmissionRecord, 'proofRef'> = {
    id: assertSafeId(input.id, 'id'),
    techniqueId: assertSafeId(input.techniqueId, 'techniqueId'),
    modelId: assertSafeId(input.modelId, 'modelId'),
    refusalClass: assertRefusalClass(input.refusalClass),
    submittedAt:
      input.submittedAt === undefined
        ? new Date().toISOString()
        : assertIsoTimestamp(input.submittedAt),
  };
  // Additive proofRef? — omit the key entirely when absent so legacy +
  // proof-less rows serialize byte-for-byte to the original 5-field shape. When
  // present it reuses the SAME `assertSafeId` grammar the signed-runs store uses
  // for a row id, so the persisted value is always a valid
  // `readSignedRunById(proofRef)` key. Referential existence is not checked here
  // (see the file header).
  const record: KokugikanSubmissionRecord =
    input.proofRef === undefined
      ? base
      : { ...base, proofRef: assertSafeId(input.proofRef, 'proofRef') };
  const filePath = submissionsPath();
  await mkdir(path.dirname(filePath), { recursive: true });
  const line = JSON.stringify(record) + '\n';
  await appendFile(filePath, line, { encoding: 'utf-8' });
  return record;
}

/**
 * Read every persisted submission row and project it to the shape
 * `buildBypassMatrix` consumes. Missing file → empty array (cold-start
 * matches the pre-Phase-3-A DEV_SUBMISSIONS=[] behaviour).
 *
 * Malformed rows are dropped with a dev-mode `console.warn` and do not
 * break the read — same defensive posture as the bypass-matrix client
 * `validateMatrix`.
 */
export async function readAllSubmissions(): Promise<readonly BypassSubmission[]> {
  const filePath = submissionsPath();
  let raw: string;
  try {
    raw = await readFile(filePath, 'utf-8');
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      'code' in err &&
      (err as NodeJS.ErrnoException).code === 'ENOENT'
    ) {
      return [];
    }
    throw err;
  }
  const out: BypassSubmission[] = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn(
          '[kokugikan-submission-store] dropped non-JSON row',
          trimmed,
        );
      }
      continue;
    }
    if (parsed === null || typeof parsed !== 'object') continue;
    const rec = parsed as Record<string, unknown>;
    if (
      typeof rec.techniqueId !== 'string' ||
      typeof rec.modelId !== 'string' ||
      typeof rec.refusalClass !== 'string' ||
      !ID_PATTERN.test(rec.techniqueId) ||
      !ID_PATTERN.test(rec.modelId) ||
      RESERVED_PROTO_IDS.has(rec.techniqueId) ||
      RESERVED_PROTO_IDS.has(rec.modelId) ||
      !REFUSAL_CLASS_SET.has(rec.refusalClass)
    ) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn(
          '[kokugikan-submission-store] dropped invalid row',
          trimmed,
        );
      }
      continue;
    }
    out.push({
      techniqueId: rec.techniqueId,
      modelId: rec.modelId,
      refusalClass: rec.refusalClass as RefusalClass,
    });
  }
  return out;
}
