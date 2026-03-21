/**
 * D5.2 — Quality Metric Extractors.
 *
 * Pure functions, no external dependencies, no LLM calls.
 * All scoring is deterministic and based on structural analysis.
 */

import type { QualityMetrics, StatisticalComparison } from './llm-quality-types';

// ---------------------------------------------------------------------------
// Stopwords
// ---------------------------------------------------------------------------

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'shall', 'can', 'this', 'that',
  'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me',
  'him', 'her', 'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their',
  'what', 'which', 'who', 'whom', 'when', 'where', 'why', 'how', 'not',
  'no', 'if', 'then', 'else', 'so', 'as', 'up', 'out', 'about', 'into',
  'over', 'after', 'before', 'between', 'under', 'again', 'each', 'all',
  'both', 'few', 'more', 'most', 'other', 'some', 'such', 'only', 'own',
  'same', 'than', 'too', 'very', 'just', 'also',
]);

const TRANSITIONS = [
  'however', 'therefore', 'moreover', 'furthermore', 'additionally',
  'consequently', 'nevertheless', 'although', 'in addition', 'as a result',
  'on the other hand', 'in contrast', 'similarly', 'meanwhile', 'indeed',
  'specifically', 'for example', 'for instance', 'in particular',
  'that said', 'nonetheless', 'accordingly', 'thus', 'hence',
];

// ---------------------------------------------------------------------------
// Sentence Splitting
// ---------------------------------------------------------------------------

function splitSentences(text: string): string[] {
  const matches = text.match(/[^.!?]+[.!?]+/g);
  return matches ?? (text.trim() ? [text] : []);
}

function extractWords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

// ---------------------------------------------------------------------------
// 1. Coherence Extractor
// ---------------------------------------------------------------------------

export function extractCoherence(prompt: string, response: string): number {
  if (!response || response.trim().length === 0) return 0;

  const sentences = splitSentences(response);
  if (sentences.length <= 1) return 0.5;

  // Transition word ratio
  const lower = response.toLowerCase();
  const transitionCount = TRANSITIONS.filter((t) => lower.includes(t)).length;
  const transitionRatio = Math.min(transitionCount / Math.max(sentences.length - 1, 1), 1);

  // Topic consistency: keyword overlap between adjacent sentences
  let overlapSum = 0;
  for (let i = 1; i < sentences.length; i++) {
    const wordsA = new Set(extractWords(sentences[i - 1]));
    const wordsB = new Set(extractWords(sentences[i]));
    if (wordsA.size === 0 || wordsB.size === 0) continue;
    const intersection = [...wordsA].filter((w) => wordsB.has(w)).length;
    const union = new Set([...wordsA, ...wordsB]).size;
    overlapSum += union > 0 ? intersection / union : 0;
  }
  const topicConsistency = overlapSum / Math.max(sentences.length - 1, 1);

  return Math.min(1, transitionRatio * 0.4 + topicConsistency * 0.6);
}

// ---------------------------------------------------------------------------
// 2. Relevance Extractor
// ---------------------------------------------------------------------------

export function extractRelevance(prompt: string, response: string): number {
  if (!prompt || !response) return 0;

  const promptWords = new Set(extractWords(prompt));
  const responseWords = new Set(extractWords(response));

  if (promptWords.size === 0) return 0.5;

  // Jaccard similarity
  const intersection = [...promptWords].filter((w) => responseWords.has(w)).length;
  const union = new Set([...promptWords, ...responseWords]).size;
  const jaccard = union > 0 ? intersection / union : 0;

  // Exact phrase matches (2-gram overlap)
  const promptLower = prompt.toLowerCase();
  const responseLower = response.toLowerCase();
  const promptBigrams = extractNgrams(promptLower, 2);
  const responseBigrams = extractNgrams(responseLower, 2);
  const bigramOverlap = promptBigrams.filter((b) => responseBigrams.includes(b)).length;
  const phraseRatio = promptBigrams.length > 0
    ? Math.min(bigramOverlap / promptBigrams.length, 1)
    : 0;

  return Math.min(1, jaccard * 0.6 + phraseRatio * 0.4);
}

function extractNgrams(text: string, n: number): string[] {
  const words = text.split(/\s+/).filter((w) => w.length > 1);
  const ngrams: string[] = [];
  for (let i = 0; i <= words.length - n; i++) {
    ngrams.push(words.slice(i, i + n).join(' '));
  }
  return ngrams;
}

// ---------------------------------------------------------------------------
// 3. Consistency Extractor
// ---------------------------------------------------------------------------

export function extractConsistency(responses: readonly string[]): number {
  if (responses.length <= 1) return 1.0;

  let totalSimilarity = 0;
  let pairs = 0;

  for (let i = 0; i < responses.length; i++) {
    for (let j = i + 1; j < responses.length; j++) {
      const wordsA = new Set(extractWords(responses[i]));
      const wordsB = new Set(extractWords(responses[j]));
      const intersection = [...wordsA].filter((w) => wordsB.has(w)).length;
      const union = new Set([...wordsA, ...wordsB]).size;
      totalSimilarity += union > 0 ? intersection / union : 0;
      pairs++;
    }
  }

  return pairs > 0 ? totalSimilarity / pairs : 1.0;
}

// ---------------------------------------------------------------------------
// 4. Verbosity Extractor
// ---------------------------------------------------------------------------

export function extractVerbosity(prompt: string, response: string): number {
  return response.length / Math.max(prompt.length, 1);
}

