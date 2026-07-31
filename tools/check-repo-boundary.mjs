#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
//
// DojoLM repo-split boundary scanner.
//
// Reads `.dojolm-repo-boundary.yaml` and rejects commits / PR diffs that touch
// any SaaS-only path on the public OSS branch. Per master plan §3 / INT-02
// decision: "nothing SaaS-related lands on the public OSS branch."
//
// Usage:
//   Pre-commit hook (paths from `git diff --cached`):
//     node tools/check-repo-boundary.mjs --staged
//
//   GitHub Action (paths supplied via file):
//     node tools/check-repo-boundary.mjs --paths-file /tmp/changed-paths.txt --strict
//
//   Ad-hoc local scan:
//     node tools/check-repo-boundary.mjs --paths-stdin < paths.txt
//
//   Public-export profile (OSS Release Program P5/P6 — scans an export
//   candidate's tracked paths against `saas_only_paths` ∪ `never_public`):
//     git -C <candidate> ls-files -z | node tools/check-repo-boundary.mjs --profile public-export --paths0-stdin
//
//   Profiles (`--profile <name>` or `--profile=<name>`):
//     staged         (DEFAULT) deny = saas_only_paths. Used by the pre-commit
//                    hook + PR-time boundary-scan workflow. Behavior is identical
//                    to the pre-profile tool.
//     public-export  deny = saas_only_paths ∪ never_public. Enforced ONLY against
//                    export candidates (never on private-repo commits — that is why
//                    `never_public` is a SEPARATE yaml section, not part of
//                    saas_only_paths; adding internal paths to saas_only_paths would
//                    make the pre-commit hook reject the repo's own commits).
//                    `never_public` is NON-ALLOWLISTABLE: a path matching it is
//                    ALWAYS a violation here, even if it also matches `allowlist:`
//                    (the allowlist only rescues saas_only_paths false-positives on
//                    private commits — it must not let an internal path into a public
//                    export, e.g. the master plan is allowlisted AND under team/**).
//                    Use with --paths-stdin/--paths-file on an export candidate; do
//                    NOT combine with --staged on a private-repo commit.
//
// `--strict` is accepted for backward compatibility (the boundary-scan workflow
// passes it) and currently has no effect — kept a no-op intentionally.
//
// Security: uses execFileSync (no shell) for the single git invocation when
// `--staged` is passed. Reads `.dojolm-repo-boundary.yaml` + supplied paths
// list directly. No untrusted input ever reaches a shell. The CLI fails CLOSED:
// an unknown/duplicate `--profile`, a missing yaml, or (under public-export) an
// empty never_public list are errors, never a silent weaker scan.
//
// Design: all decision logic is pure + exported for unit testing; the I/O
// orchestrator `runCli(deps)` takes injected dependencies and RETURNS an exit
// code (it never calls process.exit), so the whole flow is coverable in-process.
// Only the thin `if (isMainModule)` entrypoint at the bottom performs real I/O.

import {
  readFileSync as fsReadFileSync,
  existsSync as fsExistsSync,
  realpathSync as fsRealpathSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

/** Profiles understood by `--profile`. `staged` is the pre-profile default. */
export const KNOWN_PROFILES = ["staged", "public-export"];

// Minimal YAML list parser for the list sections we care about. Avoids a
// runtime dep on a YAML library so this script runs in pre-commit + GH Actions
// without any setup step. NOTE: this parser is load-bearing for the export
// boundary — it deliberately handles inline `# comments` and indented comment
// lines so an annotated glob is never silently dropped (a dropped deny-glob =
// a fail-OPEN leak). Keep list items one-per-line; do not use YAML anchors or
// flow sequences here.
export function parseListSection(text, sectionName) {
  const re = new RegExp(`^${sectionName}:\\s*$`, "m");
  const start = text.search(re);
  if (start < 0) return [];
  const after = text.slice(start);
  const lines = after.split("\n").slice(1);
  const items = [];
  for (const line of lines) {
    // Comment lines (any indent) never add an item and never terminate the
    // section — they are skipped.
    if (/^\s*#/.test(line)) continue;
    // Stop at the next top-level key (non-whitespace start, not a list item, not blank).
    if (/^\S/.test(line) && !/^\s*-/.test(line) && line.trim() !== "") break;
    // Quoted item → take the quoted content verbatim. Bare item → stop at an
    // inline `#` comment. A trailing `# comment` after a quoted/bare value is
    // tolerated and discarded (would otherwise silently drop the glob).
    const m = line.match(
      /^\s+-\s+(?:"([^"]*)"|'([^']*)'|([^#\s][^#]*?))\s*(?:#.*)?$/,
    );
    if (m) {
      const val = (m[1] ?? m[2] ?? m[3]).trim();
      if (val) items.push(val);
    }
  }
  return items;
}

export function globToRegExp(glob) {
  let re = "^";
  let i = 0;
  while (i < glob.length) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        re += "[\\s\\S]*";
        i += 2;
        if (glob[i] === "/") i++;
      } else {
        re += "[^/]*";
        i++;
      }
    } else if (c === "?") {
      re += "[^/]";
      i++;
    } else if (".+^$()[]{}|\\".includes(c)) {
      re += "\\" + c;
      i++;
    } else {
      re += c;
      i++;
    }
  }
  re += "$";
  return new RegExp(re);
}

