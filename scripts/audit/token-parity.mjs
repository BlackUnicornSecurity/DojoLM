#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
/**
 * F-09 frozen-token parity gate.
 *
 * The validated corpus is reference-only at runtime. Production tokens remain
 * in `packages/dojolm-web/src/design/styles/tokens.css`; this gate pins every
 * declaration of the frozen spine to its exact production-canon value and
 * fails closed on unresolved indirection, imports, escaped identifiers, and
 * conflicting declarations.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const PROD_TOKENS = path.join(
  ROOT,
  "packages/dojolm-web/src/design/styles/tokens.css",
);
const PROD_TOKEN_DEPENDENCIES = Object.freeze([
  path.join(ROOT, "packages/dojolm-web/src/app/brand-tokens.css"),
]);

export const FROZEN_SPINE = Object.freeze({
  bg: "#06060b",
  "bg-1": "#0a0a11",
  "bg-2": "#10111a",
  "bg-3": "#161724",
  "bg-4": "#1e2030",
  "bg-5": "#2a2c3e",
  torii: "#cc3a2f",
  "torii-lg": "#e0544a",
  "torii-hi": "#f47a63",
  "torii-deep": "#8b1e16",
  "torii-text": "#e0544a",
  ember: "#f0744b",
  fg: "#eceef2",
  "fg-dim": "#9ba3b3",
  "fg-mute": "#5e6472",
  "fg-ghost": "#7a8294",
  steel: "#5b8def",
  "steel-lg": "#86aaf3",
  jade: "#34c76a",
  gold: "#d4a843",
  "gold-lg": "#e6c46e",
  violet: "#8b7bf5",
  cyan: "#00d9ff",
  paper: "#f0e9d7",
  "paper-ink": "#1b1609",
});

export const ACCEPTED_DELTAS = Object.freeze({
  "steel-lg": Object.freeze({
    prod: "#8bb4ff",
    reason: "exact production-canon value; fold into the next corpus freeze",
  }),
  "gold-lg": Object.freeze({
    prod: "#f5c862",
    reason: "exact production-canon value; fold into the next corpus freeze",
  }),
});

const DECLARATION = /--([a-z0-9-]+)\s*:\s*([^;{}]+?)\s*(?=[;}]|$)/gi;
const HEX = /^#[0-9a-f]{3,8}$/i;
const VARIABLE = /^var\(\s*(--[a-z0-9-]+)\s*(?:,\s*([\s\S]+?)\s*)?\)$/i;

function stripComments(css) {
  let output = "";
  let quote = null;
  let escaped = false;
  for (let index = 0; index < css.length; index += 1) {
    const current = css[index];
    const next = css[index + 1];
    if (quote !== null) {
      output += current;
      if (escaped) escaped = false;
      else if (current === "\\") escaped = true;
      else if (current === quote) quote = null;
      continue;
    }
    if (current === '"' || current === "'") {
      quote = current;
      output += current;
      continue;
    }
    if (current === "/" && next === "*") {
      const close = css.indexOf("*/", index + 2);
      const end = close === -1 ? css.length : close + 2;
      output += css.slice(index, end).replace(/[^\n]/g, " ");
      index = end - 1;
      continue;
    }
    output += current;
  }
  return output;
}

function decodeCssEscapes(value) {
  return value.replace(
    /\\([0-9a-f]{1,6})(?:\s)?|\\(.)/gi,
    (_match, hex, escaped) =>
      hex ? String.fromCodePoint(Number.parseInt(hex, 16)) : escaped,
  );
}

function syntaxView(css) {
  const source = stripComments(css);
  let output = "";
  let quote = null;
  let escaped = false;
  for (const current of source) {
    if (quote !== null) {
      output += current === "\n" ? "\n" : " ";
      if (escaped) escaped = false;
      else if (current === "\\") escaped = true;
      else if (current === quote) quote = null;
      continue;
    }
    if (current === '"' || current === "'") {
      quote = current;
      output += " ";
      continue;
    }
    output += current;
  }
  return output;
}

function syntaxFailures(css) {
  const source = syntaxView(css);
  const decoded = decodeCssEscapes(source);
  const failures = [];
  if (/@import\b/i.test(decoded)) {
    failures.push("@import is not allowed in the production token source");
  }
  if (/--[^:;{}]*\\/.test(source)) {
    failures.push("escaped custom-property identifier is not allowed");
  }
  if (/\\/.test(source)) {
    failures.push("escaped CSS syntax is not allowed in token sources");
  }
  return failures;
}

