// SPDX-License-Identifier: Apache-2.0
/**
 * bundle-budget — P1.1 / Epic-3 F10 / DoD#10.
 *
 * Parses a `webpack-bundle-analyzer` JSON report (emitted by `next build` with
 * BUNDLE_STATS=1 — see next.config.ts) and FAILS the build if the Tatami
 * surface exceeds its gz budget OR if the dynamic-import split regressed.
 *
 * This is the ONLY empirical proof of the collapsed-Rail ~0-JS split: vitest
 * resolves `import()` eagerly, so a unit test can never see the chunk boundary.
 * Here we read the real built chunks and assert the lazily-imported panel
 * bodies (`Scanner{Proof,Trace}Panel`) live in NON-initial chunks, never in the
 * route's eager bundle.
 *
 * Budget surfaces:
 *  - **rail shell** — eager `design/tatami/*` presentational code (≤ 30 KB gz)
 *  - **adapter**    — `lib/tatami/adapters/*` record→proof mappers (≤ 15 KB gz)
 *  - **panel leak** — any `Scanner*Panel` byte shipped in an INITIAL chunk → 0
 *
 * gz is summed PER MODULE (webpack-bundle-analyzer gzips each module on its
 * own). That over-counts vs the real combined gz of a chunk, so the gate is
 * deliberately conservative: passing it is a strong upper-bound guarantee.
 *
 * Pure functions are exported for unit testing; the CLI wires them to a file.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** Hard gz ceilings (DoD F10). Tune at HC-1 against the first real CI run. */
export const TATAMI_BUDGET = {
  railShellGzMax: 30 * 1024,
  adapterGzMax: 15 * 1024,
};

const RAIL_RE = /[/\\]design[/\\]tatami[/\\]/;
const ADAPTER_RE = /[/\\]lib[/\\]tatami[/\\]adapters[/\\]/;
const PANEL_RE = /Scanner(?:Proof|Trace)Panel/;

/** A `.toFixed`-stable KB label. */
export function fmtKB(bytes) {
  return `${(bytes / 1024).toFixed(1)}KB`;
}

/** Does this analyzer chunk render EAGERLY for at least one entrypoint? */
export function isInitialChunk(chunk) {
  const map = chunk?.isInitialByEntrypoint;
  return map != null && typeof map === 'object' && Object.values(map).some(Boolean);
}

/** Recurse an analyzer module tree, pushing leaf {path, gzipSize} into `out`. */
function collectLeaves(node, out) {
  if (node == null) return;
  if (Array.isArray(node.groups) && node.groups.length > 0) {
    for (const child of node.groups) collectLeaves(child, out);
    return;
  }
  const path = node.path ?? node.label ?? '';
  const gzipSize =
    typeof node.gzipSize === 'number'
      ? node.gzipSize
      : typeof node.parsedSize === 'number'
        ? node.parsedSize
        : 0;
  out.push({ path, gzipSize });
}

/** Flatten the whole report into leaf modules tagged with their chunk's initial-ness. */
export function flattenModules(report) {
  const modules = [];
  for (const chunk of Array.isArray(report) ? report : []) {
    const initial = isInitialChunk(chunk);
    const leaves = [];
    collectLeaves(chunk, leaves);
    for (const leaf of leaves) modules.push({ ...leaf, initial });
  }
  return modules;
}

/** Attribute gz to each Tatami surface. */
export function summarize(modules) {
  let railShellGz = 0;
  let adapterGz = 0;
  let panelLeakGz = 0;
  let lazyPanelGz = 0;
  let lazyPanelModules = 0;
  for (const m of modules) {
    if (RAIL_RE.test(m.path) && m.initial) railShellGz += m.gzipSize;
    if (ADAPTER_RE.test(m.path)) adapterGz += m.gzipSize;
    if (PANEL_RE.test(m.path)) {
      if (m.initial) panelLeakGz += m.gzipSize;
      else {
        lazyPanelGz += m.gzipSize;
        lazyPanelModules += 1;
      }
    }
  }
  return { railShellGz, adapterGz, panelLeakGz, lazyPanelGz, lazyPanelModules };
}

/**
 * Apply the budget. Fails LOUD: a zero attribution means the parser found
 * nothing (stats misconfigured / a path moved), which must fail rather than
 * silently pass a gate that measured nothing.
 */
export function checkBudget(summary, budget = TATAMI_BUDGET) {
  const failures = [];
  if (summary.railShellGz === 0) {
    failures.push(
      'rail-shell: 0 bytes attributed — no eager design/tatami modules found (stats misconfigured or path moved)',
    );
  } else if (summary.railShellGz > budget.railShellGzMax) {
    failures.push(
      `rail-shell ${fmtKB(summary.railShellGz)} exceeds budget ${fmtKB(budget.railShellGzMax)}`,
    );
  }
  if (summary.adapterGz === 0) {
    failures.push(
      'adapter: 0 bytes attributed — no lib/tatami/adapters modules found (stats misconfigured or path moved)',
    );
  } else if (summary.adapterGz > budget.adapterGzMax) {
    failures.push(
      `adapter ${fmtKB(summary.adapterGz)} exceeds budget ${fmtKB(budget.adapterGzMax)}`,
    );
  }
  if (summary.panelLeakGz > 0) {
    failures.push(
      `dynamic-split REGRESSION: ${fmtKB(summary.panelLeakGz)} of Scanner*Panel shipped in an INITIAL chunk (must be lazy)`,
    );
  }
  if (summary.lazyPanelModules === 0) {
    failures.push(
      'dynamic-split UNPROVEN: no Scanner*Panel module found in any lazy chunk (the ~0-JS split is not happening)',
    );
  }
  return { pass: failures.length === 0, failures };
}

/** End-to-end over a parsed report. */
export function evaluateReport(report, budget = TATAMI_BUDGET) {
  const summary = summarize(flattenModules(report));
  return { summary, ...checkBudget(summary, budget) };
}

/** CLI: `node scripts/bundle-budget.mjs [path-to-stats.json]`. */
function main(argv) {
  const statsPath = argv[2] ?? 'bundle-stats.tatami.json';
  let report;
  try {
    report = JSON.parse(readFileSync(statsPath, 'utf8'));
  } catch (err) {
    console.error(`[bundle-budget] cannot read stats at ${statsPath}: ${err.message}`);
    console.error('[bundle-budget] run: BUNDLE_STATS=1 npm run build');
    process.exit(2);
  }
  const { summary, pass, failures } = evaluateReport(report);
  console.log('[bundle-budget] Tatami surface (gz, conservative per-module sum):');
  console.log(`  rail shell : ${fmtKB(summary.railShellGz)} / ${fmtKB(TATAMI_BUDGET.railShellGzMax)}`);
  console.log(`  adapter    : ${fmtKB(summary.adapterGz)} / ${fmtKB(TATAMI_BUDGET.adapterGzMax)}`);
  console.log(`  lazy panels: ${fmtKB(summary.lazyPanelGz)} across ${summary.lazyPanelModules} module(s) (split proof)`);
  if (pass) {
    console.log('[bundle-budget] PASS');
    process.exit(0);
  }
  console.error('[bundle-budget] FAIL:');
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main(process.argv);
}
