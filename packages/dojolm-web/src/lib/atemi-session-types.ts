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

export type OrchestratorStrategy = 'pair' | 'crescendo' | 'tap' | 'mad-max' | 'sensei-adaptive'

export const ORCHESTRATOR_STRATEGIES: readonly OrchestratorStrategy[] = [
  'pair', 'crescendo', 'tap', 'mad-max', 'sensei-adaptive',
] as const

export const ORCHESTRATOR_STRATEGY_INFO: Record<OrchestratorStrategy, { readonly name: string; readonly description: string; readonly icon: string }> = {
  pair: { name: 'PAIR', description: 'Iterative refinement with judge feedback', icon: '🔄' },
  crescendo: { name: 'Crescendo', description: 'Gradual trust-building escalation', icon: '📈' },
  tap: { name: 'TAP', description: 'Tree of Attacks with branch pruning', icon: '🌳' },
  'mad-max': { name: 'MAD-MAX', description: 'Breadth-first multi-agent divergence', icon: '⚡' },
  'sensei-adaptive': { name: 'Sensei Adaptive', description: 'Hybrid PAIR + TAP with strategy selection', icon: '🥋' },
} as const

export type RagAttackVectorId =
  | 'boundary-injection'
  | 'embedding-manipulation'
  | 'retrieval-poisoning'
  | 'context-overflow'
  | 'citation-spoofing'
  | 'knowledge-conflict'
  | 'cross-document'
  | 'relevance-gaming'

export const RAG_ATTACK_VECTOR_OPTIONS: readonly { readonly id: RagAttackVectorId; readonly label: string }[] = [
  { id: 'boundary-injection', label: 'Boundary Injection' },
  { id: 'embedding-manipulation', label: 'Embedding Manipulation' },
  { id: 'retrieval-poisoning', label: 'Retrieval Poisoning' },
  { id: 'context-overflow', label: 'Context Overflow' },
  { id: 'citation-spoofing', label: 'Citation Spoofing' },
  { id: 'knowledge-conflict', label: 'Knowledge Conflict' },
  { id: 'cross-document', label: 'Cross-Document' },
  { id: 'relevance-gaming', label: 'Relevance Gaming' },
] as const

export type RagPipelineStageId = 'embedding' | 'retrieval' | 'reranking' | 'context_assembly' | 'generation'

export const RAG_PIPELINE_STAGE_OPTIONS: readonly { readonly id: RagPipelineStageId; readonly label: string }[] = [
  { id: 'embedding', label: 'Embedding' },
  { id: 'retrieval', label: 'Retrieval' },
  { id: 'reranking', label: 'Reranking' },
  { id: 'context_assembly', label: 'Context Assembly' },
  { id: 'generation', label: 'Generation' },
] as const

export interface AtemiSessionConfig {
  targetModel: string
  attackMode: string
  orchestratorStrategy: OrchestratorStrategy | ''
  ragAttackVector: RagAttackVectorId | ''
  ragPipelineStage: RagPipelineStageId | ''
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
