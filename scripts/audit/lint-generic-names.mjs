#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stripComments } from "./type-floor.mjs";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const WEB_SRC = path.join(ROOT, "packages/dojolm-web/src");
const VENDOR_NAME =
  /\b(?:anthropic|claude|openai|gpt|mistral|gemini|llama|openrouter)\b/i;
const SUPPORTED_FORMAT = /\bClaude (?:Agent|Skill|Command)\b/i;
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".mjs", ".json"]);

function walk(directory, files = []) {
  if (!fs.existsSync(directory)) return files;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!entry.name.startsWith("__")) walk(target, files);
    } else if (
      SOURCE_EXTENSIONS.has(path.extname(entry.name)) &&
      !/\.(?:test|spec)\./.test(entry.name)
    ) {
      files.push(target);
    }
  }
  return files;
}

function recordLineHits(hits, source, file, repoRoot, allowSupportedFormats) {
  source.split("\n").forEach((line, index) => {
    if (!VENDOR_NAME.test(line)) return;
    if (allowSupportedFormats && SUPPORTED_FORMAT.test(line)) return;
    hits.push({
      file: path.relative(repoRoot, file).split(path.sep).join("/"),
      line: index + 1,
      text: line.trim(),
    });
  });
}

function placeholderValues(source) {
  const values = [];
  const pattern =
    /\bplaceholder\s*=\s*(?:(["'])(.*?)\1|\{\s*(["'])(.*?)\3\s*\})/gis;
  for (const match of source.matchAll(pattern))
    values.push({ index: match.index, value: match[2] ?? match[4] });
  return values;
}

export function scanGenericNames({ repoRoot = ROOT, webSrc = WEB_SRC } = {}) {
  const hits = [];
  const demoRoot = path.join(webSrc, "lib/demo");
  for (const file of walk(demoRoot)) {
    const source = stripComments(
      fs.readFileSync(file, "utf8"),
      path.extname(file),
    );
    recordLineHits(hits, source, file, repoRoot, true);
  }

  const conceptStub = path.join(
    webSrc,
    "app/api/atemi/concept-recon/concept-recon-engine.stub.ts",
  );
  if (fs.existsSync(conceptStub)) {
    const source = stripComments(fs.readFileSync(conceptStub, "utf8"), ".ts");
    recordLineHits(hits, source, conceptStub, repoRoot, false);
  }

  for (const file of walk(webSrc)) {
    if (path.extname(file) !== ".tsx") continue;
    if (
      file.includes(
        `${path.sep}app${path.sep}(design)${path.sep}canvas${path.sep}`,
      )
    )
      continue;
    const source = stripComments(fs.readFileSync(file, "utf8"), ".tsx");
    for (const placeholder of placeholderValues(source)) {
      if (!VENDOR_NAME.test(placeholder.value)) continue;
      hits.push({
        file: path.relative(repoRoot, file).split(path.sep).join("/"),
        line: source.slice(0, placeholder.index).split("\n").length,
        text: placeholder.value,
      });
    }
  }
  return hits.sort(
    (left, right) =>
      left.file.localeCompare(right.file) || left.line - right.line,
  );
}

export function runGenericNames(options) {
  const hits = scanGenericNames(options);
  return { ok: hits.length === 0, hits };
}

export function printGenericNames(result) {
  if (result.ok) {
    console.log(
      "generic-names OK — demo model identities and placeholders are vendor-neutral.",
    );
    return;
  }
  console.error(
    `generic-names FAIL (${result.hits.length}) — vendor names leaked into demo copy:`,
  );
  for (const hit of result.hits)
    console.error(`  ✗ ${hit.file}:${hit.line}  ${hit.text}`);
}

const isCli =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const result = runGenericNames();
  printGenericNames(result);
  if (!result.ok) process.exitCode = 1;
}
