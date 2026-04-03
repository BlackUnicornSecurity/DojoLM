/**
 * GUNKIMONO Phase 6.3: Compliance Evidence Bridge
 * Maps benchmark results to compliance framework evidence chains.
 */

import type { BenchmarkResult } from '../benchmark/types.js';
import type {
  ComplianceFramework,
  ControlMapping,
  EvidenceRecord,
} from './types.js';
import { getAllMappings, calculateCoverage } from './mapper.js';
import { randomUUID } from 'crypto';
import { createHmac, timingSafeEqual } from 'crypto';

// --- Types ---

export interface BenchmarkEvidenceResult {
  readonly framework: ComplianceFramework;
  readonly benchmarkSuiteId: string;
  readonly coverage: number;
  readonly evidenceRecords: readonly EvidenceRecord[];
  readonly controlMappings: readonly ControlMapping[];
  readonly generatedAt: string;
}

export interface BenchmarkComplianceReport {
  readonly frameworks: readonly BenchmarkEvidenceResult[];
  readonly overallScore: number;
  readonly totalControls: number;
  readonly coveredControls: number;
  readonly generatedAt: string;
}

// --- Category-to-module mapping ---

/**
 * Maps benchmark category names to scanner module names
 * used by the compliance mapper.
 */
const CATEGORY_MODULE_MAP: Readonly<Record<string, string>> = {
  'prompt-injection': 'enhanced-pi',
  'jailbreak': 'enhanced-pi',
  'tool-manipulation': 'mcp-attack-detector',
  'output': 'output-attack-detector',
  'supply-chain': 'supply-chain-detector',
  'agent': 'mcp-attack-detector',
  'model-theft': 'model-theft-detector',
  'vec': 'rag-analyzer',
  'bias': 'bias-detector',
  'dos': 'dos-detector',
  'encoded': 'enhanced-pi',
  // Agentic bench categories
  'tool-injection': 'mcp-attack-detector',
  'delegation-attack': 'mcp-attack-detector',
  'function-hijack': 'mcp-attack-detector',
  'indirect-pi': 'enhanced-pi',
  'benign-tool-use': 'mcp-attack-detector',
  // RAG bench categories
  'boundary-injection': 'rag-analyzer',
  'embedding-attack': 'rag-analyzer',
  'knowledge-conflict': 'rag-analyzer',
  'clean-rag': 'rag-analyzer',
} as const;

// --- HMAC key helper ---

function getHmacKey(): string {
  return process.env.EVIDENCE_HMAC_SECRET ?? 'dev-benchmark-evidence-key';
}

// --- Functions ---

/**
 * Extract active module names and fixture categories from a benchmark result.
 */
export function extractBenchmarkModules(
  result: BenchmarkResult,
): { moduleNames: string[]; fixtureCategories: Record<string, number> } {
  const moduleSet = new Set<string>();
  const fixtureCategories: Record<string, number> = {};

  for (const [category, score] of Object.entries(result.categoryScores)) {
    const moduleName = CATEGORY_MODULE_MAP[category];
    if (moduleName) {
      moduleSet.add(moduleName);
    }
    // Use score * fixture count as an approximation of "tested fixtures"
    const catFixtures = result.breakdown.filter((b) => b.category === category);
    fixtureCategories[category] = catFixtures.length;
  }

  return {
    moduleNames: [...moduleSet],
    fixtureCategories,
  };
}

/**
 * Create a signed evidence record from a benchmark category score.
 */
export function createBenchmarkEvidence(
  controlId: string,
  frameworkId: string,
  category: string,
  score: number,
  benchmarkSuiteId: string,
): EvidenceRecord {
  const id = randomUUID();
  const timestamp = new Date().toISOString();
  const result = score >= 0.7 ? 'pass' : score >= 0.4 ? 'partial' : 'fail';
  const details = `Benchmark ${benchmarkSuiteId} category "${category}" scored ${(score * 100).toFixed(1)}%`;

  const payload = `${id}:${controlId}:${frameworkId}:${timestamp}:${result}:${score}`;
  const hmac = createHmac('sha256', getHmacKey()).update(payload).digest('hex');

  return {
    id,
    controlId,
    frameworkId,
    testExecutionId: benchmarkSuiteId,
    timestamp,
    result,
    score,
    details,
    hmacSignature: hmac,
  };
}

