#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
//
// DojoLM SPDX header applier — `npm run fix:spdx`.
//
// Idempotently inserts/retags the correct SPDX header on every tracked in-scope
// source file per its tier (tools/spdx/license-map.mjs):
//   apache → // SPDX-License-Identifier: Apache-2.0   busl → // SPDX-License-Identifier: BUSL-1.1
//
// Guarantees:
//   - NEVER touches §9, ignore (incl. armory fixtures — katana gate),
//     out-of-scope, or non-source files. It only ever writes apache/busl files.
//     (The P3.1a `defer` tier retired with G-7/P3.1b — non-stamped tiers skip.)
//   - Idempotent: a correctly-stamped file is a no-op; a wrong-id header is retagged
//     in place (e.g. the community MIT → Apache retag); a missing header is inserted.
//   - Comment syntax per type: `//` for ts/tsx/js/cjs/mjs, `#` for yaml/yml/sh.
//   - Preserves a leading shebang (`#!…`): the header goes on line 2.
//   - A leading `"use client"`/`"use server"` directive stays valid: the header is a
//     comment inserted above it, and comments before a directive are permitted (the
//     repo's 278 existing JSDoc-then-"use client" files prove this in its Next/SWC).
//
// Usage:
//   node tools/spdx/apply-spdx.mjs            # stamp the whole tree
//   node tools/spdx/apply-spdx.mjs --dry-run  # report planned changes, write nothing
//   node tools/spdx/apply-spdx.mjs --staged   # only staged files
//
// DESIGN (mirrors tools/check-repo-boundary.mjs): `stampContent` is pure; `runCli(deps)`
// takes injected I/O + RETURNS an exit code (never process.exit). The CLI entrypoint is
// coverage-disabled + exercised by the subprocess smoke tests.

import { readFileSync as fsReadFileSync, writeFileSync as fsWriteFileSync, existsSync as fsExistsSync, realpathSync as fsRealpathSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  parseSection9List,
  classify,
  expectedIdFor,
  isStampedTier,
  commentTokenFor,
  HEADER_SCAN_LINES,
  splitLines,
} from './license-map.mjs';

const SPDX_RE = /SPDX-License-Identifier:\s*(\S+)/;
const SPDX_REPLACE_RE = /(SPDX-License-Identifier:\s*)\S+/;

/**
 * Insert or retag the SPDX header. Pure: returns a NEW content string (never
 * mutates). `action` is 'noop' | 'retag' | 'insert'.
 *
 * @param {string} content   current file content
 * @param {string} commentToken  '//' or '#'
 * @param {string} desiredId  the SPDX id this file's tier requires
 * @returns {{ content: string, changed: boolean, action: 'noop'|'retag'|'insert' }}
 */
export function stampContent(content, commentToken, desiredId) {
  const lines = content.split('\n');
  const scan = Math.min(HEADER_SCAN_LINES, lines.length);

  for (let i = 0; i < scan; i++) {
    const m = lines[i].match(SPDX_RE);
    if (m) {
      if (m[1] === desiredId) return { content, changed: false, action: 'noop' };
      const next = lines.slice();
      next[i] = lines[i].replace(SPDX_REPLACE_RE, `$1${desiredId}`);
      return { content: next.join('\n'), changed: true, action: 'retag' };
    }
  }

  const headerLine = `${commentToken} SPDX-License-Identifier: ${desiredId}`;
  // split() always yields ≥1 element, so lines[0] is always defined.
  const insertAt = lines[0].startsWith('#!') ? 1 : 0;
  const next = lines.slice();
  next.splice(insertAt, 0, headerLine);
  return { content: next.join('\n'), changed: true, action: 'insert' };
}

/** Aggregate the per-action tallies for the report. `counts` is pre-initialized
 * with the four reported keys (so the report always shows them), and runCli only
 * ever feeds those four action kinds, so a plain increment is correct. */
export function summarizeActions(actions) {
  const counts = { insert: 0, retag: 0, noop: 0, skip: 0 };
  for (const a of actions) counts[a] += 1;
  return counts;
}

const RULE = '═══════════════════════════════════════════════════════════════════';

