#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
/**
 * E0.S3 authored-CSS type-floor gate.
 *
 * Shipped CSS, HTML, and React style objects must not author a numeric font size
 * below 11px. Tests, fixtures, and design-review canvases are excluded.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const DEFAULT_SCAN_ROOT = path.join(ROOT, "packages/dojolm-web/src");
const EXTENSIONS = new Set([".css", ".html", ".ts", ".tsx"]);
const TYPESCRIPT_EXTENSIONS = new Set([".ts", ".tsx"]);
const OMIT_DIRECTORIES = new Set([
  "node_modules",
  ".next",
  "__tests__",
  "__fixtures__",
]);
const OMIT_FILE = /\.(?:test|spec|stories)\.[^.]+$/i;
const FLOOR_PX = 11;
const NUMBER = "[+-]?(?:\\d*\\.\\d+|\\d+\\.?\\d*)(?:e[+-]?\\d+)?";
const UNIT = "[a-z%]+";
const CSS_ESCAPE = String.raw`\\(?:[0-9a-f]{1,6}[ \t\r\n\f]?|[^\r\n\f])`;
const IDENT_START = `(?:[a-z_-]|${CSS_ESCAPE})`;
const IDENT_CONTINUE = `(?:[a-z0-9_-]|${CSS_ESCAPE})`;
const PROPERTY = new RegExp(
  `(${IDENT_START}${IDENT_CONTINUE}*)\\s*:\\s*([^;{}]*)`,
  "gi",
);
const FONT_SIZE_VALUE = new RegExp(
  `^\\s*(${NUMBER})\\s*(${UNIT})?(?=\\s*(?:[/;}]|$))`,
  "i",
);
const SHORTHAND_VALUE = new RegExp(
  `(?:^|\\s)(${NUMBER})\\s*(${UNIT})(?=\\s*(?:/\\s*\\S+\\s+|\\s+)\\S)`,
  "i",
);
const SHORTHAND_ZERO = /(?:^|\s)([+-]?0(?:\.0*)?)(?=\s*(?:\/\s*\S+\s+|\s+)\S)/i;
const INLINE_FONT_SIZE = new RegExp(
  String.raw`\bfontSize\s*:\s*(?:(["'])(` +
    NUMBER +
    String.raw`)px\1|(` +
    NUMBER +
    String.raw`))(?=\s*[,}])`,
  "gi",
);
// Phase 6.1 (conformity migration) — the two audit-confirmed blind spots:
// Tailwind arbitrary values (`text-[10px]`, `text-[0.625rem]`) let the
// FeatureBadge 10px chip through, and `font-size: var(--text-xs)` let a
// 10px rail label through because the token indirection hid the pixels.
const TAILWIND_TEXT_SIZE = new RegExp(
  String.raw`\btext-\[(` + NUMBER + String.raw`)(px|rem)\]`,
  "gi",
);
const VAR_FONT_SIZE =
  /^\s*var\(\s*(--[a-z0-9-]+)\s*(?:,\s*([0-9.]+)(px|rem)\s*)?\)\s*$/i;
const TSX_VAR_FONT_SIZE = new RegExp(
  String.raw`\bfontSize\s*:\s*(["'\x60])var\(\s*(--[a-z0-9-]+)\s*(?:,\s*([0-9.]+)(px|rem)\s*)?\)\1`,
  "gi",
);
const TOKENS_FILE = path.join(
  ROOT,
  "packages/dojolm-web/src/design/styles/tokens.css",
);
// var-indirection is enforced on the v2 conformity chain + files born
// during the migration (aivss.css). Legacy pattern/primitive CSS still
// carries sub-floor tokens and retires at E15 — swept there, NOT green
// here: the CLI message states the enforced scope explicitly.
const VAR_ENFORCED_PATHS =
  /(?:^|\/)design\/styles\/(?:v2\/|patterns\/aivss\.css)/;

let tokenPixelsCache = null;
function tokenPixels() {
  if (tokenPixelsCache) return tokenPixelsCache;
  const map = new Map();
  if (fs.existsSync(TOKENS_FILE)) {
    const source = stripComments(fs.readFileSync(TOKENS_FILE, "utf8"));
    const declaration = new RegExp(
      String.raw`(--[a-z0-9-]+)\s*:\s*(` + NUMBER + String.raw`)(rem|px)\b`,
      "gi",
    );
    for (const match of source.matchAll(declaration)) {
      const pixels =
        match[3].toLowerCase() === "rem"
          ? Number(match[2]) * 16
          : Number(match[2]);
      map.set(match[1].toLowerCase(), pixels);
    }
  }
  tokenPixelsCache = map;
  return map;
}

function maskComment(source, start, end) {
  return source.slice(start, end).replace(/[^\n]/g, " ");
}

function commentEnd(source, start, close) {
  const end = source.indexOf(close, start);
  return end === -1 ? source.length : end + close.length;
}

export function stripComments(source, extension = ".css") {
  let output = "";
  let quote = null;
  let escaped = false;
  const supportsLineComments = extension === ".ts" || extension === ".tsx";
  for (let index = 0; index < source.length; index += 1) {
    const current = source[index];
    const next = source[index + 1];
    if (quote !== null) {
      output += current;
      if (escaped) escaped = false;
      else if (current === "\\") escaped = true;
      else if (current === quote) quote = null;
      continue;
    }
    if (
      current === '"' ||
      current === "'" ||
      (supportsLineComments && current === "`")
    ) {
      quote = current;
      output += current;
      continue;
    }
    if (current === "/" && next === "*") {
      const end = commentEnd(source, index + 2, "*/");
      output += maskComment(source, index, end);
      index = end - 1;
      continue;
    }
    if (source.startsWith("<!--", index)) {
      const end = commentEnd(source, index + 4, "-->");
      output += maskComment(source, index, end);
      index = end - 1;
      continue;
    }
    if (supportsLineComments && current === "/" && next === "/") {
      const end = source.indexOf("\n", index);
      if (end === -1) return output + " ".repeat(source.length - index);
      output += maskComment(source, index, end);
      index = end - 1;
      continue;
    }
    output += current;
  }
  return output;
}

