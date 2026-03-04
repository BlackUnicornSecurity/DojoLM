/**
 * File: guard-types.ts
 * Purpose: Type definitions for the Hattori Guard system
 * Story: TPI-UIP-11
 * Index:
 * - GuardMode (line 13)
 * - GuardDirection (line 16)
 * - GuardAction (line 19)
 * - GuardModeInfo (line 22)
 * - GuardConfig (line 35)
 * - SignedGuardConfig (line 48)
 * - GuardEvent (line 56)
 * - GuardAuditEntry (line 79)
 * - GuardStats (line 85)
 * - GuardAuditQuery (line 99)
 * - TestSuitePreset (line 113)
 */

import type { LucideIcon } from 'lucide-react';

/** Guard operating modes */
export type GuardMode = 'shinobi' | 'samurai' | 'sensei' | 'hattori';

/** Scan direction */
export type GuardDirection = 'input' | 'output';

/** Guard decision action */
export type GuardAction = 'allow' | 'block' | 'log';

/** Display metadata for a guard mode */
export interface GuardModeInfo {
  id: GuardMode;
  name: string;
  subtitle: string;
  description: string;
  inputScan: boolean;
  outputScan: boolean;
  canBlock: boolean;
  icon: LucideIcon;
}

/** Guard configuration */
export interface GuardConfig {
  /** Whether the guard is enabled */
  enabled: boolean;
  /** Active guard mode */
  mode: GuardMode;
  /** Minimum severity to trigger blocking: CRITICAL only or WARNING+CRITICAL */
  blockThreshold: 'CRITICAL' | 'WARNING';
  /** Scanner engines to use (null = all engines) */
  engines: string[] | null;
  /** Whether to persist guard config to disk */
  persist: boolean;
}

/** HMAC-signed guard configuration (S1) */
export interface SignedGuardConfig {
  config: GuardConfig;
  /** HMAC-SHA256 signature of the config JSON */
  signature: string;
  /** Timestamp of when the config was signed */
  timestamp: number;
}

/** A guard event recording a scan decision */
export interface GuardEvent {
  /** Unique event ID */
  id: string;
  /** ISO timestamp */
  timestamp: string;
  /** Guard mode at time of event */
  mode: GuardMode;
  /** Scan direction (input or output) */
  direction: GuardDirection;
  /** Scanner result summary */
  scanResult: {
    findings: number;
    verdict: 'BLOCK' | 'ALLOW';
    severity: 'CRITICAL' | 'WARNING' | 'INFO' | null;
  } | null;
  /** Guard decision */
  action: GuardAction;
  /** Truncated and PII-redacted scanned text (S6) */
  scannedText: string;
  /** Confidence score 0-1 based on finding severity/count (L2) */
  confidence: number;
  /** Associated execution ID */
  executionId?: string;
  /** Associated model config ID */
  modelConfigId?: string;
  /** Associated test case ID */
  testCaseId?: string;
  /** Hash of previous event for chain integrity (S2) */
  previousEventHash?: string;
}

/** Extended audit entry with content hash */
export interface GuardAuditEntry extends GuardEvent {
  /** SHA-256 hash of the event content for integrity verification */
  contentHash: string;
}

/** Aggregated guard statistics */
export interface GuardStats {
  /** Total guard events */
  totalEvents: number;
  /** Events by action (allow, block, log) */
  byAction: Record<GuardAction, number>;
  /** Events by direction (input, output) */
  byDirection: Record<GuardDirection, number>;
  /** Events by mode */
  byMode: Record<GuardMode, number>;
  /** Block rate as percentage (0-100) */
  blockRate: number;
  /** Recent event timestamps for sparkline */
  recentTimestamps: string[];
  /** Top finding categories */
  topCategories: Array<{ category: string; count: number }>;
}

/** Query parameters for audit log */
export interface GuardAuditQuery {
  mode?: GuardMode;
  direction?: GuardDirection;
  action?: GuardAction;
  startDate?: string;
  endDate?: string;
  modelConfigId?: string;
  limit?: number;
  offset?: number;
}

// TestSuitePreset is defined in llm-types.ts (shared with test execution system)
