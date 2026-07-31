// SPDX-License-Identifier: Apache-2.0
/**
 * File: src/lib/demo/mock-api-handlers.ts
 * Purpose: Centralized demo API response handlers
 *
 * Each function returns mock data matching the EXACT shape the real API returns.
 * Response shapes were verified against the actual route handlers and contexts.
 */

import { NextRequest, NextResponse } from "next/server";
import { DEMO_MODELS } from "./mock-models";
import { getDemoTestCases } from "./mock-test-cases";
import {
  getDemoExecutions,
  getDemoPopulatedBatches,
  getDemoBatchExecutions,
  getDemoModelAvgScore,
} from "./mock-executions";
import { generateDemoScanResult, DEMO_SCANNER_STATS } from "./mock-scanner";
import {
  DEMO_GUARD_CONFIG,
  DEMO_GUARD_STATS,
  DEMO_GUARD_EVENTS,
} from "./mock-guard";
import {
  DEMO_ACTIVITY_FEED,
  DEMO_PLATFORM_STATS,
  DEMO_SYSTEM_HEALTH,
  DEMO_FIXTURE_MANIFEST,
  DEMO_SELF_SESSIONS,
  DEMO_USERS,
} from "./mock-dashboard";
import {
  getDemoArenaMatches,
  DEMO_WARRIORS,
  DEMO_SAGE_POOL,
} from "./mock-arena";
import {
  DEMO_CAMPAIGNS,
  DEMO_CAMPAIGN_RUNS,
  getDemoCampaignRuns,
  getDemoCampaignRun,
} from "./mock-sengoku";
import {
  DEMO_FRAMEWORKS,
  DEMO_COMPLIANCE_AUDIT_TRAIL,
} from "./mock-compliance";
import {
  DEMO_THREAT_SOURCES,
  DEMO_THREAT_ENTRIES,
  DEMO_ATTACK_FAMILIES,
  DEMO_ATTACK_CLUSTERS,
  DEMO_KAGAMI_RESULTS,
  DEMO_SHINGAN_SCANS,
  DEMO_SUPPLY_CHAIN_AUDIT,
} from "./mock-kumite";
import {
  DEMO_BOUNTY_PROGRAMS,
  DEMO_BOUNTY_SUBMISSIONS,
  DEMO_ATEMI_PLAYBOOK_RESULTS,
  DEMO_WEBMCP_RESULTS,
  DEMO_MCP_CONNECTORS,
  DEMO_KOTOBA_ANALYSES,
} from "./mock-remaining";
import { computeForModel } from "@/lib/aivss/computeForModel";
import { computeForSubmission } from "@/lib/aivss/computeForSubmission";
import { buildLeaderboard, computeGlobalStats } from "@/lib/arena-aggregates";
import type { GameMode } from "@/lib/arena-types";

// ─── LLM Routes ──────────────────────────────────────────────────────────────
// Real GET /api/llm/models returns LLMModelConfig[] (plain array, no wrapper)

export function demoModelsGet() {
  // Adversarial-review HIGH-3 fix — attach `aivss` per row so the demo
  // wire shape matches the production wire shape. Without this, a
  // client reading `row.aivss` would see `undefined` in demo mode and
  // a real value in prod — a three-value runtime type (`AivssScore |
  // null | undefined`) instead of the documented two-value contract.
  return NextResponse.json(
    DEMO_MODELS.map((m) => ({
      ...m,
      apiKey: undefined,
      aivss: computeForModel(m),
    })),
  );
}

