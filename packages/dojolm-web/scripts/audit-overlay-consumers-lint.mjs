#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
/**
 * Lint check for audit-overlay-consumers.md (issue #402, Phase E #12).
 *
 * Enforces that every code path importing or referencing the WORM audit
 * chain is enumerated in `packages/bu-tpi/src/onigaeshi/audit-overlay-consumers.md`.
 *
 * Why this matters
 * ----------------
 * Path B (PR-E4 / ADR-0093) erases data-subject identifiers from the
 * WORM chain via a read-side overlay. If a new reader ships without
 * `applyOverlay()`, the read path leaks PII the chain was supposed to
 * mask. The enumeration doc is the contract; this script is the
 * enforcement.
 *
 * Algorithm
 * ---------
 *   1. Run the canonical ripgrep pattern (the same one printed in the
 *      doc's "Enumeration rule" section) across `packages/`.
 *   2. Drop files that are categorically out-of-scope:
 *        - `*.test.ts` / `*.test.tsx` (tests do not surface entries to
 *          a user-facing caller).
 *        - `(design)/canvas/` artboards (mockups; string-literal hits
 *          only).
 *   3. Parse the file paths from column 2 of the table in
 *      `audit-overlay-consumers.md`.
 *   4. Diff: any matched file not present in the table → fail.
 *      Any table row whose file no longer exists → also fail (stale
 *      enumeration is as bad as missing enumeration).
 *
 * Exit codes / programmatic kinds
 * --------------------------------
 *   0 / 'clean'    — every match is in the table; every table row exists.
 *   1 / 'unlisted' — NEW reader without overlay-disposition row.
 *   2 / 'stale'    — table cites a path that no longer exists.
 *   3 / 'env'      — environment error (rg missing, doc missing, etc.).
 *
 * Invocation
 * ----------
 *   node packages/dojolm-web/scripts/audit-overlay-consumers-lint.mjs
 *   npm --workspace packages/dojolm-web run audit:overlay-consumers
 *
 * Programmatic API
 * ----------------
 *   import { lintOverlayConsumers } from './audit-overlay-consumers-lint.mjs';
 *   const result = lintOverlayConsumers();
 *   if (result.kind !== 'clean') { ... }
 *
 * CI integration is parked while repo Actions are disabled. When Actions
 * re-enable, wire this into the existing `audit:v1v2-parity` job.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO_ROOT = path.resolve(SCRIPT_DIR, '..', '..', '..');

/** Symbols the doc declares as the canonical search pattern. */
export const SEARCH_PATTERN = [
  'audit-worm-writer',
  'verifyAuditIntegrity',
  'readWormChain',
  'getOnigaeshiAuditLog',
  'WormAuditWriter',
  'appendOnigaeshiAudit',
  'WORM_ENTRY_PREFIX',
].join('|');

/** Files that match the pattern but are out-of-scope by category. */
export function isCategoricalSkip(relPath) {
  if (relPath.endsWith('.test.ts') || relPath.endsWith('.test.tsx')) return true;
  // Design-canvas artboards are visual mockups; string-literal hits only.
  if (relPath.includes('/(design)/canvas/')) return true;
  return false;
}

function runRipgrep(repoRoot) {
  try {
    const out = execFileSync(
      'rg',
      ['-l', SEARCH_PATTERN, 'packages/', '--type', 'ts', '--type-add', 'ts:*.tsx'],
      { cwd: repoRoot, encoding: 'utf8' },
    );
    return out
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  } catch (err) {
    // rg exits 1 on no-match; we treat that as "no consumers exist".
    if (err && typeof err === 'object' && 'status' in err && err.status === 1) {
      return [];
    }
    throw err;
  }
}

/**
 * Parse the file paths from the consumers table. The table is the
 * single Markdown table whose header begins `| # | File |`.
 *
 * @param {string} text Doc contents.
 * @returns {Set<string>} repo-relative paths from column 2.
 */
