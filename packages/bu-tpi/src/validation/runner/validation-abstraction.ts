/**
 * KATANA Validation Abstraction Layer (K3.5)
 *
 * Wraps the four scanner entry points behind a unified interface
 * for the validation runner. Routes samples to the correct entry
 * point based on content_type and sample metadata.
 *
 * Entry points:
 * 1. scan(text)           — text content, full pipeline
 * 2. scanBinary(buffer)   — binary content (audio, image, PDF, Office)
 * 3. scanSession(content) — multi-turn session data
 * 4. scanToolOutput(type, output) — tool result injection
 *
 * ISO 17025 Clause 7.2.2: Method validation
 */

import {
  SCHEMA_VERSION,
  type GroundTruthSample,
  type GeneratedSample,
  type ValidationResult,
} from '../types.js';

// ---------------------------------------------------------------------------
// Scanner Imports (lazy-loaded for test isolation)
// ---------------------------------------------------------------------------

/** Lazy-loaded scan function */
async function getScan(): Promise<typeof import('../../scanner.js')> {
  return import('../../scanner.js');
}

/** Lazy-loaded binary scan function */
async function getBinaryScan(): Promise<typeof import('../../scanner-binary.js')> {
  return import('../../scanner-binary.js');
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Unified sample for validation — covers both ground-truth and generated */
export interface ValidationSample {
  id: string;
  content: string;
  content_type: 'text' | 'binary';
  expected_verdict: 'clean' | 'malicious';
  expected_modules: string[];
  expected_severity: string | null;
  expected_categories: string[];
  variation_type?: string;
}

/** Individual finding from scan result */
export interface ScanFinding {
  category: string;
  severity: string;
  engine: string;
  source?: string;
}

/** Scan result from any entry point, normalized */
interface NormalizedScanResult {
  verdict: 'clean' | 'malicious';
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | null;
  categories: string[];
  findings_count: number;
  findings: ScanFinding[];
  elapsed_ms: number;
}

// ---------------------------------------------------------------------------
// Entry Point Detection
// ---------------------------------------------------------------------------

type EntryPoint = 'scan' | 'scanBinary' | 'scanSession' | 'scanToolOutput';
const BINARY_FILE_PREFIX = '__BINARY_FILE__:';
const CORE_PATTERNS_ENGINE_ALIASES = new Set([
  'Prompt Injection',
  'Jailbreak',
  'TPI',
  'Encoding',
  'Unicode',
]);
const CORE_PATTERNS_EXCLUDED_SOURCES = new Set([
  'TPI-S11',
]);

export function matchesModuleFinding(finding: ScanFinding, moduleId: string): boolean {
  if (finding.engine === moduleId || finding.category === moduleId) {
    return true;
  }

  if (moduleId === 'core-patterns') {
    return CORE_PATTERNS_ENGINE_ALIASES.has(finding.engine)
      && !CORE_PATTERNS_EXCLUDED_SOURCES.has(finding.source ?? '');
  }

  return false;
}

/**
 * Determine which scanner entry point to use based on sample metadata.
 */
export function detectEntryPoint(sample: ValidationSample): EntryPoint {
  if (sample.content_type === 'binary') {
    return 'scanBinary';
  }

  // Multi-turn: JSON content with turns array
  if (sample.variation_type === 'multi-turn') {
    return 'scanSession';
  }

  // Indirect injection: JSON tool output
  if (sample.variation_type === 'indirect-injection') {
    return 'scanToolOutput';
  }

  return 'scan';
}

// ---------------------------------------------------------------------------
// Validation Execution
// ---------------------------------------------------------------------------

/**
 * Run a single sample through the appropriate scanner entry point
 * and produce a validation result.
 */
export async function validateSample(
  sample: ValidationSample,
  moduleId: string,
): Promise<ValidationResult> {
  const start = performance.now();
  const entryPoint = detectEntryPoint(sample);
  const normalized = await executeScan(entryPoint, sample);
  const elapsed = performance.now() - start;

  // Filter findings to only those from the specific module under test.
  // Without this filter, a finding from module A would be credited to
  // module B if both share a test sample — producing false TPs.
  const moduleFindings = normalized.findings.filter(f => matchesModuleFinding(f, moduleId));
  const moduleCategories = [...new Set(moduleFindings.map(f => f.category))];
  const moduleSeverity = moduleFindings.length > 0
    ? getMaxSeverity(moduleFindings.map(f => f.severity))
    : null;

  const moduleDetected = moduleFindings.length > 0;
  const actualVerdict = moduleDetected ? 'malicious' : 'clean';

  return {
    schema_version: SCHEMA_VERSION,
    sample_id: sample.id,
    module_id: moduleId,
    expected_verdict: sample.expected_verdict,
    actual_verdict: actualVerdict,
    correct: sample.expected_verdict === actualVerdict,
    actual_severity: moduleSeverity,
    actual_categories: moduleCategories,
    actual_findings_count: moduleFindings.length,
    elapsed_ms: elapsed,
  };
}

/**
 * Execute the appropriate scan based on entry point.
 */
async function executeScan(
  entryPoint: EntryPoint,
  sample: ValidationSample,
): Promise<NormalizedScanResult> {
  switch (entryPoint) {
    case 'scan':
      return executeTextScan(sample.content);

    case 'scanBinary':
      return executeBinaryScan(sample.content);

    case 'scanSession':
      return executeSessionScan(sample.content);

    case 'scanToolOutput':
      return executeToolOutputScan(sample.content);
  }
}

/**
 * Execute text scan and normalize results.
 */
async function executeTextScan(content: string): Promise<NormalizedScanResult> {
  const start = performance.now();
  const scanner = await getScan();
  const result = scanner.scan(content);
  const elapsed = performance.now() - start;

  return {
    verdict: result.verdict === 'BLOCK' ? 'malicious' : 'clean',
    severity: result.findings.length > 0
      ? getMaxSeverity(result.findings.map(f => f.severity))
      : null,
    categories: [...new Set(result.findings.map(f => f.category))],
    findings_count: result.findings.length,
    findings: result.findings.map(f => ({
      category: f.category,
      severity: f.severity,
      engine: f.engine,
      source: f.source,
    })),
    elapsed_ms: elapsed,
  };
}

/**
 * Execute binary scan and normalize results.
 * Binary samples in the validation corpus use JSON metadata representation.
 */
async function executeBinaryScan(content: string): Promise<NormalizedScanResult> {
  const start = performance.now();

  if (content.startsWith(BINARY_FILE_PREFIX)) {
    const filePath = content.slice(BINARY_FILE_PREFIX.length);
    const [{ readFile }, { basename }, binaryScanner] = await Promise.all([
      import('node:fs/promises'),
      import('node:path'),
      getBinaryScan(),
    ]);

    const buffer = await readFile(filePath);
    const result = await binaryScanner.scanBinary(buffer, basename(filePath));
    const elapsed = performance.now() - start;

    return {
      verdict: result.verdict === 'BLOCK' ? 'malicious' : 'clean',
      severity: result.findings.length > 0
        ? getMaxSeverity(result.findings.map(f => f.severity))
        : null,
      categories: [...new Set(result.findings.map(f => f.category))],
      findings_count: result.findings.length,
      findings: result.findings.map(f => ({
        category: f.category,
        severity: f.severity,
        engine: f.engine,
        source: f.source,
      })),
      elapsed_ms: elapsed,
    };
  }

  // Binary variations in the KATANA corpus use JSON text representation
  // of binary metadata (EXIF, ID3, PDF metadata, etc.) because the
  // variation generators produce text-based metadata injection payloads.
  // Real binary file scanning via scanBinary() is used in production;
  // here we scan the text representation for pattern detection.
  const scanner = await getScan();
  const result = scanner.scan(content);
  const elapsed = performance.now() - start;

  return {
    verdict: result.verdict === 'BLOCK' ? 'malicious' : 'clean',
    severity: result.findings.length > 0
      ? getMaxSeverity(result.findings.map(f => f.severity))
      : null,
    categories: [...new Set(result.findings.map(f => f.category))],
    findings_count: result.findings.length,
    findings: result.findings.map(f => ({
      category: f.category,
      severity: f.severity,
      engine: f.engine,
      source: f.source,
    })),
    elapsed_ms: elapsed,
  };
}

/**
 * Execute session scan and normalize results.
 */
async function executeSessionScan(content: string): Promise<NormalizedScanResult> {
  const start = performance.now();
  const scanner = await getScan();
  const result = scanner.scanSession(content);
  const elapsed = performance.now() - start;

  return {
    verdict: result.verdict === 'BLOCK' ? 'malicious' : 'clean',
    severity: result.findings.length > 0
      ? getMaxSeverity(result.findings.map(f => f.severity))
      : null,
    categories: [...new Set(result.findings.map(f => f.category))],
    findings_count: result.findings.length,
    findings: result.findings.map(f => ({
      category: f.category,
      severity: f.severity,
      engine: f.engine,
      source: f.source,
    })),
    elapsed_ms: elapsed,
  };
}

/**
 * Execute tool output scan and normalize results.
 */
async function executeToolOutputScan(content: string): Promise<NormalizedScanResult> {
  const start = performance.now();
  const scanner = await getScan();

  // Parse tool output JSON to extract tool type and content
  let toolType = 'WebFetch';
  let outputContent = content;

  try {
    const parsed = JSON.parse(content);
    if (parsed.tool_type) toolType = String(parsed.tool_type);
    if (parsed.content) outputContent = String(parsed.content);
    else if (parsed.output) outputContent = String(parsed.output);
    else if (parsed.results) outputContent = JSON.stringify(parsed.results);
  } catch {
    // Not JSON — scan raw content
  }

  const result = scanner.scanToolOutput(toolType, outputContent);
  const elapsed = performance.now() - start;

  return {
    verdict: result.verdict === 'BLOCK' ? 'malicious' : 'clean',
    severity: result.findings.length > 0
      ? getMaxSeverity(result.findings.map(f => f.severity))
      : null,
    categories: [...new Set(result.findings.map(f => f.category))],
    findings_count: result.findings.length,
    findings: result.findings.map(f => ({
      category: f.category,
      severity: f.severity,
      engine: f.engine,
    })),
    elapsed_ms: elapsed,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SEVERITY_RANK: Record<string, number> = {
  INFO: 1,
  WARNING: 2,
  CRITICAL: 3,
};

function getMaxSeverity(
  severities: string[],
): 'INFO' | 'WARNING' | 'CRITICAL' | null {
  if (severities.length === 0) return null;
  let max = 'INFO';
  for (const s of severities) {
    if ((SEVERITY_RANK[s] ?? 0) > (SEVERITY_RANK[max] ?? 0)) {
      max = s;
    }
  }
  return max as 'INFO' | 'WARNING' | 'CRITICAL';
}

/**
 * Convert a GroundTruthSample to a ValidationSample.
 */
export function toValidationSample(
  sample: GroundTruthSample,
  content: string,
): ValidationSample {
  return {
    id: sample.id,
    content,
    content_type: sample.content_type,
    expected_verdict: sample.expected_verdict,
    expected_modules: sample.expected_modules,
    expected_severity: sample.expected_severity,
    expected_categories: sample.expected_categories,
  };
}

/**
 * Convert a GeneratedSample to a ValidationSample.
 */
export function generatedToValidationSample(
  sample: GeneratedSample,
): ValidationSample {
  return {
    id: sample.id,
    content: sample.content,
    content_type: sample.content_type,
    expected_verdict: sample.expected_verdict,
    expected_modules: sample.expected_modules,
    expected_severity: null,
    expected_categories: [],
    variation_type: sample.variation_type,
  };
}
