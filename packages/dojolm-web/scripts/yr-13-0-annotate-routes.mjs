#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
/**
 * One-shot helper used during YR.13.0.5 to bulk-annotate route files
 * that the api-caller-graph test reports as orphans. Each entry below
 * maps an api path → the annotation that explains why it has no UI
 * caller (per orphan-apis.md triage).
 *
 * Run once during YR.13.0 implementation; not invoked by CI. Kept in the
 * repo so future audits can reproduce the categorization.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);

/** Annotation for each route. Keyed by the URL path the api-caller-graph
 * test prints when it fails. */
const ANNOTATIONS = {
  // --- Webhooks / server-side / dev-fixture surfaces ---
  '/api/audit/log': ['@webhook', 'audit logger destination (orphan-apis.md Group D)'],
  '/api/build-info': ['@webhook', 'health/build-info endpoint (orphan-apis.md Group D)'],
  '/api/dsr': ['@webhook', 'data-subject request endpoint — admin-or-external'],
  '/api/read-fixture': ['@webhook', 'fixture reader for tests/dev only'],
  '/api/read-fixture/media': ['@webhook', 'fixture reader for tests/dev only'],
  '/api/scan-fixture': ['@webhook', 'fixture reader for tests/dev only'],
  '/api/mcp/status': ['@webhook', 'MCP server status — server-scrape only'],
  '/api/tests': ['@webhook', 'test-runtime endpoint; not a UI surface'],

  // --- Restoration backlog (Group B in orphan-apis.md) ---
  '/api/admin/validation/calibrate': ['@orphan-tracked', 'G-003 v1-v2-restore-admin-validation-ui.md'],
  '/api/admin/validation/export/[runId]': ['@orphan-tracked', 'G-003 v1-v2-restore-admin-validation-ui.md'],
  '/api/admin/validation/modules': ['@orphan-tracked', 'G-003 v1-v2-restore-admin-validation-ui.md'],
  '/api/admin/validation/report/[runId]': ['@orphan-tracked', 'G-003 v1-v2-restore-admin-validation-ui.md'],
  '/api/admin/validation/runs': ['@orphan-tracked', 'G-003 v1-v2-restore-admin-validation-ui.md'],
  '/api/admin/validation/status/[runId]': ['@orphan-tracked', 'G-003 v1-v2-restore-admin-validation-ui.md'],
  '/api/admin/validation/verify': ['@orphan-tracked', 'G-003 v1-v2-restore-admin-validation-ui.md'],
  '/api/admin/plugins': ['@orphan-tracked', 'G-005 v1-v2-restore-admin-plugins-ui.md'],
  '/api/admin/plugins/[id]': ['@orphan-tracked', 'G-005 v1-v2-restore-admin-plugins-ui.md'],
  '/api/admin/audit': ['@orphan-tracked', 'G-052 v1-v2-restore-compliance-bushido-views.md (audit-trail UI)'],
  '/api/admin/leaderboard/moderation': ['@orphan-tracked', 'orphan-apis.md Group B — deferred until leaderboard moderation UI ask'],
  '/api/admin/settings': ['@orphan-tracked', 'G-008 admin-settings UI (session TTL / retention) — restoration backlog'],
  '/api/admin/seasons': ['@orphan-tracked', 'orphan-apis.md Group B — admin seasons archive UI follow-up'],
  '/api/auth/users': ['@orphan-tracked', 'G-001 v1-v2-restore-admin-user-management.md'],
  '/api/auth/users/[id]': ['@orphan-tracked', 'G-001 v1-v2-restore-admin-user-management.md'],

  // --- Deferred-module scaffolding (Group A in orphan-apis.md) ---
  '/api/admin/amaterasu/feeds': ['@orphan-tracked', 'YA.3 Amaterasu UI (D-03)'],
  '/api/attackdna/sync': ['@orphan-tracked', 'YA.3 Amaterasu UI (D-03)'],
  '/api/buki/fuzz': ['@orphan-tracked', 'YA.6 Buki standalone (D-06) v1-v2-restore-buki-tabs.md'],
  '/api/llm/seed': ['@orphan-tracked', 'YA.6 Buki SAGE seeds — sage seed-gen surface'],
  '/api/sengoku/runs/[runId]': ['@orphan-tracked', 'YA.4 Sengoku runs view (D-04)'],

  // --- Jutsu / model-lab scaffolding (YA.7) ---
  '/api/llm/batch-test': ['@orphan-tracked', 'YA.7 Jutsu expanded — v1-v2-restore-jutsu-model-cards.md'],
  '/api/llm/batch-test/[id]': ['@orphan-tracked', 'YA.7 Jutsu expanded'],
  '/api/llm/batch/cleanup': ['@orphan-tracked', 'YA.7 Jutsu expanded'],
  '/api/llm/coverage': ['@orphan-tracked', 'G-055 compliance coverage map — restoration backlog'],
  '/api/llm/fingerprint/signatures': ['@orphan-tracked', 'YA.7 Jutsu fingerprint surface'],
  '/api/llm/fingerprint/stream/[id]': ['@orphan-tracked', 'YA.7 Jutsu fingerprint stream'],
  '/api/llm/obl/alignment': ['@orphan-tracked', 'YA.7 Jutsu OBL alignment'],
  '/api/llm/obl/depth': ['@orphan-tracked', 'YA.7 Jutsu OBL depth'],
  '/api/llm/obl/geometry': ['@orphan-tracked', 'YA.7 Jutsu OBL geometry'],
  '/api/llm/obl/robustness': ['@orphan-tracked', 'YA.7 Jutsu OBL robustness'],
  '/api/llm/presets': ['@orphan-tracked', 'YA.7 Jutsu presets'],
  '/api/llm/reports': ['@orphan-tracked', 'YA.7 Jutsu reports'],
  '/api/llm/summary': ['@orphan-tracked', 'YA.7 Jutsu summary'],
  '/api/llm/test-fixture': ['@orphan-tracked', 'YA.7 Jutsu test-fixture'],

  // --- Compliance / Bushido restoration ---
  '/api/compliance/export': ['@orphan-tracked', 'G-053 v1-v2-restore-compliance-bushido-views.md'],
  '/api/compliance/frameworks': ['@orphan-tracked', 'G-050 v1-v2-restore-compliance-bushido-views.md'],
  '/api/compliance/transfer-matrix': ['@orphan-tracked', 'G-019 v1-v2-restore-jutsu-model-cards.md (ComparisonView)'],

  // --- Arena / Ronin / Members / Shingan restoration ---
  '/api/arena/export': ['@orphan-tracked', 'G-027 BattleLog export — restoration backlog'],
  '/api/ronin/cves': ['@orphan-tracked', 'G-037 v1-v2-restore-ronin-tabs.md'],
  '/api/members/kumite/long-match': ['@orphan-tracked', 'E4B follow-up — long-match surface'],
  '/api/shingan/batch': ['@orphan-tracked', 'G-049 v1-v2-restore-shingan-trust-scan.md'],
  '/api/shingan/formats': ['@orphan-tracked', 'G-049 v1-v2-restore-shingan-trust-scan.md'],
  '/api/shingan/url': ['@orphan-tracked', 'G-049 v1-v2-restore-shingan-trust-scan.md'],
  '/api/reports/consolidated': ['@orphan-tracked', 'G-056 v1-v2-restore-consolidated-report-button.md'],
};

const fsPaths = Object.fromEntries(
  Object.keys(ANNOTATIONS).map((url) => {
    const seg = url.replace(/^\/api\//, '');
    return [url, path.join(root, 'src', 'app', 'api', seg, 'route.ts')];
  }),
);

let touched = 0;
for (const [url, [annotation, comment]] of Object.entries(ANNOTATIONS)) {
  const fp = fsPaths[url];
  if (!existsSync(fp)) {
    console.warn(`SKIP (not found): ${url} -> ${path.relative(root, fp)}`);
    continue;
  }
  const body = readFileSync(fp, 'utf8');
  if (body.includes(annotation)) {
    continue; // already annotated
  }
  const banner = `// ${annotation} -- ${comment}\n`;
  writeFileSync(fp, banner + body, 'utf8');
  touched += 1;
  console.log(`+ ${annotation.padEnd(18)} ${url}`);
}

if (touched === 0) {
  console.log(
    'Nothing to do — every route in ANNOTATIONS already carries its annotation. ' +
      'This script was a one-shot helper for YR.13.0.5 (G-A5) and should not be ' +
      're-run unless a new orphan is added to the ANNOTATIONS map above.',
  );
} else {
  console.log(`\nAnnotated ${touched} route files.`);
}
