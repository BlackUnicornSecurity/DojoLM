#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
//
// DojoLM SPDX header checker — `npm run lint:spdx`.
//
// Asserts every tracked in-scope source file (packages/|tools/|scripts/) carries
// the SPDX identifier its tier requires (tools/spdx/license-map.mjs):
//   apache  → // SPDX-License-Identifier: Apache-2.0
//   busl    → // SPDX-License-Identifier: BUSL-1.1
//   section9/ignore/out-of-scope/not-source → skipped-with-reason
//   (the P3.1a `defer` tier retired with G-7/P3.1b; any non-stamped tier skips)
//
// Exit code: 0 = all stamped tiers correct · 1 = violation or config error · 2 = usage.
// This is also the OSS-release P3.1a verification GATE + the Phase-6 Adversarial
// artifact (the checker must FAIL on every violation class — missing + wrong-id).
//
// Usage:
//   node tools/spdx/check-spdx.mjs               # full tree (manual / CI gate)
//   node tools/spdx/check-spdx.mjs --staged      # staged files only (pre-commit)
//   node tools/spdx/check-spdx.mjs --report      # classification breakdown, exit 0
//
// DESIGN (mirrors tools/check-repo-boundary.mjs): all decision logic is pure +
// exported; `runCli(deps)` takes injected I/O and RETURNS an exit code (never calls
// process.exit), so the whole flow is coverable in-process. The thin
// `if (isMainModule)` entrypoint does the real git/fs I/O and is coverage-disabled.

import { readFileSync as fsReadFileSync, existsSync as fsExistsSync, realpathSync as fsRealpathSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  parseSection9List,
  classify,
  expectedIdFor,
  isStampedTier,
  HEADER_SCAN_LINES,
  splitLines,
} from './license-map.mjs';

export { HEADER_SCAN_LINES, splitLines };

/**
 * Extract the SPDX id declared in the first `HEADER_SCAN_LINES` lines, or null.
 * Bounded to the header zone so a body reference to the literal string (e.g. in
 * these tools themselves) is never mistaken for the header.
 */
export function extractSpdxId(content) {
  const lines = content.split('\n');
  const n = Math.min(HEADER_SCAN_LINES, lines.length);
  for (let i = 0; i < n; i++) {
    const m = lines[i].match(/SPDX-License-Identifier:\s*(\S+)/);
    if (m) return m[1];
  }
  return null;
}

/**
 * Check one file's header against its tier.
 * @returns {{ path, tier, reason, status: 'ok'|'missing'|'wrong'|'skip', expected: string|null, actual: string|null }}
 */
export function checkFile(filePath, content, classification) {
  const { tier, reason } = classification;
  const expected = expectedIdFor(tier);
  if (!isStampedTier(tier)) {
    return { path: filePath, tier, reason, status: 'skip', expected: null, actual: null };
  }
  const actual = extractSpdxId(content);
  if (actual === null) {
    return { path: filePath, tier, reason, status: 'missing', expected, actual: null };
  }
  if (actual !== expected) {
    return { path: filePath, tier, reason, status: 'wrong', expected, actual };
  }
  return { path: filePath, tier, reason, status: 'ok', expected, actual };
}

/** Aggregate per-tier + per-status counts and the violation list. */
export function summarize(results) {
  const counts = { ok: 0, missing: 0, wrong: 0, skip: 0 };
  const tiers = {};
  const violations = [];
  for (const r of results) {
    counts[r.status]++;
    tiers[r.tier] = (tiers[r.tier] || 0) + 1;
    if (r.status === 'missing' || r.status === 'wrong') violations.push(r);
  }
  return { counts, tiers, violations };
}

const RULE = '═══════════════════════════════════════════════════════════════════';

