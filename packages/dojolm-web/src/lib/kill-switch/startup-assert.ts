// SPDX-License-Identifier: Apache-2.0
/**
 * YR.13.4 — single-worker startup constraint.
 *
 * Several modules carry in-process state that cannot propagate across
 * workers; firing a signal or recording a rate-limit hit in worker A
 * would NOT reach sibling worker B. Refuse to boot if `WEB_WORKERS > 1`
 * so an operator who edits the deploy compose file without reading the
 * runbook gets a hard failure rather than a silent split-brain.
 *
 * Consumers of the single-worker constraint (YR.14.3 sec M-2 fold-in
 * tracks the full list — keep in sync as new in-process state lands):
 *  - Kill-switch registry (`bu-tpi/flags`) — YR.13.4 (this file's primary motivation)
 *  - Validation-run rate-limit ledger (`lib/validation-rate-limit.ts`) — YR.14.3
 *  - Per-operator export rate-limit Map (`/api/admin/validation/export/[runId]`) — YR.14.3
 *
 * Runbook: `deploy/runbooks/kill-switch-multi-worker.md`.
 *
 * Drop this file when ALL listed consumers migrate to a Redis-backed
 * (or otherwise cross-worker) transport.
 */

const ENV_KEY = 'WEB_WORKERS';

export function assertSingleWorkerOrThrow(): void {
  const raw = process.env[ENV_KEY];
  if (raw === undefined || raw === '') return;
  const n = Number.parseInt(raw, 10);
  // Non-finite values (e.g., 'abc') are treated as unset — operators will
  // see them in startup logs via the deploy runbook's pre-flight checks.
  if (!Number.isFinite(n)) return;
  // Exactly 1 is the only supported worker count. `0` is rejected because
  // it is a misconfiguration (Docker Compose may treat it as "default" in
  // some runtimes, masking a multi-worker spawn). Anything > 1 is rejected
  // because the in-process registry cannot propagate.
  if (n === 1) return;
  throw new Error(
    `[single-worker] ${ENV_KEY}=${raw} is unsupported. The kill-switch ` +
    `registry, validation-run rate-limit ledger, and per-operator export ` +
    `rate-limit are all in-process and do not propagate across workers; ` +
    `only ${ENV_KEY}=1 or unset is supported. Migrate every listed ` +
    `consumer to a Redis-backed (or otherwise cross-worker) transport ` +
    `before raising this value (see ` +
    `deploy/runbooks/kill-switch-multi-worker.md).`,
  );
}