export function parseDocFilePaths(text) {
  const paths = new Set();
  let inTable = false;
  for (const line of text.split('\n')) {
    if (line.startsWith('| # | File |')) {
      inTable = true;
      continue;
    }
    if (!inTable) continue;
    if (line.startsWith('|---') || line.trim() === '') {
      // Header separator or blank line — stop at first blank after table.
      if (line.trim() === '' && paths.size > 0) break;
      continue;
    }
    if (!line.startsWith('|')) {
      // Reached prose after the table.
      if (paths.size > 0) break;
      continue;
    }
    // Column 2 is between the first and second `|` after the leading one.
    const cells = line.split('|').slice(1);
    if (cells.length < 2) continue;
    const fileCell = cells[1].trim();
    // Cell content is wrapped in backticks: `path/to/file.ts`. Extract.
    const match = fileCell.match(/`([^`]+)`/);
    if (match) paths.add(match[1]);
  }
  return paths;
}

/**
 * Run the lint check.
 *
 * @param {{ repoRoot?: string }} [opts]
 * @returns {{
 *   kind: 'clean' | 'unlisted' | 'stale' | 'env',
 *   matched: number,
 *   tableRows: number,
 *   unlisted: string[],
 *   stale: string[],
 *   message: string,
 * }}
 */
export function lintOverlayConsumers(opts = {}) {
  const repoRoot = opts.repoRoot ?? DEFAULT_REPO_ROOT;
  const docPath = path.join(
    repoRoot,
    'packages',
    'bu-tpi',
    'src',
    'onigaeshi',
    'audit-overlay-consumers.md',
  );

  if (!existsSync(docPath)) {
    return {
      kind: 'env',
      matched: 0,
      tableRows: 0,
      unlisted: [],
      stale: [],
      message: `audit-overlay-consumers.md not found at ${docPath}`,
    };
  }

  let matched;
  try {
    matched = runRipgrep(repoRoot).filter((p) => !isCategoricalSkip(p));
  } catch (err) {
    return {
      kind: 'env',
      matched: 0,
      tableRows: 0,
      unlisted: [],
      stale: [],
      message: `rg invocation failed: ${err && err.message ? err.message : err}`,
    };
  }

  const docText = readFileSync(docPath, 'utf8');
  const docPaths = parseDocFilePaths(docText);

  const unlisted = matched.filter((p) => !docPaths.has(p));
  const stale = [...docPaths].filter((p) => !existsSync(path.join(repoRoot, p)));

  if (unlisted.length === 0 && stale.length === 0) {
    return {
      kind: 'clean',
      matched: matched.length,
      tableRows: docPaths.size,
      unlisted: [],
      stale: [],
      message: `audit-overlay-consumers.md is in sync. ${matched.length} consumers checked, ${docPaths.size} table rows.`,
    };
  }

  if (unlisted.length > 0) {
    return {
      kind: 'unlisted',
      matched: matched.length,
      tableRows: docPaths.size,
      unlisted,
      stale,
      message:
        `Files matching the WORM-reader pattern but NOT listed in the table (${unlisted.length}):\n` +
        unlisted.map((p) => `  - ${p}`).join('\n') +
        '\n\nFix: add a row to packages/bu-tpi/src/onigaeshi/audit-overlay-consumers.md\n' +
        'documenting the reader API + surface + overlay disposition. If the file is\n' +
        'a producer or type-only reference (not a reader that surfaces entries), mark\n' +
        'it `N/A — <reason>`.',
    };
  }

  return {
    kind: 'stale',
    matched: matched.length,
    tableRows: docPaths.size,
    unlisted,
    stale,
    message:
      `Table rows whose file no longer exists (${stale.length}):\n` +
      stale.map((p) => `  - ${p}`).join('\n') +
      '\n\nFix: remove the stale rows from audit-overlay-consumers.md.',
  };
}

const EXIT_CODE = { clean: 0, unlisted: 1, stale: 2, env: 3 };

function main() {
  const result = lintOverlayConsumers();
  if (result.kind === 'clean') {
    process.stdout.write(`✔ ${result.message}\n`);
  } else {
    process.stderr.write('✘ audit-overlay-consumers.md is out of sync.\n\n');
    process.stderr.write(`${result.message}\n\n`);
  }
  return EXIT_CODE[result.kind];
}

// Run as CLI when invoked directly (not when imported).
if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(main());
}