export function demoModelsPost(_req: NextRequest) {
  return NextResponse.json(
    {
      model: {
        id: `model-i-${Date.now()}`,
        name: "model-i",
        provider: "custom",
        model: "model-i",
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    },
    { status: 201 },
  );
}

export function demoModelById(modelId: string) {
  const model = DEMO_MODELS.find((m) => m.id === modelId);
  if (!model)
    return NextResponse.json({ error: "Model not found" }, { status: 404 });
  return NextResponse.json({ ...model, apiKey: undefined });
}

// Real GET /api/llm/test-cases returns LLMPromptTestCase[] (plain array)
export function demoTestCasesGet() {
  return NextResponse.json(getDemoTestCases());
}

// Real GET /api/llm/batch returns { batches: LLMBatchExecution[] }
export function demoBatchGet() {
  return NextResponse.json({ batches: getDemoPopulatedBatches() });
}

export function demoBatchPost() {
  return NextResponse.json(
    {
      batch: {
        id: "demo-batch-live",
        name: "Demo Batch",
        status: "completed",
        totalTests: 60,
        completedTests: 60,
        failedTests: 0,
        testCaseIds: [],
        modelConfigIds: [],
        executionIds: [],
        createdAt: new Date().toISOString(),
      },
    },
    { status: 202 },
  );
}

// Real GET /api/llm/batch/[id] returns the batch object directly (via withAuth → handler)
export function demoBatchById(batchId: string) {
  const batch = getDemoPopulatedBatches().find((b) => b.id === batchId);
  if (!batch)
    return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  return NextResponse.json({ batch });
}

// Real GET /api/llm/batch/[id]/executions returns { executions: LLMTestExecution[] }
export function demoBatchExecutions(batchId: string) {
  return NextResponse.json({ executions: getDemoBatchExecutions(batchId) });
}

// Real GET /api/llm/results returns { executions: LLMTestExecution[] }
export function demoResultsGet() {
  return NextResponse.json({
    executions: getDemoExecutions().slice(0, 100),
    total: getDemoExecutions().length,
  });
}

export function demoLeaderboardGet() {
  const leaderboard = DEMO_MODELS.filter((m) => m.enabled)
    .map((m) => ({
      modelId: m.id,
      modelName: m.name,
      provider: m.provider,
      avgScore: getDemoModelAvgScore(m.id),
      executionCount: getDemoExecutions().filter(
        (e) => e.modelConfigId === m.id,
      ).length,
    }))
    .sort((a, b) => b.avgScore - a.avgScore);
  return NextResponse.json({ leaderboard });
}

export function demoCoverageGet() {
  return NextResponse.json({});
}

export function demoReportsGet() {
  return NextResponse.json({});
}

export function demoProvidersGet() {
  return NextResponse.json(
    DEMO_MODELS.map((m) => ({
      id: m.id,
      name: m.name,
      provider: m.provider,
      model: m.model,
      enabled: m.enabled,
      status: "registered",
    })),
  );
}

export function demoProvidersPost() {
  return NextResponse.json(
    { id: `demo-provider-${Date.now()}`, status: "registered" },
    { status: 201 },
  );
}

// ─── Scanner Routes ──────────────────────────────────────────────────────────

export async function demoScanPost(req: NextRequest) {
  const body = await req.json().catch(() => ({ text: "" }));
  const result = generateDemoScanResult(body.text ?? "");
  return NextResponse.json(result);
}

// Real GET /api/stats returns the PT-INFO-M06 summary shape
// { patternCount, groupCount, sourceCount } plus the E5.S1 dashboard
// aggregate sub-objects (`coverage` / `runs` / `blocked` / `budget`).
// Demo mode mirrors the live shape so the `/` Sensei dashboard cards
// resolve away from `—` placeholders without leaking the live audit-log
// walk into the demo session.
export function demoStatsGet() {
  const sources = new Set(
    DEMO_SCANNER_STATS.patternGroups.map((_name, i) =>
      i < 4 ? "core" : i < 8 ? "p2" : "p3",
    ),
  );
  const groupCount = DEMO_SCANNER_STATS.patternGroups.length;
  const sourceCount = sources.size;
  const patternCount = DEMO_SCANNER_STATS.patternCount;
  return NextResponse.json({
    patternCount,
    groupCount,
    sourceCount,
    coverage: { patternCount, groupCount, sourceCount },
    // prior48h: 10 → the dashboard renders the design's exact demo delta
    // ("▲ 4 vs prior", wave-a Command Center v2.html KPI strip).
    runs: { last48h: 14, prior48h: 10, lookbackHours: 48 },
    blocked: { last48h: 5, lookbackHours: 48 },
    budget: {
      exceededLast48h: 0,
      lookbackHours: 48,
      limitPerMin: null,
      configured: false,
    },
  });
}

export function demoFixturesGet() {
  return NextResponse.json(DEMO_FIXTURE_MANIFEST);
}

// ─── Account (self-service) Routes ───────────────────────────────────────────
// The demo auth layer's synthetic admin has no DB user row, so the
// /api/account/* self-endpoints 404 without these. Shapes mirror
// api/account/me (camelCase user) and api/account/sessions ({ sessions }).
// Header parity with the real routes (Cache-Control: no-store +
// X-Content-Type-Options: nosniff) so the demo branch carries no contract
// delta (DA KALITAS 2026-07-16, senior-dev LOW).
const ACCOUNT_RESPONSE_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Cache-Control": "no-store",
} as const;