/**
 * Verify an evidence record's HMAC signature.
 */
export function verifyBenchmarkEvidence(record: EvidenceRecord): boolean {
  const payload = `${record.id}:${record.controlId}:${record.frameworkId}:${record.timestamp}:${record.result}:${record.score}`;
  const expected = createHmac('sha256', getHmacKey()).update(payload).digest('hex');

  const a = Buffer.from(record.hmacSignature, 'hex');
  const b = Buffer.from(expected, 'hex');

  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Map a benchmark result to compliance evidence for a single framework.
 */
export function benchmarkToEvidence(
  result: BenchmarkResult,
  framework: ComplianceFramework,
): BenchmarkEvidenceResult {
  const { moduleNames, fixtureCategories } = extractBenchmarkModules(result);
  const mappings = getAllMappings(framework, moduleNames, fixtureCategories);
  const coverage = calculateCoverage(framework, mappings);

  // Create evidence records for each mapped control
  const evidenceRecords: EvidenceRecord[] = [];

  for (const mapping of mappings) {
    // Find the best category score for this control
    const relevantCategories = mapping.fixtureCategories.length > 0
      ? mapping.fixtureCategories
      : Object.keys(result.categoryScores);

    let bestScore = 0;
    let bestCategory = '';
    for (const cat of relevantCategories) {
      const score = result.categoryScores[cat] ?? 0;
      if (score > bestScore) {
        bestScore = score;
        bestCategory = cat;
      }
    }

    if (bestCategory) {
      evidenceRecords.push(
        createBenchmarkEvidence(
          mapping.controlId,
          framework.id,
          bestCategory,
          bestScore,
          result.suiteId,
        ),
      );
    }
  }

  return {
    framework,
    benchmarkSuiteId: result.suiteId,
    coverage,
    evidenceRecords,
    controlMappings: mappings,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Generate a full compliance report from benchmark results across multiple frameworks.
 */
export function generateBenchmarkComplianceReport(
  result: BenchmarkResult,
  frameworks: readonly ComplianceFramework[],
): BenchmarkComplianceReport {
  const frameworkResults: BenchmarkEvidenceResult[] = [];
  let totalControls = 0;
  let coveredControls = 0;

  for (const fw of frameworks) {
    const evidence = benchmarkToEvidence(result, fw);
    frameworkResults.push(evidence);
    totalControls += fw.controls.length;
    coveredControls += evidence.controlMappings.length;
  }

  const overallScore = totalControls > 0
    ? Math.round((coveredControls / totalControls) * 10000) / 100
    : 0;

  return {
    frameworks: frameworkResults,
    overallScore,
    totalControls,
    coveredControls,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Format a benchmark compliance report as markdown.
 */
export function formatBenchmarkComplianceReport(
  report: BenchmarkComplianceReport,
): string {
  const lines: string[] = [
    '# Benchmark Compliance Evidence Report',
    '',
    `**Overall Coverage**: ${report.overallScore}%`,
    `**Total Controls**: ${report.totalControls}`,
    `**Covered Controls**: ${report.coveredControls}`,
    `**Generated**: ${report.generatedAt}`,
    '',
  ];

  for (const fw of report.frameworks) {
    lines.push(`## ${fw.framework.name}`, '');
    lines.push(`- **Coverage**: ${fw.coverage}%`);
    lines.push(`- **Evidence Records**: ${fw.evidenceRecords.length}`);
    lines.push(`- **Mapped Controls**: ${fw.controlMappings.length}`);
    lines.push('');
  }

  return lines.join('\n');
}
