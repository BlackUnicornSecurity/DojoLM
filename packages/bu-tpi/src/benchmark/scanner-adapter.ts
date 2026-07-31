// SPDX-License-Identifier: Apache-2.0
/**
 * DojoLM scanner adapter for benchmark execution.
 */

import { scan, type ScanOptions } from "../scanner.js";
import {
  BenchmarkRunner,
  type BenchmarkProgress,
  type ScanFn,
} from "./runner.js";
import { sanitizeReportText } from "./report.js";
import type { BenchmarkResult, BenchmarkSuite } from "./types.js";
import { DOJOLM_BENCH_V1 } from "./suites/dojolm-bench.js";

export interface DojoLmBenchmarkOptions {
  readonly modelId?: string;
  readonly modelName?: string;
  readonly provider?: string;
  readonly scanOptions?: ScanOptions;
  readonly onProgress?: (progress: BenchmarkProgress) => void;
}

export const DEFAULT_DOJOLM_BENCHMARK_MODEL_ID = "dojolm-scanner";
export const DEFAULT_DOJOLM_BENCHMARK_PROVIDER = "dojolm";

export function createDojoLmScannerScanFn(scanOptions?: ScanOptions): ScanFn {
  return (text: string) => {
    const result = scan(text, scanOptions);
    return { verdict: result.verdict };
  };
}

export function runDojoLmScannerBenchmark(
  suite: BenchmarkSuite = DOJOLM_BENCH_V1,
  options: DojoLmBenchmarkOptions = {},
): BenchmarkResult {
  const modelId =
    sanitizeReportText(options.modelId ?? DEFAULT_DOJOLM_BENCHMARK_MODEL_ID) ||
    DEFAULT_DOJOLM_BENCHMARK_MODEL_ID;
  const runner = new BenchmarkRunner(suite);
  const result = runner.run(
    modelId,
    createDojoLmScannerScanFn(options.scanOptions),
    options.onProgress,
  );

  return {
    ...result,
    modelName: sanitizeReportText(options.modelName ?? modelId) || modelId,
    provider:
      sanitizeReportText(
        options.provider ?? DEFAULT_DOJOLM_BENCHMARK_PROVIDER,
      ) || DEFAULT_DOJOLM_BENCHMARK_PROVIDER,
  };
}
