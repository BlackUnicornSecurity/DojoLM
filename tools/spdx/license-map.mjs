// SPDX-License-Identifier: Apache-2.0
//
// DojoLM per-tier SPDX license map — the single source of truth for which SPDX
// identifier each tracked source file must carry. Consumed by:
//   - tools/spdx/check-spdx.mjs   (npm run lint:spdx) — verifies headers
//   - tools/spdx/apply-spdx.mjs   (npm run fix:spdx)  — inserts/retags headers
//   - .husky/pre-commit            — staged-scope check
//
// Open-core tiering (OSS Release Program D-4/D-5/D-6/D-7, founder-fired 2026-06-11):
//   Apache-2.0  → community core (the offense tool + shared substrate)
//   BUSL-1.1    → ee-hold enterprise capability (governance/compliance/assurance)
//   MIT         → the 11 §9 DO-NOT-TOUCH files (left exactly as-is; never relicensed)
//
// SCOPE (P3.1a — register D-P3.1a-1): this map classifies tracked source-extension
// files under `packages/`, `tools/`, `scripts/` ONLY. Files under deploy/, .github/,
// docs/, team/, audit/ and root configs are OUT OF SCOPE for P3.1a (owned by P3.6 /
// P4 / P5) and resolve to `out-of-scope` (skipped, never stamped, headers untouched).
//
// DESIGN: pure + exported for unit testing. No runtime dependency, no I/O — the
// §9 list is INJECTED as text (read from `.dojolm-section9-do-not-touch.txt` by the
// caller) so the classifier is fully deterministic + coverable in-process. The
// per-symbol ee-hold lists in p2-5-export-classification are PROVISIONAL; the
// authoritative export cut is the P5-A symbol-level import-graph gate. This map
// governs only the per-file LICENSE HEADER (a comment), not export inclusion.
//
// PRECEDENCE (first match wins): not-source → out-of-scope → §9 → ignore
// → community-override → busl → apache(default). §9 + ignore are checked BEFORE
// busl so a §9 file in an ee dir (lib/compliance/checklist-store.ts) and a data
// corpus under an ee engine dir are never mis-stamped. (The P3.1a `defer` tier
// retired with G-7/P3.1b — the bushido page cluster is now fully classified.)
//
// CROSS-TIER RE-EXPORT NOTE: a community (Apache) barrel MAY legitimately re-export
// a BUSL-tier sibling — that is NOT a tiering bug: this map governs only the per-file
// LICENSE HEADER. Severing the community→ee import edge is the export import-graph cut
// (P5-A §7 / the G-6/G-7/G-8 carves), not a header concern — do NOT "fix" such a
// re-export by relicensing the Apache barrel. (Historical example: the compliance
// barrels `bu-tpi/src/compliance/{index,client}.ts` re-exported the ee book modules
// until **G-8 severed that edge** — the six book modules now sit behind the BUSL
// `compliance/book.ts` sub-barrel, which this map stamps BUSL.)

import path from 'node:path';

/** Canonical SPDX License-List identifiers. `BUSL-1.1` is the valid id; the
 * program's "BSL-1.1" shorthand is NOT a valid SPDX id and must never appear in a
 * header. */
export const LICENSE_IDS = Object.freeze({
  APACHE: 'Apache-2.0',
  BUSL: 'BUSL-1.1',
  MIT: 'MIT',
});

/** Source extensions that carry an SPDX header (per docs/dev/license-policy.md). */
export const SOURCE_EXTENSIONS = Object.freeze([
  '.ts', '.tsx', '.js', '.cjs', '.mjs', '.yaml', '.yml', '.sh',
]);

/** P3.1a stamping roots. Everything else is `out-of-scope`. */
export const IN_SCOPE_ROOTS = Object.freeze(['packages/', 'tools/', 'scripts/']);

/** How many leading lines hold the SPDX header (policy: "first 5 lines"; a shebang
 * pushes the header to line 2, still within range). Shared by the checker + applier. */
export const HEADER_SCAN_LINES = 5;

/** The set of tiers `classify` can return. (`defer` retired with G-7/P3.1b;
 * the checker still SKIPS any unknown/non-stamped tier string fail-safe.) */
