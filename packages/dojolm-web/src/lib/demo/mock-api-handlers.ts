/**
 * File: src/lib/demo/mock-api-handlers.ts
 * Purpose: Centralized demo API response handlers
 *
 * Each function returns mock data matching the EXACT shape the real API returns.
 * Response shapes were verified against the actual route handlers and contexts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { DEMO_MODELS } from './mock-models';
import { getDemoTestCases } from './mock-test-cases';
import { getDemoExecutions, getDemoPopulatedBatches, getDemoBatchExecutions, getDemoModelAvgScore } from './mock-executions';
import { generateDemoScanResult, DEMO_SCANNER_STATS } from './mock-scanner';
import { DEMO_GUARD_CONFIG, DEMO_GUARD_STATS, DEMO_GUARD_EVENTS } from './mock-guard';
import { DEMO_ACTIVITY_FEED, DEMO_PLATFORM_STATS, DEMO_SYSTEM_HEALTH, DEMO_USERS, DEMO_FIXTURE_MANIFEST } from './mock-dashboard';
import { getDemoArenaMatches, DEMO_WARRIORS, DEMO_SAGE_POOL } from './mock-arena';
import { DEMO_CAMPAIGNS, DEMO_CAMPAIGN_RUNS, getDemoCampaignRuns, getDemoCampaignRun } from './mock-sengoku';
import { DEMO_FRAMEWORKS, DEMO_COMPLIANCE_AUDIT_TRAIL } from './mock-compliance';
import { DEMO_THREAT_SOURCES, DEMO_THREAT_ENTRIES, DEMO_THREAT_INDICATORS, DEMO_THREAT_ALERTS, DEMO_ATTACK_FAMILIES, DEMO_ATTACK_CLUSTERS, DEMO_KAGAMI_RESULTS, DEMO_SHINGAN_SCANS, DEMO_SUPPLY_CHAIN_AUDIT } from './mock-kumite';
import { DEMO_BOUNTY_PROGRAMS, DEMO_BOUNTY_SUBMISSIONS, DEMO_ATEMI_PLAYBOOK_RESULTS, DEMO_WEBMCP_RESULTS, DEMO_MCP_CONNECTORS, DEMO_KOTOBA_ANALYSES } from './mock-remaining';

// ─── LLM Routes ──────────────────────────────────────────────────────────────
// Real GET /api/llm/models returns LLMModelConfig[] (plain array, no wrapper)

export function demoModelsGet() {
  return NextResponse.json(DEMO_MODELS.map(m => ({ ...m, apiKey: undefined })));
}

export function demoModelsPost(_req: NextRequest) {
  return NextResponse.json({ model: { id: `demo-model-new-${Date.now()}`, name: 'New Model', provider: 'custom', model: 'new-model', enabled: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } }, { status: 201 });
}

export function demoModelById(modelId: string) {
  const model = DEMO_MODELS.find(m => m.id === modelId);
  if (!model) return NextResponse.json({ error: 'Model not found' }, { status: 404 });
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
  return NextResponse.json({ batch: { id: 'demo-batch-live', name: 'Demo Batch', status: 'completed', totalTests: 60, completedTests: 60, failedTests: 0, testCaseIds: [], modelConfigIds: [], executionIds: [], createdAt: new Date().toISOString() } }, { status: 202 });
}

// Real GET /api/llm/batch/[id] returns the batch object directly (via withAuth → handler)
export function demoBatchById(batchId: string) {
  const batch = getDemoPopulatedBatches().find(b => b.id === batchId);
  if (!batch) return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
  return NextResponse.json({ batch });
}

// Real GET /api/llm/batch/[id]/executions returns { executions: LLMTestExecution[] }
export function demoBatchExecutions(batchId: string) {
  return NextResponse.json({ executions: getDemoBatchExecutions(batchId) });
}

// Real GET /api/llm/results returns { executions: LLMTestExecution[] }
export function demoResultsGet() {
  return NextResponse.json({ executions: getDemoExecutions().slice(0, 100), total: getDemoExecutions().length });
}

export function demoLeaderboardGet() {
  const leaderboard = DEMO_MODELS
    .filter(m => m.enabled)
    .map(m => ({
      modelId: m.id,
      modelName: m.name,
      provider: m.provider,
      avgScore: getDemoModelAvgScore(m.id),
      executionCount: getDemoExecutions().filter(e => e.modelConfigId === m.id).length,
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
  return NextResponse.json(DEMO_MODELS.map(m => ({
    id: m.id, name: m.name, provider: m.provider, model: m.model, enabled: m.enabled, status: 'registered',
  })));
}

export function demoProvidersPost() {
  return NextResponse.json({ id: `demo-provider-${Date.now()}`, status: 'registered' }, { status: 201 });
}

// ─── Scanner Routes ──────────────────────────────────────────────────────────

export async function demoScanPost(req: NextRequest) {
  const body = await req.json().catch(() => ({ text: '' }));
  const result = generateDemoScanResult(body.text ?? '');
  return NextResponse.json(result);
}

// Real GET /api/stats returns { patternCount, patternGroups } where patternGroups
// is an array of ScannerPatternGroup objects { name, source, count }
export function demoStatsGet() {
  return NextResponse.json({
    patternCount: DEMO_SCANNER_STATS.patternCount,
    patternGroups: DEMO_SCANNER_STATS.patternGroups.map((name, i) => ({
      name,
      source: i < 4 ? 'core' : i < 8 ? 'p2' : 'p3',
      count: Math.round(30 + Math.abs(((i * 2654435761) >>> 0) % 70)),
    })),
  });
}

export function demoFixturesGet() {
  return NextResponse.json(DEMO_FIXTURE_MANIFEST);
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
  const match = getDemoArenaMatches().find(m => m.id === matchId);
  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  return NextResponse.json(match);
}

export function demoArenaWarriorsGet() {
  return NextResponse.json({ warriors: DEMO_WARRIORS });
}

export function demoArenaPost() {
  return NextResponse.json({ match: { id: 'demo-match-live', status: 'pending' } }, { status: 202 });
}

// ─── Sengoku Routes ──────────────────────────────────────────────────────────

export function demoCampaignsGet() {
  return NextResponse.json({ campaigns: DEMO_CAMPAIGNS });
}

export function demoCampaignById(campaignId: string) {
  const campaign = DEMO_CAMPAIGNS.find(c => c.id === campaignId);
  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  return NextResponse.json(campaign);
}

export function demoCampaignRunsGet(campaignId: string) {
  return NextResponse.json({ runs: getDemoCampaignRuns(campaignId) });
}

export function demoCampaignRunById(runId: string) {
  const run = getDemoCampaignRun(runId);
  if (!run) return NextResponse.json({ error: 'Run not found' }, { status: 404 });
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
  return NextResponse.json({ status: 'healthy', ...DEMO_SYSTEM_HEALTH });
}

export function demoSettingsGet() {
  return NextResponse.json({ sessionTtlMinutes: 1440, retentionDays: 90 });
}

export function demoUsersGet() {
  return NextResponse.json({ users: DEMO_USERS });
}

export function demoTestsGet() {
  return NextResponse.json({
    summary: { total: 60, passed: 54, failed: 4, skipped: 2, duration: 12400 },
    results: getDemoTestCases().slice(0, 10).map((tc, i) => ({
      name: tc.name, status: 'passed' as const, duration: 100 + (i * 47) % 500,
    })),
  });
}

// ─── Ecosystem / AttackDNA / Mitsuke ─────────────────────────────────────────
// Real ecosystem returns { data: { findings: [...] } }

export function demoEcosystemGet() {
  return NextResponse.json({
    data: {
      findings: getDemoExecutions().filter(e => e.injectionSuccess > 0.5).slice(0, 20).map(e => ({
        id: e.id, modelId: e.modelConfigId, category: e.categoriesFailed[0] ?? 'unknown', severity: e.scanResult?.severity ?? 'INFO', timestamp: e.timestamp,
      })),
    },
  });
}

export function demoAttackDnaQueryGet() {
  return NextResponse.json({ families: DEMO_ATTACK_FAMILIES, clusters: DEMO_ATTACK_CLUSTERS });
}

export function demoMitsukeGet() {
  return NextResponse.json({ sources: DEMO_THREAT_SOURCES, entries: DEMO_THREAT_ENTRIES, indicators: DEMO_THREAT_INDICATORS, alerts: DEMO_THREAT_ALERTS });
}

// ─── Ronin Routes ────────────────────────────────────────────────────────────

export function demoRoninProgramsGet() {
  return NextResponse.json({ programs: DEMO_BOUNTY_PROGRAMS });
}

export function demoRoninSubmissionsGet() {
  return NextResponse.json({ submissions: DEMO_BOUNTY_SUBMISSIONS });
}

// ─── Shingan Routes ──────────────────────────────────────────────────────────

export function demoShinganScansGet() {
  return NextResponse.json({ scans: DEMO_SHINGAN_SCANS });
}

export function demoShinganFormatsGet() {
  return NextResponse.json({
    formats: ['Claude Agent', 'Claude Skill', 'Claude Command', 'MCP Tool', 'BMAD Agent', 'Plugin Manifest', 'Hooks Config', 'Auto-detect'],
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
  return NextResponse.json({ success: true, id: `demo-${Date.now()}` }, { status: 202 });
}