/**
 * Orchestrator. Returns an exit code (0 ok / 1 config-or-io error / 2 usage).
 * deps: { argv, existsSync, readFileSync, section9Path, io, log, error }
 *   io: { listTrackedFiles(): string[], gitDiffCached(): string,
 *         readFile(p): string, writeFile(p, content): void }
 */
export function runCli(deps) {
  const { argv, existsSync, readFileSync, section9Path, io, log, error } = deps;

  if (!existsSync(section9Path)) {
    error(`[spdx-apply] ERROR: ${section9Path} not found — refusing to run without the §9 skip set.`);
    return 1;
  }
  const section9Set = parseSection9List(readFileSync(section9Path, 'utf8'));
  if (section9Set.size === 0) {
    error(`[spdx-apply] ERROR: §9 list parsed empty from ${section9Path} — refusing to run (would risk stamping §9).`);
    return 1;
  }

  const dryRun = argv.includes('--dry-run');
  const stagedMode = argv.includes('--staged');

  let candidates;
  try {
    candidates = stagedMode ? splitLines(io.gitDiffCached()) : io.listTrackedFiles();
  } catch (e) {
    error(`[spdx-apply] ERROR: failed to list files: ${e.message}`);
    return 1;
  }

  const actions = [];
  const changed = [];
  for (const p of candidates) {
    if (!p) continue;
    const { tier } = classify(p, { section9Set });
    if (!isStampedTier(tier)) {
      actions.push('skip');
      continue;
    }
    const desiredId = expectedIdFor(tier);
    // commentToken is invariantly non-null for a stamped tier: classify only returns
    // apache/busl for the 8 SOURCE_EXTENSIONS, every one of which has a comment token.
    // That invariant is machine-checked in tools/__tests__/spdx-license-map.test.js.
    const commentToken = commentTokenFor(p);
    let content;
    try {
      content = io.readFile(p);
    } catch (e) {
      error(`[spdx-apply] ERROR: cannot read ${p}: ${e.message}`);
      return 1;
    }
    const result = stampContent(content, commentToken, desiredId);
    actions.push(result.action);
    if (result.changed) {
      changed.push({ path: p, action: result.action, tier });
      if (!dryRun) {
        try {
          io.writeFile(p, result.content);
        } catch (e) {
          error(`[spdx-apply] ERROR: cannot write ${p}: ${e.message}`);
          return 1;
        }
      }
    }
  }

  const counts = summarizeActions(actions);
  log(RULE);
  log(` SPDX APPLY ${dryRun ? '(dry-run — nothing written)' : ''}`);
  log(RULE);
  for (const c of changed) log(`   ${c.action === 'insert' ? '＋' : '↻'} [${c.tier}] ${c.path}`);
  log('   ' + '-'.repeat(20));
  log(`   inserted ${counts.insert} · retagged ${counts.retag} · already-ok ${counts.noop} · skipped ${counts.skip}`);
  log(RULE);
  return 0;
}

// node:coverage disable -- CLI-only I/O entrypoint; exercised by the subprocess
// smoke tests in tools/__tests__/spdx-apply.test.js.
function findRepoRoot() {
  return execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
}

const isMainModule =
  !!process.argv[1] &&
  fsExistsSync(process.argv[1]) &&
  fsRealpathSync(fileURLToPath(import.meta.url)) === fsRealpathSync(process.argv[1]);

if (isMainModule) {
  const REPO_ROOT = findRepoRoot();
  const SECTION9_PATH = path.join(REPO_ROOT, '.dojolm-section9-do-not-touch.txt');
  const exitCode = runCli({
    argv: process.argv.slice(2),
    existsSync: fsExistsSync,
    readFileSync: fsReadFileSync,
    section9Path: SECTION9_PATH,
    io: {
      listTrackedFiles: () =>
        splitLines(execFileSync('git', ['ls-files'], { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })),
      gitDiffCached: () =>
        execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'], { cwd: REPO_ROOT, encoding: 'utf8' }),
      readFile: p => fsReadFileSync(path.join(REPO_ROOT, p), 'utf8'),
      writeFile: (p, content) => fsWriteFileSync(path.join(REPO_ROOT, p), content),
    },
    log: m => console.log(m),
    error: m => console.error(m),
  });
  process.exit(exitCode);
}
// node:coverage enable
