#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
/**
 * E13.S2 red-budget runner (conformity migration Phase 6.2) — makes the
 * design's acceptance step repeatable instead of a one-off audit script.
 *
 * Modes:
 *   tally <screens-dir> <out.json> [viewport]   Run the corpus instrument
 *       (red-tally.js, v2 mode + moments) over every capture PNG whose
 *       name contains the viewport (default 1440x900), via headless
 *       Chromium. Writes { "<relative-key>": {blobs, moments, redShare} }.
 *   compare <tally.json> [expected.json]        Diff a tally against the
 *       expected-moments table (red-tally-expected.json). Over-budget
 *       surfaces and keys matching no expected row fail (exit 1).
 *
 * lint:audit wiring: `compare --gate <tally.json>` — when the tally
 * artifact does not exist yet the gate prints an explicit WARN and
 * passes (capture runs are Phase-7 acceptance work, not per-merge work);
 * it NEVER silently skips, and once artifacts exist deviations fail.
 */

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const TALLY_JS = path.join(HERE, "red-tally.js");
const DEFAULT_EXPECTED = path.join(HERE, "red-tally-expected.json");

export function loadExpected(file = DEFAULT_EXPECTED) {
  const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  return parsed.rows.map((row) => ({
    ...row,
    regex: new RegExp(row.pattern),
  }));
}

export function compareTally(tally, rows) {
  const over = [];
  const unmatched = [];
  let checked = 0;
  let excluded = 0;
  for (const [key, result] of Object.entries(tally)) {
    const row = rows.find((candidate) => candidate.regex.test(key));
    if (!row) {
      unmatched.push(key);
      continue;
    }
    if (row.exclude) {
      excluded += 1;
      continue;
    }
    checked += 1;
    if (result.moments > row.maxMoments) {
      over.push({
        key,
        moments: result.moments,
        maxMoments: row.maxMoments,
        note: row.note,
      });
    }
  }
  return { over, unmatched, checked, excluded };
}

async function runTallyMode(screensDir, outFile, viewport) {
  // Resolve through the dojolm-web workspace (which declares
  // @playwright/test) instead of relying on root hoisting of a
  // transitive "playwright" package.
  const require = createRequire(
    path.join(ROOT, "packages/dojolm-web/package.json"),
  );
  const { chromium } = require("@playwright/test");
  const tallySource = fs.readFileSync(TALLY_JS, "utf8");

  const pngs = [];
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const target = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(target);
      else if (entry.name.endsWith(".png") && entry.name.includes(viewport))
        pngs.push(target);
    }
  })(screensDir);
  pngs.sort();
  console.log(`tallying ${pngs.length} ${viewport} captures`);

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent("<html><body></body></html>");
  await page.addScriptTag({ content: tallySource });

  const results = {};
  for (const png of pngs) {
    const b64 = fs.readFileSync(png).toString("base64");
    const tallied = await page.evaluate(async (data) => {
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = "data:image/png;base64," + data;
      });
      return window.RedTally.tallyImage(img, { mode: "v2", moments: true });
    }, b64);
    const key = path.relative(screensDir, png).split(path.sep).join("/");
    results[key] = {
      blobs: tallied.blobs,
      moments: tallied.moments,
      redShare: tallied.redShare,
    };
    console.log(`${key}\tblobs=${tallied.blobs}\tmoments=${tallied.moments}`);
  }
  await browser.close();
  fs.writeFileSync(outFile, JSON.stringify(results, null, 1));
  console.log(`wrote ${outFile} (${Object.keys(results).length} rows)`);
}

function runCompareMode(tallyFile, expectedFile, gateMode) {
  if (!fs.existsSync(tallyFile)) {
    if (gateMode) {
      console.warn(
        `red-tally WARN — no tally artifact at ${tallyFile}; the red-budget ` +
          `gate has NOT run (produce it with the Phase-7 acceptance capture).`,
      );
      return 0;
    }
    console.error(`red-tally FAIL — tally file not found: ${tallyFile}`);
    return 1;
  }
  const tally = JSON.parse(fs.readFileSync(tallyFile, "utf8"));
  const rows = loadExpected(expectedFile);
  const { over, unmatched, checked, excluded } = compareTally(tally, rows);
  if (unmatched.length > 0) {
    console.error(
      `red-tally FAIL — ${unmatched.length} capture key(s) match no expected row:`,
    );
    for (const key of unmatched) console.error(`  ? ${key}`);
  }
  if (over.length > 0) {
    console.error(
      `red-tally FAIL (${over.length}/${checked}) — surfaces over the §5 moment budget:`,
    );
    for (const hit of over) {
      console.error(
        `  ✗ ${hit.key}  moments=${hit.moments} > max=${hit.maxMoments}  (${hit.note})`,
      );
    }
  }
  if (unmatched.length === 0 && over.length === 0) {
    console.log(
      `red-tally OK — ${checked} surfaces within the §5 moment budgets` +
        ` (${excluded} review-chrome captures excluded).`,
    );
    return 0;
  }
  return 1;
}

const isCli =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
/* v8 ignore next 20 -- exercised as a real subprocess by lint:audit + the acceptance run. */
if (isCli) {
  const [mode, ...rest] = process.argv.slice(2);
  if (mode === "tally") {
    const [screensDir, outFile, viewport = "1440x900"] = rest;
    if (!screensDir || !outFile) {
      console.error(
        "usage: red-tally-runner.mjs tally <screens-dir> <out.json> [viewport]",
      );
      process.exit(2);
    }
    await runTallyMode(screensDir, outFile, viewport);
  } else if (mode === "compare") {
    const gateMode = rest.includes("--gate");
    const files = rest.filter((arg) => arg !== "--gate");
    const [tallyFile, expectedFile = DEFAULT_EXPECTED] = files;
    if (!tallyFile) {
      console.error(
        "usage: red-tally-runner.mjs compare [--gate] <tally.json> [expected.json]",
      );
      process.exit(2);
    }
    process.exitCode = runCompareMode(tallyFile, expectedFile, gateMode);
  } else {
    console.error("usage: red-tally-runner.mjs <tally|compare> …");
    process.exit(2);
  }
}
