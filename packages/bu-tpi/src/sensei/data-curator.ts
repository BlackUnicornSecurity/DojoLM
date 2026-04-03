/**
 * IKIGAI Phase 1.1: Data Curator
 * Quality filtering, deduplication, and category balancing for training data.
 *
 * Uses Jaccard similarity (same approach as SAGE genetic-core.ts) for dedup,
 * SHA-256 hashing (same as Sengoku finding-tracker.ts) for content addressing.
 */

import { createHash } from 'node:crypto';
import type {
  SenseiTrainingSample,
  CurationConfig,
  DataQualityMetrics,
  SampleQualityGrade,
} from './types.js';
import { DEFAULT_CURATION_CONFIG, SAMPLE_QUALITY_GRADES } from './types.js';

// ---------------------------------------------------------------------------
// Content Hashing (follows Sengoku convention)
// ---------------------------------------------------------------------------

/** SHA-256 hash of normalized content for deduplication */
export function hashContent(content: string): string {
  return createHash('sha256')
    .update(content.trim().toLowerCase())
    .digest('hex');
}

// ---------------------------------------------------------------------------
// Jaccard Similarity (follows AttackDNA / SAGE convention)
// ---------------------------------------------------------------------------

/** Word-level Jaccard similarity between two strings */
export function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(a.toLowerCase().split(/\s+/).filter(Boolean));
  const setB = new Set(b.toLowerCase().split(/\s+/).filter(Boolean));

  if (setA.size === 0 && setB.size === 0) return 1.0;
  if (setA.size === 0 || setB.size === 0) return 0.0;

  let intersection = 0;
  for (const word of setA) {
    if (setB.has(word)) intersection++;
  }

  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// ---------------------------------------------------------------------------
// Quality Filtering
// ---------------------------------------------------------------------------

const QUALITY_ORDER: Record<SampleQualityGrade, number> = {
  high: 3,
  medium: 2,
  low: 1,
  rejected: 0,
};

/** Filter samples below minimum quality threshold */
export function filterByQuality(
  samples: readonly SenseiTrainingSample[],
  minQuality: SampleQualityGrade,
): readonly SenseiTrainingSample[] {
  const minOrder = QUALITY_ORDER[minQuality];
  return samples.filter((s) => QUALITY_ORDER[s.quality] >= minOrder);
}

/** Filter samples below minimum content length */
export function filterByLength(
  samples: readonly SenseiTrainingSample[],
  minLength: number,
  maxLength: number,
): readonly SenseiTrainingSample[] {
  return samples.filter((s) => s.content.length >= minLength && s.content.length <= maxLength);
}

// ---------------------------------------------------------------------------
// Deduplication
// ---------------------------------------------------------------------------

/** Remove exact duplicates (same SHA-256 hash) */
export function deduplicateExact(
  samples: readonly SenseiTrainingSample[],
): readonly SenseiTrainingSample[] {
  const seen = new Set<string>();
  const result: SenseiTrainingSample[] = [];

  for (const sample of samples) {
    const hash = hashContent(sample.content);
    if (!seen.has(hash)) {
      seen.add(hash);
      result.push(sample);
    }
  }

  return result;
}

/** Remove near-duplicates using Jaccard similarity threshold.
 *  Uses per-category bucketing to reduce O(n²) comparisons.
 *  Skips semantic dedup when total samples exceed limit (falls back to exact dedup only). */
