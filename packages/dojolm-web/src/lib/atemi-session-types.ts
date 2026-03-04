/**
 * File: atemi-session-types.ts
 * Purpose: Type definitions for Atemi Lab session recording
 * Story: P3.2 - Atemi Lab Session Recording
 * Index:
 * - AtemiSessionStatus type (line 11)
 * - AtemiSessionEventType type (line 13)
 * - AtemiSessionEvent interface (line 15)
 * - AtemiSessionConfig interface (line 24)
 * - SeverityCounts interface (line 32)
 * - AtemiSessionSummary interface (line 39)
 * - AtemiSession interface (line 47)
 */

export type AtemiSessionStatus = 'recording' | 'completed' | 'cancelled'

export type AtemiSessionEventType = 'attack_start' | 'attack_result' | 'mode_change' | 'error' | 'info'

export interface AtemiSessionEvent {
  id: string
  timestamp: string
  type: AtemiSessionEventType
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  toolId?: string
}

export interface AtemiSessionConfig {
  targetModel: string
  attackMode: string
  concurrency: number
  timeoutMs: number
  autoLog: boolean
}

export interface SeverityCounts {
  critical: number
  high: number
  medium: number
  low: number
}

export interface AtemiSessionSummary {
  totalEvents: number
  bySeverity: SeverityCounts
  durationMs: number
  topTools: string[]
}

export interface AtemiSession {
  id: string
  name: string
  status: AtemiSessionStatus
  startedAt: string
  endedAt?: string
  config: AtemiSessionConfig
  events: AtemiSessionEvent[]
  summary?: AtemiSessionSummary
}
