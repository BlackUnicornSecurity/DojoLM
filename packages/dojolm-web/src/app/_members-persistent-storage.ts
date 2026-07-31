// SPDX-License-Identifier: Apache-2.0
/**
 * File: src/app/_members-persistent-storage.ts
 * Purpose: Epic 4B.6 S4B.6.2 boot shim — install persistent fs-JSON
 *          adapters for the members invite store + belt ledger source
 *          BEFORE any request handler reads `getMemberInviteStore()`
 *          or `getMemberBeltLedgerSource()`.
 *
 * Why this file exists at all
 * ---------------------------
 * `src/lib/members/invite-store.ts` and `src/lib/members/belt-ledger-source.ts`
 * ship a swap-site pattern — a module-level `currentStore` / `currentSource`
 * with an in-memory default, plus `setMemberInviteStore(next)` /
 * `setMemberBeltLedgerSource(next)` setters that production is expected
 * to call at boot with the persistent backends. Without this shim, the
 * two fs-backed adapters (`FsInviteStore`, `FsBeltLedgerSource`) are
 * dead code and every container restart loses invites + the belt-ledger
 * chain.
 *
 * Why the leading underscore
 * --------------------------
 * Next.js App Router treats any `src/app/foo/page.tsx` as a route and
 * emits a public URL for it. Prefixing this file with `_` is the
 * project-convention opt-out — `_members-persistent-storage.ts` is
 * NOT a route; it's a server-only side-effect module whose only job
 * is to run its top-level install call on first import.
 *
 * Why server-boot only
 * --------------------
 * The shim reaches for `node:fs` transitively (via the two adapters)
 * and MUST never be bundled for the client. Importing it from a
 * server-only entry point (Next.js `instrumentation.ts`, a Server
 * Component root layout, or a server-only route module) keeps it
 * out of the client chunk.
 *
 * Gate
 * ----
 * Install ONLY when either:
 *   - `NODE_ENV === 'production'` (live deploy), OR
 *   - `MEMBERS_PERSISTENT_STORAGE === 'true'` (explicit opt-in for
 *     local / staging operators who want to exercise the persistent
 *     code path without NODE_ENV=production).
 *
 * Otherwise leave the in-memory defaults in place — route + e2e tests
 * rely on the deterministic in-memory store.
 *
 * Sync-only init
 * --------------
 * Next.js does not guarantee a server-boot `await` point that is
 * serialised against request handling. The two adapter constructors
 * are synchronous by design: `ensureFile()` (mkdir-recursive +
 * appendFileSync to create an empty file with mode 0o600) and
 * `replay()` (readFileSync + per-line JSON.parse). Both tolerate a
 * missing file + a missing dir on first boot. No async primitive is
 * invoked from this module's top level.
 *
 * Verification
 * ------------
 * Because unit-testing module-import side effects under vitest is
 * hostile (the setter mutation leaks across suites), deploy-time
 * verification via log scraping is tracked under E4B.7 — a single
 * `console.info('[members] persistent storage installed')` (emitted
 * below when the gate passes) is the verifiable signal.
 */

import * as path from 'node:path';
import {
  setMemberInviteStore,
} from '@/lib/members/invite-store';
import {
  setMemberBeltLedgerSource,
} from '@/lib/members/belt-ledger-source';
import {
  setMemberInviteRequestStore,
} from '@/lib/members/invite-request-store';
import { FsInviteStore } from '@/lib/members/fs-invite-store';
import { FsBeltLedgerSource } from '@/lib/members/fs-belt-ledger-source';
import { FsInviteRequestStore } from '@/lib/members/fs-invite-request-store';

const DEFAULT_STORAGE_DIR = '.data/members';
const INVITE_LOG_FILENAME = 'member-invites.jsonl';
const BELT_LEDGER_FILENAME = 'belt-ledger.jsonl';
// E4B.7 S4B.7.2 — persistent request-invite log lives next to the
// invite log + belt ledger under the same MEMBERS_STORAGE_DIR. File
// name chosen so `ls data/` sorts related logs together for ops
// inspection.
const INVITE_REQUEST_LOG_FILENAME = 'member-invite-requests.jsonl';

function isPersistentStorageRequested(): boolean {
  if (process.env.NODE_ENV === 'production') return true;
  if (process.env.MEMBERS_PERSISTENT_STORAGE === 'true') return true;
  return false;
}

function resolveStorageDir(): string {
  const configured = process.env.MEMBERS_STORAGE_DIR;
  if (typeof configured === 'string' && configured.length > 0) {
    return configured;
  }
  return path.join(process.cwd(), DEFAULT_STORAGE_DIR);
}

// Top-level side effect — runs once on module import. Module-level
// guard prevents re-install on HMR / double-import (Next.js dev can
// re-evaluate modules; prod is single-evaluation but the guard is
// cheap). The guard lives on `globalThis` rather than a
// module-local to survive the dev-time re-evaluation.
declare global {
  // eslint-disable-next-line no-var
  var __DOJOLM_MEMBERS_PERSISTENT_INSTALLED__: boolean | undefined;
}

if (
  isPersistentStorageRequested() &&
  globalThis.__DOJOLM_MEMBERS_PERSISTENT_INSTALLED__ !== true
) {
  globalThis.__DOJOLM_MEMBERS_PERSISTENT_INSTALLED__ = true;

  const storageDir = resolveStorageDir();
  const invitesPath = path.join(storageDir, INVITE_LOG_FILENAME);
  const ledgerPath = path.join(storageDir, BELT_LEDGER_FILENAME);
  const inviteRequestsPath = path.join(storageDir, INVITE_REQUEST_LOG_FILENAME);

  // All three constructors are synchronous — see FsInviteStore /
  // FsBeltLedgerSource / FsInviteRequestStore top-of-file JSDoc.
  // ensureFile() creates the parent dir + empty log with mode 0o600;
  // replay() streams the log into memory. A fresh deploy (no files on
  // disk) takes the empty-file path on all three.
  setMemberInviteStore(new FsInviteStore({ filePath: invitesPath }));
  setMemberBeltLedgerSource(new FsBeltLedgerSource({ filePath: ledgerPath }));
  // E4B.7 S4B.7.2 — parallel block. Same env gate, same filename
  // convention, same mode, same fail-mode. Keeping this as a
  // stand-alone `setX(new FsY(...))` line (rather than merging into
  // the two above) preserves the block-per-adapter discipline the
  // E4B.6 shim established.
  setMemberInviteRequestStore(
    new FsInviteRequestStore({ filePath: inviteRequestsPath }),
  );

  // Deploy-time verification signal (rule §17 sanitized) — NEVER echo
  // the resolved path (it is a server-side implementation detail).
  // eslint-disable-next-line no-console
  console.info('[members] persistent storage installed');
}

export {};
