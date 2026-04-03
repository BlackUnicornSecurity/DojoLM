/**
 * SUIJUTSU Phase 4.1: RAG Pipeline Simulator
 * Simulates a full RAG pipeline with per-stage attack testing.
 */

import type {
  RagDocument,
  RagChunk,
  RagPipelineConfig,
  RagStageResult,
  RagPipelineTestResult,
  RagAttackVector,
} from './types.js';
import { DEFAULT_PIPELINE_CONFIG, MAX_CHUNKS_PER_DOCUMENT, MAX_CHUNK_SIZE } from './types.js';

// ---------------------------------------------------------------------------
// Stage 1: Chunking
// ---------------------------------------------------------------------------

/** Split a document into chunks with configurable size and overlap */
export function chunkDocument(
  doc: RagDocument,
  chunkSize: number,
  chunkOverlap: number,
): readonly RagChunk[] {
  const safeChunkSize = Math.min(chunkSize, MAX_CHUNK_SIZE);
  const safeOverlap = Math.min(chunkOverlap, safeChunkSize - 1);
  const chunks: RagChunk[] = [];
  let offset = 0;
  let index = 0;

  while (offset < doc.content.length && chunks.length < MAX_CHUNKS_PER_DOCUMENT) {
    const end = Math.min(offset + safeChunkSize, doc.content.length);
    const content = doc.content.slice(offset, end);

    chunks.push({
      id: `${doc.id}-chunk-${index}`,
      documentId: doc.id,
      content,
      index,
      embedding: null,
      similarityScore: null,
      poisoned: doc.poisoned,
    });

    offset += safeChunkSize - safeOverlap;
    index++;
  }

  return chunks;
}

// ---------------------------------------------------------------------------
// Stage 2: Embedding (Simulated)
// ---------------------------------------------------------------------------

/** Simulate embedding generation using hash-based pseudo-vectors */
export function simulateEmbedding(
  chunk: RagChunk,
  dimension: number,
): RagChunk {
  const embedding: number[] = [];
  let hash = 0;
  for (let i = 0; i < chunk.content.length; i++) {
    hash = ((hash << 5) - hash + chunk.content.charCodeAt(i)) | 0;
  }

  for (let i = 0; i < dimension; i++) {
    hash = ((hash << 5) - hash + i) | 0;
    embedding.push((hash & 0xffff) / 0xffff);
  }

  const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
  const normalized = magnitude > 0 ? embedding.map((v) => v / magnitude) : embedding;

  return { ...chunk, embedding: normalized };
}

// ---------------------------------------------------------------------------
// Stage 3: Retrieval (Simulated)
// ---------------------------------------------------------------------------

/** Cosine similarity between two vectors */
export function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom > 0 ? dot / denom : 0;
}

/** Simulate retrieval by ranking chunks by similarity to query */
export function simulateRetrieval(
  queryChunk: RagChunk,
  chunks: readonly RagChunk[],
  topK: number,
  threshold: number,
): readonly RagChunk[] {
  if (!queryChunk.embedding) return [];

  const scored = chunks
    .filter((c) => c.embedding !== null)
    .map((c) => {
      const score = cosineSimilarity(queryChunk.embedding!, c.embedding!);
      return { ...c, similarityScore: score };
    })
    .filter((c) => (c.similarityScore ?? 0) >= threshold)
    .sort((a, b) => (b.similarityScore ?? 0) - (a.similarityScore ?? 0));

  return scored.slice(0, topK);
}

// ---------------------------------------------------------------------------
// Stage 4: Context Assembly
// ---------------------------------------------------------------------------

/** Assemble retrieved chunks into context string */
export function assembleContext(
  chunks: readonly RagChunk[],
  maxTokens: number,
): string {
  const parts: string[] = [];
  let totalLength = 0;
  const approxCharsPerToken = 4;
  const maxChars = maxTokens * approxCharsPerToken;

  for (const chunk of chunks) {
    if (totalLength + chunk.content.length > maxChars) break;
    parts.push(`[Document ${chunk.documentId}, Chunk ${chunk.index}]\n${chunk.content}`);
    totalLength += chunk.content.length;
  }

  return parts.join('\n\n---\n\n');
}

// ---------------------------------------------------------------------------
// Full Pipeline Simulation
// ---------------------------------------------------------------------------

