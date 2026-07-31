#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
// E1.S9 — Auditor-of-Auditors: sensei Playwright change-set gate.
//
// Spec (audit/REMEDIATION-PLAN.md lines 278-291):
//   "Asserts: every PR touching `src/components/sensei/` includes a Playwright
//    assertion for streaming + Stop button."
//
// Trigger: PR diff touches packages/dojolm-web/src/components/sensei/**.
// Required: PR diff also touches at least one e2e/**/*.spec.ts file AND that
// file contains both:
//   - the substring "streaming" (case-insensitive), AND
//   - a Stop-button assertion (one of: `getByRole('button', { name: /stop/i })`,
//     `getByRole('button', { name: 'Stop' })`, `getByLabel(/stop/i)`,
//     a JSX/string `aria-label="Stop"`, or `data-testid="sensei-stop"`).
//
// If the trigger fires but neither condition is met, exit non-zero with the
// list of changed sensei files + remediation message.
//
// Local invocation:
//   node scripts/audit/validate-sensei-playwright.mjs \
//        --pr-base origin/main --pr-head HEAD
//
// CI invocation: ui-audit.yml runs from the repo root with default args.
//
// Exit codes: 0 = no trigger OR all conditions met; 1 = violation.
//
// Note on subprocess use: this script invokes `git` via `execFileSync` with
// argv arrays — no shell, no string interpolation. Safe by construction.

import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, dirname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(__filename), '..', '..');

const SENSEI_PATH_RE =
  /^packages\/dojolm-web\/src\/components\/sensei\/.+/;
const E2E_SPEC_PATH_RE = /^e2e\/.*\.spec\.ts$/;