export function collectDeclarations(css) {
  const declarations = {};
  for (const [, name, raw] of syntaxView(css).matchAll(DECLARATION)) {
    (declarations[name] ||= []).push(raw.trim());
  }
  return declarations;
}

export function resolveHex(raw, declarations, seen = new Set()) {
  const value = raw.trim();
  if (HEX.test(value)) return value.toLowerCase();
  const variable = value.match(VARIABLE);
  if (!variable) return null;

  const reference = variable[1].slice(2);
  const chain = declarations[reference];
  if (!chain) {
    return variable[2] ? resolveHex(variable[2], declarations, seen) : null;
  }
  if (seen.has(reference)) return null;

  const nextSeen = new Set(seen).add(reference);
  const resolved = new Set(
    chain.map((candidate) => resolveHex(candidate, declarations, nextSeen)),
  );
  return resolved.size === 1 ? [...resolved][0] : null;
}

function expectedProductionValue(name, frozen) {
  return ACCEPTED_DELTAS[name]?.prod ?? frozen;
}

function resolveFrozenHex(raw, declarations, seen = new Set()) {
  const value = raw.trim();
  if (HEX.test(value)) return value.toLowerCase();
  const variable = value.match(VARIABLE);
  if (!variable) return null;
  const reference = variable[1].slice(2);
  const chain = declarations[reference];
  if (!chain || seen.has(reference)) return null;
  const nextSeen = new Set(seen).add(reference);
  const resolved = new Set(
    chain.map((candidate) =>
      resolveFrozenHex(candidate, declarations, nextSeen),
    ),
  );
  return resolved.size === 1 ? [...resolved][0] : null;
}

export function auditTokenParity(css, { dependencyCss = [] } = {}) {
  const sources = [...dependencyCss, css];
  const declarations = collectDeclarations(sources.join("\n"));
  const failures = sources.flatMap((source) => syntaxFailures(source));
  const deltas = [];

  for (const [name, frozen] of Object.entries(FROZEN_SPINE)) {
    const chain = declarations[name];
    const expected = expectedProductionValue(name, frozen);
    if (!chain) {
      failures.push(`--${name}: missing; expected ${expected}`);
      continue;
    }
    for (const raw of chain) {
      const resolved = resolveFrozenHex(raw, declarations);
      if (resolved !== expected) {
        failures.push(
          `--${name}: expected ${expected}, got ${resolved ?? "unresolved"} from "${raw}"`,
        );
      }
    }
    if (expected !== frozen) {
      deltas.push(
        `--${name}: corpus ${frozen} → production ${expected} (${ACCEPTED_DELTAS[name].reason})`,
      );
    }
  }

  return { ok: failures.length === 0, failures, deltas };
}

export function frozenSpineFromCss(css) {
  const failures = syntaxFailures(css);
  if (failures.length > 0) throw new Error(failures.join("; "));
  const declarations = collectDeclarations(css);
  const spine = {};
  for (const [name, chain] of Object.entries(declarations)) {
    const raw = chain.at(-1);
    const resolved = resolveFrozenHex(raw, declarations);
    if (resolved) spine[name] = resolved;
    else if (VARIABLE.test(raw)) {
      throw new Error(`--${name}: unresolved token dependency`);
    }
  }
  return spine;
}

export function printTokenAudit(result, io = console) {
  for (const delta of result.deltas) io.log(`  · ${delta}`);
  if (result.ok) {
    io.log(
      `token-parity OK — ${Object.keys(FROZEN_SPINE).length} production tokens pinned.`,
    );
    return;
  }
  io.error(`token-parity FAIL (${result.failures.length}):`);
  for (const failure of result.failures) io.error(`  ✗ ${failure}`);
}

const isCli =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
/* v8 ignore next 12 -- exercised as real subprocesses by lint:audit and reviewer probes. */
if (isCli) {
  if (process.argv[2] === "--spine") {
    const sourcePath = process.argv[3];
    if (!sourcePath) {
      console.error("usage: token-parity.mjs --spine <dojo.css>");
      process.exitCode = 2;
    } else {
      console.log(
        JSON.stringify(
          frozenSpineFromCss(fs.readFileSync(sourcePath, "utf8")),
          null,
          2,
        ),
      );
    }
  } else {
    const tokensPath = process.argv[2]
      ? path.resolve(process.argv[2])
      : PROD_TOKENS;
    const dependencyCss = PROD_TOKEN_DEPENDENCIES.map((dependency) =>
      fs.readFileSync(dependency, "utf8"),
    );
    const result = auditTokenParity(fs.readFileSync(tokensPath, "utf8"), {
      dependencyCss,
    });
    printTokenAudit(result);
    if (!result.ok) process.exitCode = 1;
  }
}
