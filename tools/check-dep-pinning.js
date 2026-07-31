#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
/**
 * check-dep-pinning.js — R-X6 dependency-pinning gate.
 *
 * Walks all package.json files in the workspace and reports
 * dependencies that use version ranges (^, ~, >=, >, <, *, x)
 * instead of exact pins.
 *
 * Allowed (skipped):
 *   - file:  local workspace links
 *   - workspace:  pnpm workspace protocol
 *   - github: / git+  VCS deps
 *   - "latest" / "" / "*"  intentionally unpinned (reported as warnings)
 *
 * Allowlist (Phase-0 audit MED #118 remediation):
 *   Existing unpinned deps from before the gate landed are grandfathered
 *   into `tools/dep-pinning-allowlist.json`. New unpinned deps fail the
 *   strict-mode CI gate. To add a new pinning exception, edit the
 *   allowlist file with a justification comment.
 *
 * Exit 0 — no unpinned non-allowlisted deps (or advisory mode)
 * Exit 1 — strict mode with non-allowlisted violations
 *
 * Usage:
 *   node tools/check-dep-pinning.js               # advisory
 *   node tools/check-dep-pinning.js --strict      # fail on non-allowlisted
 *   node tools/check-dep-pinning.js --regenerate  # rewrite allowlist from HEAD
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';

const STRICT = process.argv.includes('--strict');
const REGENERATE = process.argv.includes('--regenerate');
const ROOT = resolve(new URL('.', import.meta.url).pathname, '..');
const ALLOWLIST_PATH = resolve(ROOT, 'tools/dep-pinning-allowlist.json');

/** Version strings to skip (non-semver / workspace refs) */
function isLocalOrVcs(version) {
  return (
    version.startsWith('file:') ||
    version.startsWith('workspace:') ||
    version.startsWith('github:') ||
    version.startsWith('git+') ||
    version.startsWith('git://') ||
    version.startsWith('http://') ||
    version.startsWith('https://')
  );
}

/** True if version is an exact semver (e.g. "1.2.3" or "0.0.1-alpha") */
function isExact(version) {
  if (!version || version === '*' || version === 'latest') return false;
  if (isLocalOrVcs(version)) return true; // treated as OK
  return /^[0-9]/.test(version); // starts with digit → exact pin
}

/** Find all package.json files under a directory (one level of workspace) */
function findPackageJsons(dir) {
  const result = [];
  const rootPkg = join(dir, 'package.json');
  try { statSync(rootPkg); result.push(rootPkg); } catch { /**/ }
  const pkgsDir = join(dir, 'packages');
  try {
    for (const entry of readdirSync(pkgsDir)) {
      const pkgPath = join(pkgsDir, entry, 'package.json');
      try { statSync(pkgPath); result.push(pkgPath); } catch { /**/ }
    }
  } catch { /**/ }
  return result;
}

/** Allowlist entry: a (packageJsonRel, field, name) triple. */
function makeKey(pkgPathRel, field, name) {
  return `${pkgPathRel}::${field}::${name}`;
}

/** Load allowlist; return empty set if the file doesn't exist. */
function loadAllowlist() {
  try {
    const raw = JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf8'));
    const set = new Set();
    for (const entry of raw.entries ?? []) {
      set.add(makeKey(entry.package, entry.field, entry.name));
    }
    return set;
  } catch {
    return new Set();
  }
}

/** Check a single package.json path; returns violation objects. */
function checkPackage(pkgPath) {
  let pkg;
  try {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  } catch {
    return [];
  }
  const rel = pkgPath.replace(`${ROOT}/`, '');
  const violations = [];
  for (const field of ['dependencies', 'devDependencies', 'peerDependencies']) {
    const deps = pkg[field];
    if (!deps) continue;
    for (const [name, version] of Object.entries(deps)) {
      const v = String(version);
      if (isLocalOrVcs(v)) continue;
      if (!isExact(v)) {
        violations.push({ package: rel, field, name, version: v });
      }
    }
  }
  return violations;
}

// ── Main ────────────────────────────────────────────────────────────────────

const allViolations = findPackageJsons(ROOT).flatMap(checkPackage);

// --- --regenerate mode: rewrite the allowlist from current state -----------
if (REGENERATE) {
  const payload = {
    $schema: 'Allowlist for tools/check-dep-pinning.js (R-X6)',
    generatedAt: new Date().toISOString().slice(0, 10),
    note: 'Grandfathered unpinned deps from before the gate landed. '
      + 'Each entry should be removed when the dep is pinned to an exact version. '
      + 'New unpinned deps fail strict mode and must NOT be added here without review.',
    entries: allViolations.map((v) => ({
      package: v.package,
      field: v.field,
      name: v.name,
      reason: 'grandfathered-from-phase-0',
    })),
  };
  writeFileSync(ALLOWLIST_PATH, JSON.stringify(payload, null, 2) + '\n');
  console.log(`✓ Regenerated ${ALLOWLIST_PATH} with ${allViolations.length} entries.`);
  process.exit(0);
}

// --- Normal / strict mode: filter by allowlist -----------------------------
const allowlist = loadAllowlist();
const nonAllowlisted = allViolations.filter(
  (v) => !allowlist.has(makeKey(v.package, v.field, v.name)),
);
const allowlisted = allViolations.length - nonAllowlisted.length;

if (nonAllowlisted.length === 0) {
  console.log(
    `✓ All dependencies are pinned or allowlisted `
      + `(${allowlisted} allowlisted / ${allViolations.length} total unpinned).`,
  );
  process.exit(0);
}

console.warn(
  `⚠  Found ${nonAllowlisted.length} NON-ALLOWLISTED unpinned dependency declaration(s):`,
);
for (const v of nonAllowlisted) {
  console.warn(`  ${v.field}["${v.name}"] = "${v.version}"  (${v.package})`);
}
console.warn(
  `\n  (${allowlisted} grandfathered unpinned deps skipped — see tools/dep-pinning-allowlist.json)`,
);

if (STRICT) {
  console.error('\n✗  Strict mode: non-allowlisted unpinned deps are a build failure (R-X6).');
  console.error('   To pin: set the exact version in package.json.');
  console.error('   To grandfather (use sparingly): edit tools/dep-pinning-allowlist.json with a written reason.');
  process.exit(1);
} else {
  console.warn('\nRun with --strict to fail the build on non-allowlisted unpinned deps.');
  process.exit(0);
}