export const TIERS = Object.freeze([
  'apache', 'busl', 'section9', 'ignore', 'out-of-scope', 'not-source',
]);

// ---------------------------------------------------------------------------
// glob → RegExp (self-contained; mirrors tools/check-repo-boundary.mjs semantics:
// `**` crosses `/`, `*` does not, `?` is one non-slash char, regex specials escaped).
// ---------------------------------------------------------------------------
export function globToRegExp(glob) {
  let re = '^';
  let i = 0;
  while (i < glob.length) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        re += '.*';
        i += 2;
        if (glob[i] === '/') i++;
      } else {
        re += '[^/]*';
        i++;
      }
    } else if (c === '?') {
      re += '[^/]';
      i++;
    } else if ('.+^$()[]{}|\\'.includes(c)) {
      re += '\\' + c;
      i++;
    } else {
      re += c;
      i++;
    }
  }
  re += '$';
  return new RegExp(re);
}

/** Build a [RegExp, reason][] table from a list of [glob, reason] pairs. */
function table(pairs) {
  return pairs.map(([glob, reason]) => [globToRegExp(glob), reason]);
}

/**
 * Parse `.dojolm-section9-do-not-touch.txt` into a Set of repo-relative paths.
 * Mirrors the .husky/pre-commit parser: `#` comment lines + blank lines skipped,
 * one path per line, exact-match semantics. Loading the list (vs hard-coding it)
 * means the map never drifts from the enforced §9 source of truth.
 */
export function parseSection9List(text) {
  const out = new Set();
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    out.add(line);
  }
  return out;
}

/** Comment token for a path's extension: `//` for ts/tsx/js/cjs/mjs, `#` for
 * yaml/yml/sh. Returns null for an unhandled extension. */
export function commentTokenFor(filePath) {
  const ext = path.extname(filePath);
  if (['.ts', '.tsx', '.js', '.cjs', '.mjs'].includes(ext)) return '//';
  if (['.yaml', '.yml', '.sh'].includes(ext)) return '#';
  return null;
}

/** Normalize a newline-delimited path list (git output / a paths file): strip a
 * trailing CR (CRLF), trim surrounding whitespace, drop blank lines. Shared by the
 * checker + applier so their `--staged` path handling can never diverge. */
