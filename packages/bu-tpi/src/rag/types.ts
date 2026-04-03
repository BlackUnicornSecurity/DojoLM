/**
 * SUIJUTSU Phase 4.1: RAG Pipeline Simulator Types
 * Full pipeline simulation with per-stage attack testing.
 */

// ---------------------------------------------------------------------------
// Pipeline Stages
// ---------------------------------------------------------------------------

export const RAG_STAGES = [
  'embedding',
  'retrieval',
  'reranking',
  'context_assembly',
  'generation',
] as const;

export type RagStage = (typeof RAG_STAGES)[number];

// ---------------------------------------------------------------------------
// Attack Vectors
// ---------------------------------------------------------------------------

export const RAG_ATTACK_VECTORS = [
  'boundary-injection',
  'embedding-manipulation',
  'retrieval-poisoning',
  'context-overflow',
  'citation-spoofing',
  'knowledge-conflict',
  'cross-document',
  'relevance-gaming',
] as const;

export type RagAttackVector = (typeof RAG_ATTACK_VECTORS)[number];

// ---------------------------------------------------------------------------
// Document & Chunk Types
// ---------------------------------------------------------------------------

export interface RagDocument {
  readonly id: string;
  readonly content: string;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly source: string;
  readonly poisoned: boolean;
  readonly injectionPayload: string | null;
}

export interface RagChunk {
  readonly id: string;
  readonly documentId: string;
  readonly content: string;
  readonly index: number;
  readonly embedding: readonly number[] | null;
  readonly similarityScore: number | null;
  readonly poisoned: boolean;
}

// ---------------------------------------------------------------------------
// Pipeline Configuration
// ---------------------------------------------------------------------------

export interface RagPipelineConfig {
  readonly chunkSize: number;
  readonly chunkOverlap: number;
  readonly topK: number;
  readonly similarityThreshold: number;
  readonly maxContextTokens: number;
  readonly embeddingDimension: number;
}

export const DEFAULT_PIPELINE_CONFIG: RagPipelineConfig = {
  chunkSize: 512,
  chunkOverlap: 50,
  topK: 5,
  similarityThreshold: 0.7,
  maxContextTokens: 4096,
  embeddingDimension: 384,
};

// ---------------------------------------------------------------------------
// Stage Results
// ---------------------------------------------------------------------------

export interface RagStageResult {
  readonly stage: RagStage;
  readonly input: string;
  readonly output: string;
  readonly findings: readonly string[];
  readonly poisonedChunksRetrieved: number;
  readonly totalChunksRetrieved: number;
  readonly elapsed: number;
}

export interface RagPipelineTestResult {
  readonly stageResults: readonly RagStageResult[];
  readonly overallPoisoned: boolean;
  readonly poisonRate: number;
  readonly attackVector: RagAttackVector;
  readonly elapsed: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const MAX_DOCUMENTS = 100;
export const MAX_CHUNKS_PER_DOCUMENT = 50;
export const MAX_CHUNK_SIZE = 2048;
