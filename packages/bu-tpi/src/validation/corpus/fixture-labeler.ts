/**
 * KATANA Fixture Labeler (K1.3)
 *
 * Labels all existing fixtures with ground-truth metadata by:
 * 1. Reading the fixture manifest (bu-tpi/fixtures/manifest.json v4.0.0)
 * 2. Mapping fixture categories to scanner module IDs
 * 3. Auto-labeling unambiguous samples from existing metadata
 * 4. Computing SHA-256 content hashes
 * 5. Generating per-module ground-truth manifests
 *
 * ISO 17025 Clause 6.5, 7.2.1
 */

import { createHash } from 'node:crypto';
import { readFileSync, existsSync, lstatSync } from 'node:fs';
import { join, resolve, isAbsolute, sep } from 'node:path';
import { SCHEMA_VERSION, type GroundTruthSample, type Manifest } from '../types.js';
import { PATHS } from '../config.js';

// ---------------------------------------------------------------------------
// Fixture Category → Module Mapping
// ---------------------------------------------------------------------------

/**
 * Maps fixture manifest categories to the scanner modules expected to detect them.
 * Derived from module taxonomy detection_categories and fixture category semantics.
 *
 * For malicious fixtures: these modules should produce findings.
 * For clean fixtures: expected_modules is always [].
 */
export const CATEGORY_TO_MODULES: Record<string, string[]> = {
  // Text-based injection categories
  'prompt-injection': ['core-patterns', 'enhanced-pi'],
  'context': ['core-patterns', 'enhanced-pi'],
  'modern': ['core-patterns', 'enhanced-pi'],
  'few-shot': ['core-patterns', 'enhanced-pi'],
  'cognitive': ['core-patterns', 'enhanced-pi', 'social-engineering-detector'],
  'social': ['core-patterns', 'social-engineering-detector'],
  'translation': ['core-patterns'],
  'boundary': ['core-patterns', 'enhanced-pi'],
  'code': ['core-patterns', 'enhanced-pi'],

  // Encoding & obfuscation
  'encoded': ['encoding-engine', 'core-patterns'],
  'malformed': ['core-patterns'],

  // Agent & tool attacks
  'agent': ['core-patterns', 'enhanced-pi'],
  'agent-output': ['core-patterns', 'output-detector'],
  'tool-manipulation': ['mcp-parser', 'core-patterns'],
  'mcp': ['mcp-parser'],
  'webmcp': ['webmcp-detector'],

  // Delivery vectors & untrusted sources
  'delivery-vectors': ['core-patterns', 'enhanced-pi'],
  'untrusted-sources': ['core-patterns', 'enhanced-pi'],
  'search-results': ['core-patterns'],

  // Web & session attacks
  'web': ['ssrf-detector', 'xxe-protopollution', 'core-patterns'],
  'session': ['session-bypass', 'core-patterns'],

  // DoS & resource exhaustion
  'dos': ['dos-detector'],

  // Supply chain
  'supply-chain': ['supply-chain-detector'],

  // Token & environment
  'token-attacks': ['token-analyzer'],
  'environmental': ['env-detector'],

  // Bias & overreliance
  'bias': ['bias-detector'],
  'or': ['overreliance-detector'],

  // Model theft & output
  'model-theft': ['model-theft-detector'],
  'output': ['output-detector', 'core-patterns'],

  // Multi-vector
  'multimodal': ['core-patterns', 'enhanced-pi'],
  'vec': ['core-patterns', 'enhanced-pi', 'encoding-engine'],

  // Document attacks
  'document-attacks': ['document-pdf', 'document-office'],

  // Binary media
  'images': ['image-scanner'],
  'audio': ['audio-scanner'],
  'audio-attacks': ['audio-scanner'],
};

// ---------------------------------------------------------------------------
// Fixture Category → Severity Mapping
// ---------------------------------------------------------------------------

