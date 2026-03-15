/**
 * H25.1: Transfer Test Runner
 * Runs fixtures across model pairs and builds the NxN transfer matrix.
 */

import type {
  TransferTestConfig,
  TransferResult,
  TransferMatrix,
  TransferSummary,
} from './types.js';

export class TransferTestRunner {
  private readonly config: TransferTestConfig;

  constructor(config: TransferTestConfig) {
    this.config = config;
  }

  /**
   * Run all fixtures against all models and build TransferResult[].
   * @param scanFn - Function that returns a verdict for a given fixture+model pair.
   * @param onProgress - Optional progress callback.
   */
  run(
    scanFn: (fixtureId: string, modelId: string) => { verdict: 'BLOCK' | 'ALLOW' },
    onProgress?: (progress: { completed: number; total: number }) => void,
  ): TransferResult[] {
    const { fixtureIds, modelIds } = this.config;
    const results: TransferResult[] = [];

    // Pre-compute all verdicts: model -> fixture -> verdict
    const verdictMap = new Map<string, Map<string, 'BLOCK' | 'ALLOW'>>();
    const totalScans = modelIds.length * fixtureIds.length;
    let completed = 0;

    for (const modelId of modelIds) {
      const modelVerdicts = new Map<string, 'BLOCK' | 'ALLOW'>();
      for (const fixtureId of fixtureIds) {
        const { verdict } = scanFn(fixtureId, modelId);
        modelVerdicts.set(fixtureId, verdict);
        completed++;
        onProgress?.({ completed, total: totalScans });
      }
      verdictMap.set(modelId, modelVerdicts);
    }

    // Build pair results
    for (const sourceModelId of modelIds) {
      for (const targetModelId of modelIds) {
        const sourceVerdicts = verdictMap.get(sourceModelId)!;
        const targetVerdicts = verdictMap.get(targetModelId)!;

        for (const fixtureId of fixtureIds) {
          const sourceVerdict = sourceVerdicts.get(fixtureId)!;
          const targetVerdict = targetVerdicts.get(fixtureId)!;

          // transferred = true when source blocked AND target also blocked
          const transferred = sourceVerdict === 'BLOCK' && targetVerdict === 'BLOCK';

          results.push({
            fixtureId,
            sourceModelId,
            targetModelId,
            sourceVerdict,
            targetVerdict,
            transferred,
          });
        }
      }
    }

    return results;
  }

  /**
   * Build the NxN TransferMatrix from results.
   * Transfer rate for pair (source, target) = count(transferred) / total fixtures.
   * Diagonal is always 1.0 (self-transfer).
   */
  buildMatrix(results: TransferResult[]): TransferMatrix {
    const { modelIds } = this.config;
    const n = modelIds.length;
    const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
    const pairDetails: Record<string, TransferResult[]> = {};

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const sourceId = modelIds[i];
        const targetId = modelIds[j];
        const key = `${sourceId}:${targetId}`;

        const pairResults = results.filter(
          (r) => r.sourceModelId === sourceId && r.targetModelId === targetId,
        );
        pairDetails[key] = pairResults;

        if (i === j) {
          // Diagonal is always 1.0
          matrix[i][j] = 1.0;
        } else {
          const total = pairResults.length;
          if (total === 0) {
            matrix[i][j] = 0;
          } else {
            const transferredCount = pairResults.filter((r) => r.transferred).length;
            matrix[i][j] = transferredCount / total;
          }
        }
      }
    }

    return { modelIds, matrix, pairDetails };
  }

  /**
   * Calculate summary statistics from a TransferMatrix.
   */
  generateSummary(matrix: TransferMatrix): TransferSummary {
    const { modelIds } = matrix;
    const n = modelIds.length;

    let totalRate = 0;
    let offDiagonalCount = 0;
    let highest = { source: modelIds[0], target: modelIds[0], rate: -Infinity };
    let lowest = { source: modelIds[0], target: modelIds[0], rate: Infinity };

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue; // Skip diagonal for summary
        const rate = matrix.matrix[i][j];
        totalRate += rate;
        offDiagonalCount++;

        if (rate > highest.rate) {
          highest = { source: modelIds[i], target: modelIds[j], rate };
        }
        if (rate < lowest.rate) {
          lowest = { source: modelIds[i], target: modelIds[j], rate };
        }
      }
    }

    // Edge case: single model (no off-diagonal pairs)
    if (offDiagonalCount === 0) {
      highest = { source: modelIds[0], target: modelIds[0], rate: 1.0 };
      lowest = { source: modelIds[0], target: modelIds[0], rate: 1.0 };
      totalRate = 1.0;
      offDiagonalCount = 1;
    }

    // Count unique fixtures from pairDetails
    const fixtureSet = new Set<string>();
    for (const pairResults of Object.values(matrix.pairDetails)) {
      for (const r of pairResults) {
        fixtureSet.add(r.fixtureId);
      }
    }

    return {
      averageTransferRate: totalRate / offDiagonalCount,
      highestPair: highest,
      lowestPair: lowest,
      totalFixtures: fixtureSet.size,
      totalModels: n,
    };
  }
}