export function demoAccountMeGet() {
  const u = DEMO_USERS[0];
  return NextResponse.json(
    {
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role,
      displayName: u.display_name,
      createdAt: u.created_at,
      lastLoginAt: u.last_login_at,
    },
    { headers: ACCOUNT_RESPONSE_HEADERS },
  );
}

export function demoAccountSessionsGet() {
  return NextResponse.json(
    { sessions: DEMO_SELF_SESSIONS },
    { headers: ACCOUNT_RESPONSE_HEADERS },
  );
}

// ─── Admin Users Route ───────────────────────────────────────────────────────
// P2d D1 (wave-g/Users v2.html honest roster): the demo runtime's SQLite
// user table is empty — the synthetic demo admin never gets a DB row — so
// the real route honestly returned `{ users: [], total: 0 }` and the page
// showed a dishonest "0 users" empty while the signed-in admin plainly
// exists. The roster is the canonical demo-fixture operator list; response
// shape mirrors GET /api/admin/users ({ users, total, limit, offset, page }).
// ponytail: pagination params ignored — 5 fixture rows never exceed a page.
export function demoAdminUsersGet() {
  return NextResponse.json(
    {
      users: DEMO_USERS,
      total: DEMO_USERS.length,
      limit: 100,
      offset: 0,
      page: 1,
    },
    { headers: ACCOUNT_RESPONSE_HEADERS },
  );
}

// ─── Guard Routes ────────────────────────────────────────────────────────────
// Real returns { data: GuardConfig }, { data: GuardStats }, { data: GuardEvent[] }

export function demoGuardConfigGet() {
  return NextResponse.json({ data: DEMO_GUARD_CONFIG });
}

export function demoGuardStatsGet() {
  return NextResponse.json({ data: DEMO_GUARD_STATS });
}

export function demoGuardAuditGet() {
  return NextResponse.json({ data: DEMO_GUARD_EVENTS });
}

// ─── Arena Routes ────────────────────────────────────────────────────────────

export function demoArenaGet() {
  return NextResponse.json({ matches: getDemoArenaMatches() });
}

export function demoArenaMatchById(matchId: string) {
  const match = getDemoArenaMatches().find((m) => m.id === matchId);
  if (!match)
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  return NextResponse.json(match);
}

export function demoArenaWarriorsGet() {
  return NextResponse.json({
    warriors: DEMO_WARRIORS,
    total: DEMO_WARRIORS.length,
  });
}

export function demoArenaLeaderboardGet(options: {
  readonly gameMode: GameMode | null;
  readonly minMatches: number;
  readonly limit: number;
  readonly offset: number;
}) {
  const matches = getDemoArenaMatches();
  const { entries, total } = buildLeaderboard(DEMO_WARRIORS, matches, options);
  return NextResponse.json({
    leaderboard: entries,
    globalStats: computeGlobalStats(matches),
    total,
    limit: options.limit,
    offset: options.offset,
    gameMode: options.gameMode,
  });
}

export function demoArenaPost() {
  return NextResponse.json(
    { match: { id: "demo-match-live", status: "pending" } },
    { status: 202 },
  );
}

// ─── Sengoku Routes ──────────────────────────────────────────────────────────

export function demoCampaignsGet() {
  return NextResponse.json({ campaigns: DEMO_CAMPAIGNS });
}

