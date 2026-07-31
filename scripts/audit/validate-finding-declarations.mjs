#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
// E1.S9 — Auditor-of-Auditors: finding-class declaration validator.
//
// Spec (audit/REMEDIATION-PLAN.md lines 278-291):
//   "Asserts: every new finding-class issue declared in PR has severity,
//    evidence, principle, recommendation, effort, confidence."
//
// Trigger: a PR is "declaring a finding-class issue" when it touches
// audit/findings-register.csv (new rows) OR adds/modifies files under
// audit/findings/*.md OR contains a `<!-- finding-class --> ... -->` block in
// the PR body. If none of those triggers fire, the validator exits 0.
//
// Required fields (the 6 listed in the plan-spec, matching the existing
// finding markdown frontmatter format and the existing CSV columns):
//   - Severity   (P0|P1|P2|P3, optionally with prefix)
//   - Evidence   (markdown only — CSV register lacks this column; the
//                 register schema covers it via the Title + the linked .md)
//   - Principle
//   - Recommendation (markdown only — CSV register lacks this column)
//   - Effort     (XS|S|M|L|XL or hour/day estimate)
//   - Confidence (High|Medium|Low)
//
// CSV register schema does NOT carry Evidence/Recommendation columns — those
// fields live in the linked findings/NN-*.md sections. So the CSV-row check
// validates the 4 columns that ARE in the register (Severity, Principle,
// Effort, Confidence) and emits a hint that Evidence / Recommendation must
// exist in the corresponding findings/NN-*.md section.
//
// Local invocation:
//   node scripts/audit/validate-finding-declarations.mjs \
//        --pr-base origin/main --pr-head HEAD \
//        [--pr-body-file path/to/body.md]
//
// CI invocation: ui-audit.yml writes ${{ github.event.pull_request.body }}
// to a temp file then passes --pr-body-file.
//
// Exit codes: 0 = no triggers OR all valid; 1 = at least one violation.
//
// Note on subprocess use: this script invokes `git` via `execFileSync` with
// argv arrays — no shell, no string interpolation. Safe by construction.

import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, dirname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(__filename), '..', '..');

const REQUIRED_FIELDS_MD = [
  'Severity',
  'Evidence',
  'Principle',
  'Recommendation',
  'Effort',
  'Confidence',
];

// CSV register lacks Evidence / Recommendation; those live in the linked .md.
const REQUIRED_FIELDS_CSV = ['Severity', 'Principle', 'Effort', 'Confidence'];

// Inline PR-body block format — copy-paste-ready template:
//   <!-- finding-class -->
//   Severity: P1
//   Evidence: …
//   …
//   <!-- /finding-class -->
const PR_BODY_BLOCK_RE =
  /<!--\s*finding-class\s*-->([\s\S]*?)<!--\s*\/finding-class\s*-->/g;

// Markdown finding section — kicks off with `### F-N-NNN — title` per
// audit/findings/01-visual-brand.md convention.
const MD_FINDING_HEADER_RE = /^###\s+F-\d+-\d+\s+/m;