export function matchesAny(p, patterns) {
  return patterns.some((re) => re.test(p));
}

function hasControlPathCharacter(value) {
  return [...value].some((character) => {
    const code = character.codePointAt(0);
    return code <= 31 || code === 127;
  });
}

/**
 * Resolve the `--profile` value from argv. Supports `--profile <val>` and
 * `--profile=<val>`. Fails CLOSED: an unknown value, a missing value, or more
 * than one `--profile` is an error (never a silent fall-through to `staged`).
 * @returns {string} a known profile name, or `{ error }`.
 */
export function parseProfile(argv) {
  const occurrences = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--profile")
      occurrences.push(argv[i + 1]); // value is the next arg (may be undefined)
    else if (a.startsWith("--profile="))
      occurrences.push(a.slice("--profile=".length));
  }
  if (occurrences.length === 0) return "staged";
  if (occurrences.length > 1) {
    return {
      error: `--profile given ${occurrences.length} times; specify it exactly once`,
    };
  }
  const val = occurrences[0];
  if (!val || !KNOWN_PROFILES.includes(val)) {
    return {
      error: `unknown --profile '${val ?? ""}' (known: ${KNOWN_PROFILES.join(", ")})`,
    };
  }
  return val;
}

/**
 * Build the deny-glob sets for a profile from the boundary yaml text.
 * `staged` → never_public is empty (unchanged default). `public-export` → also
 * parse never_public.
 */
export function resolveDenyGlobs(yamlText, profile) {
  const saas = parseListSection(yamlText, "saas_only_paths");
  const neverPublic =
    profile === "public-export"
      ? parseListSection(yamlText, "never_public")
      : [];
  return { saas, neverPublic };
}

/**
 * Two-tier violation check.
 *  - `never_public` is NON-allowlistable: a path matching it is ALWAYS a
 *    violation, checked first. The staged `allowlist` exists to permit
 *    SaaS-describing *docs* on private commits (e.g. the master plan, which is
 *    in `allowlist` AND matches `team/**`) — it must NOT grant an internal path
 *    passage into a PUBLIC export. So never_public wins over allowlist.
 *  - otherwise the staged contract: `allowlist` rescues, else `saas_only_paths`
 *    denies.
 * For the `staged` profile `neverPublicPatterns` is empty, so this reduces
 * EXACTLY to the pre-profile behavior (`allow ? skip : saas-deny`). A path
 * matching both tiers is reported once (the `continue` after a never_public hit).
 */
export function computeViolations(
  paths,
  { neverPublicPatterns, allowPatterns, saasPatterns },
) {
  const violations = [];
  for (const p of paths) {
    if (!p) continue;
    if (matchesAny(p, neverPublicPatterns)) {
      violations.push(p);
      continue;
    }
    if (matchesAny(p, allowPatterns)) continue;
    if (matchesAny(p, saasPatterns)) violations.push(p);
  }
  return violations;
}

/**
 * Normalize a raw newline-delimited path list: strip a trailing CR (CRLF files),
 * trim surrounding whitespace, drop a leading `./`, and drop blank lines. Without
 * this a Windows/hand-authored `--paths-file` could slip an internal path past an
 * anchored glob (fail-OPEN). `git ls-files`/`git diff` output is already clean, so
 * this is a no-op for the default `--staged` path.
 */