export function demoCampaignById(campaignId: string) {
  const campaign = DEMO_CAMPAIGNS.find((c) => c.id === campaignId);
  if (!campaign)
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  return NextResponse.json(campaign);
}

export function demoCampaignRunsGet(campaignId: string) {
  return NextResponse.json({ runs: getDemoCampaignRuns(campaignId) });
}

export function demoCampaignRunById(runId: string) {
  const run = getDemoCampaignRun(runId);
  if (!run)
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  return NextResponse.json(run);
}

// ─── Compliance Routes ───────────────────────────────────────────────────────

export function demoComplianceGet() {
  return NextResponse.json({ frameworks: DEMO_FRAMEWORKS });
}

export function demoComplianceFrameworksGet() {
  return NextResponse.json({ frameworks: DEMO_FRAMEWORKS });
}

export function demoComplianceAuditGet() {
  return NextResponse.json({ entries: DEMO_COMPLIANCE_AUDIT_TRAIL });
}

// ─── Admin Routes ────────────────────────────────────────────────────────────

export function demoHealthGet() {
  return NextResponse.json(DEMO_SYSTEM_HEALTH);
}

export function demoSettingsGet() {
  return NextResponse.json({ sessionTtlMinutes: 1440, retentionDays: 90 });
}

// Plugin Registry (Train 3) — demo mode returns a small curated list so the
// PluginsTab UI shows real structure without persisting anything to disk.
const DEMO_PLUGINS = [
  {
    manifest: {
      id: "demo-prompt-shield",
      name: "Prompt Shield",
      version: "1.0.0",
      type: "scanner" as const,
      description: "Demo scanner that blocks prompt-injection attempts.",
      author: "BU-TPI Team",
      dependencies: [],
      capabilities: ["scan", "detect"],
    },
    enabled: true,
    registeredAt: "2026-04-01T00:00:00.000Z",
    state: "loaded" as const,
    lastError: null,
  },
  {
    manifest: {
      id: "demo-markdown-reporter",
      name: "Markdown Reporter",
      version: "0.9.2",
      type: "reporter" as const,
      description: "Demo reporter that renders scan results as Markdown.",
      author: "BU-TPI Team",
      dependencies: [],
      capabilities: ["report"],
    },
    enabled: false,
    registeredAt: "2026-04-03T00:00:00.000Z",
    state: "disabled" as const,
    lastError: null,
  },
];

export function demoPluginsGet() {
  return NextResponse.json({
    plugins: DEMO_PLUGINS,
    counts: { scanner: 1, transform: 0, reporter: 1, orchestrator: 0 },
  });
}

export function demoPluginsPost() {
  return NextResponse.json(
    { error: "Plugin registration is disabled in demo mode" },
    { status: 403 },
  );
}

export function demoPluginsDelete() {
  return NextResponse.json(
    { error: "Plugin unregistration is disabled in demo mode" },
    { status: 403 },
  );
}

export async function demoPluginsPatch(req: NextRequest) {
  // Demo PATCH echoes a 200 with the requested enabled flag so the optimistic
  // UI path does not error. The returned body is discarded by the PluginsTab
  // caller (which always re-fetches via `load()`), so the canned DEMO_PLUGINS
  // list is what actually renders. Nothing is persisted — demos are read-only.
  const len = req.headers.get("content-length");
  if (len && Number(len) > 1024) {
    return NextResponse.json(
      { error: "Request body too large" },
      { status: 413 },
    );
  }

  let enabled = false;
  try {
    const body = (await req.json()) as { enabled?: boolean };
    if (typeof body.enabled === "boolean") enabled = body.enabled;
  } catch {
    /* fall through with default */
  }
  const template = DEMO_PLUGINS[0];
  if (!template) {
    // Defensive: the demo fixture should never be empty, but spreading
    // `undefined` would silently truncate the response shape.
    return NextResponse.json(
      { error: "Demo plugins fixture is empty" },
      { status: 500 },
    );
  }
  return NextResponse.json({
    ...template,
    enabled,
    state: enabled ? "loaded" : "disabled",
  });
}

