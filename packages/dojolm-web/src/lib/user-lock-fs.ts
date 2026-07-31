// SPDX-License-Identifier: Apache-2.0
/**
 * File: user-lock-fs.ts
 * Purpose: Filesystem-level mutex for per-user load-modify-write
 *          handlers, used to extend the in-process `withUserLock`
 *          (`api-session.ts`) into horizontally-scaled deployments.
 *          Activated only when `TPI_FILE_LOCK=1`; otherwise the
 *          existing in-process queue is sufficient.
 *
 * Story: WAVE4-PER-USER-POST-FILELOCK / ADR-0040.
 *
 * Algorithm: atomic create-with-exclusive-flag on a lockfile under
 * `<TPI_DATA_DIR>/locks/<namespace>/<userId>.lock`. If the file
 * exists, sleep with exponential backoff and retry. A lockfile
 * older than `STALE_LOCK_AGE_MS` is treated as stale and
 * unlinked before the next retry — defends against a process
 * crash mid-handler that leaves an orphan lock.
 *
 * No external dependency (`proper-lockfile` would be one but is
 * not justified for the current write rate). The atomic-create
 * primitive (`O_CREAT|O_EXCL` via `'wx'` flag) is provided by
 * POSIX and Windows alike.
 *
 * Failure mode: every I/O surface has a defensive fallback. If
 * the lock-directory cannot be created, the wrapper falls
 * through and runs `fn` unprotected (logged once). The
 * in-process lock from `withUserLock` still applies.
 */

import { open, unlink, stat, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { getDataPath } from '@/lib/runtime-paths'
import { fsLockContentionsTotal } from '@/lib/metrics/registry'

const ENV_VAR = 'TPI_FILE_LOCK'
const STALE_LOCK_AGE_MS = 30_000
const MAX_WAIT_MS = 10_000
const INITIAL_BACKOFF_MS = 25
const MAX_BACKOFF_MS = 500

const NAMESPACE_PATTERN = /^[A-Za-z0-9_-]{1,40}$/
const USER_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/

export function isFsLockingEnabled(): boolean {
  return process.env[ENV_VAR] === '1'
}

function lockFile(namespace: string, userId: string): string {
  return getDataPath('locks', namespace, `${userId}.lock`)
}

async function ensureLockDir(file: string): Promise<boolean> {
  const dir = path.dirname(file)
  if (existsSync(dir)) return true
  try {
    await mkdir(dir, { recursive: true })
    return true
  } catch (err) {
    console.error('[user-lock-fs] mkdir failed (falling back to in-process lock only):',
      err instanceof Error ? err.message : 'unknown')
    return false
  }
}

async function tryAcquire(file: string, namespace: string): Promise<boolean> {
  try {
    const handle = await open(file, 'wx')
    await handle.writeFile(`${process.pid}\n${Date.now()}\n`)
    await handle.close()
    return true
  } catch (err) {
    if (err instanceof Error && 'code' in err && (err as { code?: string }).code === 'EEXIST') {
      // Wave 6 metrics — one contention bump per failed acquire. A
      // single `withFsUserLock` call may bump this multiple times
      // across its retry loop; that is the intended signal (higher
      // values mean higher total retry pressure).
      fsLockContentionsTotal.inc({ namespace })
      return false
    }
    throw err
  }
}

async function clearIfStale(file: string): Promise<void> {
  try {
    const stats = await stat(file)
    if (Date.now() - stats.mtimeMs > STALE_LOCK_AGE_MS) {
      await unlink(file)
    }
  } catch {
    // Either the file vanished (another contender released it) or
    // the stat failed transiently — both are safe to ignore.
  }
}

function backoffSleep(attempt: number): Promise<void> {
  const ms = Math.min(MAX_BACKOFF_MS, INITIAL_BACKOFF_MS * 2 ** attempt)
  // Add a tiny jitter to avoid thundering-herd retries.
  const jittered = ms * (0.85 + Math.random() * 0.3)
  return new Promise((resolve) => setTimeout(resolve, jittered))
}

/**
 * Run `fn` while holding the per-user filesystem lock at
 * `<TPI_DATA_DIR>/locks/<namespace>/<userId>.lock`. Always
 * releases the lock — including on `fn` throwing. If the lock
 * cannot be acquired within `MAX_WAIT_MS`, runs `fn` anyway
 * (the in-process lock from `withUserLock` is the safety net)
 * and logs the contention.
 *
 * Caller must validate `namespace` and `userId` before invoking;
 * this wrapper additionally re-validates and falls back to
 * `fn()` unprotected on any malformed input.
 */
export async function withFsUserLock<T>(
  namespace: string,
  userId: string,
  fn: () => Promise<T>,
): Promise<T> {
  if (!NAMESPACE_PATTERN.test(namespace) || !USER_ID_PATTERN.test(userId)) {
    return fn()
  }
  const file = lockFile(namespace, userId)
  const dirReady = await ensureLockDir(file)
  if (!dirReady) return fn()

  const startedAt = Date.now()
  let attempt = 0
  while (Date.now() - startedAt < MAX_WAIT_MS) {
    if (await tryAcquire(file, namespace)) {
      try {
        return await fn()
      } finally {
        try {
          await unlink(file)
        } catch (unlinkErr) {
          console.error('[user-lock-fs] unlink failed (lock will be reaped on next stale check):',
            unlinkErr instanceof Error ? unlinkErr.message : 'unknown')
        }
      }
    }
    await clearIfStale(file)
    await backoffSleep(attempt)
    attempt += 1
  }

  console.error(`[user-lock-fs] lock acquisition timed out after ${MAX_WAIT_MS}ms for ${namespace}:${userId} — running fn() unprotected (in-process queue still applies)`)
  return fn()
}