export function normalizePaths(raw) {
  return raw
    .split("\n")
    .map((line) => {
      let p = line.replace(/\r$/, "").trim();
      if (/^".*"$/.test(p) || hasControlPathCharacter(p)) {
        throw new Error(
          "quoted or control path records require a NUL-delimited path mode",
        );
      }
      // Strip ALL leading './' segments idempotently. A single-pass `replace(/^\.\/+/)`
      // left `././x` and `./ ./x` partially prefixed → fail-OPEN (Adversarial round-2).
      let prev;
      do {
        prev = p;
        p = p.replace(/^\.\/+/, "").trim();
      } while (p !== prev);
      return p;
    })
    .filter(Boolean);
}

/** Decode Git's `-z` path stream without trimming filename bytes. */
export function normalizePaths0(raw) {
  if (raw.length === 0) return [];
  if (!raw.endsWith("\0")) {
    throw new Error("NUL-delimited path input requires a terminal NUL");
  }
  return raw
    .slice(0, -1)
    .split("\0")
    .map((p) => {
      if (p.length === 0)
        throw new Error("NUL-delimited path input contains an empty record");
      let normalized = p;
      while (normalized.startsWith("./")) normalized = normalized.slice(2);
      return normalized;
    });
}

/**
 * Collect candidate paths from argv using injected I/O. Path-source modes are
 * orthogonal to the profile.
 * @returns {string[]} or `{ error: 'usage' }` when no source mode is given.
 */
export function collectPaths(argv, io) {
  const sources = [
    argv.includes("--staged"),
    argv.includes("--paths-stdin"),
    argv.includes("--paths0-stdin"),
    argv.includes("--paths-file"),
    argv.includes("--paths0-file"),
  ].filter(Boolean).length;
  if (sources !== 1) return { error: "usage" };
  if (argv.includes("--staged")) return normalizePaths0(io.gitDiffCached());
  const fileIdx = argv.indexOf("--paths-file");
  if (fileIdx >= 0 && argv[fileIdx + 1]) {
    return normalizePaths(io.readPathsFile(argv[fileIdx + 1]));
  }
  const file0Idx = argv.indexOf("--paths0-file");
  if (file0Idx >= 0 && argv[file0Idx + 1]) {
    return normalizePaths0(io.readPathsFile(argv[file0Idx + 1]));
  }
  if (argv.includes("--paths-stdin")) {
    return normalizePaths(io.readStdin());
  }
  if (argv.includes("--paths0-stdin")) return normalizePaths0(io.readStdin());
  return { error: "usage" };
}

const RULE =
  "═══════════════════════════════════════════════════════════════════";

/** Emit the human violation report. For `staged` this is byte-identical to the
 * pre-profile tool; `public-export` gets accurate (non-allowlistable) guidance. */
export function emitViolation(violations, profile, error) {
  const denyLabel =
    profile === "public-export" ? "SaaS-only / never-public" : "SaaS-only";
  error("");
  error(RULE);
  error(" REPO-SPLIT BOUNDARY VIOLATION");
  error(RULE);
  error("");
  error(
    ` The following paths match ${denyLabel} globs in \`.dojolm-repo-boundary.yaml\``,
  );
  error(" and MUST NOT land on the public OSS branch:");
  error("");
  for (const v of violations) {
    const display = hasControlPathCharacter(v) ? JSON.stringify(v) : v;
    error(`   ❌ ${display}`);
  }
  error("");
  error(
    ' Per master plan §3 / INT-02 decision: "nothing SaaS-related lands on',
  );
  error(' the public OSS branch." See `docs/dev/repo-split-discipline.md`.');
  error("");
  if (profile === "public-export") {
    error(
      " A `never_public` match CANNOT be rescued via `allowlist:` — exclude the",
    );
    error(
      " path from the export candidate. A `saas_only_paths` false positive may be",
    );
    error(" allowlisted in a separate maintainer-reviewed PR.");
  } else {
    error(" If false positive: add the path to the `allowlist:` section of");
    error(
      " `.dojolm-repo-boundary.yaml` in a separate PR (boundary changes require",
    );
    error(" maintainer review).");
    error("");
    error(
      " If this SHOULD be in SaaS private repo: move the file to the private",
    );
    error(" repo + remove from this PR.");
  }
  error(RULE);
}

/** Emit the success line. For `staged` this is byte-identical to the pre-profile tool. */
export function emitOk(count, profile, log) {
  const denyLabel =
    profile === "public-export" ? "SaaS-only / never-public" : "SaaS-only";
  const okSuffix =
    profile === "public-export" ? " (profile: public-export)" : "";
  log(
    `[boundary] OK — ${count} path(s) checked${okSuffix}; no ${denyLabel} paths.`,
  );
}

