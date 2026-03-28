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
  'output-detector',
  'session-bypass',
]);
const CORE_PATTERNS_STRESS_ENGINE_ALIASES = new Set([
  'encoding-engine',
  'edgefuzz-detector',
  'dos-detector',
  'enhanced-pi',
  'webmcp-detector',
]);
const CORE_PATTERNS_EXCLUDED_SOURCES = new Set([
  'TPI-S11',
]);

export function matchesModuleFinding(
  finding: ScanFinding,
  moduleId: string,
  variationType?: string,
): boolean {
  if (finding.engine === moduleId || finding.category === moduleId) {
    return true;
  }

  if (moduleId === 'core-patterns') {
    const aliases = variationType?.startsWith('stress:')
      ? new Set([...CORE_PATTERNS_ENGINE_ALIASES, ...CORE_PATTERNS_STRESS_ENGINE_ALIASES])
      : CORE_PATTERNS_ENGINE_ALIASES;
    return aliases.has(finding.engine)
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

  if (
    sample.id.includes('::session::')
    || sample.expected_modules.includes('session-bypass')
  ) {
    return 'scanSession';
  }

  // Multi-turn: JSON content with turns array
  if (sample.variation_type?.startsWith('multi-turn')) {
    return 'scanSession';
  }

  // Indirect injection: JSON tool output
  if (sample.variation_type?.startsWith('indirect-injection')) {
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
  const moduleFindings = normalized.findings.filter(f => matchesModuleFinding(f, moduleId, sample.variation_type));
  const moduleCategories = [...new Set(moduleFindings.map(f => f.category))];
  const moduleSeverity = moduleFindings.length > 0
    ? getMaxSeverity(moduleFindings.map(f => f.severity))
    : null;

  const moduleDetected = moduleFindings.some((finding) => finding.severity !== 'INFO');
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
  const embeddedPayloads = extractEmbeddedJsonFragments(content);
  const embeddedResults = embeddedPayloads
    .filter(fragment => fragment !== content.trim())
    .map(fragment => scanner.scan(fragment));
  const elapsed = performance.now() - start;

  return mergeNormalizedResults(
    [
      normalizeFindings(result),
      ...embeddedResults.map(normalizeFindings),
    ],
    elapsed,
  );
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
  const sessionPayload = extractEmbeddedSessionPayload(content) ?? content;
  const result = scanner.scanSession(sessionPayload);
  const elapsed = performance.now() - start;

  return mergeNormalizedResults([normalizeFindings(result)], elapsed);
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
    else if (parsed.tool) toolType = String(parsed.tool);

    const extractedFragments = extractToolOutputStrings(parsed);
    if (extractedFragments.length > 0) {
      outputContent = [content, ...extractedFragments].join('\n\n');
    } else if (parsed.content) {
      outputContent = String(parsed.content);
    } else if (parsed.output) {
      outputContent = String(parsed.output);
    } else if (parsed.results) {
      outputContent = JSON.stringify(parsed.results);
    }
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

function normalizeFindings(
  result: {
    verdict: 'BLOCK' | 'ALLOW';
    findings: Array<{
      category: string;
      severity: string;
      engine: string;
      source?: string;
    }>;
  },
): NormalizedScanResult {
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
    elapsed_ms: 0,
  };
}

function mergeNormalizedResults(
  results: NormalizedScanResult[],
  elapsedMs: number,
): NormalizedScanResult {
  const mergedFindings = dedupeFindings(
    results.flatMap(result => result.findings),
  );

  return {
    verdict: mergedFindings.some(f => f.severity !== 'INFO') ? 'malicious' : 'clean',
    severity: mergedFindings.length > 0
      ? getMaxSeverity(mergedFindings.map(f => f.severity))
      : null,
    categories: [...new Set(mergedFindings.map(f => f.category))],
    findings_count: mergedFindings.length,
    findings: mergedFindings,
    elapsed_ms: elapsedMs,
  };
}

function dedupeFindings(findings: ScanFinding[]): ScanFinding[] {
  const seen = new Set<string>();
  const deduped: ScanFinding[] = [];

  for (const finding of findings) {
    const key = [
      finding.engine,
      finding.source ?? '',
      finding.category,
      finding.severity,
    ].join('|');

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(finding);
  }

  return deduped;
}

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

function extractToolOutputStrings(
  value: unknown,
  fragments: string[] = [],
  depth = 0,
): string[] {
  if (depth > 6) return fragments;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      fragments.push(trimmed);
    }
    return fragments;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      extractToolOutputStrings(item, fragments, depth + 1);
    }
    return fragments;
  }

  if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      if (typeof nested === 'string') {
        const trimmed = nested.trim();
        if (trimmed.length > 0) {
          fragments.push(`${key}: ${trimmed}`);
        }
      } else {
        extractToolOutputStrings(nested, fragments, depth + 1);
      }
    }
  }

  return fragments;
}

function extractEmbeddedSessionPayload(content: string): string | null {
  const fragment = extractEmbeddedJsonFragments(
    content,
    (value): value is { turns: unknown[] } =>
      !!value
      && typeof value === 'object'
      && Array.isArray((value as { turns?: unknown[] }).turns),
  )[0];

  return fragment ?? null;
}

function extractEmbeddedJsonFragments(
  content: string,
  predicate?: (value: unknown) => boolean,
): string[] {
  const fragments = new Set<string>();
  const trimmed = content.trim();

  if (trimmed.length > 0) {
    const parsed = tryParseJson(trimmed);
    if (parsed !== null && (!predicate || predicate(parsed))) {
      fragments.add(trimmed);
    }
  }

  for (let index = 0; index < content.length; index++) {
    const ch = content[index];
    if (ch !== '{' && ch !== '[') {
      continue;
    }

    const fragment = extractBalancedJsonFragment(content, index);
    if (!fragment) {
      continue;
    }

    const parsed = tryParseJson(fragment);
    if (parsed === null) {
      continue;
    }

    if (predicate && !predicate(parsed)) {
      continue;
    }

    fragments.add(fragment.trim());
    if (fragments.size >= 4) {
      break;
    }
  }

  return [...fragments];
}

function tryParseJson(fragment: string): unknown | null {
  try {
    return JSON.parse(fragment);
  } catch {
    return null;
  }
}

function extractBalancedJsonFragment(content: string, startIndex: number): string | null {
  const opener = content[startIndex];
  const expectedCloser = opener === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = startIndex; index < content.length; index++) {
    const ch = content[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (ch === '\\') {
      escaped = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (ch === opener) {
      depth++;
      continue;
    }

    if (ch === expectedCloser) {
      depth--;
      if (depth === 0) {
        return content.slice(startIndex, index + 1);
      }
    }
  }

  return null;
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