const STREAMING_RE = /streaming/i;
// One of these forms must appear in the spec text to count as a Stop-button
// assertion. We deliberately keep the surface narrow so a passing reference
// to the word "stop" in a comment doesn't trip the gate.
const STOP_ASSERTION_PATTERNS = [
  /getByRole\(\s*['"]button['"]\s*,\s*{\s*name\s*:\s*\/stop/i,
  /getByRole\(\s*['"]button['"]\s*,\s*{\s*name\s*:\s*['"]Stop['"]/,
  /getByLabel\(\s*\/stop/i,
  /aria-label\s*=\s*['"]Stop['"]/i,
  /data-testid\s*=\s*['"]sensei-stop['"]/i,
  // Common alternate that some specs use:
  /getByTestId\(\s*['"]sensei-stop['"]/i,
];

function parseArgs(argv) {
  const out = { prBase: 'origin/main', prHead: 'HEAD' };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--pr-base') out.prBase = argv[++i];
    else if (a === '--pr-head') out.prHead = argv[++i];
    else if (a === '--root') out.root = argv[++i];
    else if (a === '--changed-files-file') out.changedFilesFile = argv[++i];
    else if (a === '--help' || a === '-h') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error('Unknown arg: ' + a);
    }
  }
  return out;
}

function printHelp() {
  console.log(
    'Usage: validate-sensei-playwright.mjs [options]\n' +
      '  --pr-base <ref>           git ref (default: origin/main)\n' +
      '  --pr-head <ref>           git ref (default: HEAD)\n' +
      '  --changed-files-file <p>  newline-delimited file list to use INSTEAD\n' +
      '                            of `git diff` (test seam)\n' +
      '  --root <dir>              repo root (test seam; default = git root)\n'
  );
}

function getChangedFiles(prBase, prHead, root) {
  const out = execFileSync(
    'git',
    ['diff', '--name-only', `${prBase}...${prHead}`],
    { cwd: root, encoding: 'utf8' }
  );
  return out
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

function hasStopAssertion(text) {
  return STOP_ASSERTION_PATTERNS.some((re) => re.test(text));
}

function specFileSatisfiesGate(text) {
  return STREAMING_RE.test(text) && hasStopAssertion(text);
}

export function runValidation({ root, changedFiles, fsImpl }) {
  // Optional file-read injection seam for tests so we don't need to touch the
  // real filesystem. Falls back to fs.readFileSync.
  const readFile =
    fsImpl !== undefined && fsImpl.readFileSync !== undefined
      ? fsImpl.readFileSync
      : (p, enc) => readFileSync(p, enc);
  const fileExists =
    fsImpl !== undefined && fsImpl.existsSync !== undefined
      ? fsImpl.existsSync
      : (p) => existsSync(p);

  const senseiFiles = changedFiles.filter((p) => SENSEI_PATH_RE.test(p));
  const e2eFiles = changedFiles.filter((p) => E2E_SPEC_PATH_RE.test(p));

  if (senseiFiles.length === 0) {
    return {
      triggered: false,
      ok: true,
      senseiFiles,
      e2eFiles,
      satisfiedFile: null,
      issues: [],
    };
  }

  // At least one e2e spec must satisfy both conditions.
  let satisfiedFile = null;
  const inspected = [];
  for (const relPath of e2eFiles) {
    const abs = isAbsolute(relPath) ? relPath : resolve(root, relPath);
    if (!fileExists(abs)) continue;
    const text = readFile(abs, 'utf8');
    inspected.push({ path: relPath, text });
    if (specFileSatisfiesGate(text)) {
      satisfiedFile = relPath;
      break;
    }
  }

  if (satisfiedFile !== null) {
    return {
      triggered: true,
      ok: true,
      senseiFiles,
      e2eFiles,
      satisfiedFile,
      issues: [],
    };
  }

  // Diagnose precisely which condition failed for each inspected spec — saves
  // an authoring round-trip.
  const issues = [];
  if (e2eFiles.length === 0) {
    issues.push(
      'PR touches sensei components but no e2e/**/*.spec.ts file is in the diff'
    );
  } else {
    for (const { path: p, text } of inspected) {
      const hasStream = STREAMING_RE.test(text);
      const hasStop = hasStopAssertion(text);
      if (!hasStream && !hasStop) {
        issues.push(`${p}: missing both "streaming" reference AND Stop-button assertion`);
      } else if (!hasStream) {
        issues.push(`${p}: missing "streaming" reference (case-insensitive)`);
      } else if (!hasStop) {
        issues.push(
          `${p}: missing Stop-button assertion (e.g. getByRole('button', { name: /stop/i }) or aria-label="Stop")`
        );
      }
    }
  }

  return {
    triggered: true,
    ok: false,
    senseiFiles,
    e2eFiles,
    satisfiedFile: null,
    issues,
  };
}

function loadChangedFiles(opts) {
  if (opts.changedFilesFile !== undefined && opts.changedFilesFile !== null) {
    const abs = isAbsolute(opts.changedFilesFile)
      ? opts.changedFilesFile
      : resolve(process.cwd(), opts.changedFilesFile);
    return readFileSync(abs, 'utf8')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
  }
  const root = opts.root !== undefined ? opts.root : ROOT;
  return getChangedFiles(opts.prBase, opts.prHead, root);
}

function main() {
  const opts = parseArgs(process.argv);
  const root = opts.root !== undefined ? opts.root : ROOT;
  const changedFiles = loadChangedFiles(opts);

  const result = runValidation({ root, changedFiles });

  if (!result.triggered) {
    console.log(
      '[validate-sensei-playwright] OK — no sensei component changes in this PR.'
    );
    process.exit(0);
  }

  if (result.ok) {
    console.log(
      `[validate-sensei-playwright] OK — sensei changes covered by ${result.satisfiedFile} (streaming + Stop assertions present).`
    );
    process.exit(0);
  }

  console.error('[validate-sensei-playwright] FAIL — sensei components changed without Playwright coverage:');
  console.error('  Sensei files touched:');
  for (const f of result.senseiFiles) console.error('    - ' + f);
  console.error('  Issues:');
  for (const issue of result.issues) console.error('    - ' + issue);
  console.error(
    '\nRemediation: add or extend an e2e/**/*.spec.ts file that exercises the\n' +
      'streaming flow AND asserts on the Stop button. Example assertion:\n' +
      "  await expect(page.getByRole('button', { name: /stop/i })).toBeVisible();"
  );
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  parseArgs,
  hasStopAssertion,
  specFileSatisfiesGate,
  STOP_ASSERTION_PATTERNS,
  STREAMING_RE,
  SENSEI_PATH_RE,
  E2E_SPEC_PATH_RE,
};