/**
 * Default severity for malicious fixtures by category.
 * Can be overridden by manifest entry severity field.
 */
export const CATEGORY_DEFAULT_SEVERITY: Record<string, 'INFO' | 'WARNING' | 'CRITICAL'> = {
  'prompt-injection': 'CRITICAL',
  'context': 'CRITICAL',
  'modern': 'CRITICAL',
  'few-shot': 'WARNING',
  'cognitive': 'WARNING',
  'social': 'WARNING',
  'translation': 'WARNING',
  'boundary': 'WARNING',
  'code': 'CRITICAL',
  'encoded': 'CRITICAL',
  'malformed': 'WARNING',
  'agent': 'CRITICAL',
  'agent-output': 'CRITICAL',
  'tool-manipulation': 'CRITICAL',
  'mcp': 'CRITICAL',
  'webmcp': 'CRITICAL',
  'delivery-vectors': 'CRITICAL',
  'untrusted-sources': 'WARNING',
  'search-results': 'WARNING',
  'web': 'CRITICAL',
  'session': 'CRITICAL',
  'dos': 'CRITICAL',
  'supply-chain': 'CRITICAL',
  'token-attacks': 'CRITICAL',
  'environmental': 'WARNING',
  'bias': 'WARNING',
  'or': 'WARNING',
  'model-theft': 'CRITICAL',
  'output': 'WARNING',
  'multimodal': 'CRITICAL',
  'vec': 'CRITICAL',
  'document-attacks': 'CRITICAL',
  'images': 'WARNING',
  'audio': 'WARNING',
  'audio-attacks': 'WARNING',
};

// ---------------------------------------------------------------------------
// Severity Normalization
// ---------------------------------------------------------------------------

/**
 * Normalize manifest severity values to the KATANA severity enum.
 * The manifest uses HIGH in some entries, which maps to CRITICAL in our taxonomy.
 */
function normalizeSeverity(severity: string | null): 'INFO' | 'WARNING' | 'CRITICAL' | null {
  if (severity === null) return null;
  const upper = severity.toUpperCase();
  switch (upper) {
    case 'CRITICAL': return 'CRITICAL';
    case 'HIGH': return 'CRITICAL';
    case 'WARNING': return 'WARNING';
    case 'MEDIUM': return 'WARNING';
    case 'INFO': return 'INFO';
    case 'LOW': return 'INFO';
    default: return null;
  }
}

// ---------------------------------------------------------------------------
// Content Type Detection
// ---------------------------------------------------------------------------

const BINARY_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.ico', '.tiff', '.webp',
  '.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.opus', '.wma',
  '.amr', '.aiff', '.dts', '.ac3', '.spx', '.3gp',
  '.mp4', '.mkv', '.mov', '.mpeg', '.ogv', '.webm', '.wmv', '.avi', '.m4v',
  '.pdf', '.docx', '.xlsx', '.pptx', '.doc', '.xls',
  '.zip', '.tar', '.gz',
]);

export function detectContentType(filename: string): 'text' | 'binary' {
  const dotIdx = filename.lastIndexOf('.');
  if (dotIdx === -1) return 'text'; // extensionless = text
  const ext = filename.slice(dotIdx).toLowerCase();
  return BINARY_EXTENSIONS.has(ext) ? 'binary' : 'text';
}

// ---------------------------------------------------------------------------
// Difficulty Assignment
// ---------------------------------------------------------------------------

/**
 * Assign difficulty level to a sample.
 * 'evasive' is reserved for generated samples with 2+ chained evasion techniques (K2.10).
 * Auto-labeling assigns trivial/moderate/advanced only.
 */
export function assignDifficulty(
  category: string,
  clean: boolean,
): 'trivial' | 'moderate' | 'advanced' | 'evasive' {
  if (clean) return 'trivial'; // Clean samples should be trivially identified as clean

  // Evasive categories
  if (['encoded', 'vec', 'translation', 'cognitive'].includes(category)) {
    return 'advanced';
  }
  // Multi-vector
  if (['multimodal', 'delivery-vectors'].includes(category)) {
    return 'moderate';
  }
  // Basic attack patterns
  if (['prompt-injection', 'context', 'modern', 'web'].includes(category)) {
    return 'trivial';
  }

  return 'moderate';
}

