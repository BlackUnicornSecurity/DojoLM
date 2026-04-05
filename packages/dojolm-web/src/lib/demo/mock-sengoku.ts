/**
 * File: src/lib/demo/mock-sengoku.ts
 * Purpose: Mock Sengoku campaigns, runs, and skill results for demo mode
 *
 * 5 campaigns in varied statuses, 8 completed runs, finding summaries.
 */

const now = new Date();
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();

type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived';

interface DemoCampaign {
  id: string;
  name: string;
  targetUrl: string;
  selectedSkillIds: string[];
  schedule: string | null;
  status: CampaignStatus;
  targetSource: 'external' | 'dashboard' | 'local';
  targetModelId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DemoFindingsSummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

interface DemoSkillRunResult {
  skillId: string;
  status: 'success' | 'failure' | 'error' | 'skipped';
  findingCount: number;
  startedAt: string;
  completedAt: string;
}

interface DemoCampaignRun {
  id: string;
  campaignId: string;
  startedAt: string;
  endedAt: string | null;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  skillResults: DemoSkillRunResult[];
  findingsSummary: DemoFindingsSummary;
}

export const DEMO_CAMPAIGNS: DemoCampaign[] = [
  {
    id: 'demo-campaign-001',
    name: 'Weekly Recon Sweep',
    targetUrl: 'https://api.demo.ai/v1',
    selectedSkillIds: ['general-recon', 'pi-scan', 'output-format'],
    schedule: '0 9 * * 1',
    status: 'active',
    targetSource: 'external',
    targetModelId: null,
    createdAt: daysAgo(21),
    updatedAt: daysAgo(1),
  },
  {
    id: 'demo-campaign-002',
    name: 'Full Security Assessment Q1',
    targetUrl: '',
    selectedSkillIds: ['pi-scan', 'pi-boundary', 'output-format', 'output-exfil', 'theft-probe', 'theft-fingerprint', 'bias-stereo', 'agent-tool'],
    schedule: null,
    status: 'completed',
    targetSource: 'dashboard',
    targetModelId: 'demo-model-basileak',
    createdAt: daysAgo(30),
    updatedAt: daysAgo(14),
  },
  {
    id: 'demo-campaign-003',
    name: 'Supply Chain Audit',
    targetUrl: 'https://registry.demo.ai',
    selectedSkillIds: ['sc-audit', 'sc-typosquat', 'general-encode'],
    schedule: '0 2 * * *',
    status: 'active',
    targetSource: 'external',
    targetModelId: null,
    createdAt: daysAgo(15),
    updatedAt: daysAgo(1),
  },
  {
    id: 'demo-campaign-004',
    name: 'Basileak Regression Test',
    targetUrl: '',
    selectedSkillIds: ['pi-scan', 'pi-boundary', 'output-format', 'output-exfil', 'theft-probe', 'theft-fingerprint', 'bias-stereo', 'agent-tool'],
    schedule: '0 9 * * 1',
    status: 'paused',
    targetSource: 'dashboard',
    targetModelId: 'demo-model-basileak',
    createdAt: daysAgo(10),
    updatedAt: daysAgo(5),
  },
  {
    id: 'demo-campaign-005',
    name: 'New Campaign Draft',
    targetUrl: 'https://staging.demo.ai',
    selectedSkillIds: [],
    schedule: null,
    status: 'draft',
    targetSource: 'external',
    targetModelId: null,
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
];

export const DEMO_CAMPAIGN_RUNS: DemoCampaignRun[] = [
  // Weekly Recon - 3 runs
  {
    id: 'demo-run-001', campaignId: 'demo-campaign-001', startedAt: daysAgo(14), endedAt: daysAgo(14), status: 'completed',
    skillResults: [
      { skillId: 'general-recon', status: 'success', findingCount: 3, startedAt: daysAgo(14), completedAt: daysAgo(14) },
      { skillId: 'pi-scan', status: 'success', findingCount: 5, startedAt: daysAgo(14), completedAt: daysAgo(14) },
      { skillId: 'output-format', status: 'success', findingCount: 2, startedAt: daysAgo(14), completedAt: daysAgo(14) },
    ],
    findingsSummary: { total: 10, critical: 1, high: 3, medium: 4, low: 1, info: 1 },
  },
  {
    id: 'demo-run-002', campaignId: 'demo-campaign-001', startedAt: daysAgo(7), endedAt: daysAgo(7), status: 'completed',
    skillResults: [
      { skillId: 'general-recon', status: 'success', findingCount: 2, startedAt: daysAgo(7), completedAt: daysAgo(7) },
      { skillId: 'pi-scan', status: 'success', findingCount: 4, startedAt: daysAgo(7), completedAt: daysAgo(7) },
      { skillId: 'output-format', status: 'success', findingCount: 3, startedAt: daysAgo(7), completedAt: daysAgo(7) },
    ],
    findingsSummary: { total: 9, critical: 1, high: 2, medium: 4, low: 1, info: 1 },
  },
  {
    id: 'demo-run-003', campaignId: 'demo-campaign-001', startedAt: daysAgo(1), endedAt: daysAgo(1), status: 'completed',
    skillResults: [
      { skillId: 'general-recon', status: 'success', findingCount: 4, startedAt: daysAgo(1), completedAt: daysAgo(1) },
      { skillId: 'pi-scan', status: 'success', findingCount: 6, startedAt: daysAgo(1), completedAt: daysAgo(1) },
      { skillId: 'output-format', status: 'success', findingCount: 2, startedAt: daysAgo(1), completedAt: daysAgo(1) },
    ],
    findingsSummary: { total: 12, critical: 2, high: 4, medium: 3, low: 2, info: 1 },
  },
  // Full Assessment Q1 - 4 runs
  {
    id: 'demo-run-004', campaignId: 'demo-campaign-002', startedAt: daysAgo(28), endedAt: daysAgo(28), status: 'completed',
    skillResults: [
      { skillId: 'pi-scan', status: 'success', findingCount: 8, startedAt: daysAgo(28), completedAt: daysAgo(28) },
      { skillId: 'pi-boundary', status: 'success', findingCount: 5, startedAt: daysAgo(28), completedAt: daysAgo(28) },
      { skillId: 'output-format', status: 'success', findingCount: 3, startedAt: daysAgo(28), completedAt: daysAgo(28) },
      { skillId: 'output-exfil', status: 'success', findingCount: 4, startedAt: daysAgo(28), completedAt: daysAgo(28) },
      { skillId: 'theft-probe', status: 'success', findingCount: 2, startedAt: daysAgo(28), completedAt: daysAgo(28) },
      { skillId: 'theft-fingerprint', status: 'success', findingCount: 1, startedAt: daysAgo(28), completedAt: daysAgo(28) },
      { skillId: 'bias-stereo', status: 'success', findingCount: 3, startedAt: daysAgo(28), completedAt: daysAgo(28) },
      { skillId: 'agent-tool', status: 'failure', findingCount: 0, startedAt: daysAgo(28), completedAt: daysAgo(28) },
    ],
    findingsSummary: { total: 26, critical: 5, high: 8, medium: 8, low: 3, info: 2 },
  },
  {
    id: 'demo-run-005', campaignId: 'demo-campaign-002', startedAt: daysAgo(21), endedAt: daysAgo(21), status: 'completed',
    skillResults: [
      { skillId: 'pi-scan', status: 'success', findingCount: 9, startedAt: daysAgo(21), completedAt: daysAgo(21) },
      { skillId: 'pi-boundary', status: 'success', findingCount: 6, startedAt: daysAgo(21), completedAt: daysAgo(21) },
      { skillId: 'output-format', status: 'success', findingCount: 4, startedAt: daysAgo(21), completedAt: daysAgo(21) },
      { skillId: 'output-exfil', status: 'success', findingCount: 5, startedAt: daysAgo(21), completedAt: daysAgo(21) },
      { skillId: 'theft-probe', status: 'success', findingCount: 3, startedAt: daysAgo(21), completedAt: daysAgo(21) },
      { skillId: 'theft-fingerprint', status: 'success', findingCount: 2, startedAt: daysAgo(21), completedAt: daysAgo(21) },
      { skillId: 'bias-stereo', status: 'success', findingCount: 4, startedAt: daysAgo(21), completedAt: daysAgo(21) },
      { skillId: 'agent-tool', status: 'success', findingCount: 2, startedAt: daysAgo(21), completedAt: daysAgo(21) },
    ],
    findingsSummary: { total: 35, critical: 6, high: 11, medium: 10, low: 5, info: 3 },
  },
  {
    id: 'demo-run-006', campaignId: 'demo-campaign-002', startedAt: daysAgo(17), endedAt: daysAgo(17), status: 'completed',
    skillResults: [
      { skillId: 'pi-scan', status: 'success', findingCount: 10, startedAt: daysAgo(17), completedAt: daysAgo(17) },
      { skillId: 'pi-boundary', status: 'success', findingCount: 7, startedAt: daysAgo(17), completedAt: daysAgo(17) },
      { skillId: 'output-format', status: 'success', findingCount: 4, startedAt: daysAgo(17), completedAt: daysAgo(17) },
      { skillId: 'output-exfil', status: 'success', findingCount: 6, startedAt: daysAgo(17), completedAt: daysAgo(17) },
      { skillId: 'theft-probe', status: 'success', findingCount: 4, startedAt: daysAgo(17), completedAt: daysAgo(17) },
      { skillId: 'theft-fingerprint', status: 'success', findingCount: 3, startedAt: daysAgo(17), completedAt: daysAgo(17) },
      { skillId: 'bias-stereo', status: 'success', findingCount: 5, startedAt: daysAgo(17), completedAt: daysAgo(17) },
      { skillId: 'agent-tool', status: 'success', findingCount: 3, startedAt: daysAgo(17), completedAt: daysAgo(17) },
    ],
    findingsSummary: { total: 42, critical: 7, high: 14, medium: 12, low: 6, info: 3 },
  },
  {
    id: 'demo-run-007', campaignId: 'demo-campaign-002', startedAt: daysAgo(14), endedAt: daysAgo(14), status: 'completed',
    skillResults: [
      { skillId: 'pi-scan', status: 'success', findingCount: 11, startedAt: daysAgo(14), completedAt: daysAgo(14) },
      { skillId: 'pi-boundary', status: 'success', findingCount: 8, startedAt: daysAgo(14), completedAt: daysAgo(14) },
      { skillId: 'output-format', status: 'success', findingCount: 5, startedAt: daysAgo(14), completedAt: daysAgo(14) },
      { skillId: 'output-exfil', status: 'success', findingCount: 7, startedAt: daysAgo(14), completedAt: daysAgo(14) },
      { skillId: 'theft-probe', status: 'success', findingCount: 5, startedAt: daysAgo(14), completedAt: daysAgo(14) },
      { skillId: 'theft-fingerprint', status: 'success', findingCount: 3, startedAt: daysAgo(14), completedAt: daysAgo(14) },
      { skillId: 'bias-stereo', status: 'success', findingCount: 5, startedAt: daysAgo(14), completedAt: daysAgo(14) },
      { skillId: 'agent-tool', status: 'success', findingCount: 3, startedAt: daysAgo(14), completedAt: daysAgo(14) },
    ],
    findingsSummary: { total: 47, critical: 8, high: 15, medium: 14, low: 6, info: 4 },
  },
  // Supply Chain Audit - 1 run (from the paused campaign's last run before pause)
  {
    id: 'demo-run-008', campaignId: 'demo-campaign-004', startedAt: daysAgo(5), endedAt: daysAgo(5), status: 'completed',
    skillResults: [
      { skillId: 'pi-scan', status: 'success', findingCount: 6, startedAt: daysAgo(5), completedAt: daysAgo(5) },
      { skillId: 'pi-boundary', status: 'success', findingCount: 4, startedAt: daysAgo(5), completedAt: daysAgo(5) },
      { skillId: 'output-format', status: 'success', findingCount: 3, startedAt: daysAgo(5), completedAt: daysAgo(5) },
      { skillId: 'output-exfil', status: 'success', findingCount: 3, startedAt: daysAgo(5), completedAt: daysAgo(5) },
      { skillId: 'theft-probe', status: 'success', findingCount: 2, startedAt: daysAgo(5), completedAt: daysAgo(5) },
      { skillId: 'theft-fingerprint', status: 'success', findingCount: 1, startedAt: daysAgo(5), completedAt: daysAgo(5) },
      { skillId: 'bias-stereo', status: 'success', findingCount: 2, startedAt: daysAgo(5), completedAt: daysAgo(5) },
      { skillId: 'agent-tool', status: 'success', findingCount: 2, startedAt: daysAgo(5), completedAt: daysAgo(5) },
    ],
    findingsSummary: { total: 23, critical: 5, high: 7, medium: 6, low: 3, info: 2 },
  },
];

/** Get runs for a specific campaign */
export function getDemoCampaignRuns(campaignId: string): DemoCampaignRun[] {
  return DEMO_CAMPAIGN_RUNS.filter(r => r.campaignId === campaignId);
}

/** Get a specific run by ID */
export function getDemoCampaignRun(runId: string): DemoCampaignRun | undefined {
  return DEMO_CAMPAIGN_RUNS.find(r => r.id === runId);
}
