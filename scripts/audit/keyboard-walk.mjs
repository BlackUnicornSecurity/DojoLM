#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
/**
 * E13.S4 keyboard walk (design acceptance item F-07) — Command Center,
 * Guard, Eval Run, Login: focus must be visible at every Tab stop and
 * the order must follow the layout.
 *
 * Usage: node scripts/audit/keyboard-walk.mjs <origin> [out.json]
 * Requires a running demo/e2e instance. The three shell surfaces walk
 * in an authenticated context (demo-session via /api/setup/admin); the
 * login surface walks in a FRESH UNAUTHENTICATED context so the real
 * auth card is exercised (an authenticated visit to /login redirects to
 * the shell — the DA KALITAS round-2 finding this script encodes).
 */

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const require = createRequire(
  path.join(ROOT, "packages/dojolm-web/package.json"),
);
const { chromium } = require("@playwright/test");

const ORIGIN = process.argv[2];
const OUT = process.argv[3];
if (!ORIGIN) {
  console.error("usage: keyboard-walk.mjs <origin> [out.json]");
  process.exit(2);
}

const SURFACES = [
  { name: "command-center", url: "/", auth: true },
  { name: "guard", url: "/admin/hattori", auth: true },
  { name: "eval-run", url: "/admin/eval/run", auth: true },
  { name: "login", url: "/login", auth: false },
];
const STOPS = 25;

async function walk(page, surface) {
  await page.goto(ORIGIN + surface.url, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const finalPath = new URL(page.url()).pathname;
  const stops = [];
  let prev = null;
  let orderViolations = 0;
  let invisibleFocus = 0;
  for (let index = 0; index < STOPS; index += 1) {
    await page.keyboard.press("Tab");
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      const ring =
        (style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0) ||
        style.boxShadow !== "none";
      return {
        tag: el.tagName,
        label: (el.getAttribute("aria-label") || el.textContent || "")
          .trim()
          .slice(0, 30),
        ring,
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        inViewport: rect.bottom > 0 && rect.top < innerHeight,
      };
    });
    if (!info) continue;
    if (!info.ring) invisibleFocus += 1;
    if (
      prev &&
      info.inViewport &&
      prev.inViewport &&
      info.y < prev.y - 8 &&
      info.x < prev.x
    ) {
      orderViolations += 1;
    }
    stops.push(`${info.tag}:${info.label}${info.ring ? "" : " [NO-RING]"}`);
    prev = info;
  }
  return {
    surface: surface.name,
    url: surface.url,
    finalPath,
    tabPresses: STOPS,
    focusableStops: stops.length,
    invisibleFocus,
    orderViolations,
    walk: stops,
  };
}

const browser = await chromium.launch();

// Authenticated context for the shell surfaces.
const authContext = await browser.newContext({
  viewport: { width: 1440, height: 900 },
});
const authPage = await authContext.newPage();
await authPage.request.post(ORIGIN + "/api/setup/admin", {
  data: { username: "walk", password: "unused" },
  headers: { "x-dojo-demo-mode": "1" },
});
await authPage.setExtraHTTPHeaders({ "x-dojo-demo-mode": "1" });

// Fresh unauthenticated context for the login card — the demo build's
// AuthContext auto-authenticates, so the rig's E2E signed-out capture
// signal (init script; only an E2E demo build honours it) forces the
// real auth card, exactly as the sealed capture's unauth phase does.
const anonContext = await browser.newContext({
  viewport: { width: 1440, height: 900 },
});
await anonContext.addInitScript(() => {
  globalThis.__DOJOLM_E2E_SIGNED_OUT__ = true;
});
const anonPage = await anonContext.newPage();
// Same-origin response fixture the rig's unauth phase uses
// (capture-public-fixtures.mjs setupStatus): a configured instance
// answers 401 here, which keeps /login from bouncing to the wizard.
await anonPage.route("**/api/setup/status", (route) =>
  route.fulfill({
    status: 401,
    contentType: "application/json",
    body: '{"error":"Authentication required"}',
  }),
);

const results = [];
for (const surface of SURFACES) {
  const page = surface.auth ? authPage : anonPage;
  results.push(await walk(page, surface));
}
await browser.close();

const payload = JSON.stringify(results, null, 1);
if (OUT) {
  fs.writeFileSync(OUT, payload);
  console.log(`wrote ${OUT}`);
}
console.log(payload);
const defects = results.reduce(
  (sum, r) => sum + r.invisibleFocus + r.orderViolations,
  0,
);
process.exitCode = defects === 0 ? 0 : 1;
