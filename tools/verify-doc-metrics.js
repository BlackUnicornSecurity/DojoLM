#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
/**
 * tools/verify-doc-metrics.js
 *
 * Verifies documentation metrics match real implementation counts.
 *
 * Wave 0 Track B.1 rewrite (2026-04-18):
 *   - Strict equality on every metric (no `allowAtLeast` slack).
 *   - Missing metric in any checked doc is a hard error.
 *   - Exits 1 on any mismatch.
 *
 * Invoked by:
 *   - npm run verify:docs
 *   - .github/workflows/docs-metrics-check.yml
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// -----------------------------------------------------------------------------
// Paths
// -----------------------------------------------------------------------------

const SCANNER_PATH = path.join(ROOT, 'packages/bu-tpi/src/scanner.ts');
const FIXTURES_DIR = path.join(ROOT, 'packages/bu-tpi/fixtures');

// Each entry: the doc to check + WHICH of the four core metrics it is expected to
// carry (a doc need not cite all four). F-6 extended this from the single
// DOCUMENTATION-INDEX to the other shipping docs that cite the same metrics in
// prose/table form (P3.3 proved they drift undetected). The nav/detector metrics
// (cited only by DOCUMENTATION-INDEX) stay verified manually for now — their
// source counts need a precise methodology (see F-6 carry).
const ALL_CORE = ['patterns', 'groups', 'categories', 'fixtures'];
export const CHECKED_DOCS = [
  { path: path.join(ROOT, 'docs/DOCUMENTATION-INDEX.md'), metrics: ALL_CORE },
  { path: path.join(ROOT, 'docs/README.md'), metrics: ALL_CORE },
  { path: path.join(ROOT, 'docs/user/PLATFORM_GUIDE.md'), metrics: ALL_CORE },
  { path: path.join(ROOT, 'docs/user/FAQ.md'), metrics: ['patterns', 'fixtures'] },
];

// -----------------------------------------------------------------------------
// Logging
// -----------------------------------------------------------------------------

const log = {
  info: (msg) => console.log(`  ${msg}`),
  ok: (msg) => console.log(`  \x1b[32m✓\x1b[0m ${msg}`),
  fail: (msg) => console.log(`  \x1b[31m✗\x1b[0m ${msg}`),
  warn: (msg) => console.log(`  \x1b[33m⚠\x1b[0m ${msg}`),
  section: (msg) => console.log(`\n\x1b[1m${msg}\x1b[0m`),
};

// -----------------------------------------------------------------------------
// Actual-count extractors
// -----------------------------------------------------------------------------

export function countPatternsInScanner(scannerPath) {
  if (!fs.existsSync(scannerPath)) {
    throw new Error(`Scanner file not found: ${scannerPath}`);
  }
  const src = fs.readFileSync(scannerPath, 'utf8');
  const matches = src.match(/^\s*\{\s*name:\s*['"]/gm) || [];
  return matches.length;
}

export function countPatternGroupsInScanner(scannerPath) {
  const src = fs.readFileSync(scannerPath, 'utf8');
  const matches = src.match(/^export const \w+_PATTERNS: RegexPattern\[\]/gm) || [];
  return matches.length;
}

export function countFixtureCategories(fixturesDir) {
  if (!fs.existsSync(fixturesDir)) {
    throw new Error(`Fixtures dir not found: ${fixturesDir}`);
  }
  return fs.readdirSync(fixturesDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .length;
}

export function countFixtureFiles(fixturesDir) {
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    let count = 0;
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) count += walk(full);
      else if (e.isFile()) count += 1;
    }
    return count;
  }
  return walk(fixturesDir);
}

// -----------------------------------------------------------------------------
// Doc parsing
// -----------------------------------------------------------------------------

/** Per-metric extractor regexes. The FIRST regex (over the backtick-normalised
 * text) that matches wins. Each handles both the legacy table form (`| Detection
 * Patterns | 544 across 49 groups |`) and the prose form (`544 patterns across 49
 * groups`, `` `5,217` fixtures ``). Anchored on the metric keyword so a stray
 * number elsewhere is not mis-read. */