function omittedPath(scanRoot, file) {
  const relative = path.relative(scanRoot, file).split(path.sep).join("/");
  return (
    relative.startsWith("app/(design)/canvas/") || OMIT_FILE.test(relative)
  );
}

function walk(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!OMIT_DIRECTORIES.has(entry.name)) walk(target, files);
    } else if (EXTENSIONS.has(path.extname(entry.name))) {
      files.push(target);
    }
  }
  return files;
}

function resolvePixels(value, unit = "") {
  const numeric = Number(value);
  const normalized = unit.toLowerCase();
  if (numeric === 0 && normalized === "") {
    return { pixels: 0, reason: "below 11px" };
  }
  if (normalized === "px") return { pixels: numeric, reason: "below 11px" };
  if (normalized === "rem")
    return { pixels: numeric * 16, reason: "below 11px" };
  if (normalized === "em")
    return { pixels: null, reason: "context-dependent unit" };
  return { pixels: null, reason: "unsupported unit" };
}

function lineNumber(source, index) {
  return source.slice(0, index).split("\n").length;
}

function decodeCssIdentifier(value) {
  return value.replace(
    /\\([0-9a-f]{1,6})(?:\s)?|\\(.)/gi,
    (_match, hex, escaped) => {
      if (!hex) return escaped;
      const codePoint = Number.parseInt(hex, 16);
      return codePoint === 0 || codePoint > 0x10ffff
        ? "\uFFFD"
        : String.fromCodePoint(codePoint);
    },
  );
}

function sizeFromValue(property, value) {
  if (property === "font-size") {
    return value.match(FONT_SIZE_VALUE);
  }
  return value.match(SHORTHAND_VALUE) ?? value.match(SHORTHAND_ZERO);
}

function propertyName(node, sourceFile) {
  if (!node?.name) return null;
  if (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)) {
    return node.name.text;
  }
  return node.name.getText(sourceFile);
}

function callName(node) {
  if (ts.isIdentifier(node.expression)) return node.expression.text;
  if (ts.isPropertyAccessExpression(node.expression)) {
    return node.expression.name.text;
  }
  return null;
}

function isInsideAutoTableCall(node) {
  for (let current = node.parent; current; current = current.parent) {
    if (ts.isCallExpression(current)) return callName(current) === "autoTable";
  }
  return false;
}

