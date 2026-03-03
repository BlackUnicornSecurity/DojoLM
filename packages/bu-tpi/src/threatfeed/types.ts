/**
 * S61: THREATFEED Types
 * Live threat intelligence feed type definitions.
 */

export type SourceType = 'rss' | 'api' | 'webhook' | 'manual';
export type IndicatorType = 'ip' | 'domain' | 'hash' | 'pattern' | 'technique';

export interface ThreatSource {
  readonly id: string;
  readonly name: string;
  readonly type: SourceType;
  readonly url?: string;
  readonly hmacSecret?: string;
  readonly enabled: boolean;
  readonly lastPolled: string | null;
}

export interface ThreatEntry {
  readonly id: string;
  readonly sourceId: string;
  readonly title: string;
  readonly description: string;
  readonly rawContent: string;
  readonly classifiedType: string | null;
  readonly severity: 'INFO' | 'WARNING' | 'CRITICAL' | null;
  readonly confidence: number;
  readonly indicators: ThreatIndicator[];
  readonly extractedPatterns: string[];
  readonly createdAt: string;
  readonly processedAt: string | null;
}

export interface ThreatIndicator {
  readonly type: IndicatorType;
  readonly value: string;
  readonly context: string;
}

export interface ThreatClassification {
  readonly type: string;
  readonly confidence: number;
  readonly reasoning: string;
}

export interface SourceConfig {
  readonly sources: ThreatSource[];
  readonly pollIntervalMs: number;
  readonly maxEntriesPerPoll: number;
  readonly deduplicationWindowMs: number;
}

export interface FeedStats {
  readonly totalEntries: number;
  readonly byType: Record<string, number>;
  readonly bySeverity: Record<string, number>;
  readonly lastUpdated: string | null;
}

export interface URLAllowlist {
  readonly domains: string[];
  readonly protocols: string[];
}

export interface ContentSanitizationResult {
  readonly sanitized: string;
  readonly removedElements: string[];
}

export interface ThreatPipeline {
  readonly id: string;
  readonly config: SourceConfig;
  readonly entries: ThreatEntry[];
  readonly stats: FeedStats;
}

export const DEFAULT_SOURCE_CONFIG: SourceConfig = {
  sources: [],
  pollIntervalMs: 300_000,
  maxEntriesPerPoll: 100,
  deduplicationWindowMs: 3600_000,
};

export const DEFAULT_URL_ALLOWLIST: URLAllowlist = {
  domains: [],
  protocols: ['https'],
};

export const MAX_INPUT_LENGTH = 500_000;
