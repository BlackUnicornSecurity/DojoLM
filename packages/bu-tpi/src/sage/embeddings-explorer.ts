/**
 * S64: Embeddings Explorer - Dimensionality Reduction + Attack Tools
 * Provides embedding generation, t-SNE dimensionality reduction,
 * and attack tools for adversarial embedding analysis.
 * Note: Visualization component (3D rendering) is in dojolm-web (P7).
 */

import { createHash } from 'crypto';
import type { SeedEntry } from './types.js';
import { MAX_INPUT_LENGTH } from './types.js';

// --- Types ---

export interface EmbeddingPoint {
  readonly id: string;
  readonly label: string;
  readonly category: string;
  readonly embedding: number[];
  readonly reduced?: { x: number; y: number; z: number };
}

export interface EmbeddingCluster {
  readonly id: string;
  readonly centroidId: string;
  readonly pointIds: string[];
  readonly category: string;
  readonly avgDistance: number;
}

export interface EmbeddingStats {
  readonly totalPoints: number;
  readonly dimensions: number;
  readonly clusters: number;
  readonly categories: Record<string, number>;
}

// --- Simple TF-IDF Embedding (per SME MED-03: no external embedding model) ---

/**
 * Build vocabulary from corpus of texts.
 */
export function buildVocabulary(texts: string[], maxTerms: number = 256): string[] {
  const termFreq = new Map<string, number>();

  for (const text of texts) {
    const words = text.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    const seen = new Set<string>();
    for (const word of words) {
      if (!seen.has(word)) {
        termFreq.set(word, (termFreq.get(word) ?? 0) + 1);
        seen.add(word);
      }
    }
  }

  // Sort by frequency and take top N
  return Array.from(termFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxTerms)
    .map(([term]) => term);
}

/**
 * Generate a TF-IDF embedding vector for a text.
 */
export function generateEmbedding(
  text: string,
  vocabulary: string[],
  corpusSize: number,
  documentFrequencies: Map<string, number>
): number[] {
  if (text.length > MAX_INPUT_LENGTH) return new Array(vocabulary.length).fill(0);

  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  const termCounts = new Map<string, number>();

  for (const word of words) {
    termCounts.set(word, (termCounts.get(word) ?? 0) + 1);
  }

  return vocabulary.map((term) => {
    const tf = (termCounts.get(term) ?? 0) / (words.length || 1);
    const df = documentFrequencies.get(term) ?? 1;
    const idf = Math.log(corpusSize / df);
    return Math.round(tf * idf * 10000) / 10000;
  });
}

/**
 * Generate embeddings for a collection of seed entries.
 */
export function generateEmbeddings(seeds: SeedEntry[]): EmbeddingPoint[] {
  const texts = seeds.map((s) => s.content);
  const vocabulary = buildVocabulary(texts);

  // Calculate document frequencies
  const df = new Map<string, number>();
  for (const text of texts) {
    const words = new Set(text.toLowerCase().split(/\s+/));
    for (const term of vocabulary) {
      if (words.has(term)) {
        df.set(term, (df.get(term) ?? 0) + 1);
      }
    }
  }

  return seeds.map((seed) => ({
    id: seed.id,
    label: `${seed.category}:${seed.id.slice(0, 8)}`,
    category: seed.category,
    embedding: generateEmbedding(seed.content, vocabulary, texts.length, df),
  }));
}

// --- Dimensionality Reduction (simplified t-SNE-like) ---

/**
 * Cosine similarity between two vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dotProduct / denom;
}

/**
 * Euclidean distance between two vectors.
 */
export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) return Infinity;

  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * Simple PCA-like dimensionality reduction to 3D.
 * (Deterministic, no randomness, suitable for visualization.)
 */
