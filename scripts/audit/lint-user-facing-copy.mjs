#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const DEFAULT_ROOT = path.join(ROOT, "packages/dojolm-web/src");
const OMIT =
  /(?:^|\/)(?:__tests__|__fixtures__|canvas)(?:\/|$)|\.(?:test|spec|stories)\.tsx$/;
const COPY_ARTIFACT =
  /ADR-\d+|\/api\/\S+|\b\w+_ENABLED\b|\bEpic\s+\d+|\bGap\s+\d+|\bR-T1\b|\bwithAuth\b|\blocalStorage\b/i;
// B-05 (Phase 5.4) — ALL-CAPS enum identifiers (USER_DELETE, DSR_BACKEND…)
// never belong in visible copy. Case-sensitive + underscore-required so
// legitimate acronyms (AIVSS, GDPR, API) and shouty prose stay legal.
const CAPS_ENUM_ARTIFACT = /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/;
// §2.4 (Phase 4.1) — "Kumite" is arena's codename. It belongs to the
// /admin/arena surfaces only; everywhere else it never reaches visible copy.
const KUMITE_ARTIFACT = /\bKumite\b/;
const KUMITE_ALLOWED_PATHS = /^(?:app\/\(shell\)\/admin\/arena|design\/arena)\//;
const COPY_ATTRIBUTES = new Set([
  "title",
  "sub",
  "lede",
  "label",
  "description",
  "placeholder",
  "eyebrow",
  "caption",
]);
const PROTECTED_COPY_EXEMPTIONS = new Set([
  "app/(shell)/admin/bushido/BushidoBypassMatrixClient.tsx",
]);

function walk(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(target, files);
    else if (entry.name.endsWith(".tsx")) files.push(target);
  }
  return files;
}

function attributeCopy(node) {
  if (!ts.isJsxAttribute(node) || !COPY_ATTRIBUTES.has(node.name.getText()))
    return null;
  const initializer = node.initializer;
  if (initializer && ts.isStringLiteral(initializer)) return initializer.text;
  const expression =
    initializer && ts.isJsxExpression(initializer)
      ? initializer.expression
      : null;
  return expression &&
    (ts.isStringLiteral(expression) ||
      ts.isNoSubstitutionTemplateLiteral(expression))
    ? expression.text
    : null;
}

function extractedCopy(source, file) {
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const segments = [];
  function visit(node) {
    const value = ts.isJsxText(node)
      ? node.getText(sourceFile)
      : ts.isJsxExpression(node) &&
          node.expression &&
          (ts.isStringLiteral(node.expression) ||
            ts.isNoSubstitutionTemplateLiteral(node.expression))
        ? node.expression.text
        : attributeCopy(node);
    if (value) segments.push({ index: node.getStart(sourceFile), value });
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return segments;
}

export function scanUserFacingCopy({
  scanRoot = DEFAULT_ROOT,
  repoRoot = ROOT,
} = {}) {
  const hits = [];
  for (const file of walk(scanRoot)) {
    const relative = path.relative(scanRoot, file).split(path.sep).join("/");
    if (OMIT.test(relative) || PROTECTED_COPY_EXEMPTIONS.has(relative))
      continue;
    const source = fs.readFileSync(file, "utf8");
    for (const segment of extractedCopy(source, file)) {
      const artifact =
        segment.value.match(COPY_ARTIFACT)?.[0] ??
        segment.value.match(CAPS_ENUM_ARTIFACT)?.[0] ??
        (KUMITE_ALLOWED_PATHS.test(relative)
          ? undefined
          : segment.value.match(KUMITE_ARTIFACT)?.[0]);
      if (!artifact) continue;
      hits.push({
        file: path.relative(repoRoot, file).split(path.sep).join("/"),
        line: source.slice(0, segment.index).split("\n").length,
        artifact,
      });
    }
  }
  return hits.sort(
    (left, right) =>
      left.file.localeCompare(right.file) || left.line - right.line,
  );
}

export function runUserFacingCopy(options) {
  const hits = scanUserFacingCopy(options);
  return { ok: hits.length === 0, hits };
}

export function printUserFacingCopy(result) {
  if (result.ok) {
    console.log(
      "user-copy OK — implementation artifacts stay out of visible JSX copy.",
    );
    return;
  }
  console.error(
    `user-copy FAIL (${result.hits.length}) — implementation artifacts are visible:`,
  );
  for (const hit of result.hits)
    console.error(`  ✗ ${hit.file}:${hit.line}  ${hit.artifact}`);
}

const isCli =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const result = runUserFacingCopy();
  printUserFacingCopy(result);
  if (!result.ok) process.exitCode = 1;
}