// ─── Ecosystem / AttackDNA / Mitsuke ─────────────────────────────────────────
// Real ecosystem returns { data: { findings: [...] } }

export function demoEcosystemGet() {
  return NextResponse.json({
    data: {
      findings: getDemoExecutions()
        .filter((e) => e.injectionSuccess > 0.5)
        .slice(0, 20)
        .map((e) => ({
          id: e.id,
          modelId: e.modelConfigId,
          category: e.categoriesFailed[0] ?? "unknown",
          severity: e.scanResult?.severity ?? "INFO",
          timestamp: e.timestamp,
        })),
    },
  });
}

export function demoAttackDnaQueryGet() {
  return NextResponse.json({
    families: DEMO_ATTACK_FAMILIES,
    clusters: DEMO_ATTACK_CLUSTERS,
  });
}

// D-06 — Mitsuke demo seed, mapped to the wire shapes the /api/mitsuke
// read routes serve. The routes splice these into their live filter +
// pagination flow under isDemoMode(), so demo behaves like a curated
// store instead of returning a dead aggregate payload (the old
// demoMitsukeGet was unreachable from any route).
const DEMO_ENTRY_SEVERITY: Readonly<
  Record<string, "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO">
> = Object.freeze({
  critical: "CRITICAL",
  high: "HIGH",
  medium: "MEDIUM",
  low: "LOW",
});

export function demoMitsukeEntries() {
  return DEMO_THREAT_ENTRIES.map((e) => ({
    id: e.id,
    source: e.source,
    threatType: e.type,
    title: e.title,
    description: e.description,
    indicators: e.indicators,
    severity: DEMO_ENTRY_SEVERITY[e.severity] ?? "INFO",
    confidence: e.confidence,
    firstSeen: e.publishedAt,
    lastSeen: e.publishedAt,
    createdAt: e.publishedAt,
  }));
}

export function demoMitsukeSources() {
  return DEMO_THREAT_SOURCES.map((s) => ({
    id: s.id,
    name: s.name,
    url: s.url,
    type: s.type.toLowerCase() as "rss" | "api" | "webhook",
    enabled: s.status === "active",
    refreshIntervalMinutes: 60,
    lastFetched: s.lastPoll,
    createdAt: s.lastPoll,
  }));
}

// ─── Ronin Routes ────────────────────────────────────────────────────────────

export function demoRoninProgramsGet() {
  return NextResponse.json({ programs: DEMO_BOUNTY_PROGRAMS });
}

export function demoRoninSubmissionsGet() {
  // Adversarial-review HIGH-3 fix — attach `aivss` per row so the demo
  // wire shape matches production. See `demoModelsGet` for rationale.
  return NextResponse.json({
    submissions: DEMO_BOUNTY_SUBMISSIONS.map((s) => ({
      ...s,
      aivss: computeForSubmission(s),
    })),
  });
}

// ─── Shingan Routes ──────────────────────────────────────────────────────────

export function demoShinganScansGet() {
  return NextResponse.json({ scans: DEMO_SHINGAN_SCANS });
}

export function demoShinganFormatsGet() {
  return NextResponse.json({
    formats: [
      "Claude Agent",
      "Claude Skill",
      "Claude Command",
      "MCP Tool",
      "BMAD Agent",
      "Plugin Manifest",
      "Hooks Config",
      "Auto-detect",
    ],
  });
}

// ─── Kagami / Fingerprint Routes ─────────────────────────────────────────────

export function demoFingerprintGet() {
  return NextResponse.json({ results: DEMO_KAGAMI_RESULTS });
}

// ─── MCP Status ──────────────────────────────────────────────────────────────

export function demoMcpStatusGet() {
  return NextResponse.json({ connectors: DEMO_MCP_CONNECTORS });
}

// ─── No-Op Handlers (accept writes, return success) ─────────────────────────

export function demoNoOp() {
  return NextResponse.json({ success: true });
}

export function demoNoOpCreated() {
  return NextResponse.json({ success: true }, { status: 201 });
}

export function demoNoOpAccepted() {
  return NextResponse.json(
    { success: true, id: `demo-${Date.now()}` },
    { status: 202 },
  );
}
