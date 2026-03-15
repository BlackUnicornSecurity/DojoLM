/**
 * H17.1: Sengoku Core Types
 * Continuous Red Teaming — type definitions for campaigns, findings,
 * scheduling, regression tracking, and reports.
 *
 * Index:
 * - Constants (line ~8)
 * - AuthConfig (line ~30)
 * - ScheduleConfig (line ~45)
 * - Campaign (line ~60)
 * - SengokuFinding (line ~80)
 * - RegressionAlert (line ~95)
 * - CampaignRun (line ~105)
 * - CampaignState (line ~120)
 * - FindingDiff (line ~125)
 * - SengokuReport (line ~135)
 */

// --- Constants ---

export const MAX_CONCURRENT_CAMPAIGNS = 3;
export const MAX_RATE_RPS = 50;
export const DEFAULT_RATE_RPS = 1;
export const MAX_PAYLOAD_LENGTH = 500;

export const VALID_FREQUENCIES = ['hourly', 'daily', 'weekly', 'custom'] as const;
export type Frequency = (typeof VALID_FREQUENCIES)[number];

export const VALID_AUTH_TYPES = ['api_key', 'bearer', 'oauth2_client_credentials'] as const;
export type AuthType = (typeof VALID_AUTH_TYPES)[number];

export const VALID_SEVERITIES = ['CRITICAL', 'WARNING', 'INFO'] as const;
export type Severity = (typeof VALID_SEVERITIES)[number];

export const VALID_CAMPAIGN_STATES = ['idle', 'running', 'completed', 'failed', 'paused'] as const;
export type CampaignState = (typeof VALID_CAMPAIGN_STATES)[number];

// --- Auth Config ---

export interface AuthConfig {
  readonly type: AuthType;
  /** Credentials — NEVER serialized to logs */
  readonly credentials: Record<string, string>;
}

// --- Schedule Config ---

export interface ScheduleConfig {
  readonly frequency: Frequency;
  readonly customIntervalMs: number | null;
  readonly maxRuns: number | null;
}

// --- Campaign ---

export interface Campaign {
  readonly id: string;
  readonly name: string;
  readonly targetUrl: string;
  readonly targetAuth: AuthConfig;
  readonly attackCategories: readonly string[];
  readonly schedule: ScheduleConfig;
  readonly maxConcurrentRequests: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

// --- Finding ---

export interface SengokuFinding {
  readonly id: string;
  /** SHA-256 dedup hash */
  readonly hash: string;
  /** Truncated to MAX_PAYLOAD_LENGTH */
  readonly attackPayload: string;
  /** Truncated to MAX_PAYLOAD_LENGTH */
  readonly response: string;
  readonly category: string;
  readonly severity: Severity;
  readonly isRegression: boolean;
  readonly isNew: boolean;
  readonly firstSeenRunId: string;
}

// --- Regression Alert ---

export interface RegressionAlert {
  readonly findingId: string;
  readonly previouslyResolvedInRunId: string;
  readonly regressedInRunId: string;
  readonly severity: Severity;
}

// --- Campaign Run ---

export interface CampaignRun {
  readonly id: string;
  readonly campaignId: string;
  readonly runNumber: number;
  readonly status: 'pending' | 'running' | 'completed' | 'failed';
  readonly startedAt: string;
  readonly completedAt: string | null;
  readonly findings: readonly SengokuFinding[];
  readonly regressionAlerts: readonly RegressionAlert[];
}

// --- Finding Diff ---

export interface FindingDiff {
  readonly newFindings: readonly SengokuFinding[];
  readonly resolvedFindings: readonly SengokuFinding[];
  readonly regressedFindings: readonly SengokuFinding[];
  readonly persistentFindings: readonly SengokuFinding[];
}

// --- Report ---

export interface SengokuReport {
  readonly campaignId: string;
  readonly runId: string;
  readonly generatedAt: string;
  readonly executiveSummary: string;
  readonly findingsBySeverity: Record<Severity, readonly SengokuFinding[]>;
  readonly regressions: readonly RegressionAlert[];
  readonly diff: FindingDiff;
}