function parseArgs(argv) {
  const out = { prBase: 'origin/main', prHead: 'HEAD', prBodyFile: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--pr-base') out.prBase = argv[++i];
    else if (a === '--pr-head') out.prHead = argv[++i];
    else if (a === '--pr-body-file') out.prBodyFile = argv[++i];
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
    'Usage: validate-finding-declarations.mjs [options]\n' +
      '  --pr-base <ref>           git ref (default: origin/main)\n' +
      '  --pr-head <ref>           git ref (default: HEAD)\n' +
      '  --pr-body-file <path>     path to PR body markdown (optional)\n' +
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

function getNewCsvRows(root, prBase, prHead) {
  // Diff the register file against the PR base; keep added '+' lines that are
  // not the file marker and not the header row.
  let diff;
  try {
    diff = execFileSync(
      'git',
      [
        'diff',
        '--unified=0',
        `${prBase}...${prHead}`,
        '--',
        'audit/findings-register.csv',
      ],
      { cwd: root, encoding: 'utf8' }
    );
  } catch {
    return [];
  }
  const rows = [];
  for (const line of diff.split('\n')) {
    if (!line.startsWith('+')) continue;
    if (line.startsWith('+++')) continue;
    const body = line.slice(1);
    if (body.startsWith('ID,')) continue; // header line
    if (body.length === 0) continue;
    rows.push(body);
  }
  return rows;
}

function parseCsvRow(rawRow) {
  // Schema (header from audit/findings-register.csv line 1):
  // ID,Severity,Dimension,Surface,Component,State,Principle,Effort,Confidence,
  //   Theme,Quick-win,Title
  // We only need Severity (col 1), Principle (col 6), Effort (col 7),
  // Confidence (col 8). Component (col 4) may contain unquoted commas, but
  // those columns sit BEFORE column 4. We do however need to walk past any
  // quoted field carefully. Use a minimal hand-rolled splitter that respects
  // double-quoted cells.
  const cells = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < rawRow.length; i++) {
    const ch = rawRow[i];
    if (ch === '"') {
      // RFC 4180-style escape: "" inside quoted = literal "
      if (inQuotes && rawRow[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      cells.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  return {
    id: cells[0],
    severity: cells[1],
    dimension: cells[2],
    surface: cells[3],
    component: cells[4],
    state: cells[5],
    principle: cells[6],
    effort: cells[7],
    confidence: cells[8],
    theme: cells[9],
    quickWin: cells[10],
    title: cells[11],
    raw: rawRow,
  };
}

function validateCsvRow(row) {
  const issues = [];
  const checks = {
    Severity: row.severity,
    Principle: row.principle,
    Effort: row.effort,
    Confidence: row.confidence,
  };
  for (const field of REQUIRED_FIELDS_CSV) {
    const v = checks[field];
    if (v === undefined || v === null || v.trim().length === 0) {
      issues.push(`field "${field}" is empty`);
    }
  }
  return issues;
}

function getFindingMarkdownPaths(changedFiles) {
  return changedFiles.filter(
    (p) => /^audit\/findings\/.+\.md$/.test(p) && !p.endsWith('00-checklist.md')
  );
}

// Extracts each `### F-N-NNN — title` section with its body.
function extractMarkdownFindingSections(text) {
  const lines = text.split('\n');
  const sections = [];
  let cur = null;
  for (const line of lines) {
    const m = line.match(/^###\s+(F-\d+-\d+)\s+—?\s*(.*)$/);
    if (m !== null) {
      if (cur !== null) sections.push(cur);
      cur = { id: m[1], title: m[2], body: '' };
    } else if (cur !== null) {
      cur.body += line + '\n';
    }
  }
  if (cur !== null) sections.push(cur);
  return sections;
}

function validateMarkdownSection(section) {
  // The body uses fenced/unfenced label lines like `Severity: P1`, `Evidence:
  // …`, etc. We accept any line starting with the field name + colon (case
  // sensitive — the existing files all use Title-case labels).
  const issues = [];
  for (const field of REQUIRED_FIELDS_MD) {
    // ^Field:  <something non-empty>$  (multi-line value continues on subsequent
    // indented lines but we only check the first line)
    const re = new RegExp('^' + field + ':\\s*(\\S.*)$', 'm');
    const m = section.body.match(re);
    if (m === null) {
      issues.push(`finding ${section.id}: missing "${field}:" field`);
    } else if (m[1].trim().length === 0) {
      issues.push(`finding ${section.id}: "${field}:" field is empty`);
    }
  }
  return issues;
}

function extractPrBodyBlocks(prBody) {
  if (typeof prBody !== 'string') return [];
  const blocks = [];
  // Reset lastIndex to keep the regex stateless across calls.
  PR_BODY_BLOCK_RE.lastIndex = 0;
  let m;
  while ((m = PR_BODY_BLOCK_RE.exec(prBody)) !== null) {
    blocks.push(m[1]);
  }
  return blocks;
}

function validatePrBodyBlock(block, idx) {
  const issues = [];
  for (const field of REQUIRED_FIELDS_MD) {
    const re = new RegExp('^' + field + ':\\s*(\\S.*)$', 'm');
    const m = block.match(re);
    if (m === null) {
      issues.push(`pr-body finding-class block #${idx + 1}: missing "${field}:"`);
    } else if (m[1].trim().length === 0) {
      issues.push(
        `pr-body finding-class block #${idx + 1}: "${field}:" field is empty`
      );
    }
  }
  return issues;
}

export function runValidation({
  root,
  changedFiles,
  prBody,
  newCsvRows,
  prBase = 'origin/main',
  prHead = 'HEAD',
  resolveNewCsvRows = getNewCsvRows,
}) {
  const allIssues = [];
  const summary = {
    csvRowsChecked: 0,
    mdFindingsChecked: 0,
    prBodyBlocksChecked: 0,
    triggered: false,
  };

  // 1) CSV register rows. `newCsvRows` is an injection seam for tests; in
  // production we resolve via `resolveNewCsvRows` (default: git-backed
  // `getNewCsvRows`) using the caller-supplied `prBase`/`prHead` refs.
  let csvRows = newCsvRows;
  if (csvRows === undefined && changedFiles.includes('audit/findings-register.csv')) {
    csvRows = resolveNewCsvRows(root, prBase, prHead);
  }
  if (Array.isArray(csvRows) && csvRows.length > 0) {
    summary.csvRowsChecked = csvRows.length;
    summary.triggered = true;
    for (const raw of csvRows) {
      const row = parseCsvRow(raw);
      const issues = validateCsvRow(row);
      for (const issue of issues) {
        allIssues.push(`audit/findings-register.csv:${row.id || '<unknown>'}: ${issue}`);
      }
    }
  }

  // 2) Finding markdown files.
  const mdPaths = getFindingMarkdownPaths(changedFiles);
  for (const relPath of mdPaths) {
    const abs = resolve(root, relPath);
    if (!existsSync(abs)) continue;
    const text = readFileSync(abs, 'utf8');
    if (!MD_FINDING_HEADER_RE.test(text)) continue;
    const sections = extractMarkdownFindingSections(text);
    for (const section of sections) {
      summary.mdFindingsChecked++;
      summary.triggered = true;
      const issues = validateMarkdownSection(section);
      for (const issue of issues) {
        allIssues.push(`${relPath}: ${issue}`);
      }
    }
  }

  // 3) PR body inline blocks.
  const blocks = extractPrBodyBlocks(prBody);
  summary.prBodyBlocksChecked = blocks.length;
  if (blocks.length > 0) summary.triggered = true;
  for (let i = 0; i < blocks.length; i++) {
    const issues = validatePrBodyBlock(blocks[i], i);
    allIssues.push(...issues);
  }

  return { issues: allIssues, summary };
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
  const prBody =
    opts.prBodyFile !== null
      ? readFileSync(
          isAbsolute(opts.prBodyFile)
            ? opts.prBodyFile
            : resolve(process.cwd(), opts.prBodyFile),
          'utf8'
        )
      : '';

  const { issues, summary } = runValidation({
    root,
    changedFiles,
    prBody,
    prBase: opts.prBase,
    prHead: opts.prHead,
  });

  if (!summary.triggered) {
    console.log(
      '[validate-finding-declarations] OK — no finding-class declarations in this PR.'
    );
    process.exit(0);
  }

  if (issues.length === 0) {
    console.log(
      `[validate-finding-declarations] OK — checked ${summary.csvRowsChecked} CSV rows, ${summary.mdFindingsChecked} markdown findings, ${summary.prBodyBlocksChecked} PR-body blocks.`
    );
    process.exit(0);
  }

  console.error('[validate-finding-declarations] FAIL — missing required fields:');
  for (const issue of issues) console.error('  - ' + issue);
  console.error(
    `\nRequired markdown fields: ${REQUIRED_FIELDS_MD.join(', ')}\n` +
      `Required CSV columns:     ${REQUIRED_FIELDS_CSV.join(', ')}\n` +
      'See audit/findings/01-visual-brand.md (F-1-001) for the canonical format.'
  );
  process.exit(1);
}

// Only run main() when invoked as a script (not when imported by tests).
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  parseArgs,
  parseCsvRow,
  validateCsvRow,
  validateMarkdownSection,
  validatePrBodyBlock,
  extractMarkdownFindingSections,
  extractPrBodyBlocks,
  REQUIRED_FIELDS_MD,
  REQUIRED_FIELDS_CSV,
};
