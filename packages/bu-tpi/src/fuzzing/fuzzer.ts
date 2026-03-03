/**
 * S66: Fuzzing Engine
 * Coverage-guided fuzzing for AI inputs.
 */

import { randomUUID } from 'crypto';
import type { FuzzConfig, FuzzResult, FuzzSession, AnomalyType } from './types.js';
import { DEFAULT_FUZZ_CONFIG, MAX_INPUT_LENGTH } from './types.js';
import { createGrammar, generateInput, mutateInput } from './grammar.js';

type ScannerFn = (text: string) => {
  verdict: 'BLOCK' | 'ALLOW';
  findings: Array<{ category: string }>;
  counts: { critical: number; warning: number; info: number };
};

/**
 * Create a new fuzz session.
 */
export function createFuzzSession(config: FuzzConfig = DEFAULT_FUZZ_CONFIG): FuzzSession {
  return {
    id: randomUUID(),
    config,
    results: [],
    startTime: new Date().toISOString(),
    endTime: null,
    status: 'running',
  };
}

/**
 * Detect anomalies in scan results.
 */
export function detectAnomaly(
  durationMs: number,
  avgDuration: number,
  expectedVerdict?: 'BLOCK' | 'ALLOW',
  actualVerdict?: 'BLOCK' | 'ALLOW'
): AnomalyType | null {
  // Performance degradation: 5x slower than average
  if (avgDuration > 0 && durationMs > avgDuration * 5) {
    return 'performance-degradation';
  }

  // Timeout: over 10 seconds
  if (durationMs > 10_000) {
    return 'timeout';
  }

  // Unexpected verdict
  if (expectedVerdict && actualVerdict && expectedVerdict !== actualVerdict) {
    return 'unexpected-verdict';
  }

  return null;
}

/**
 * Run a fuzzing session against a scanner.
 */
export function fuzz(
  session: FuzzSession,
  scanner: ScannerFn
): FuzzSession {
  const grammar = createGrammar(session.config.grammarRules, session.config.seed);
  const maxIter = Math.min(session.config.maxIterations, 10_000);
  const startTime = Date.now();
  let totalDuration = 0;
  let resultCount = 0;

  for (let i = 0; i < maxIter; i++) {
    // Timeout check
    if (Date.now() - startTime > session.config.timeoutMs) {
      session.status = 'aborted';
      break;
    }

    // Generate or mutate input (coverage-guided: prefer interesting inputs)
    let input: string;
    if (session.results.length > 0 && grammar.rng.next() < session.config.mutationRate) {
      const interesting = session.results.filter((r) => r.anomaly || r.verdict === 'BLOCK');
      const pool = interesting.length > 0 ? interesting : session.results;
      const prev = pool[Math.floor(grammar.rng.next() * pool.length)];
      input = mutateInput(prev.input, 0.1, `${session.config.seed}-${i}`);
    } else {
      input = generateInput(grammar);
    }

    if (input.length > MAX_INPUT_LENGTH) {
      input = input.slice(0, MAX_INPUT_LENGTH);
    }

    // Scan
    const scanStart = Date.now();
    let verdict: 'BLOCK' | 'ALLOW' = 'ALLOW';
    let findingsCount = 0;

    try {
      const result = scanner(input);
      verdict = result.verdict;
      findingsCount = result.findings.length;
    } catch {
      // Scanner crash = record as anomaly
      const crashResult: FuzzResult = {
        input: input.slice(0, 1000),
        verdict: 'BLOCK',
        findingsCount: 0,
        anomaly: true,
        anomalyType: 'timeout',
        durationMs: Date.now() - scanStart,
      };
      (session.results as FuzzResult[]).push(crashResult);
      totalDuration += Date.now() - scanStart;
      resultCount++;
      continue;
    }

    const durationMs = Date.now() - scanStart;
    totalDuration += durationMs;
    resultCount++;

    const avgDuration = totalDuration / resultCount;
    const anomalyType = detectAnomaly(durationMs, avgDuration);

    const fuzzResult: FuzzResult = {
      input: input.slice(0, 1000), // Truncate for storage
      verdict,
      findingsCount,
      anomaly: anomalyType !== null,
      anomalyType,
      durationMs,
    };

    (session.results as FuzzResult[]).push(fuzzResult);
  }

  session.status = 'completed';
  session.endTime = new Date().toISOString();
  return session;
}

/**
 * Get fuzzing coverage statistics.
 */
export function getFuzzCoverage(session: FuzzSession): {
  totalInputs: number;
  anomalies: number;
  blockedRate: number;
  avgLatencyMs: number;
} {
  const total = session.results.length;
  const anomalies = session.results.filter((r) => r.anomaly).length;
  const blocked = session.results.filter((r) => r.verdict === 'BLOCK').length;
  const totalLatency = session.results.reduce((sum, r) => sum + r.durationMs, 0);

  return {
    totalInputs: total,
    anomalies,
    blockedRate: total > 0 ? blocked / total : 0,
    avgLatencyMs: total > 0 ? totalLatency / total : 0,
  };
}

/**
 * Export fuzz results as JSON.
 */
export function exportResults(session: FuzzSession): string {
  return JSON.stringify({
    id: session.id,
    config: session.config,
    status: session.status,
    startTime: session.startTime,
    endTime: session.endTime,
    summary: getFuzzCoverage(session),
    anomalies: session.results.filter((r) => r.anomaly),
    totalResults: session.results.length,
  }, null, 2);
}
