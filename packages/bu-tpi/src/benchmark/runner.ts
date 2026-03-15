/**
 * H20.3: Benchmark Runner
 * Executes benchmark suites against model scan functions and produces scored results.
 */

import type {
  BenchmarkComparison,
  BenchmarkResult,
  BenchmarkSuite,
  ScoreBreakdown,
} from './types.js';
import { CATEGORY_DIFFICULTY } from './suites/dojolm-bench.js';

/** Progress callback payload */
export interface BenchmarkProgress {
  readonly current: number;
  readonly total: number;
  readonly category: string;
}

/** Scan function signature expected by the runner */
export type ScanFn = (text: string) => { verdict: 'BLOCK' | 'ALLOW' };

/**
 * BenchmarkRunner — executes a suite's fixtures through a scan function and scores results.
 *
 * Scoring:
 *   - Per-category accuracy = correct / total within category
 *   - Overall score = sum(category_accuracy * category_weight) * 100
 */
export class BenchmarkRunner {
  private readonly suite: BenchmarkSuite;

  constructor(suite: BenchmarkSuite) {
    this.suite = suite;
  }

  /**
   * Run the benchmark against a model's scan function.
   * @param modelId   Unique model identifier
   * @param scanFn    Function that returns a verdict for a given fixture text
   * @param onProgress Optional progress callback
   */
  run(
    modelId: string,
    scanFn: ScanFn,
    onProgress?: (progress: BenchmarkProgress) => void,
  ): BenchmarkResult {
    const startTime = Date.now();
    const breakdown: ScoreBreakdown[] = [];
    const categoryScores: Record<string, number> = {};

    let globalIndex = 0;
    const totalFixtures = this.suite.categories.reduce(
      (sum, cat) => sum + cat.fixtureIds.length,
      0,
    );

    for (const category of this.suite.categories) {
      let correct = 0;
      const total = category.fixtureIds.length;

      for (const fixtureId of category.fixtureIds) {
        globalIndex++;

        const expectedVerdict = category.expectedVerdicts[fixtureId];
        if (!expectedVerdict) {
          continue;
        }

        const result = scanFn(fixtureId);
        const actualVerdict = result.verdict;
        const isCorrect = actualVerdict === expectedVerdict;

        if (isCorrect) {
          correct++;
        }

        const severity = CATEGORY_DIFFICULTY[category.name] ?? 'medium';

        breakdown.push({
          fixtureId,
          category: category.name,
          expectedVerdict,
          actualVerdict,
          correct: isCorrect,
          severity,
        });

        if (onProgress) {
          onProgress({
            current: globalIndex,
            total: totalFixtures,
            category: category.name,
          });
        }
      }

      categoryScores[category.name] = total > 0 ? correct / total : 0;
    }

    // Overall score: weighted sum of category accuracies, scaled to 0-100
    let overallScore = 0;
    for (const category of this.suite.categories) {
      const accuracy = categoryScores[category.name] ?? 0;
      overallScore += accuracy * category.weight;
    }
    overallScore = Math.round(overallScore * 10000) / 100;

    const elapsed = Date.now() - startTime;

    return {
      suiteId: this.suite.id,
      modelId,
      modelName: modelId,
      provider: '',
      overallScore,
      categoryScores,
      breakdown,
      executedAt: new Date(startTime).toISOString(),
      elapsed,
    };
  }

  /**
   * Compare multiple model results and rank them by overall score (descending).
   */
  compareModels(results: readonly BenchmarkResult[]): BenchmarkComparison {
    const sorted = [...results].sort((a, b) => b.overallScore - a.overallScore);

    const rankedModels = sorted.map((r, i) => ({
      modelId: r.modelId,
      rank: i + 1,
      score: r.overallScore,
    }));

    return {
      suiteId: this.suite.id,
      results: sorted,
      rankedModels,
    };
  }
}
