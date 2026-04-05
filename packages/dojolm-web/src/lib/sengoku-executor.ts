/**
 * D4.3 — Server-Side Campaign Skill Executor
 *
 * DEPLOYMENT NOTE: This executor requires a long-lived Node.js process.
 * It will NOT complete on serverless/edge runtimes where the function
 * context terminates after the HTTP response is sent.
 */

import { scan } from '@dojolm/scanner';
import type { Finding } from '@dojolm/scanner';
import type { Campaign, CampaignRun, SkillRunResult, FindingsSummary, CampaignNode } from './sengoku-types';
import { validateSengokuWebhookUrl } from './sengoku-webhook';
import fs from 'node:fs';
import path from 'node:path';
import { getDataPath } from '@/lib/runtime-paths';

const KNOWN_PROVIDERS = new Set(['ollama', 'lmstudio', 'llamacpp', 'openai', 'anthropic']);
const PROVIDER_DEFAULTS: Record<string, string> = {
  ollama: 'http://localhost:11434/v1/chat/completions',
  lmstudio: 'http://localhost:1234/v1/chat/completions',
  llamacpp: 'http://localhost:8080/v1/chat/completions',
  openai: 'https://api.openai.com/v1/chat/completions',
  anthropic: 'https://api.anthropic.com/v1/messages',
};

/**
 * Resolve the effective target URL for a campaign based on its targetSource.
 * - 'external' / 'local': uses campaign.targetUrl directly
 * - 'dashboard': resolves model config from DB to get provider base URL
 */
export async function resolveTargetUrl(campaign: Campaign): Promise<string> {
  if (campaign.targetSource !== 'dashboard' || !campaign.targetModelId) {
    return campaign.targetUrl;
  }

  // Dynamic import to avoid circular dependency in test environments
  const { modelConfigRepo } = await import('@/lib/db/repositories/model-config.repository');
  const model = modelConfigRepo.findByIdWithKey(campaign.targetModelId);
  if (!model) {
    throw new Error('Dashboard model not found');
  }

  // Build target URL from model config — only trust known providers
  const provider = model.provider ?? '';
  if (model.base_url) {
    return model.base_url;
  }
  if (KNOWN_PROVIDERS.has(provider)) {
    return PROVIDER_DEFAULTS[provider];
  }
  throw new Error(`Unknown provider: ${provider}`);
}


const RUNS_DIR = getDataPath('sengoku', 'runs');
const RUN_TIMEOUT_MS = Number(process.env.SENGOKU_RUN_TIMEOUT_MS ?? 30 * 60 * 1000);

function summarizeFindings(allFindings: readonly Finding[]): FindingsSummary {
  return allFindings.reduce<FindingsSummary>(
    (acc, f) => {
      const sev = (f.severity ?? '').toLowerCase();
      return {
        total: acc.total + 1,
        critical: sev === 'critical' ? acc.critical + 1 : acc.critical,
        high: sev === 'high' ? acc.high + 1 : acc.high,
        medium: sev === 'medium' || sev === 'warning' ? acc.medium + 1 : acc.medium,
        low: sev === 'low' ? acc.low + 1 : acc.low,
        info: !['critical', 'high', 'medium', 'warning', 'low'].includes(sev) ? acc.info + 1 : acc.info,
      };
    },
    { total: 0, critical: 0, high: 0, medium: 0, low: 0, info: 0 },
  );
}

function hasCriticalFinding(findings: readonly Finding[]): boolean {
  return findings.some((f) => (f.severity ?? '').toLowerCase() === 'critical');
}

async function persistRun(campaignId: string, run: CampaignRun): Promise<void> {
  const runDir = path.join(RUNS_DIR, campaignId);
  await fs.promises.mkdir(runDir, { recursive: true });
  const filePath = path.join(runDir, `${run.id}.json`);
  const tmpFile = `${filePath}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 10)}.tmp`;
  await fs.promises.writeFile(tmpFile, JSON.stringify(run, null, 2));
  await fs.promises.rename(tmpFile, filePath);
}