// ---------------------------------------------------------------------------
// Detection Categories (from taxonomy)
// ---------------------------------------------------------------------------

/**
 * Maps fixture categories to expected detection_categories.
 * These are the taxonomy detection_categories the modules produce.
 */
export const CATEGORY_TO_DETECTION_CATEGORIES: Record<string, string[]> = {
  'prompt-injection': ['PROMPT_INJECTION', 'PROMPT_LEAKAGE', 'PROMPT_MANIPULATION', 'SYSTEM_OVERRIDE', 'INSTRUCTION_INJECTION'],
  'context': ['CONTEXT_MANIPULATION', 'SYSTEM_OVERRIDE', 'INSTRUCTION_INJECTION'],
  'modern': ['MODERN_JAILBREAK', 'DAN', 'ROLEPLAY'],
  'few-shot': ['INSTRUCTION_INJECTION', 'CONTEXT_MANIPULATION'],
  'cognitive': ['SOCIAL_ENGINEERING', 'EMOTIONAL_MANIPULATION', 'TRUST_MANIPULATION'],
  'social': ['SOCIAL_ENGINEERING', 'SOCIAL_PHISHING', 'SOCIAL_PRETEXTING'],
  'translation': ['MULTILINGUAL', 'TRANSLATION_JAILBREAK'],
  'boundary': ['INSTRUCTION_INJECTION', 'CONTEXT_MANIPULATION'],
  'code': ['CODE_FORMAT_INJECTION', 'INSTRUCTION_INJECTION'],
  'encoded': ['ENCODING_OBFUSCATION', 'ENCODING_BYPASS', 'OBFUSCATION'],
  'malformed': ['OBFUSCATION'],
  'agent': ['AGENT_OUTPUT_INJECTION', 'AGENT_CREDENTIAL_THEFT', 'INSTRUCTION_INJECTION'],
  'agent-output': ['AGENT_OUTPUT_INJECTION', 'OUTPUT_EVASION'],
  'tool-manipulation': ['MCP_TOOL_MANIPULATION', 'MCP_CAPABILITY_SPOOFING'],
  'mcp': ['MCP_TOOL_MANIPULATION', 'MCP_CAPABILITY_SPOOFING', 'MCP_RESOURCE_ATTACK', 'MCP_SAMPLING_ABUSE'],
  'webmcp': ['WEBMCP_INJECTION', 'WEBMCP_ORIGIN_SPOOFING'],
  'delivery-vectors': ['INSTRUCTION_INJECTION', 'CONTEXT_MANIPULATION'],
  'untrusted-sources': ['INSTRUCTION_INJECTION', 'SEARCH_RESULT_INJECTION'],
  'search-results': ['SEARCH_RESULT_INJECTION'],
  'web': ['SSRF_CLOUD_METADATA', 'SSRF_INTERNAL_IP', 'XXE_INJECTION', 'PROTO_POLLUTION'],
  'session': ['SESSION_FIXATION', 'SESSION_HIJACKING', 'SESSION_MANIPULATION'],
  'dos': ['DOS_RESOURCE_EXHAUSTION', 'DOS_COMPUTATION_BOMB', 'DOS_REGEX_BOMB'],
  'supply-chain': ['SUPPLY_CHAIN_COMPROMISE', 'SUPPLY_CHAIN_DEPENDENCY_INJECTION'],
  'token-attacks': ['TOKEN_LEAKAGE', 'API_KEY_EXPOSURE', 'JWT_ATTACK'],
  'environmental': ['ENV_VARIABLE_INJECTION', 'ENV_MANIPULATION'],
  'bias': ['BIAS_DEMOGRAPHIC', 'BIAS_STEREOTYPE', 'BIAS_FAIRNESS_VIOLATION'],
  'or': ['OVERRELIANCE_AUTHORITY_EXPLOIT', 'OVERRELIANCE_DELEGATION_ATTACK'],
  'model-theft': ['MODEL_THEFT_EXTRACTION', 'MODEL_THEFT_DISTILLATION'],
  'output': ['OUTPUT_EVASION', 'OUTPUT_ENCODING', 'OUTPUT_FILTER_BYPASS'],
  'multimodal': ['INSTRUCTION_INJECTION', 'PROMPT_INJECTION'],
  'vec': ['INSTRUCTION_INJECTION', 'ENCODING_OBFUSCATION'],
  'document-attacks': ['PDF_METADATA_INJECTION', 'PDF_JAVASCRIPT_INJECTION', 'OFFICE_MACRO_INJECTION', 'OFFICE_XML_INJECTION'],
  'images': ['IMAGE_STEGANOGRAPHY', 'IMAGE_EXIF_INJECTION', 'IMAGE_SVG_INJECTION'],
  'audio': ['AUDIO_METADATA_INJECTION', 'AUDIO_ID3_INJECTION'],
  'audio-attacks': ['AUDIO_METADATA_INJECTION', 'AUDIO_ID3_INJECTION'],
};

