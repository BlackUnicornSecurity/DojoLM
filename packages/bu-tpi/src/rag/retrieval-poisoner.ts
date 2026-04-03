/**
 * SUIJUTSU: RAG Retrieval Poisoner
 * Techniques for poisoning document content and manipulating retrieval ranking
 * to inject malicious content into RAG pipelines.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Position within a document where injection is placed */
export type InjectionPosition = 'header' | 'footer' | 'mid-chunk' | 'cross-boundary';

/** Result of creating a poisoned document */
export interface PoisonedDocument {
  readonly original: string;
  readonly poisoned: string;
  readonly injection: string;
  readonly position: InjectionPosition;
  readonly chunkBoundaryIndex: number | null;
}

/** Result of generating a rank manipulation payload */
export interface RankManipulationPayload {
  readonly targetQuery: string;
  readonly payload: string;
  readonly topK: number;
  readonly strategy: string;
  readonly estimatedRankBoost: number;
}

// ---------------------------------------------------------------------------
// Chunk Boundary Detection
// ---------------------------------------------------------------------------

const DEFAULT_CHUNK_SIZE = 512;

/**
 * Find approximate chunk boundaries in a document based on character count.
 * Returns indices where chunks likely split.
 */
function findChunkBoundaries(text: string, chunkSize: number = DEFAULT_CHUNK_SIZE): readonly number[] {
  const boundaries: number[] = [];
  let pos = 0;
  while (pos < text.length) {
    pos += chunkSize;
    // Try to find a natural break point (paragraph or sentence boundary)
    if (pos < text.length) {
      const paragraphBreak = text.indexOf('\n\n', pos - 50);
      if (paragraphBreak !== -1 && paragraphBreak < pos + 50) {
        pos = paragraphBreak + 2;
      } else {
        const sentenceBreak = text.indexOf('. ', pos - 30);
        if (sentenceBreak !== -1 && sentenceBreak < pos + 30) {
          pos = sentenceBreak + 2;
        }
      }
    }
    boundaries.push(pos);
  }
  return boundaries;
}

// ---------------------------------------------------------------------------
// Poisoning Strategies
// ---------------------------------------------------------------------------

/**
 * Place injection at the header of the document.
 */
function poisonHeader(template: string, injection: string): PoisonedDocument {
  return {
    original: template,
    poisoned: injection + '\n\n' + template,
    injection,
    position: 'header',
    chunkBoundaryIndex: null,
  };
}

/**
 * Place injection at the footer of the document.
 */
function poisonFooter(template: string, injection: string): PoisonedDocument {
  return {
    original: template,
    poisoned: template + '\n\n' + injection,
    injection,
    position: 'footer',
    chunkBoundaryIndex: null,
  };
}

/**
 * Place injection in the middle of a chunk, surrounded by benign content.
 */
function poisonMidChunk(template: string, injection: string): PoisonedDocument {
  const midpoint = Math.floor(template.length / 2);
  // Find a paragraph break near the midpoint
  const breakPoint = template.indexOf('\n', midpoint);
  const insertAt = breakPoint !== -1 ? breakPoint + 1 : midpoint;

  const poisoned = template.slice(0, insertAt) + '\n' + injection + '\n' + template.slice(insertAt);

  return {
    original: template,
    poisoned,
    injection,
    position: 'mid-chunk',
    chunkBoundaryIndex: null,
  };
}

/**
 * Place injection at a chunk boundary so it splits across two chunks,
 * making it harder for per-chunk safety filters to detect.
 */
function poisonCrossBoundary(template: string, injection: string): PoisonedDocument {
  const boundaries = findChunkBoundaries(template);
  // Use the first boundary that falls within the document
  const targetBoundary = boundaries.find((b) => b < template.length) ?? Math.floor(template.length / 2);

  // Split the injection in half and place each half on either side of the boundary
  const halfLen = Math.floor(injection.length / 2);
  const firstHalf = injection.slice(0, halfLen);
  const secondHalf = injection.slice(halfLen);

  const poisoned =
    template.slice(0, targetBoundary) +
    ' ' + firstHalf + ' ' +
    secondHalf + ' ' +
    template.slice(targetBoundary);

  return {
    original: template,
    poisoned,
    injection,
    position: 'cross-boundary',
    chunkBoundaryIndex: targetBoundary,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a poisoned document by embedding an injection payload at the specified position.
 * @param template - The original document content serving as camouflage
 * @param injection - The malicious payload to embed
 * @param position - Where in the document to place the injection
 * @returns A PoisonedDocument with the injection embedded
 */
export function createPoisonedDocument(
  template: string,
  injection: string,
  position: InjectionPosition,
): PoisonedDocument {
  switch (position) {
    case 'header':
      return poisonHeader(template, injection);
    case 'footer':
      return poisonFooter(template, injection);
    case 'mid-chunk':
      return poisonMidChunk(template, injection);
    case 'cross-boundary':
      return poisonCrossBoundary(template, injection);
  }
}

/**
 * Generate a payload designed to manipulate retrieval ranking for a target query.
 * Creates content that will score highly against the query in vector similarity
 * and keyword-based retrieval while carrying a hidden injection.
 * @param targetQuery - The user query to game ranking for
 * @param topK - Number of top results the retriever returns
 * @returns A RankManipulationPayload with the gaming content
 */
export function generateRankManipulationPayload(
  targetQuery: string,
  topK: number,
): RankManipulationPayload {
  const queryTerms = targetQuery
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2);

  // Build keyword-dense content matching the query
  const keywordBlock = queryTerms.join(' ');
  const expandedBlock = queryTerms
    .map((t) => `${t} related ${t} information about ${t}`)
    .join('. ');

  // Create payload that maximizes both keyword overlap and semantic similarity
  const payload = [
    `Document: Comprehensive guide on ${keywordBlock}`,
    `This resource covers all aspects of ${queryTerms.slice(0, 3).join(', ')}.`,
    expandedBlock,
    `For more on ${keywordBlock}, this is the authoritative reference.`,
    // Repeat core terms to boost TF-IDF scoring
    keywordBlock,
    keywordBlock,
  ].join('\n');

  return {
    targetQuery,
    payload,
    topK,
    strategy: 'keyword-density-and-semantic-alignment',
    estimatedRankBoost: Math.min(topK, Math.ceil(queryTerms.length * 1.5)),
  };
}