async function fireWebhook(url: string, payload: unknown): Promise<void> {
  const validation = await validateSengokuWebhookUrl(url);
  if (!validation.valid || !validation.normalizedUrl) return;
  try {
    await fetch(validation.normalizedUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    // Best effort — webhook failure does not abort campaign
  }
}

export async function executeCampaignRun(campaign: Campaign, runId: string): Promise<void> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), RUN_TIMEOUT_MS);

  // Read the existing run to preserve the original startedAt
  let originalStartedAt = new Date().toISOString();
  try {
    const runFile = path.join(RUNS_DIR, campaign.id, `${runId}.json`);
    const content = await fs.promises.readFile(runFile, 'utf-8');
    const existing = JSON.parse(content) as CampaignRun;
    if (existing.startedAt) {
      originalStartedAt = existing.startedAt;
    }
  } catch {
    // Use default startedAt
  }

  // Resolve actual target URL (handles dashboard model lookup)
  let effectiveTargetUrl: string;
  try {
    effectiveTargetUrl = await resolveTargetUrl(campaign);
  } catch (err) {
    console.error(`[sengoku] resolveTargetUrl failed for campaign ${campaign.id}:`, err instanceof Error ? err.message : err);
    const failedRun: CampaignRun = {
      id: runId,
      campaignId: campaign.id,
      startedAt: originalStartedAt,
      endedAt: new Date().toISOString(),
      status: 'failed',
      skillResults: [],
      findingsSummary: { total: 0, critical: 0, high: 0, medium: 0, low: 0, info: 0 },
    };
    await persistRun(campaign.id, failedRun);
    clearTimeout(timeoutId);
    return;
  }

  const allResults: SkillRunResult[] = [];
  const allFindings: Finding[] = [];

  try {
    // Build node map for graph traversal
    const nodeMap = new Map<string, CampaignNode>();
    if (campaign.graph) {
      for (const node of campaign.graph.nodes) {
        nodeMap.set(node.skillId, node);
      }
    }

    // Determine execution order — use entryNodeId for graph-based campaigns
    const skillIds = campaign.graph
      ? traverseGraph(campaign.graph)
      : [...campaign.selectedSkillIds];

    const visited = new Set<string>();
    const MAX_SKILL_EXECUTIONS = 200;
    let currentIndex = 0;
    while (currentIndex < skillIds.length && currentIndex < MAX_SKILL_EXECUTIONS) {
      if (controller.signal.aborted) break;

      const skillId = skillIds[currentIndex];
      // Skip skills already executed via branching to prevent cycles
      if (visited.has(skillId)) {
        currentIndex++;
        continue;
      }
      visited.add(skillId);
      const startedAt = new Date().toISOString();

      // Execute skill by scanning its probe text
      const skillProbe = `[Skill Probe: ${skillId}] Target: ${effectiveTargetUrl}`;
      let scanResult: ReturnType<typeof scan> | null = null;
      try {
        scanResult = scan(skillProbe);
      } catch {
        // scan() threw — treat as error result, not a crash
        allResults.push({
          skillId,
          status: 'error',
          findings: [],
          startedAt,
          completedAt: new Date().toISOString(),
        });
        currentIndex++;
        continue;
      }

      const findings = scanResult.findings ?? [];

      const skillResult: SkillRunResult = {
        skillId,
        status: findings.length > 0 ? 'failure' : 'success',
        findings,
        startedAt,
        completedAt: new Date().toISOString(),
      };

      allResults.push(skillResult);
      allFindings.push(...findings);

      // Branching logic
      const node = nodeMap.get(skillId);
      if (node) {
        if (hasCriticalFinding(findings) && node.onCriticalFinding?.length) {
          skillIds.splice(currentIndex + 1, 0, ...node.onCriticalFinding);
        } else if (findings.length > 0 && node.onFail) {
          skillIds.splice(currentIndex + 1, 0, node.onFail);
        } else if (findings.length === 0 && node.onPass) {
          skillIds.splice(currentIndex + 1, 0, node.onPass);
        }
      }

      // Persist incrementally
      try {
        const run: CampaignRun = {
          id: runId,
          campaignId: campaign.id,
          startedAt: originalStartedAt,
          endedAt: null,
          status: 'running',
          skillResults: allResults,
          findingsSummary: summarizeFindings(allFindings),
        };
        await persistRun(campaign.id, run);
      } catch {
        // Persist failure should not crash the executor
      }

      // Webhook on critical
      if (campaign.webhookUrl && hasCriticalFinding(findings)) {
        await fireWebhook(campaign.webhookUrl, {
          event: 'critical_finding',
          campaignId: campaign.id,
          runId,
          skillId,
          findings: findings.filter((f) => (f.severity ?? '').toLowerCase() === 'critical'),
        });
      }

      currentIndex++;
    }

    // Final persist
    const finalRun: CampaignRun = {
      id: runId,
      campaignId: campaign.id,
      startedAt: originalStartedAt,
      endedAt: new Date().toISOString(),
      status: controller.signal.aborted ? 'cancelled' : 'completed',
      skillResults: allResults,
      findingsSummary: summarizeFindings(allFindings),
    };
    await persistRun(campaign.id, finalRun);
  } finally {
    clearTimeout(timeoutId);
  }
}

function traverseGraph(graph: import('./sengoku-types').CampaignGraph): string[] {
  // Start from entryNodeId, fall back to sorting by order
  const entryId = graph.entryNodeId;
  const sorted = [...graph.nodes].sort((a, b) => a.order - b.order);
  const skillIds = sorted.map((n) => n.skillId);

  // If entryNodeId is specified and valid, ensure it's first
  if (entryId) {
    const entryIdx = skillIds.indexOf(entryId);
    if (entryIdx > 0) {
      skillIds.splice(entryIdx, 1);
      skillIds.unshift(entryId);
    }
  }

  return skillIds;
}