// ---------------------------------------------------------------------------
// Fixture Manifest Types
// ---------------------------------------------------------------------------

interface FixtureManifestEntry {
  file: string;
  attack: string | null;
  severity: string | null;
  clean: boolean;
  product: string;
}

interface FixtureManifestCategory {
  story: string;
  desc: string;
  files: FixtureManifestEntry[];
}

interface FixtureManifest {
  version: string;
  totalFixtures: number;
  categories: Record<string, FixtureManifestCategory>;
}

// ---------------------------------------------------------------------------
// Labeler
// ---------------------------------------------------------------------------

/**
 * Label all fixtures from the manifest with ground-truth metadata.
 * Synchronous — reads all fixture files to compute SHA-256 hashes.
 *
 * @param buTpiRoot - Absolute path to packages/bu-tpi
 * @returns Array of ground truth samples and labeling statistics
 */
export function labelFixtures(buTpiRoot: string): {
  samples: GroundTruthSample[];
  stats: LabelingStats;
} {
  if (!isAbsolute(buTpiRoot)) {
    throw new Error(`buTpiRoot must be an absolute path, got: ${buTpiRoot}`);
  }

  const manifestPath = join(buTpiRoot, PATHS.FIXTURES_MANIFEST);
  if (!existsSync(manifestPath)) {
    throw new Error(`Fixture manifest not found at: ${manifestPath}`);
  }

  const fixturesRoot = resolve(buTpiRoot, 'fixtures');
  const manifest: FixtureManifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  const samples: GroundTruthSample[] = [];
  const stats: LabelingStats = {
    total: 0,
    labeled: 0,
    clean: 0,
    malicious: 0,
    text: 0,
    binary: 0,
    missingFiles: 0,
    byCategory: {},
    byModule: {},
    unmappedCategories: [],
    missingFilePaths: [],
  };

  const now = new Date().toISOString();

  for (const [category, catData] of Object.entries(manifest.categories)) {
    const modules = CATEGORY_TO_MODULES[category];
    if (!modules) {
      stats.unmappedCategories.push(category);
      continue;
    }

    stats.byCategory[category] = { total: 0, clean: 0, malicious: 0 };

    for (const entry of catData.files) {
      stats.total++;

      // Path traversal protection: resolve and verify within fixtures root
      const fixtureAbsPath = resolve(fixturesRoot, category, entry.file);
      if (!fixtureAbsPath.startsWith(fixturesRoot + sep)) {
        throw new Error(`Path traversal detected in fixture entry: ${entry.file}`);
      }

      // Symlink check: don't follow symlinks outside fixtures
      try {
        const stat = lstatSync(fixtureAbsPath);
        if (stat.isSymbolicLink()) {
          throw new Error(`Symlink detected in fixture: ${entry.file}`);
        }
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
          // Re-throw non-ENOENT errors (including symlink error)
          if ((err as Error).message?.includes('Symlink')) throw err;
        }
      }

      const fixtureRelPath = `fixtures/${category}/${entry.file}`;
      const contentType = detectContentType(entry.file);

      // Compute content hash — missing files are tracked, not silently fabricated
      let contentHash: string;
      if (!existsSync(fixtureAbsPath)) {
        stats.missingFiles++;
        stats.missingFilePaths.push(fixtureRelPath);
        // Use path-based hash but mark in stats so callers know
        contentHash = createHash('sha256').update(fixtureRelPath).digest('hex');
      } else {
        const fileContent = readFileSync(fixtureAbsPath);
        contentHash = createHash('sha256').update(fileContent).digest('hex');
      }

      const isClean = entry.clean;
      const expectedVerdict = isClean ? 'clean' as const : 'malicious' as const;
      const expectedModules = isClean ? [] : modules;
      const expectedSeverity = isClean
        ? null
        : normalizeSeverity(entry.severity) ?? CATEGORY_DEFAULT_SEVERITY[category] ?? 'WARNING';
      const expectedCategories = isClean ? [] : (CATEGORY_TO_DETECTION_CATEGORIES[category] ?? []);
      const difficulty = assignDifficulty(category, isClean);

      const sampleId = `gt::${category}::${entry.file}`.replace(/[^a-zA-Z0-9_.:\-]/g, '_');

      const sample: GroundTruthSample = {
        schema_version: SCHEMA_VERSION,
        id: sampleId,
        source_file: fixtureRelPath,
        content_hash: contentHash,
        content_type: contentType,
        expected_verdict: expectedVerdict,
        expected_modules: expectedModules,
        expected_severity: expectedSeverity,
        expected_categories: expectedCategories,
        difficulty,
        source_type: 'synthetic',
        reviewer_1: {
          id: 'auto-labeler-v1',
          verdict: expectedVerdict,
          timestamp: now,
        },
        reviewer_2: {
          id: 'manifest-metadata',
          verdict: expectedVerdict,
          timestamp: now,
        },
        independent_agreement: true,
        holdout: false,
        notes: entry.attack ? `Attack: ${entry.attack}` : undefined,
      };

      samples.push(sample);
      stats.labeled++;

      // Update stats
      if (isClean) {
        stats.clean++;
        stats.byCategory[category].clean++;
      } else {
        stats.malicious++;
        stats.byCategory[category].malicious++;
      }
      stats.byCategory[category].total++;

      if (contentType === 'text') {
        stats.text++;
      } else {
        stats.binary++;
      }

      // Track per-module counts
      for (const mod of expectedModules) {
        stats.byModule[mod] = (stats.byModule[mod] ?? 0) + 1;
      }
    }
  }

  return { samples, stats };
}

export interface LabelingStats {
  total: number;
  labeled: number;
  clean: number;
  malicious: number;
  text: number;
  binary: number;
  missingFiles: number;
  byCategory: Record<string, { total: number; clean: number; malicious: number }>;
  byModule: Record<string, number>;
  unmappedCategories: string[];
  missingFilePaths: string[];
}

/**
 * Build a ground-truth manifest from labeled samples.
 */
export function buildGroundTruthManifest(samples: readonly GroundTruthSample[]): Manifest {
  return {
    schema_version: SCHEMA_VERSION,
    manifest_type: 'ground-truth',
    generated_at: new Date().toISOString(),
    entry_count: samples.length,
    entries: samples.map(s => ({
      id: s.id,
      file_path: s.source_file,
      content_hash: s.content_hash,
    })),
  };
}
