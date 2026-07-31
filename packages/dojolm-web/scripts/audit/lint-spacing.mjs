#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
/**
 * HAGANE E5.S1 spacing-literal ratchet (GUARDRAILS G12).
 *
 * Counts numeric margin/padding/gap values in shipped TSX. Tests, dependencies,
 * and the never-shipped `(design)/canvas` review boards are excluded. Normal
 * updates may only lower the committed maximum; an increase fails closed.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SCAN_DIRS = ["src/app", "src/components", "src/design"];
const SPACING_PROP =
  /\b(margin[A-Z][a-zA-Z]*|margin|padding[A-Z][a-zA-Z]*|padding|gap|rowGap|columnGap)\s*:\s*['"]?-?\d/g;

function walk(root, directory, files = []) {
  for (const entry of readdirSync(directory)) {
    const target = join(directory, entry);
    const stats = statSync(target);
    if (stats.isDirectory()) {
      if (entry === "__tests__" || entry === "node_modules") continue;
      const relative = target
        .slice(root.length + 1)
        .split("\\")
        .join("/");
      if (relative === "src/app/(design)/canvas") continue;
      walk(root, target, files);
    } else if (entry.endsWith(".tsx") && !entry.endsWith(".test.tsx")) {
      files.push(target);
    }
  }
  return files;
}

export function countSpacing({ root }) {
  let count = 0;
  const perFile = new Map();
  for (const directory of SCAN_DIRS) {
    for (const file of walk(root, join(root, directory))) {
      const hits = readFileSync(file, "utf8").match(SPACING_PROP);
      if (!hits?.length) continue;
      count += hits.length;
      perFile.set(file.slice(root.length + 1), hits.length);
    }
  }
  return { count, perFile };
}

function readMaximum(pathname) {
  try {
    const parsed = JSON.parse(readFileSync(pathname, "utf8"));
    if (!Number.isSafeInteger(parsed.max) || parsed.max < 0) {
      return { max: null, error: "invalid ratchet schema" };
    }
    return { max: parsed.max, error: null };
  } catch (error) {
    return {
      max: null,
      error:
        error?.code === "ENOENT" ? "no ratchet file" : "invalid ratchet JSON",
    };
  }
}

function topFiles(perFile) {
  return [...perFile.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 10);
}

export function runSpacingAudit({ root, args, io }) {
  const ratchetPath = join(root, "scripts/audit/spacing-ratchet.json");
  const { count, perFile } = countSpacing({ root });
  const ratchet = readMaximum(ratchetPath);
  const { max } = ratchet;
  const updating = args.includes("--update");

  if (updating && max !== null && count > max) {
    io.error(`[spacing] refusing to raise ratchet from ${max} to ${count}.`);
    return { exitCode: 1, count, max };
  }
  if (updating) {
    writeFileSync(ratchetPath, `${JSON.stringify({ max: count }, null, 2)}\n`);
    io.log(`[spacing] ratchet frozen at ${count}`);
    return { exitCode: 0, count, max: count };
  }
  if (max === null) {
    io.error(`[spacing] ${ratchet.error} — run with --update to freeze`);
    return { exitCode: 2, count, max };
  }
  if (count > max) {
    io.error(
      `[spacing] FAIL — ${count} raw spacing literals (ratchet ${max}).`,
    );
    for (const [file, hits] of topFiles(perFile)) {
      io.error(`   ${String(hits).padStart(4)}  ${file}`);
    }
    return { exitCode: 1, count, max };
  }

  io.log(`[spacing] OK — ${count} raw spacing literals (ratchet ${max}).`);
  if (count < max)
    io.log(
      "[spacing] note: below ratchet — consider re-freezing with --update.",
    );
  return { exitCode: 0, count, max };
}

const isCli =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
/* v8 ignore next 2 -- composition-only CLI edge; runSpacingAudit is unit covered. */
if (isCli) {
  process.exitCode = runSpacingAudit({
    root: process.cwd(),
    args: process.argv.slice(2),
    io: console,
  }).exitCode;
}