export function splitLines(raw) {
  return raw.split('\n').map(l => l.replace(/\r$/, '').trim()).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Classification tables (OSS-release P2.5 deliverable-3 §1–§3 + the import
// analysis recorded in team/QA/checklists/oss-release-p3-1.md DECISIONS).
// ---------------------------------------------------------------------------
const W = 'packages/dojolm-web/src/';
const BT = 'packages/bu-tpi/src/';

// IGNORE — never stamped. Data corpora (katana ISO-17025 gate — armory fixtures
// must never be hand-edited), generated output, and never-public-internal trees.
// NOTE: the ONLY source-ext data corpus is packages/bu-tpi/fixtures/** (the armory —
// .ts/.js/.sh/.yaml payload data under the katana gate). `validation/corpus/*.ts`,
// `ground-truth`, etc. are ENGINE CODE (e.g. "KATANA Corpus Expander"), NOT data —
// they ship BUSL via the validation glob. The build-output globs are package-root
// scoped (`packages/*/…`) so they never swallow a nested source dir named "coverage"
// (e.g. the community app/api/llm/coverage route). All three are also gitignored, so
// these globs are defensive belt-and-suspenders.
const IGNORE_GLOBS = table([
  ['packages/bu-tpi/fixtures/**', 'armory corpus — katana ISO-17025 gate (never hand-edit fixtures)'],
  ['packages/bu-tpi/fixtures-public-sample/**', 'curated public-safe fixtures sample — data, not source (F-QA-003; ships renamed onto fixtures/)'],
  [`${W}app/(design)/canvas/**`, 'never-public-internal design showcase (export-classification §3 / round-5 H5-1)'],
  ['packages/**/*.generated.*', 'generated output'],
  ['packages/**/next-env.d.ts', 'Next.js generated ambient types'],
  ['packages/*/dist/**', 'build output'],
  ['packages/*/.next/**', 'build output'],
  ['packages/*/coverage/**', 'coverage output'],
  ['**/node_modules/**', 'vendored dependencies'],
]);
const IGNORE_FILES = new Set([
  `${W}lib/hooks/useKagamiData.ts`, // dead code (zero consumers) — P5 G-5 drop (export-classification §3)
]);

// (The P3.1a DEFER mechanism is gone: G-7 split the bushido page cluster and
// P3.1b stamped the outputs — the page shell / Dashboard / community stub /
// loader resolve apache (default glob), the BushidoSurface unit + the two
// compliance-posture clients resolve busl (explicit below). D-P3.1a-2 closed.)

// COMMUNITY override (Apache) for files that sit INSIDE a BUSL glob but are
// community per the manifest (the public catalog read).
const COMMUNITY_OVERRIDE_FILES = new Set([
  `${W}app/api/compliance/mappings/route.ts`, // PUBLIC catalog read (ee-boundary §5)
]);

// BUSL — ee-hold enterprise capability (explicit files + dir globs).
const BUSL_FILES = new Set([
  // bushido components with a certain, stable ee tier (D-P3.1a-2)
  `${W}app/(shell)/admin/bushido/ComplianceClient.tsx`,
  `${W}app/(shell)/admin/bushido/BushidoSignoffPanel.tsx`,
  `${W}app/(shell)/admin/bushido/__tests__/ComplianceClient.test.tsx`,
  `${W}app/(shell)/admin/bushido/__tests__/BushidoSignoffPanel.test.tsx`,
  // G-7 split outputs (P3.1b): the ee-hold surface unit + the two
  // compliance-posture clients it mounts (readiness aggregates the sign-off
  // ledger; the AIVSS summary feeds the Coverage tab). The community-side
  // outputs (page shell, BushidoDashboard, load-chains, the
  // BushidoSurface.community stub + their tests) resolve apache by default.
  `${W}app/(shell)/admin/bushido/BushidoSurface.tsx`,
  `${W}app/(shell)/admin/bushido/BushidoReadinessClient.tsx`,
  `${W}app/(shell)/admin/bushido/BushidoAivssSummary.tsx`,
  `${W}app/(shell)/admin/bushido/__tests__/BushidoSurface.test.tsx`,
  `${W}app/(shell)/admin/bushido/__tests__/BushidoReadinessClient.test.tsx`,
  `${W}app/(shell)/admin/bushido/__tests__/BushidoAivssSummary.test.tsx`,
  // lib/bushido — the signoff LEDGER only (narrowing); fixtures/readiness ship community
  `${W}lib/bushido/signoff-store.ts`,
  `${W}lib/bushido/signoff-signer.ts`,
  `${W}lib/bushido/signoff-claims.ts`,
  `${W}lib/bushido/signoff-store-pg-worm.ts`,
  `${W}lib/bushido/signoff-store-s3.ts`,
  `${W}lib/bushido/__tests__/signoff-store.test.ts`,
  `${W}lib/bushido/__tests__/signoff-signer.test.ts`,
  `${W}lib/bushido/__tests__/signoff-claims.test.ts`,
  // surface-libs (single files outside the ee lib dirs)
  `${W}lib/validation-executor.ts`,
  `${W}lib/validation-rate-limit.ts`,
  // ee validation-assurance: renders the enterprise ISO-17025 results report
  // from a ValidationRun (sibling to validation-executor; kept out of OSS).
  `${W}lib/validation-html-report.ts`,
  `${W}lib/__tests__/validation-html-report.test.ts`,
  // ee validation-assurance: evidence-mode executor (spawns the bu-tpi
  // corpus runner; sibling to validation-executor; kept out of OSS).
  `${W}lib/validation-evidence.ts`,
  `${W}lib/__tests__/validation-evidence.test.ts`,
  // ee validation-assurance: FULL engagement report binder (run + Project →
  // 14-section report; sibling to validation-html-report; kept out of OSS).
  `${W}lib/validation-full-report.ts`,
  `${W}lib/validation-full-report-style.ts`,
  `${W}lib/__tests__/validation-full-report.test.ts`,
  // Sensei EE doer skill bodies (Pillar C). The Apache siblings in the same
  // dir (catalog-oss/load-skills/generate/types/index) stay community; only
  // the EE catalog is ee-hold and reached via the guarded dynamic import.
  `${W}lib/sensei/personas/skills/catalog-ee.ts`,
  // @dojolm/mcp-control EE catalog + EE skill prompts (control-plane Pillar A).
  // The Apache siblings (catalog/prompts/server/transports) stay community;
  // only these two ee-hold files are reached via the guarded dynamic import.
  'packages/dojolm-control-mcp/src/catalog/catalog-ee.ts',
  'packages/dojolm-control-mcp/src/prompts/prompts-ee.ts',
  // bu-tpi compliance BOOK modules (G-8 carved these OUT of the public
  // Apache barrels index.ts/client.ts into the ee-hold sub-barrel book.ts;
  // the barrels + import-boundary.test.ts stay Apache — see book.ts comment)
  `${BT}compliance/report-generator.ts`,
  `${BT}compliance/mapper.ts`,
  `${BT}compliance/delta-reporter.ts`,
  `${BT}compliance/benchmark-bridge.ts`,
  `${BT}compliance/llm-test-capabilities.ts`,
  `${BT}compliance/evidence-automation.ts`,
  // G-8: the ee-hold book sub-barrel (BUSL re-export point) + its test
  `${BT}compliance/book.ts`,
  `${BT}compliance/book.test.ts`,
  // …and the book modules' tests (subject-tier inheritance)
  `${BT}compliance/report-generator.test.ts`,
  `${BT}compliance/mapper.test.ts`,
  `${BT}compliance/delta-reporter.test.ts`,
  `${BT}compliance/benchmark-bridge.test.ts`,
  `${BT}compliance/llm-test-capabilities.test.ts`,
  `${BT}compliance/evidence-automation.test.ts`,
  `${BT}compliance/__tests__/report-h92.test.ts`,
  `${BT}compliance/__tests__/llm-test-capabilities-h104.test.ts`,
  `${BT}compliance/__tests__/evidence-automation-h103.test.ts`,
]);

const BUSL_GLOBS = table([
  // enterprise admin pages
  [`${W}app/(shell)/admin/validation/**`, 'ee surface — Katana validation page'],
  [`${W}app/(shell)/admin/projects/**`, 'ee surface — Projects engagement console (full-report engagement half)'],
  [`${W}app/(shell)/admin/amaterasu/**`, 'ee surface — Amaterasu dashboard'],
  [`${W}app/(shell)/admin/kagami/**`, 'ee surface — Kagami dashboard'],
  [`${W}app/(shell)/admin/shingan/**`, 'ee surface — Shingan workbench'],
  [`${W}app/(shell)/admin/users/**`, 'ee surface — RBAC/users admin'],
  [`${W}app/(shell)/admin/onigaeshi/**`, 'ee surface — Onigaeshi WORM audit'],
  // enterprise design components
  [`${W}design/compliance/**`, 'ee components — compliance book primitives'],
  [`${W}design/amaterasu/**`, 'ee components — Amaterasu primitives'],
  [`${W}design/shingan/**`, 'ee components — Shingan primitives'],
  // enterprise surface libs
  [`${W}lib/validation/**`, 'ee lib — Katana validation'],
  [`${W}lib/projects/**`, 'ee lib — Projects engagement schema + storage (full-report engagement half)'],
  [`${W}lib/amaterasu/**`, 'ee lib — Amaterasu'],
  [`${W}lib/kagami/**`, 'ee lib — Kagami'],
  [`${W}lib/compliance/**`, 'ee lib — compliance book adapters + book fixtures (checklist-store.ts is §9, skipped by precedence)'],
  // enterprise API routes (the Compliance Book API + ee surfaces)
  [`${W}app/api/admin/validation/**`, 'ee route — Katana validation'],
  [`${W}app/api/admin/projects/**`, 'ee route — Projects engagement CRUD + run association'],
  [`${W}app/api/admin/bushido/chains/**`, 'ee route — bushido chains'],
  [`${W}app/api/admin/bushido/sign-off/**`, 'ee route — bushido sign-off'],
  [`${W}app/api/admin/bushido/verify-attestation/**`, 'ee route — attestation verify'],
  [`${W}app/api/admin/webauthn/sign-off/**`, 'ee route — sign-off WebAuthn step-up'],
  [`${W}app/api/admin/users/**`, 'ee route — RBAC/users'],
  [`${W}app/api/admin/onigaeshi/**`, 'ee route — Onigaeshi audit'],
  [`${W}app/api/kagami/**`, 'ee route — Kagami'],
  [`${W}app/api/attackdna/query/**`, 'ee route — Amaterasu lineage query'],
  [`${W}app/api/attackdna/analyze/**`, 'ee route — Amaterasu ablation analyze'],
  [`${W}app/api/compliance/**`, 'ee route — Compliance Book API (mappings/route.ts is a community override)'],
  // enterprise engine — the one clean whole-dir move (M1)
  [`${BT}validation/**`, 'ee engine — Katana validation (M1 clean move)'],
  // enterprise Tatami forensic layer — seal/export/attest (P3.1 Epic 9).
  // Pre-registered so the OSS-export gate fails closed the moment an EE dir
  // appears; the F15 eslint tripwire enforces OSS lib/tatami never imports it.
  [`${W}lib/tatami-vault/**`, 'ee lib — Tatami seal/export forensic layer (P3.1)'],
  [`${W}app/(shell)/admin/tatami-vault/**`, 'ee surface — Tatami sealed-export workspace (P3.1)'],
  [`${W}app/api/admin/tatami-vault/**`, 'ee route — Tatami seal/export API (P3.1)'],
]);

/**
 * Classify a repo-relative path to its license tier + a human reason.
 * @param {string} filePath repo-relative path (a leading `./` is tolerated)
 * @param {{ section9Set?: Set<string> }} [opts] the parsed §9 path set
 * @returns {{ tier: string, reason: string }}
 */
export function classify(filePath, opts = {}) {
  const section9 = opts.section9Set || new Set();
  const p = filePath.replace(/^\.\/+/, '');

  const ext = path.extname(p);
  if (!SOURCE_EXTENSIONS.includes(ext)) {
    return { tier: 'not-source', reason: `extension '${ext || '(none)'}' is not a stamped source type` };
  }
  if (!IN_SCOPE_ROOTS.some(root => p.startsWith(root))) {
    return { tier: 'out-of-scope', reason: 'outside packages/|tools/|scripts/ — P3.6/P4/P5 own deploy/.github/docs/team/root' };
  }
  if (section9.has(p)) {
    return { tier: 'section9', reason: '§9 DO-NOT-TOUCH — stays MIT, never relicensed (.dojolm-section9-do-not-touch.txt)' };
  }
  if (IGNORE_FILES.has(p)) {
    return { tier: 'ignore', reason: 'dead code — P5 G-5 drop (export-classification §3)' };
  }
  for (const [re, reason] of IGNORE_GLOBS) if (re.test(p)) return { tier: 'ignore', reason };
  if (COMMUNITY_OVERRIDE_FILES.has(p)) {
    return { tier: 'apache', reason: 'community catalog read (override inside an ee glob)' };
  }
  if (BUSL_FILES.has(p)) {
    return { tier: 'busl', reason: 'ee-hold enterprise capability (explicit)' };
  }
  for (const [re, reason] of BUSL_GLOBS) if (re.test(p)) return { tier: 'busl', reason };

  return { tier: 'apache', reason: 'community core (default)' };
}

/** Map a tier to the SPDX id a stamped file must carry, or null if the tier is
 * not stamped (section9/defer/ignore/out-of-scope/not-source). */
export function expectedIdFor(tier) {
  if (tier === 'apache') return LICENSE_IDS.APACHE;
  if (tier === 'busl') return LICENSE_IDS.BUSL;
  return null;
}

/** True iff a tier is one the checker/applier actively stamps + verifies. */
export function isStampedTier(tier) {
  return tier === 'apache' || tier === 'busl';
}