export function reduceTo3D(points: EmbeddingPoint[]): EmbeddingPoint[] {
  if (points.length === 0) return [];

  const dims = points[0].embedding.length;
  if (dims < 3) {
    return points.map((p) => ({
      ...p,
      reduced: {
        x: p.embedding[0] ?? 0,
        y: p.embedding[1] ?? 0,
        z: p.embedding[2] ?? 0,
      },
    }));
  }

  // Simple projection: use variance-maximizing dimensions
  const variances = new Array(dims).fill(0);
  const means = new Array(dims).fill(0);

  for (const point of points) {
    for (let d = 0; d < dims; d++) {
      means[d] += point.embedding[d];
    }
  }
  for (let d = 0; d < dims; d++) {
    means[d] /= points.length;
  }

  for (const point of points) {
    for (let d = 0; d < dims; d++) {
      variances[d] += (point.embedding[d] - means[d]) ** 2;
    }
  }

  // Pick top 3 variance dimensions
  const dimIndices = variances
    .map((v, i) => ({ variance: v, index: i }))
    .sort((a, b) => b.variance - a.variance)
    .slice(0, 3)
    .map((d) => d.index);

  return points.map((p) => ({
    ...p,
    reduced: {
      x: Math.round((p.embedding[dimIndices[0]] - means[dimIndices[0]]) * 1000) / 1000,
      y: Math.round((p.embedding[dimIndices[1]] - means[dimIndices[1]]) * 1000) / 1000,
      z: Math.round((p.embedding[dimIndices[2]] - means[dimIndices[2]]) * 1000) / 1000,
    },
  }));
}

// --- Clustering ---

/**
 * Simple k-means-like clustering on embeddings.
 */
export function clusterEmbeddings(
  points: EmbeddingPoint[],
  k: number = 5,
  maxIterations: number = 20
): EmbeddingCluster[] {
  if (points.length < k) k = points.length;
  if (k === 0) return [];

  // Initialize centroids from first k points
  let centroids = points.slice(0, k).map((p) => [...p.embedding]);

  let assignments = new Array(points.length).fill(0);

  for (let iter = 0; iter < maxIterations; iter++) {
    // Assign points to nearest centroid
    const newAssignments = points.map((point) => {
      let minDist = Infinity;
      let minIdx = 0;
      for (let c = 0; c < centroids.length; c++) {
        const dist = euclideanDistance(point.embedding, centroids[c]);
        if (dist < minDist) {
          minDist = dist;
          minIdx = c;
        }
      }
      return minIdx;
    });

    // Check for convergence
    const changed = newAssignments.some((a, i) => a !== assignments[i]);
    assignments = newAssignments;
    if (!changed) break;

    // Update centroids
    for (let c = 0; c < k; c++) {
      const clusterPoints = points.filter((_, i) => assignments[i] === c);
      if (clusterPoints.length === 0) continue;

      const dims = centroids[c].length;
      centroids[c] = new Array(dims).fill(0);
      for (const p of clusterPoints) {
        for (let d = 0; d < dims; d++) {
          centroids[c][d] += p.embedding[d];
        }
      }
      for (let d = 0; d < dims; d++) {
        centroids[c][d] /= clusterPoints.length;
      }
    }
  }

  // Build cluster objects
  const clusters: EmbeddingCluster[] = [];
  for (let c = 0; c < k; c++) {
    const clusterPointIds = points
      .filter((_, i) => assignments[i] === c)
      .map((p) => p.id);

    if (clusterPointIds.length === 0) continue;

    // Find centroid point (closest to center)
    let centroidId = clusterPointIds[0];
    let minDist = Infinity;
    for (const pid of clusterPointIds) {
      const point = points.find((p) => p.id === pid);
      if (!point) continue;
      const dist = euclideanDistance(point.embedding, centroids[c]);
      if (dist < minDist) {
        minDist = dist;
        centroidId = pid;
      }
    }

    // Calculate average distance to centroid
    let totalDist = 0;
    for (const pid of clusterPointIds) {
      const point = points.find((p) => p.id === pid);
      if (point) {
        totalDist += euclideanDistance(point.embedding, centroids[c]);
      }
    }

    const categories = clusterPointIds
      .map((id) => points.find((p) => p.id === id)?.category ?? 'unknown')
      .reduce((acc, cat) => {
        acc[cat] = (acc[cat] ?? 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const dominantCategory = Object.entries(categories)
      .sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'unknown';

    clusters.push({
      id: createHash('sha256').update(`cluster-${c}`).digest('hex').slice(0, 8),
      centroidId,
      pointIds: clusterPointIds,
      category: dominantCategory,
      avgDistance: clusterPointIds.length > 0 ? totalDist / clusterPointIds.length : 0,
    });
  }

  return clusters;
}

/**
 * Get embedding statistics.
 */
export function getEmbeddingStats(points: EmbeddingPoint[]): EmbeddingStats {
  const categories: Record<string, number> = {};
  for (const point of points) {
    categories[point.category] = (categories[point.category] ?? 0) + 1;
  }

  return {
    totalPoints: points.length,
    dimensions: points[0]?.embedding.length ?? 0,
    clusters: 0,
    categories,
  };
}