const METRIC_RES = {
  patterns: [/Detection Patterns\s*\|\s*([\d,]+)/i, /([\d,]+)\s+(?:detection\s+)?patterns\b/i],
  groups: [/Pattern Groups\s*\|\s*([\d,]+)/i, /across\s+([\d,]+)\s+(?:pattern\s+)?groups\b/i, /([\d,]+)\s+(?:pattern\s+)?groups\b/i],
  categories: [/Fixture Categories\s*\|\s*([\d,]+)/i, /across\s+([\d,]+)\s+(?:fixture\s+)?categories\b/i, /([\d,]+)\s+(?:fixture\s+)?categories\b/i],
  fixtures: [/Attack Fixtures\s*\|\s*([\d,]+)/i, /([\d,]+)\s+fixtures\b/i],
};

/**
 * Extract the documented metric values from a doc. Handles the legacy table rows
 * AND prose/combined-cell forms (F-6). Backticks are normalised to spaces first so
 * `` `544` patterns `` parses. Returns only the metrics it found.
 */
export function parseDocMetrics(docPath) {
  if (!fs.existsSync(docPath)) {
    throw new Error(`Doc not found: ${docPath}`);
  }
  const text = fs.readFileSync(docPath, 'utf8').replace(/`/g, ' ');
  const metrics = {};
  for (const [key, res] of Object.entries(METRIC_RES)) {
    for (const re of res) {
      const m = text.match(re);
      if (m) { metrics[key] = parseInt(m[1].replace(/,/g, ''), 10); break; }
    }
  }
  return metrics;
}

// -----------------------------------------------------------------------------
// Strict verification
// -----------------------------------------------------------------------------

/**
 * Strict-equals every documented metric against the actual count.
 * No `allowAtLeast` slack. A missing metric is a hard error.
 */
export function verifyStrict(label, metricName, documentedValue, actualValue) {
  if (documentedValue === undefined) {
    log.fail(`${label}: \`${metricName}\` metric is missing — must be documented`);
    return false;
  }
  const ok = documentedValue === actualValue;
  const detail = `documented=${documentedValue} actual=${actualValue}`;
  if (ok) log.ok(`${label}: ${metricName} matches (${actualValue})`);
  else log.fail(`${label}: ${metricName} mismatch — ${detail}`);
  return ok;
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

function main() {
  log.section('Documentation Metrics Verification (strict)');

  const actual = {
    patterns: countPatternsInScanner(SCANNER_PATH),
    groups: countPatternGroupsInScanner(SCANNER_PATH),
    categories: countFixtureCategories(FIXTURES_DIR),
    fixtures: countFixtureFiles(FIXTURES_DIR),
  };
  log.section('Actual implementation counts');
  log.info(`patterns:   ${actual.patterns}`);
  log.info(`groups:     ${actual.groups}`);
  log.info(`categories: ${actual.categories}`);
  log.info(`fixtures:   ${actual.fixtures}`);

  let hasErrors = false;
  for (const { path: docPath, metrics } of CHECKED_DOCS) {
    const label = path.relative(ROOT, docPath);
    log.section(`Checking ${label}`);
    const doc = parseDocMetrics(docPath);
    const oks = metrics.map((mn) => verifyStrict(label, mn, doc[mn], actual[mn]));
    if (oks.some((v) => !v)) hasErrors = true;
  }

  // Shipped manifest gate: fixtures/manifest.json feeds public consumers
  // (npm tarball, MCP resources). Its total must strict-equal the tree —
  // it drifted to 4,162 while the tree grew to 5,281 and the public
  // /stats.json under-reported by ~1,100 (catalog finding R-03).
  const manifestLabel = 'packages/bu-tpi/fixtures/manifest.json';
  log.section(`Checking ${manifestLabel}`);
  const manifest = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, 'manifest.json'), 'utf8'));
  if (!verifyStrict(manifestLabel, 'totalFixtures', manifest.totalFixtures, actual.fixtures)) {
    hasErrors = true;
  }

  log.section(hasErrors ? '\x1b[31mVERIFICATION FAILED\x1b[0m' : '\x1b[32mALL METRICS MATCH\x1b[0m');
  process.exit(hasErrors ? 1 : 0);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);
if (isMain) {
  try {
    main();
  } catch (err) {
    log.fail(err.message);
    process.exit(1);
  }
}