/** Human report. `report` mode also lists the per-tier breakdown. */
export function emitReport({ counts, tiers, violations }, { reportMode, scanned }, log, error) {
  if (reportMode) {
    log(RULE);
    log(' SPDX CLASSIFICATION REPORT (tools/spdx/license-map.mjs)');
    log(RULE);
    for (const tier of Object.keys(tiers).sort()) {
      log(`   ${tier.padEnd(13)} ${tiers[tier]}`);
    }
    log('   ' + '-'.repeat(20));
    log(`   stamped ok    ${counts.ok}`);
    log(`   missing       ${counts.missing}`);
    log(`   wrong-id      ${counts.wrong}`);
    log(`   skipped       ${counts.skip}`);
    log(`   scanned       ${scanned}`);
    log(RULE);
  }
  if (violations.length > 0) {
    error('');
    error(RULE);
    error(' SPDX HEADER VIOLATION');
    error(RULE);
    error('');
    error(` ${violations.length} file(s) carry the wrong (or no) SPDX header for their tier:`);
    error('');
    for (const v of violations) {
      const what = v.status === 'missing'
        ? `missing — expected ${v.expected}`
        : `has ${v.actual} — expected ${v.expected}`;
      error(`   ❌ [${v.tier}] ${v.path}  (${what})`);
    }
    error('');
    error(' Fix with:  npm run fix:spdx');
    error(' Tier map:  tools/spdx/license-map.mjs · §9 is never stamped (stays MIT).');
    error(RULE);
  }
}

/**
 * Orchestrator. Returns an exit code (0 ok / 1 violation-or-config / 2 usage).
 * Never calls process.exit; all I/O via injected `deps`.
 *
 * deps: { argv, existsSync, readFileSync, section9Path, io, log, error }
 *   io: { listTrackedFiles(): string[], gitDiffCached(): string, readFile(repoRelPath): string }
 */
export function runCli(deps) {
  const { argv, existsSync, readFileSync, section9Path, io, log, error } = deps;

  if (!existsSync(section9Path)) {
    error(`[spdx] ERROR: ${section9Path} not found — cannot resolve the §9 skip set.`);
    return 1;
  }
  const section9Set = parseSection9List(readFileSync(section9Path, 'utf8'));
  // Fail CLOSED: the §9 list is load-bearing (these files must NOT be stamped). An
  // empty parse means a truncated/moved file — refuse rather than risk stamping §9.
  if (section9Set.size === 0) {
    error(`[spdx] ERROR: §9 list parsed empty from ${section9Path} (expected the DO-NOT-TOUCH paths).`);
    return 1;
  }

  const reportMode = argv.includes('--report');
  const stagedMode = argv.includes('--staged');

  let candidates;
  try {
    candidates = stagedMode ? splitLines(io.gitDiffCached()) : io.listTrackedFiles();
  } catch (e) {
    error(`[spdx] ERROR: failed to list files: ${e.message}`);
    return 1;
  }

  const results = [];
  for (const p of candidates) {
    if (!p) continue;
    const classification = classify(p, { section9Set });
    if (!isStampedTier(classification.tier)) {
      results.push({ path: p, tier: classification.tier, reason: classification.reason, status: 'skip', expected: null, actual: null });
      continue;
    }
    let content;
    try {
      content = io.readFile(p);
    } catch (e) {
      error(`[spdx] ERROR: cannot read ${p}: ${e.message}`);
      return 1;
    }
    results.push(checkFile(p, content, classification));
  }

  const summary = summarize(results);
  emitReport(summary, { reportMode, scanned: results.length }, log, error);

  if (summary.violations.length > 0) return reportMode ? 0 : 1;
  if (!reportMode) {
    log(`[spdx] OK — ${summary.counts.ok} file(s) correctly stamped; ${summary.counts.skip} skipped${stagedMode ? ' (staged scope)' : ''}.`);
  }
  return 0;
}

// node:coverage disable -- CLI-only I/O entrypoint; exercised by the subprocess
// smoke tests in tools/__tests__/spdx-check.test.js + the live pre-commit hook.
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
    },
    log: m => console.log(m),
    error: m => console.error(m),
  });
  process.exit(exitCode);
}
// node:coverage enable