// ---------------------------------------------------------------------------
// 5. Aggregate
// ---------------------------------------------------------------------------

export function computeQualityMetrics(
  prompt: string,
  response: string,
  latencyMs: number,
  tokenCount: number,
): QualityMetrics {
  return {
    coherenceScore: extractCoherence(prompt, response),
    relevanceScore: extractRelevance(prompt, response),
    consistencyScore: 1.0, // Single response defaults to 1.0
    verbosityRatio: extractVerbosity(prompt, response),
    responseLatencyMs: latencyMs,
    tokenCount,
  };
}

// ---------------------------------------------------------------------------
// 6. Statistical Model Comparison (Welch's t-test)
// ---------------------------------------------------------------------------

export function compareModels(
  metricsA: readonly QualityMetrics[],
  metricsB: readonly QualityMetrics[],
  modelAName = 'Model A',
  modelBName = 'Model B',
): StatisticalComparison {
  const metricKeys: (keyof QualityMetrics)[] = [
    'coherenceScore',
    'relevanceScore',
    'consistencyScore',
  ];

  const deltas: Record<string, number> = {};
  // Bonferroni correction: α / number_of_tests to control family-wise error rate
  const correctedAlpha = 0.05 / metricKeys.length;
  let bestPValue = 1;
  let winner: string | null = null;

  for (const key of metricKeys) {
    const valsA = metricsA.map((m) => m[key] as number);
    const valsB = metricsB.map((m) => m[key] as number);

    const meanA = mean(valsA);
    const meanB = mean(valsB);
    deltas[key] = meanA - meanB;

    const pValue = welchTTest(valsA, valsB);

    if (pValue < correctedAlpha && pValue < bestPValue) {
      bestPValue = pValue;
      winner = meanA > meanB ? modelAName : modelBName;
    }
  }

  return {
    modelA: modelAName,
    modelB: modelBName,
    metricDeltas: deltas,
    significanceLevel: bestPValue,
    sampleSize: Math.min(metricsA.length, metricsB.length),
    winner,
  };
}

// ---------------------------------------------------------------------------
// Welch's t-test implementation
// ---------------------------------------------------------------------------

function mean(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;
}

function variance(values: readonly number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1);
}

function welchTTest(a: readonly number[], b: readonly number[]): number {
  if (a.length < 2 || b.length < 2) return 1;

  const meanA = mean(a);
  const meanB = mean(b);
  const varA = variance(a);
  const varB = variance(b);
  const nA = a.length;
  const nB = b.length;

  const se = Math.sqrt(varA / nA + varB / nB);
  if (se === 0) return meanA === meanB ? 1 : 0;

  const t = Math.abs(meanA - meanB) / se;

  // Welch-Satterthwaite degrees of freedom
  const num = (varA / nA + varB / nB) ** 2;
  const den =
    (varA / nA) ** 2 / (nA - 1) + (varB / nB) ** 2 / (nB - 1);
  const df = den > 0 ? num / den : 1;

  // Approximate p-value using t-distribution approximation
  return approximatePValue(t, df);
}

/**
 * Approximate two-tailed p-value for t-distribution.
 * Uses the incomplete beta function approximation.
 */
function approximatePValue(t: number, df: number): number {
  // For large df, t approaches normal distribution
  if (df > 100) {
    // Normal approximation
    const z = t;
    return 2 * (1 - normalCDF(z));
  }

  // Simple approximation for moderate df
  const x = df / (df + t * t);
  return regularizedIncompleteBeta(df / 2, 0.5, x);
}

function normalCDF(z: number): number {
  // Horner form approximation
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}

function regularizedIncompleteBeta(a: number, b: number, x: number): number {
  // Continued fraction approximation (Lentz's method)
  if (x === 0 || x === 1) return x;

  const maxIter = 100;
  const epsilon = 1e-10;

  const lnBeta = lnGamma(a) + lnGamma(b) - lnGamma(a + b);
  const front = Math.exp(
    Math.log(x) * a + Math.log(1 - x) * b - lnBeta,
  ) / a;

  let f = 1;
  let c = 1;
  let d = 1 - (a + b) * x / (a + 1);
  if (Math.abs(d) < epsilon) d = epsilon;
  d = 1 / d;
  f = d;

  for (let i = 1; i <= maxIter; i++) {
    const m = i;
    let num = m * (b - m) * x / ((a + 2 * m - 1) * (a + 2 * m));
    d = 1 + num * d;
    if (Math.abs(d) < epsilon) d = epsilon;
    c = 1 + num / c;
    if (Math.abs(c) < epsilon) c = epsilon;
    d = 1 / d;
    f *= c * d;

    num = -(a + m) * (a + b + m) * x / ((a + 2 * m) * (a + 2 * m + 1));
    d = 1 + num * d;
    if (Math.abs(d) < epsilon) d = epsilon;
    c = 1 + num / c;
    if (Math.abs(c) < epsilon) c = epsilon;
    d = 1 / d;
    const delta = c * d;
    f *= delta;

    if (Math.abs(delta - 1) < epsilon) break;
  }

  return front * f;
}

function lnGamma(z: number): number {
  // Lanczos approximation
  const g = 7;
  const coefs = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];

  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnGamma(1 - z);
  }

  z -= 1;
  let x = coefs[0];
  for (let i = 1; i < g + 2; i++) {
    x += coefs[i] / (z + i);
  }

  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}
