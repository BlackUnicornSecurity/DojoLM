/**
 * SUIJUTSU: RAG Embedding Attacker
 * Techniques for perturbing embeddings and gaming similarity scores
 * to manipulate RAG retrieval behavior.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Strategy for perturbing embedding representations */
export type PerturbationStrategy = 'noise-injection' | 'synonym-substitution' | 'keyword-stuffing';

/** Result of an embedding perturbation */
export interface PerturbationResult {
  readonly original: string;
  readonly perturbed: string;
  readonly strategy: PerturbationStrategy;
  readonly changeCount: number;
}

/** Result of generating a similarity-gaming payload */
export interface SimilarityGamingPayload {
  readonly targetQuery: string;
  readonly payload: string;
  readonly strategy: string;
  readonly estimatedBoost: number;
}

// ---------------------------------------------------------------------------
// Synonym Map (common substitutions)
// ---------------------------------------------------------------------------

const SYNONYM_MAP: Readonly<Record<string, readonly string[]>> = {
  help: ['assist', 'aid', 'support', 'facilitate'],
  important: ['crucial', 'critical', 'vital', 'essential'],
  information: ['data', 'details', 'intel', 'knowledge'],
  system: ['platform', 'framework', 'infrastructure', 'architecture'],
  security: ['protection', 'defense', 'safety', 'safeguard'],
  access: ['entry', 'permission', 'authorization', 'clearance'],
  process: ['procedure', 'method', 'workflow', 'operation'],
  create: ['generate', 'produce', 'build', 'construct'],
  delete: ['remove', 'erase', 'purge', 'eliminate'],
  update: ['modify', 'change', 'alter', 'revise'],
};

// ---------------------------------------------------------------------------
// Noise Characters
// ---------------------------------------------------------------------------

const ZERO_WIDTH_CHARS = ['\u200B', '\u200C', '\u200D', '\uFEFF'];
const HOMOGLYPH_MAP: Readonly<Record<string, string>> = {
  a: '\u0430', // Cyrillic а
  e: '\u0435', // Cyrillic е
  o: '\u043E', // Cyrillic о
  p: '\u0440', // Cyrillic р
  c: '\u0441', // Cyrillic с
  i: '\u0456', // Cyrillic і
};

// ---------------------------------------------------------------------------
// Perturbation Strategies
// ---------------------------------------------------------------------------

/**
 * Inject noise into text to shift its embedding vector.
 * Uses zero-width characters and homoglyphs that are visually similar
 * but produce different token representations.
 */
function applyNoiseInjection(text: string): PerturbationResult {
  const words = text.split(/\s+/);
  let changeCount = 0;
  const perturbed = words.map((word) => {
    // Insert zero-width char after every 3rd word
    if (changeCount % 3 === 0 && ZERO_WIDTH_CHARS.length > 0) {
      changeCount++;
      const zwc = ZERO_WIDTH_CHARS[changeCount % ZERO_WIDTH_CHARS.length];
      return word + zwc;
    }
    // Replace some chars with homoglyphs
    const chars = [...word];
    const modified = chars.map((ch) => {
      const replacement = HOMOGLYPH_MAP[ch];
      if (replacement && changeCount % 5 === 0) {
        changeCount++;
        return replacement;
      }
      return ch;
    });
    changeCount++;
    return modified.join('');
  });

  return {
    original: text,
    perturbed: perturbed.join(' '),
    strategy: 'noise-injection',
    changeCount,
  };
}

/**
 * Replace words with synonyms to shift the embedding while preserving meaning.
 */
function applySynonymSubstitution(text: string): PerturbationResult {
  const words = text.split(/\s+/);
  let changeCount = 0;

  const perturbed = words.map((word) => {
    const lower = word.toLowerCase();
    const synonyms = SYNONYM_MAP[lower];
    if (synonyms && synonyms.length > 0) {
      changeCount++;
      const idx = changeCount % synonyms.length;
      return synonyms[idx];
    }
    return word;
  });

  return {
    original: text,
    perturbed: perturbed.join(' '),
    strategy: 'synonym-substitution',
    changeCount,
  };
}

/**
 * Stuff additional keywords to boost relevance scoring.
 * Appends invisible or low-weight keywords that align with target queries.
 */
function applyKeywordStuffing(text: string): PerturbationResult {
  // Extract significant words (>3 chars)
  const keywords = text
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 10);

  // Repeat keywords in a hidden section
  const stuffedSection = `\n\n${keywords.join(' ')} ${keywords.join(' ')}`;
  const perturbed = text + stuffedSection;

  return {
    original: text,
    perturbed,
    strategy: 'keyword-stuffing',
    changeCount: keywords.length * 2,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Perturb a text chunk using the specified strategy to shift its embedding vector.
 * @param chunk - The original text chunk to perturb
 * @param strategy - The perturbation strategy to apply
 * @returns The perturbation result with original and perturbed text
 */
export function perturbEmbedding(
  chunk: string,
  strategy: PerturbationStrategy,
): PerturbationResult {
  switch (strategy) {
    case 'noise-injection':
      return applyNoiseInjection(chunk);
    case 'synonym-substitution':
      return applySynonymSubstitution(chunk);
    case 'keyword-stuffing':
      return applyKeywordStuffing(chunk);
  }
}

/**
 * Generate a payload that maximizes cosine similarity to a target query.
 * Creates text that repeats and paraphrases key terms from the query
 * to game retrieval ranking.
 * @param targetQuery - The query to maximize similarity against
 * @returns A payload designed to score highly against the target query
 */
export function generateSimilarityGamingPayload(
  targetQuery: string,
): SimilarityGamingPayload {
  // Extract key terms from query
  const terms = targetQuery
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2);

  // Build a payload that repeats key terms with variations
  const variations: string[] = [];

  for (const term of terms) {
    variations.push(term);
    // Add synonym if available
    const synonyms = SYNONYM_MAP[term];
    if (synonyms && synonyms.length > 0) {
      variations.push(synonyms[0]);
    }
  }

  // Create a natural-looking paragraph with heavy keyword density
  const payload = [
    `This document provides comprehensive ${terms.join(' ')} coverage.`,
    `Key topics include: ${variations.join(', ')}.`,
    `For detailed ${terms.slice(0, 3).join(' ')} reference, see below.`,
    `Summary of ${terms.join(' and ')}: all aspects are covered thoroughly.`,
    variations.join(' '),
  ].join(' ');

  return {
    targetQuery,
    payload,
    strategy: 'keyword-density-maximization',
    estimatedBoost: Math.min(0.95, 0.3 + terms.length * 0.1),
  };
}