function readCheckedPaths(argv, io, error) {
  let paths;
  try {
    paths = collectPaths(argv, io);
  } catch (pathError) {
    error(`[boundary] ERROR: ${pathError.message}`);
    return { code: 1 };
  }
  if (!Array.isArray(paths)) {
    error(
      "Usage: check-repo-boundary.mjs [--profile staged|public-export] --staged | --paths-file <f> | --paths-stdin | --paths0-file <f> | --paths0-stdin",
    );
    return { code: 2 };
  }
  return { paths };
}

/**
 * Orchestrator. Returns a process exit code (0 ok / 1 violation-or-config /
 * 2 usage). Never calls process.exit; all I/O is via injected `deps`.
 */
export function runCli(deps) {
  const { argv, readFileSync, existsSync, boundaryYamlPath, io, log, error } =
    deps;

  if (!existsSync(boundaryYamlPath)) {
    error(`[boundary] ERROR: ${boundaryYamlPath} not found.`);
    return 1;
  }

  const profile = parseProfile(argv);
  if (typeof profile === "object") {
    error(`[boundary] ERROR: ${profile.error}`);
    return 2;
  }

  const yamlText = readFileSync(boundaryYamlPath, "utf8");
  const { saas, neverPublic } = resolveDenyGlobs(yamlText, profile);

  if (saas.length === 0) {
    error(
      "[boundary] ERROR: no saas_only_paths defined in .dojolm-repo-boundary.yaml",
    );
    return 1;
  }
  // Fail CLOSED: an empty never_public under public-export is a truncated/mis-parsed yaml — scanning like `staged` would leak every internal path.
  if (profile === "public-export" && neverPublic.length === 0) {
    error(
      "[boundary] ERROR: --profile public-export but never_public is empty in .dojolm-repo-boundary.yaml",
    );
    return 1;
  }

  const allowlist = parseListSection(yamlText, "allowlist");
  const saasPatterns = saas.map(globToRegExp);
  const neverPublicPatterns = neverPublic.map(globToRegExp);
  const allowPatterns = allowlist.map(globToRegExp);

  const checked = readCheckedPaths(argv, io, error);
  if (checked.code !== undefined) return checked.code;
  const { paths } = checked;

  const violations = computeViolations(paths, {
    neverPublicPatterns,
    allowPatterns,
    saasPatterns,
  });

  if (violations.length > 0) {
    emitViolation(violations, profile, error);
    return 1;
  }

  emitOk(paths.length, profile, log);
  return 0;
}

// node:coverage disable -- CLI-only I/O entrypoint below; exercised end-to-end by the
// subprocess smoke tests in tools/__tests__/check-repo-boundary.test.js and by the live
// pre-commit hook + boundary-scan workflow. All decision logic above is import-tested to 100%.
function findRepoRoot() {
  // execFileSync uses execFile under the hood — no shell, no injection vector.
  const stdout = execFileSync("git", ["rev-parse", "--show-toplevel"], {
    encoding: "utf8",
  });
  return stdout.trim();
}

function readStagedPaths() {
  return execFileSync(
    "git",
    ["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"],
    { encoding: "utf8" },
  );
}

// Resolve both sides through realpath so a symlinked invocation still detects the
// main module (a raw string mismatch would skip the entrypoint → silent exit 0).
// existsSync-guarded so realpathSync never throws at import in an exotic context.
const isMainModule =
  !!process.argv[1] &&
  fsExistsSync(process.argv[1]) &&
  fsRealpathSync(fileURLToPath(import.meta.url)) ===
    fsRealpathSync(process.argv[1]);

if (isMainModule) {
  const REPO_ROOT = findRepoRoot();
  const BOUNDARY_YAML = path.join(REPO_ROOT, ".dojolm-repo-boundary.yaml");
  const exitCode = runCli({
    argv: process.argv.slice(2),
    readFileSync: fsReadFileSync,
    existsSync: fsExistsSync,
    boundaryYamlPath: BOUNDARY_YAML,
    io: {
      gitDiffCached: readStagedPaths,
      readPathsFile: (f) => fsReadFileSync(f, "utf8"),
      readStdin: () => fsReadFileSync(0, "utf8"),
    },
    log: (m) => console.log(m),
    error: (m) => console.error(m),
  });
  process.exit(exitCode);
}
// node:coverage enable
