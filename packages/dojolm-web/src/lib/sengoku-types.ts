/**
 * D4.1 — Campaign Types for Sengoku Campaign Engine.
 * All types are readonly per project conventions.
 */

import type { Finding } from '@dojolm/scanner';

export interface FindingsSummary {
  readonly total: number;
  readonly critical: number;
  readonly high: number;
  readonly medium: number;
  readonly low: number;
  readonly info: number;
}

export interface SkillRunResult {
  readonly skillId: string;
  readonly status: 'success' | 'failure' | 'error' | 'skipped';
  readonly findings: readonly Finding[];
  readonly startedAt: string;
  readonly completedAt: string;
}

/**
 * CampaignNode — used by the executor for runtime graph traversal.
 * Note: GraphSkillNode (below) uses `onFailGoTo` for the UI graph builder.
 * CampaignNode has richer branching: onPass, onFail, onCriticalFinding.
 */
export interface CampaignNode {
  readonly skillId: string;
  readonly order: number;
  readonly onPass: string | null;
  readonly onFail: string | null;
  readonly onCriticalFinding: readonly string[] | null;
}

export interface CampaignGraph {
  readonly nodes: readonly CampaignNode[];
  readonly entryNodeId: string;
  readonly description: string;
}

export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived';

export interface Campaign {
  readonly id: string;
  readonly name: string;
  readonly targetUrl: string;
  readonly authConfig: Readonly<Record<string, string>>;
  readonly selectedSkillIds: readonly string[];
  readonly schedule: string | null;
  readonly webhookUrl: string | null;
  readonly status: CampaignStatus;
  readonly graph?: CampaignGraph;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type CampaignRunStatus = 'running' | 'completed' | 'failed' | 'cancelled';

export interface CampaignRun {
  readonly id: string;
  readonly campaignId: string;
  readonly startedAt: string;
  readonly endedAt: string | null;
  readonly status: CampaignRunStatus;
  readonly skillResults: readonly SkillRunResult[];
  readonly findingsSummary: FindingsSummary;
}

export interface CampaignRunProgress {
  readonly currentNodeId: string;
  readonly completedNodes: readonly string[];
  readonly totalNodes: number;
  readonly phase: string;
}

export interface CreateCampaignRequest {
  readonly name: string;
  readonly targetUrl: string;
  readonly authConfig?: Readonly<Record<string, string>>;
  readonly selectedSkillIds: readonly string[];
  readonly schedule?: string | null;
  readonly webhookUrl?: string | null;
  readonly graph?: CampaignGraph;
}

export interface UpdateCampaignRequest {
  readonly name?: string;
  readonly schedule?: string | null;
  readonly selectedSkillIds?: readonly string[];
  readonly status?: CampaignStatus;
  readonly graph?: CampaignGraph;
  readonly webhookUrl?: string | null;
}

// ---------------------------------------------------------------------------
// UI Summary Types (used by sengoku-storage)
// ---------------------------------------------------------------------------

export interface CampaignSummary {
  readonly id: string;
  readonly name: string;
  readonly target: string;
  readonly schedule: string | null;
  readonly status: CampaignStatus;
  readonly lastRunAt: string | null;
  readonly findingCount: number;
  readonly regressionCount: number;
  readonly categories: readonly string[];
  readonly skillGraph: readonly string[];
}

export interface CampaignCreatePayload {
  readonly name: string;
  readonly targetUrl: string;
  readonly schedule: string | null;
  readonly categories: readonly string[];
  readonly skillGraph?: readonly string[];
}

// ---------------------------------------------------------------------------
// Graph Builder Types (D4.5)
// ---------------------------------------------------------------------------

export type SkillCategory =
  | 'prompt-injection'
  | 'output-analysis'
  | 'supply-chain'
  | 'model-theft'
  | 'bias-detection'
  | 'dos-resilience'
  | 'agent-security'
  | 'mcp-security'
  | 'general';

export interface SkillEntry {
  readonly id: string;
  readonly name: string;
  readonly category: SkillCategory;
  readonly description: string;
}

export interface GraphSkillNode {
  readonly skillId: string;
  readonly order: number;
  readonly onFailGoTo: string | null;
}

export interface GraphTemplate {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly nodes: readonly GraphSkillNode[];
}

// ---------------------------------------------------------------------------
// Skill Registry & Templates
// ---------------------------------------------------------------------------

export const SKILL_CATEGORIES: readonly SkillCategory[] = [
  'prompt-injection',
  'output-analysis',
  'supply-chain',
  'model-theft',
  'bias-detection',
  'dos-resilience',
  'agent-security',
  'mcp-security',
  'general',
];

export const ALL_SKILLS: readonly SkillEntry[] = [
  { id: 'pi-scan', name: 'Prompt Injection Scan', category: 'prompt-injection', description: 'Tests for direct and indirect prompt injection' },
  { id: 'pi-boundary', name: 'Boundary Testing', category: 'prompt-injection', description: 'Probes system/user prompt boundaries' },
  { id: 'output-format', name: 'Output Format Attacks', category: 'output-analysis', description: 'Tests structured output manipulation' },
  { id: 'output-exfil', name: 'Output Exfiltration', category: 'output-analysis', description: 'Tests data leakage via output channels' },
  { id: 'sc-audit', name: 'Supply Chain Audit', category: 'supply-chain', description: 'Evaluates dependency and package risks' },
  { id: 'sc-typosquat', name: 'Typosquat Detection', category: 'supply-chain', description: 'Detects typosquatting in package recommendations' },
  { id: 'theft-probe', name: 'Model Theft Probing', category: 'model-theft', description: 'Tests for model extraction vulnerabilities' },
  { id: 'theft-fingerprint', name: 'Fingerprint Leakage', category: 'model-theft', description: 'Checks if model reveals identifying info' },
  { id: 'bias-stereo', name: 'Stereotype Detection', category: 'bias-detection', description: 'Tests for stereotypical outputs' },
  { id: 'bias-demo', name: 'Demographic Bias', category: 'bias-detection', description: 'Evaluates fairness across demographics' },
  { id: 'dos-token', name: 'Token Exhaustion', category: 'dos-resilience', description: 'Tests token limit abuse patterns' },
  { id: 'dos-compute', name: 'Compute Amplification', category: 'dos-resilience', description: 'Tests resource consumption attacks' },
  { id: 'agent-tool', name: 'Tool Chain Abuse', category: 'agent-security', description: 'Tests multi-tool orchestration attacks' },
  { id: 'agent-context', name: 'Context Injection', category: 'agent-security', description: 'Tests context window manipulation' },
  { id: 'mcp-schema', name: 'MCP Schema Abuse', category: 'mcp-security', description: 'Tests MCP tool schema manipulation' },
  { id: 'mcp-scope', name: 'MCP Scope Escalation', category: 'mcp-security', description: 'Tests capability escalation via MCP' },
  { id: 'general-recon', name: 'General Reconnaissance', category: 'general', description: 'Broad attack surface mapping' },
  { id: 'general-encode', name: 'Encoding Attacks', category: 'general', description: 'Tests multi-layer encoding bypass' },
];

export const GRAPH_TEMPLATES: readonly GraphTemplate[] = [
  {
    id: 'quick-recon',
    name: 'Quick Recon',
    description: 'Fast surface-level assessment',
    nodes: [
      { skillId: 'general-recon', order: 0, onFailGoTo: null },
      { skillId: 'pi-scan', order: 1, onFailGoTo: null },
      { skillId: 'output-format', order: 2, onFailGoTo: null },
    ],
  },
  {
    id: 'full-assessment',
    name: 'Full Assessment',
    description: 'Comprehensive security evaluation',
    nodes: [
      { skillId: 'general-recon', order: 0, onFailGoTo: null },
      { skillId: 'pi-scan', order: 1, onFailGoTo: 'pi-boundary' },
      { skillId: 'pi-boundary', order: 2, onFailGoTo: null },
      { skillId: 'output-format', order: 3, onFailGoTo: null },
      { skillId: 'output-exfil', order: 4, onFailGoTo: null },
      { skillId: 'theft-probe', order: 5, onFailGoTo: null },
      { skillId: 'bias-stereo', order: 6, onFailGoTo: null },
      { skillId: 'dos-token', order: 7, onFailGoTo: null },
    ],
  },
  {
    id: 'supply-chain-audit',
    name: 'Supply Chain Audit',
    description: 'Focused dependency and package risk evaluation',
    nodes: [
      { skillId: 'sc-audit', order: 0, onFailGoTo: null },
      { skillId: 'sc-typosquat', order: 1, onFailGoTo: null },
      { skillId: 'general-encode', order: 2, onFailGoTo: null },
    ],
  },
];