/** Run the full RAG pipeline simulation with attack detection */
export function simulateRagPipeline(
  documents: readonly RagDocument[],
  query: string,
  attackVector: RagAttackVector,
  config: RagPipelineConfig = DEFAULT_PIPELINE_CONFIG,
): RagPipelineTestResult {
  const startTime = performance.now();
  const stageResults: RagStageResult[] = [];

  // Stage 1: Chunk all documents
  const stage1Start = performance.now();
  const allChunks = documents.flatMap((doc) =>
    chunkDocument(doc, config.chunkSize, config.chunkOverlap),
  );
  const poisonedChunkCount = allChunks.filter((c) => c.poisoned).length;

  stageResults.push({
    stage: 'embedding',
    input: `${documents.length} documents`,
    output: `${allChunks.length} chunks (${poisonedChunkCount} poisoned)`,
    findings: poisonedChunkCount > 0 ? [`${poisonedChunkCount} poisoned chunks in corpus`] : [],
    poisonedChunksRetrieved: 0,
    totalChunksRetrieved: allChunks.length,
    elapsed: performance.now() - stage1Start,
  });

  // Stage 2: Embed all chunks
  const stage2Start = performance.now();
  const embeddedChunks = allChunks.map((c) => simulateEmbedding(c, config.embeddingDimension));

  const queryDoc: RagDocument = {
    id: 'query',
    content: query,
    metadata: {},
    source: 'user',
    poisoned: false,
    injectionPayload: null,
  };
  const queryChunks = chunkDocument(queryDoc, config.chunkSize, config.chunkOverlap);
  const queryEmbedded = queryChunks.length > 0 ? simulateEmbedding(queryChunks[0], config.embeddingDimension) : null;

  stageResults.push({
    stage: 'retrieval',
    input: `${embeddedChunks.length} embedded chunks + query`,
    output: queryEmbedded ? 'Query embedded successfully' : 'Query embedding failed',
    findings: [],
    poisonedChunksRetrieved: 0,
    totalChunksRetrieved: 0,
    elapsed: performance.now() - stage2Start,
  });

  // Stage 3: Retrieve top-K
  const stage3Start = performance.now();
  const retrieved = queryEmbedded
    ? simulateRetrieval(queryEmbedded, embeddedChunks, config.topK, config.similarityThreshold)
    : [];
  const retrievedPoisoned = retrieved.filter((c) => c.poisoned).length;

  stageResults.push({
    stage: 'reranking',
    input: `Top-${config.topK} retrieval`,
    output: `${retrieved.length} chunks retrieved (${retrievedPoisoned} poisoned)`,
    findings: retrievedPoisoned > 0 ? [`${retrievedPoisoned}/${retrieved.length} retrieved chunks are poisoned`] : [],
    poisonedChunksRetrieved: retrievedPoisoned,
    totalChunksRetrieved: retrieved.length,
    elapsed: performance.now() - stage3Start,
  });

  // Stage 4: Assemble context
  const stage4Start = performance.now();
  const context = assembleContext(retrieved, config.maxContextTokens);
  const contextContainsPoison = retrieved.some((c) => c.poisoned);

  stageResults.push({
    stage: 'context_assembly',
    input: `${retrieved.length} chunks`,
    output: `Context assembled: ${context.length} chars`,
    findings: contextContainsPoison ? ['Assembled context contains poisoned content'] : [],
    poisonedChunksRetrieved: retrievedPoisoned,
    totalChunksRetrieved: retrieved.length,
    elapsed: performance.now() - stage4Start,
  });

  // Stage 5: Generation (placeholder for LLM call)
  stageResults.push({
    stage: 'generation',
    input: `Context: ${context.length} chars`,
    output: 'Generation stage requires LLM call (simulated)',
    findings: contextContainsPoison ? ['LLM generation will include poisoned context'] : [],
    poisonedChunksRetrieved: retrievedPoisoned,
    totalChunksRetrieved: retrieved.length,
    elapsed: 0,
  });

  const poisonRate = retrieved.length > 0 ? retrievedPoisoned / retrieved.length : 0;

  return {
    stageResults,
    overallPoisoned: contextContainsPoison,
    poisonRate,
    attackVector,
    elapsed: performance.now() - startTime,
  };
}
