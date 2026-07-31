#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
/**
 * tools/industry-tools/st3gg-coverage-audit.mjs
 *
 * Gap 11.3 — CI-friendly ST3GG coverage auditor.
 *
 * Reads `packages/bu-tpi/fixtures/encoded/ST3GG-COVERAGE.json`, walks the
 * fixture roots, and emits a deterministic `coverage-report.json` next to
 * stdout.  Exits non-zero on:
 *   - any declared/observed status mismatch (regression gate)
 *   - any declared category that resolves to zero fixture files
 *
 * Flags:
 *   --out <path>     — write the report JSON to <path> (default: stdout only)
 *   --coverage <p>   — override ST3GG-COVERAGE.json path
 *   --encoded-root   — override fixtures/encoded root
 *   --quiet          — suppress summary table
 *
 * Intended invocation:
 *   node tools/industry-tools/st3gg-coverage-audit.mjs \
 *       --out tools/industry-tools/coverage-report.json
 */

import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { writeFile } from 'node:fs/promises';

import {
  auditSt3ggCoverage,
  defaultCoverageFile,
  defaultEncodedRoot,
} from '../../packages/bu-tpi/src/attackdna/st3gg-coverage.ts';

const HERE = dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const out = { out: null, coverage: null, encodedRoot: null, quiet: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out') out.out = argv[++i];
    else if (a === '--coverage') out.coverage = argv[++i];
    else if (a === '--encoded-root') out.encodedRoot = argv[++i];
    else if (a === '--quiet') out.quiet = true;
    else if (a === '--help' || a === '-h') {
      console.log(
        `Usage: node st3gg-coverage-audit.mjs [--out FILE] [--coverage FILE] [--encoded-root DIR] [--quiet]`,
      );
      process.exit(0);
    } else {
      console.error(`unknown arg: ${a}`);
      process.exit(2);
    }
  }
  return out;
}

function formatRow(f) {
  const flag = f.mismatch ? '!' : ' ';
  return `${flag} ${f.categoryId.padEnd(32)} ${f.layer.padEnd(11)} declared=${f.declaredStatus.padEnd(8)} observed=${f.observedStatus.padEnd(8)} files=${f.matchedFiles}`;
}

async function main() {
  const args = parseArgs(process.argv);

  const report = await auditSt3ggCoverage({
    coverageFile: args.coverage ? resolve(process.cwd(), args.coverage) : defaultCoverageFile(),
    encodedRoot: args.encodedRoot ? resolve(process.cwd(), args.encodedRoot) : defaultEncodedRoot(),
  });

  if (!args.quiet) {
    console.log(`ST3GG coverage audit — ${report.categoryCount} categories`);
    console.log(
      `  present=${report.presentCount}  partial=${report.partialCount}  missing=${report.missingCount}  mismatch=${report.mismatchCount}`,
    );
    console.log('---');
    for (const f of report.findings) console.log(formatRow(f));
  }

  if (args.out) {
    const abs = resolve(process.cwd(), args.out);
    await writeFile(abs, JSON.stringify(report, null, 2) + '\n', 'utf8');
    if (!args.quiet) console.log(`report written to ${abs}`);
  }

  const unresolved = report.findings.filter((f) => f.matchedFiles === 0);
  if (unresolved.length > 0) {
    console.error(`FAIL: ${unresolved.length} categories resolved to zero fixtures`);
    process.exit(1);
  }
  if (report.mismatchCount > 0) {
    console.error(`FAIL: ${report.mismatchCount} declared/observed status mismatches`);
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('st3gg-coverage-audit failed:', err);
  process.exit(2);
});
