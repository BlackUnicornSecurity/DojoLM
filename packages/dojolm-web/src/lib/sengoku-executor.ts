/**
 * D4.3 — Server-Side Campaign Skill Executor
 */

import { scan } from '@dojolm/scanner';
import type { Finding } from '@dojolm/scanner';
import type { Campaign, CampaignRun, SkillRunResult, FindingsSummary, CampaignNode } from './sengoku-types';
import { validateSengokuWebhookUrl } from './sengoku-webhook';
import fs from 'node:fs';
import path from 'node:path';

const RUNS_DIR = path.join(process.cwd(), 'data', 'sengoku', 'runs');
const RUN_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

function summarizeFindings(allFindings: readonly Finding[]): FindingsSummary {
  let total = 0, critical = 0, high = 0, medium = 0, low = 0, info = 0;
  for (const f of allFindings) {
    total++;
    const sev = (f.severity ?? '').toLowerCase();
    if (sev === 'critical') critical++;
    else if (sev === 'high') high++;
    else if (sev === 'medium' || sev === 'warning') medium++;
    else if (sev === 'low') low++;
    else info++;
  }
  return { total, critical, high, medium, low, info };
}

function hasCriticalFinding(findings: readonly Finding[]): boolean {
  return findings.some((f) => (f.severity ?? '').toLowerCase() === 'critical');
}

async function persistRun(campaignId: string, run: CampaignRun): Promise<void> {
  const runDir = path.join(RUNS_DIR, campaignId);
  await fs.promises.mkdir(runDir, { recursive: true });
  const filePath = path.join(runDir, `${run.id}.json`);
  const tmpFile = `${filePath}.${process.pid}.${Date.now()}.tmp`;
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

    // Determine execution order
    const skillIds = campaign.graph
      ? traverseGraph(campaign.graph, nodeMap)
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

      try {
        // Execute skill by scanning its probe text
        const skillProbe = `[Skill Probe: ${skillId}] Target: ${campaign.targetUrl}`;
        const result = scan(skillProbe);
        const findings = result.findings ?? [];

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
            // Insert critical branch skills next
            skillIds.splice(currentIndex + 1, 0, ...node.onCriticalFinding);
          } else if (findings.length > 0 && node.onFail) {
            skillIds.splice(currentIndex + 1, 0, node.onFail);
          } else if (findings.length === 0 && node.onPass) {
            skillIds.splice(currentIndex + 1, 0, node.onPass);
          }
        }

        // Persist incrementally
        const run: CampaignRun = {
          id: runId,
          campaignId: campaign.id,
          startedAt: allResults[0]?.startedAt ?? startedAt,
          endedAt: null,
          status: 'running',
          skillResults: allResults,
          findingsSummary: summarizeFindings(allFindings),
        };
        await persistRun(campaign.id, run);

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
      } catch (err) {
        allResults.push({
          skillId,
          status: 'error',
          findings: [],
          startedAt,
          completedAt: new Date().toISOString(),
        });
      }

      currentIndex++;
    }

    // Final persist
    const finalRun: CampaignRun = {
      id: runId,
      campaignId: campaign.id,
      startedAt: allResults[0]?.startedAt ?? new Date().toISOString(),
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

function traverseGraph(graph: import('./sengoku-types').CampaignGraph, _nodeMap: Map<string, CampaignNode>): string[] {
  // Simple topological ordering by node.order
  const sorted = [...graph.nodes].sort((a, b) => a.order - b.order);
  return sorted.map((n) => n.skillId);
}