export function deduplicateSemantic(
  samples: readonly SenseiTrainingSample[],
  threshold: number,
  maxSamples: number = 5_000,
): readonly SenseiTrainingSample[] {
  // Guard: skip O(n²) semantic dedup for large datasets
  if (samples.length > maxSamples) {
    return [...samples];
  }

  // Bucket by category for efficient comparison
  const buckets = new Map<string, SenseiTrainingSample[]>();
  const result: SenseiTrainingSample[] = [];

  for (const sample of samples) {
    const bucket = buckets.get(sample.category) ?? [];

    const isDuplicate = bucket.some(
      (existing) => jaccardSimilarity(existing.content, sample.content) >= threshold,
    );

    if (!isDuplicate) {
      bucket.push(sample);
      buckets.set(sample.category, bucket);
      result.push(sample);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Category Balancing
// ---------------------------------------------------------------------------

/** Balance samples so no single category dominates */
export function balanceCategories(
  samples: readonly SenseiTrainingSample[],
  maxPerCategory: number,
): readonly SenseiTrainingSample[] {
  const byCategory = new Map<string, SenseiTrainingSample[]>();

  for (const sample of samples) {
    const existing = byCategory.get(sample.category) ?? [];
    byCategory.set(sample.category, [...existing, sample]);
  }

  const balanced: SenseiTrainingSample[] = [];
  for (const [, categorySamples] of byCategory) {
    // Sort by quality (high first), then novelty (high first)
    const sorted = [...categorySamples].sort((a, b) => {
      const qualDiff = QUALITY_ORDER[b.quality] - QUALITY_ORDER[a.quality];
      if (qualDiff !== 0) return qualDiff;
      return b.noveltyScore - a.noveltyScore;
    });
    balanced.push(...sorted.slice(0, maxPerCategory));
  }

  return balanced;
}

// ---------------------------------------------------------------------------
// Novelty Scoring
// ---------------------------------------------------------------------------

/** Max samples for novelty scoring — larger sets use placeholder scores */
const NOVELTY_SCORE_MAX_SAMPLES = 5_000;

/** Compute novelty for each sample relative to the dataset.
 *  Uses per-category bucketing. Skips recalculation for large datasets. */
export function computeNoveltyScores(
  samples: readonly SenseiTrainingSample[],
): readonly SenseiTrainingSample[] {
  // Guard: skip O(n²) novelty for large datasets — keep initial scores
  if (samples.length > NOVELTY_SCORE_MAX_SAMPLES) {
    return [...samples];
  }

  // Pre-bucket by category for efficiency
  const categoryBuckets = new Map<string, SenseiTrainingSample[]>();
  for (const sample of samples) {
    const bucket = categoryBuckets.get(sample.category) ?? [];
    bucket.push(sample);
    categoryBuckets.set(sample.category, bucket);
  }

  return samples.map((sample) => {
    const bucket = categoryBuckets.get(sample.category) ?? [];
    const sameCategory = bucket.filter((s) => s.id !== sample.id);

    if (sameCategory.length === 0) {
      return { ...sample, noveltyScore: 1.0 };
    }

    const avgSimilarity =
      sameCategory.reduce((sum, s) => sum + jaccardSimilarity(sample.content, s.content), 0) /
      sameCategory.length;

    const noveltyScore = Math.max(0, Math.min(1, 1 - avgSimilarity));
    return { ...sample, noveltyScore };
  });
}

// ---------------------------------------------------------------------------
// Quality Metrics
// ---------------------------------------------------------------------------

/** Compute quality metrics for a curated dataset */
export function computeQualityMetrics(
  samples: readonly SenseiTrainingSample[],
  originalCount: number,
): DataQualityMetrics {
  const bySource: Record<string, number> = {};
  const byCapability: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  const byQuality: Record<string, number> = {};

  let totalNovelty = 0;

  for (const sample of samples) {
    bySource[sample.sourceType] = (bySource[sample.sourceType] ?? 0) + 1;
    byCapability[sample.capability] = (byCapability[sample.capability] ?? 0) + 1;
    byCategory[sample.category] = (byCategory[sample.category] ?? 0) + 1;
    byQuality[sample.quality] = (byQuality[sample.quality] ?? 0) + 1;
    totalNovelty += sample.noveltyScore;
  }

  // Category balance: 1.0 = perfectly balanced, 0.0 = single category
  const categoryValues = Object.values(byCategory);
  const maxCategory = Math.max(...categoryValues, 0);
  const categoryBalance =
    categoryValues.length > 0 && maxCategory > 0
      ? 1 - (maxCategory - samples.length / categoryValues.length) / maxCategory
      : 0;

  return {
    totalSamples: samples.length,
    bySource,
    byCapability,
    byCategory,
    byQuality,
    avgNovelty: samples.length > 0 ? totalNovelty / samples.length : 0,
    duplicateRate: originalCount > 0 ? 1 - samples.length / originalCount : 0,
    categoryBalance: Math.max(0, Math.min(1, categoryBalance)),
  };
}

// ---------------------------------------------------------------------------
// Full Curation Pipeline
// ---------------------------------------------------------------------------

export interface CurationOutput {
  readonly samples: readonly SenseiTrainingSample[];
  readonly metrics: DataQualityMetrics;
  readonly removedCount: number;
}

/** Run the full curation pipeline: quality filter -> dedup -> balance -> novelty */
export function curateSamples(
  samples: readonly SenseiTrainingSample[],
  config: CurationConfig = DEFAULT_CURATION_CONFIG,
): CurationOutput {
  const originalCount = samples.length;

  // Step 1: Quality filter
  const qualityFiltered = filterByQuality(samples, config.minQuality);

  // Step 2: Length filter
  const lengthFiltered = filterByLength(
    qualityFiltered,
    config.minContentLength,
    config.maxContentLength,
  );

  // Step 3: Exact dedup
  const exactDeduped = deduplicateExact(lengthFiltered);

  // Step 4: Semantic dedup (with O(n²) guard)
  const semanticDeduped = deduplicateSemantic(
    exactDeduped,
    config.deduplicationThreshold,
    config.semanticDedupLimit,
  );

  // Step 5: Category balancing
  const balanced = balanceCategories(semanticDeduped, config.maxPerCategory);

  // Step 6: Novelty scoring
  const scored = computeNoveltyScores(balanced);

  // Step 7: Filter by novelty threshold
  const final = scored.filter((s) => s.noveltyScore >= config.noveltyThreshold);

  const metrics = computeQualityMetrics(final, originalCount);

  return {
    samples: final,
    metrics,
    removedCount: originalCount - final.length,
  };
}