function pdfPointSizeOffsets(source, extension) {
  const scriptKind =
    extension === ".tsx" ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(
    `type-floor${extension}`,
    source,
    ts.ScriptTarget.Latest,
    true,
    scriptKind,
  );
  const offsets = new Set();
  const visit = (node) => {
    if (
      ts.isPropertyAssignment(node) &&
      propertyName(node, sourceFile) === "fontSize" &&
      isInsideAutoTableCall(node)
    ) {
      offsets.add(node.name.getStart(sourceFile));
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return offsets;
}

function scanTypescriptSource(source, file, repoRoot, extension) {
  const pdfOffsets = pdfPointSizeOffsets(source, extension);
  const relativeFile = path.relative(repoRoot, file).split(path.sep).join("/");
  const inlineHits = [...source.matchAll(INLINE_FONT_SIZE)]
    .map((match) => ({ match, value: match[2] ?? match[3] }))
    .filter(({ match }) => !pdfOffsets.has(match.index))
    .filter(({ value }) => Number(value) < FLOOR_PX)
    .map(({ match, value }) => ({
      file: relativeFile,
      line: lineNumber(source, match.index),
      value: `${value}px`.toLowerCase(),
      reason: "below 11px",
    }));
  const tsxVarHits = [...source.matchAll(TSX_VAR_FONT_SIZE)]
    .map((match) => ({
      match,
      token: match[2].toLowerCase(),
      pixels:
        tokenPixels().get(match[2].toLowerCase()) ??
        (match[3]
          ? match[4].toLowerCase() === "rem"
            ? Number(match[3]) * 16
            : Number(match[3])
          : undefined),
    }))
    .filter(({ pixels }) => typeof pixels === "number" && pixels < FLOOR_PX)
    .map(({ match, token, pixels }) => ({
      file: relativeFile,
      line: lineNumber(source, match.index),
      value: `var(${token}) = ${pixels}px`,
      reason: "below 11px via token",
    }));
  const tailwindHits = [...source.matchAll(TAILWIND_TEXT_SIZE)]
    .map((match) => ({
      match,
      pixels:
        match[2].toLowerCase() === "rem"
          ? Number(match[1]) * 16
          : Number(match[1]),
    }))
    .filter(({ pixels }) => pixels < FLOOR_PX)
    .map(({ match }) => ({
      file: relativeFile,
      line: lineNumber(source, match.index),
      value: `text-[${match[1]}${match[2].toLowerCase()}]`,
      reason: "below 11px",
    }));
  return [...inlineHits, ...tailwindHits, ...tsxVarHits];
}

function scanStylesheetSource(source, file, repoRoot) {
  const hits = [];
  const relativeFile = path.relative(repoRoot, file).split(path.sep).join("/");
  const varEnforced = VAR_ENFORCED_PATHS.test(relativeFile);
  for (const match of source.matchAll(PROPERTY)) {
    const property = decodeCssIdentifier(match[1]).toLowerCase();
    if (property !== "font-size" && property !== "font") continue;
    if (property === "font-size" && varEnforced) {
      const indirection = match[2].match(VAR_FONT_SIZE);
      if (indirection) {
        const token = indirection[1].toLowerCase();
        const fallbackPixels = indirection[2]
          ? indirection[3].toLowerCase() === "rem"
            ? Number(indirection[2]) * 16
            : Number(indirection[2])
          : null;
        const pixels = tokenPixels().get(token) ?? fallbackPixels;
        if (typeof pixels === "number" && pixels < FLOOR_PX) {
          hits.push({
            file: relativeFile,
            line: lineNumber(source, match.index),
            value: `var(${token}) = ${pixels}px`,
            reason: "below 11px via token",
          });
        }
        continue;
      }
    }
    const size = sizeFromValue(property, match[2]);
    if (!size) continue;
    const unit = size[2] ?? "";
    const resolved = resolvePixels(size[1], unit);
    const escapedProperty = match[1].includes("\\");
    if (
      !escapedProperty &&
      resolved.pixels !== null &&
      resolved.pixels >= FLOOR_PX
    ) {
      continue;
    }
    hits.push({
      file: path.relative(repoRoot, file).split(path.sep).join("/"),
      line: lineNumber(source, match.index),
      value: `${size[1]}${unit || "px"}`.toLowerCase(),
      reason: escapedProperty ? "escaped property name" : resolved.reason,
    });
  }
  return hits;
}

export function scanTypeFloor({
  scanRoot = DEFAULT_SCAN_ROOT,
  repoRoot = ROOT,
} = {}) {
  const hits = [];
  for (const file of walk(scanRoot)) {
    if (omittedPath(scanRoot, file)) continue;
    const original = fs.readFileSync(file, "utf8");
    const extension = path.extname(file);
    const source = stripComments(original, extension);

    const fileHits = TYPESCRIPT_EXTENSIONS.has(extension)
      ? scanTypescriptSource(source, file, repoRoot, extension)
      : scanStylesheetSource(source, file, repoRoot);
    hits.push(...fileHits);
  }
  return hits.sort(
    (left, right) =>
      left.file.localeCompare(right.file) || left.line - right.line,
  );
}

export function runTypeFloor(options) {
  const hits = scanTypeFloor(options);
  if (hits.length === 0) return { ok: true, hits };
  return { ok: false, hits };
}

export function printTypeFloorResult(result) {
  if (result.ok) {
    console.log(
      "type-floor OK — no sub-11px literals anywhere; token indirection " +
        "enforced on the v2 chain + TSX (legacy pattern CSS sweeps at E15).",
    );
    return;
  }
  console.error(
    `type-floor FAIL (${result.hits.length}) — authored product type below 11px:`,
  );
  for (const hit of result.hits) {
    console.error(`  ✗ ${hit.file}:${hit.line}  ${hit.value} (${hit.reason})`);
  }
}

const isCli =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
/* v8 ignore next 4 -- exercised as a real subprocess by the package-local lint:audit gate. */
if (isCli) {
  const result = runTypeFloor();
  printTypeFloorResult(result);
  if (!result.ok) process.exitCode = 1;
}
