/**
 * TPI Security Test Lab — Type Definitions
 *
 * Core types for the prompt injection scanner engine.
 * All scanner patterns, findings, and fixture metadata are strictly typed.
 */

// ---------------------------------------------------------------------------
// Severity & Verdicts
// ---------------------------------------------------------------------------

export const SEVERITY = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL',
} as const;

export type Severity = (typeof SEVERITY)[keyof typeof SEVERITY];

export type Verdict = 'BLOCK' | 'ALLOW';

// ---------------------------------------------------------------------------
// Scanner Findings
// ---------------------------------------------------------------------------

export interface Finding {
  category: string;
  severity: Severity;
  description: string;
  match: string;
  source: 'current' | string; // 'current' or TPI story ID
  engine: string;
  pattern_name?: string;
  weight?: number;
  lang?: string;
}

export interface ScanResult {
  findings: Finding[];
  verdict: Verdict;
  elapsed: number;
  textLength: number;
  normalizedLength: number;
  counts: {
    critical: number;
    warning: number;
    info: number;
  };
}

// ---------------------------------------------------------------------------
// Scanner Patterns
// ---------------------------------------------------------------------------

export interface RegexPattern {
  name: string;
  cat: string;
  sev: Severity;
  re: RegExp;
  desc: string;
  source?: string;
  weight?: number;
  lang?: string;
}

export interface CustomPattern {
  name: string;
  cat: string;
  sev: Severity;
  desc: string;
  source?: string;
  custom: string; // detector function key
}

export type ScannerPattern = RegexPattern | CustomPattern;

// ---------------------------------------------------------------------------
// Scanner Module System (S09: Pluggable Module Registry)
// ---------------------------------------------------------------------------

/**
 * Interface for pluggable scanner modules.
 * Each module encapsulates detection logic (patterns + custom detectors)
 * and can be registered/unregistered at runtime without modifying core scanner.
 */
export interface ScannerModule {
  /** Unique module identifier (e.g., 'core-patterns', 'mcp-parser') */
  name: string;
  /** Semantic version string */
  version: string;
  /** Human-readable description of what this module detects */
  description?: string;
  /** MIME types or content categories this module can scan */
  supportedContentTypes?: string[];
  /**
   * Scan input text and return findings.
   * @param text - Original input text
   * @param normalized - Normalized (NFKC, zero-width stripped) version
   * @returns Array of findings from this module
   */
  scan(text: string, normalized: string): Finding[];
  /** Total number of patterns in this module */
  getPatternCount(): number;
  /** Metadata about each pattern group in this module */
  getPatternGroups(): { name: string; count: number; source: string }[];
}

// ---------------------------------------------------------------------------
// Fixture Metadata
// ---------------------------------------------------------------------------

export interface FixtureFile {
  file: string;
  attack: string | null;
  severity: Severity | null;
  clean: boolean;
  product?: string;
  /** Speech-to-text transcript for audio fixtures (Story 12.1) */
  transcription?: string;
  /** Dual-layer audio attack descriptor: vocal content + metadata content (Story 12.1) */
  audioLayers?: {
    vocal: string;
    metadata: string;
  };
}

export interface FixtureCategory {
  story: string;
  desc: string;
  files: FixtureFile[];
}

export interface FixtureManifest {
  generated: string;
  version: string;
  description: string;
  company?: string;
  website?: string;
  products?: string[];
  totalFixtures?: number;
  categories: Record<string, FixtureCategory>;
}

// ---------------------------------------------------------------------------
// Binary Metadata (from serve.ts inspection)
// ---------------------------------------------------------------------------

export interface BinaryMetadata {
  format: string;
  magic: string;
  valid_jpeg?: boolean;
  valid_png?: boolean;
  valid_wav?: boolean;
  has_id3?: boolean;
  extracted_text?: string;
  polyglot?: string;
  warning?: string;
}

// ---------------------------------------------------------------------------
// Enhanced Binary Metadata Parsing (SCANNER-UPGRADE)
// ---------------------------------------------------------------------------

/**
 * A single metadata field extracted from a binary file
 */
export interface MetadataField {
  key: string;
  value: string;
  source: string; // e.g., "EXIF.UserComment", "ID3.TIT2", "PNG.tEXt"
}

/**
 * Result of parsing binary file metadata
 */
export interface BinaryParseResult {
  format: string;
  valid: boolean;
  fields: MetadataField[];
  warnings: string[];
  errors: string[];
}

/**
 * Extended scan result for binary files with metadata source tracking
 */
export interface BinaryScanResult extends ScanResult {
  metadata: {
    format: string;
    fieldCount: number;
    sources: string[]; // Which metadata areas were extracted (e.g., ["EXIF", "ID3"])
  };
}

export interface TextFixtureResponse {
  path: string;
  content: string;
  size: number;
}

export interface BinaryFixtureResponse {
  path: string;
  size: number;
  hex_preview: string;
  metadata: {
    format: string;
    fieldCount: number;
    sources: string[];
    verdict: 'ALLOW' | 'BLOCK';
    findingCount: number;
    valid_jpeg?: boolean;
    valid_png?: boolean;
    valid_wav?: boolean;
    has_id3?: boolean;
    extracted_text?: string;
    polyglot?: string;
    warning?: string;
  };
}

// ---------------------------------------------------------------------------
// Payload Catalog (UI)
// ---------------------------------------------------------------------------

export interface PayloadEntry {
  title: string;
  desc: string;
  status: 'current' | 'planned';
  story: string;
  example: string;
}

// ---------------------------------------------------------------------------
// Coverage Data (UI)
// ---------------------------------------------------------------------------

export interface CoverageEntry {
  category: string;
  pre: number;
  post: number;
  stories: string;
  gap: boolean;
}

// ---------------------------------------------------------------------------
// Test Suite (QA Tools)
// ---------------------------------------------------------------------------

export interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  duration_ms: number;
  output: string;
  required: boolean;
}

export interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration_ms: number;
}

export interface TestSuiteResult {
  summary: TestSummary;
  results: TestResult[];
  timestamp: string;
}

// ---------------------------------------------------------------------------
// OBL Behavioral Metrics (OBLITERATUS)
// ---------------------------------------------------------------------------

export type {
  BehavioralMetrics,
  DefenseRobustness,
  AlignmentImprint,
  TransferScore,
  ConceptGeometry,
  RefusalDepthProfile,
  AlignmentMethod,
  OBLAnalysisResult,
} from './behavioral-metrics/types.js';
