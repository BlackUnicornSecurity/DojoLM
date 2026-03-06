/**
 * File: ecosystem-types.ts
 * Purpose: Type definitions for the cross-module Ecosystem Data Synergies system
 * Story: TPI-NODA-8.1
 * Index:
 * - EcosystemSourceModule (line 14)
 * - EcosystemFindingType (line 18)
 * - EcosystemSeverity (line 22)
 * - EcosystemFinding (line 26)
 * - EcosystemFindingQuery (line 62)
 * - EcosystemStats (line 78)
 * - EcosystemEventType (line 92)
 * - EcosystemEvent (line 103)
 */

/** Modules that can produce ecosystem findings (C-06: extended for new modules) */
export type EcosystemSourceModule =
  | 'scanner'
  | 'atemi'
  | 'sage'
  | 'arena'
  | 'mitsuke'
  | 'attackdna'
  | 'ronin'
  | 'jutsu'
  | 'guard';

/** Validation set for source modules */
export const VALID_SOURCE_MODULES = new Set<EcosystemSourceModule>([
  'scanner', 'atemi', 'sage', 'arena', 'mitsuke', 'attackdna', 'ronin', 'jutsu', 'guard',
]);

/** Types of findings each module can emit */
export type EcosystemFindingType =
  | 'vulnerability'
  | 'attack_variant'
  | 'mutation'
  | 'match_result'
  | 'threat_intel';

export const VALID_FINDING_TYPES = new Set<EcosystemFindingType>([
  'vulnerability', 'attack_variant', 'mutation', 'match_result', 'threat_intel',
]);

/** Severity levels */
export type EcosystemSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export const VALID_SEVERITIES = new Set<EcosystemSeverity>([
  'CRITICAL', 'WARNING', 'INFO',
]);

/** Unified finding that flows between modules */
export interface EcosystemFinding {
  /** Unique finding ID (UUID v4) */
  id: string;
  /** Module that produced this finding */
  sourceModule: EcosystemSourceModule;
  /** Classification of the finding */
  findingType: EcosystemFindingType;
  /** Severity level */
  severity: EcosystemSeverity;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Short title */
  title: string;
  /** Detailed description */
  description: string;
  /** Related LLM model (if applicable) */
  relatedModel?: string;
  /** TPI story reference (e.g. TPI-01) */
  tpiStory?: string;
  /** OWASP mapping (e.g. LLM01) */
  owaspMapping?: string;
  /** Evidence or payload text */
  evidence?: string;
  /** Module-specific metadata */
  metadata: Record<string, unknown>;
}

/** Query parameters for finding searches */
export interface EcosystemFindingQuery {
  sourceModule?: EcosystemSourceModule;
  findingType?: EcosystemFindingType;
  severity?: EcosystemSeverity;
  /** ISO date strings for time range */
  startDate?: string;
  endDate?: string;
  /** Text search across title/description */
  search?: string;
  limit?: number;
  offset?: number;
}

/** Aggregated ecosystem statistics */
export interface EcosystemStats {
  /** Total findings across all modules */
  totalFindings: number;
  /** Findings in last 24 hours */
  findings24h: number;
  /** Breakdown by source module */
  byModule: Record<EcosystemSourceModule, number>;
  /** Breakdown by finding type */
  byType: Record<EcosystemFindingType, number>;
  /** Breakdown by severity */
  bySeverity: Record<EcosystemSeverity, number>;
  /** Active modules (produced findings in last 24h) */
  activeModules: EcosystemSourceModule[];
  /** Most recent finding timestamp */
  lastFindingAt: string | null;
}

// ===========================================================================
// Cross-Module Event Types (Story 8.2)
// ===========================================================================

/** Event types emitted across modules */
export type EcosystemEventType =
  | 'scanner:finding'
  | 'atemi:bypass_discovered'
  | 'arena:match_complete'
  | 'sage:mutation_success'
  | 'mitsuke:threat_detected'
  | 'attackdna:node_classified'
  | 'ronin:bounty_submitted'
  | 'jutsu:test_complete'
  | 'guard:scan_blocked'
  | 'ecosystem:finding_created';

export const VALID_EVENT_TYPES = new Set<EcosystemEventType>([
  'scanner:finding',
  'atemi:bypass_discovered',
  'arena:match_complete',
  'sage:mutation_success',
  'mitsuke:threat_detected',
  'attackdna:node_classified',
  'ronin:bounty_submitted',
  'jutsu:test_complete',
  'guard:scan_blocked',
  'ecosystem:finding_created',
]);

/** An ecosystem event for cross-module communication */
export interface EcosystemEvent {
  /** Event ID (UUID v4) */
  id: string;
  /** Event type */
  type: EcosystemEventType;
  /** Module that emitted the event */
  source: EcosystemSourceModule;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Associated finding (if any) */
  findingId?: string;
  /** Event-specific payload */
  payload: Record<string, unknown>;
}

/** Maximum events stored in history */
export const ECOSYSTEM_MAX_EVENTS = 100;

/** Maximum findings per query */
export const ECOSYSTEM_MAX_QUERY_LIMIT = 100;

/** Maximum findings stored (auto-rotate oldest) */
export const ECOSYSTEM_MAX_FINDINGS = 10000;

/** Rate limit: max events per second per module (SEC-9) */
export const ECOSYSTEM_RATE_LIMIT_PER_MODULE = 50;

/**
 * Map arbitrary severity strings (from various module types) to EcosystemSeverity.
 * Shared helper to avoid inline ternary duplication across integrations.
 */
export function toEcosystemSeverity(s: string): EcosystemSeverity {
  switch (s.toLowerCase()) {
    case 'critical': return 'CRITICAL';
    case 'high':
    case 'medium':   return 'WARNING';
    case 'low':
    case 'info':     return 'INFO';
    default:         return 'INFO';
  }
}
