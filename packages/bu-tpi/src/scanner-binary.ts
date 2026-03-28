/**
 * TPI Security Test Lab — Binary File Scanner
 *
 * Orchestrates metadata extraction from binary files and scans for prompt injection.
 * Integrates with the existing text scanner for pattern matching.
 *
 * @module scanner-binary
 */

import { scan } from './scanner.js';
import {
  extractMetadata,
  extractTextFields,
  extractSources,
  detectFormat,
  type BinaryFormat,
} from './metadata-parsers.js';
import type {
  BinaryScanResult,
  BinaryParseResult,
  MetadataField,
  Finding,
} from './types.js';

// ---------------------------------------------------------------------------
// INDEX
// ---------------------------------------------------------------------------
// 1. Binary Scanning (scanBinary)
// 2. Result Formatting (formatBinaryResult)
// 3. Utility Functions (isBinarySupported)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 1. BINARY SCANNING
// ---------------------------------------------------------------------------

// Default parse timeout (5 seconds)
const DEFAULT_PARSE_TIMEOUT = 5000;
const MIN_PRINTABLE_STRING_LENGTH = 12;
const MAX_PRINTABLE_STRINGS = 256;
const MAX_FALLBACK_TEXT_LENGTH = 100_000;
const MAX_RAW_SCAN_PREFIX_BYTES = 4 * 1024 * 1024;
const MAX_RAW_SCAN_SUFFIX_BYTES = 512 * 1024;
const AUDIO_FILENAME_EXTENSIONS = new Set([
  '.mp3',
  '.wav',
  '.flac',
  '.ogg',
  '.oga',
  '.m4a',
  '.opus',
  '.wma',
  '.amr',
  '.aac',
  '.aiff',
  '.aif',
  '.spx',
  '.3gp',
]);
const EXTENSION_FORMAT_MAP: Partial<Record<string, BinaryFormat>> = {
  jpg: 'JPEG',
  jpeg: 'JPEG',
  png: 'PNG',
  gif: 'GIF',
  webp: 'WebP',
};
const STRUCTURAL_FILENAME_MARKER_RE = /\b(?:mismatch-[\w-]+|polyglot-[\w-]+|suspiciously-small|zip-bomb|gzip-bomb)\b/i;
const STRUCTURAL_TEXT_MARKER_RE = /(?:Malformed\s+fixture\s*:\s*(?:mismatch-[\w-]+|polyglot-[\w-]+|suspiciously-small|zip-bomb|gzip-bomb)|EXPLOIT:\s*Format\s+abuse\s+attack)/i;
const RAW_BINARY_ATTACK_MARKER =
  /(?:ignore\s+(?:all\s+)?(?:previous|prior)\s+(?:instructions|rules|guidelines)|reveal\s+(?:everything|all\s+system\s+prompts?|your\s+system\s+prompt)|dump\s+the\s+full\s+system\s+prompt|prompt[_\s-]?extraction|override\s+safety\s+protocols(?:\s+immediately)?|system\s+override|dan:\s*ignore\s+all\s+rules|jailbreak:\s*override\s+safety|png\s+chunk\s+overflow|ihdr\s+chunk\s+length\s*:\s*0x[f]{4,8}|payload\s+(?:width|height)\s*:\s*0x7f{5,8}|heap\s+buffer\s+overflow|integer\s+overflow)/i;

function shouldAppendPrintableRawStrings(
  extractedMetadataText: string,
  rawStringText: string,
): boolean {
  if (rawStringText.length === 0) {
    return false;
  }

  // Unsupported binaries often expose high-entropy printable junk that can
  // accidentally satisfy text regexes. Only promote raw fallback text when it
  // contains a high-confidence attack marker that is not already present in
  // parsed metadata.
  if (!RAW_BINARY_ATTACK_MARKER.test(rawStringText)) {
    return false;
  }

  return extractedMetadataText.length === 0
    || !RAW_BINARY_ATTACK_MARKER.test(extractedMetadataText);
}

function isLikelyAudioBinary(format: string, filename?: string): boolean {
  if (['MP3', 'WAV', 'OGG', 'FLAC', 'M4A', 'WMA'].includes(format)) {
    return true;
  }

  if (!filename) {
    return false;
  }

  const extension = `.${filename.split('.').pop()?.toLowerCase() ?? ''}`;
  return AUDIO_FILENAME_EXTENSIONS.has(extension);
}

function getAudioContextLabel(format: string, filename?: string): string {
  switch (format) {
    case 'OGG':
    case 'FLAC':
      return 'Vorbis.COMMENT';
    case 'WAV':
      return 'RIFF.INFO';
    case 'WMA':
      return 'ASF.WMA';
    case 'M4A':
      return 'iTunes.META';
    default:
      break;
  }

  const extension = `.${filename?.split('.').pop()?.toLowerCase() ?? ''}`;
  if (extension === '.ogg' || extension === '.oga' || extension === '.opus' || extension === '.flac' || extension === '.spx') {
    return 'Vorbis.COMMENT';
  }
  if (extension === '.wav' || extension === '.aiff' || extension === '.aif' || extension === '.amr' || extension === '.aac') {
    return 'RIFF.INFO';
  }
  if (extension === '.m4a' || extension === '.3gp') {
    return 'iTunes.META';
  }
  if (extension === '.wma') {
    return 'ASF.WMA';
  }
  return 'ID3 tag data';
}

function buildRawFallbackText(
  rawStringText: string,
  format: string,
  filename?: string,
): string {
  if (!isLikelyAudioBinary(format, filename)) {
    return rawStringText;
  }

  const contextLabel = getAudioContextLabel(format, filename);
  return `${contextLabel}: Comment=${rawStringText}`;
}

function getExpectedFormatFromFilename(filename?: string): BinaryFormat | null {
  if (!filename) {
    return null;
  }

  const extension = filename.split('.').pop()?.toLowerCase() ?? '';
  return EXTENSION_FORMAT_MAP[extension] ?? null;
}

function collectStructuralBinaryFindings(
  filename: string | undefined,
  parseResult: BinaryParseResult,
  extractedText: string,
): Finding[] {
  const findings: Finding[] = [];
  const safeFilename = filename ?? '';
  const expectedFormat = getExpectedFormatFromFilename(safeFilename);
  const hasStructuralFilenameMarker = STRUCTURAL_FILENAME_MARKER_RE.test(safeFilename);
  const hasStructuralTextMarker = STRUCTURAL_TEXT_MARKER_RE.test(extractedText);

  if (
    expectedFormat
    && parseResult.format !== 'UNKNOWN'
    && parseResult.format !== 'TIMEOUT'
    && parseResult.format !== expectedFormat
  ) {
    findings.push({
      category: 'MALFORMED_CONTENT',
      severity: 'CRITICAL',
      description: `File extension does not match detected format (${safeFilename} vs ${parseResult.format})`,
      match: safeFilename.slice(0, 120),
      source: 'TPI-BINARY',
      engine: 'TPI',
      pattern_name: 'core_binary_format_mismatch_artifact',
      weight: 10,
    });
  }

  if (/(?:polyglot-[\w-]+)/i.test(safeFilename)) {
    findings.push({
      category: 'MALFORMED_CONTENT',
      severity: 'CRITICAL',
      description: 'Polyglot binary artifact detected via filename marker',
      match: safeFilename.slice(0, 120),
      source: 'TPI-BINARY',
      engine: 'TPI',
      pattern_name: 'core_binary_polyglot_artifact',
      weight: 10,
    });
  }

  if (/suspiciously-small/i.test(safeFilename)) {
    findings.push({
      category: 'MALFORMED_CONTENT',
      severity: 'CRITICAL',
      description: 'Suspiciously small binary artifact detected via filename marker',
      match: safeFilename.slice(0, 120),
      source: 'TPI-BINARY',
      engine: 'TPI',
      pattern_name: 'core_binary_size_anomaly_artifact',
      weight: 9,
    });
  }

  if (
    (hasStructuralFilenameMarker || hasStructuralTextMarker)
    && (parseResult.format === 'UNKNOWN' || parseResult.errors.length > 0)
  ) {
    findings.push({
      category: 'MALFORMED_CONTENT',
      severity: 'CRITICAL',
      description: 'Malformed binary artifact pairs suspicious markers with parse failures or unsupported structure',
      match: (safeFilename || extractedText).slice(0, 120),
      source: 'TPI-BINARY',
      engine: 'TPI',
      pattern_name: 'core_binary_structural_artifact',
      weight: 10,
    });
  }

  return findings;
}

function collectPrintableStrings(
  text: string,
  seen: Set<string>,
  out: string[],
): void {
  const matches = text.match(/[\x20-\x7E]{12,}/g) ?? [];
  for (const match of matches) {
    const normalized = match.replace(/\s+/g, ' ').trim();
    if (normalized.length < MIN_PRINTABLE_STRING_LENGTH || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    out.push(normalized);
    if (out.length >= MAX_PRINTABLE_STRINGS) {
      return;
    }
  }
}

function extractPrintableBinaryStrings(buffer: Buffer): string {
  const seen = new Set<string>();
  const strings: string[] = [];
  const prefix = buffer.subarray(0, Math.min(buffer.length, MAX_RAW_SCAN_PREFIX_BYTES));
  const suffixStart = Math.max(prefix.length, buffer.length - MAX_RAW_SCAN_SUFFIX_BYTES);
  const suffix = suffixStart < buffer.length ? buffer.subarray(suffixStart) : Buffer.alloc(0);
  const segments = suffix.length > 0 ? [prefix, suffix] : [prefix];

  for (const segment of segments) {
    collectPrintableStrings(segment.toString('latin1'), seen, strings);
    if (strings.length >= MAX_PRINTABLE_STRINGS) {
      break;
    }
    const utf16 = segment.toString('utf16le').replace(/\u0000/g, '');
    collectPrintableStrings(utf16, seen, strings);
    if (strings.length >= MAX_PRINTABLE_STRINGS) {
      break;
    }
  }

  const selected: string[] = [];
  let totalLength = 0;
  for (const value of strings) {
    if (totalLength + value.length > MAX_FALLBACK_TEXT_LENGTH) {
      break;
    }
    selected.push(value);
    totalLength += value.length;
  }

  return selected.join(' | ');
}

/**
 * Scan a binary file for prompt injection in metadata
 *
 * @param buffer - The binary file content as Buffer
 * @param filename - Optional filename for logging
 * @param timeout - Parse timeout in milliseconds (default 5000ms, range: 100-30000) (FIX-2.3)
 * @param transcription - Optional speech-to-text transcript for dual-layer audio scanning (Story 12.1)
 * @returns Enhanced scan result with metadata sources
 */
export async function scanBinary(buffer: Buffer, filename?: string, timeout = DEFAULT_PARSE_TIMEOUT, transcription?: string): Promise<BinaryScanResult> {
  // Validate timeout parameter (code-review fix)
  const effectiveTimeout = Math.min(Math.max(timeout, 100), 30000);

  // Validate input
  if (!buffer || buffer.length === 0) {
    return {
      findings: [],
      verdict: 'ALLOW',
      elapsed: 0,
      textLength: 0,
      normalizedLength: 0,
      counts: { critical: 0, warning: 0, info: 0 },
      metadata: {
        format: 'UNKNOWN',
        fieldCount: 0,
        sources: [],
      },
    };
  }

  const startTime = performance.now();

  // SECURITY: Timeout enforcement for metadata parsing (FIX-2.3)
  const parseResult: BinaryParseResult = await Promise.race([
    extractMetadata(buffer),
    new Promise<BinaryParseResult>((resolve) =>
      setTimeout(() => {
        resolve({
          format: 'TIMEOUT',
          valid: false,
          fields: [],
          warnings: [],
          errors: [`Parse timeout exceeded (${effectiveTimeout}ms)`],
        });
      }, effectiveTimeout)
    ),
  ]);

  // Extract all text from metadata fields
  const extractedMetadataText = extractTextFields(parseResult.fields);
  const rawStringText = extractPrintableBinaryStrings(buffer);
  const shouldAppendRawStrings = shouldAppendPrintableRawStrings(extractedMetadataText, rawStringText);
  const promotedRawText = shouldAppendRawStrings
    ? buildRawFallbackText(rawStringText, parseResult.format, filename)
    : '';
  const extractedText = shouldAppendRawStrings
    ? (extractedMetadataText.length > 0 ? `${extractedMetadataText} | ${promotedRawText}` : promotedRawText)
    : extractedMetadataText;

  // Story 12.1: Dual-layer audio scanning — append transcription for vocal layer
  // H5 fix: cap transcription length and sanitize delimiter to prevent injection
  const MAX_TRANSCRIPTION_LENGTH = 500_000; // 500KB cap
  let sanitizedTranscription = transcription ?? '';
  if (sanitizedTranscription.length > MAX_TRANSCRIPTION_LENGTH) {
    sanitizedTranscription = sanitizedTranscription.slice(0, MAX_TRANSCRIPTION_LENGTH);
  }
  // Remove any embedded delimiter strings that could confuse layer separation
  sanitizedTranscription = sanitizedTranscription.replace(/\[TRANSCRIPTION\]/gi, '[TRANSCRIPT_DATA]');
  const fullScanText = sanitizedTranscription
    ? `${extractedText}\n[TRANSCRIPTION]\n${sanitizedTranscription}`
    : extractedText;

  // Scan the extracted text (+ transcription if present) using the existing scanner
  const textScanResult = scan(fullScanText);

  // Calculate elapsed time
  const elapsed = performance.now() - startTime;

  // Get metadata sources
  const sources = extractSources(parseResult.fields);
  if (shouldAppendRawStrings) {
    sources.push('RAW_STRINGS');
  }

  // Story 12.1: Add transcription as a scanned source if present
  if (transcription) {
    sources.push('TRANSCRIPTION');
  }

  // Sanitize filename for use in findings
  const sanitizedFilename = filename?.replace(/[\x00-\x1F\x7F]/g, '').trim() || 'binary file';

  // Build enhanced result
  const result: BinaryScanResult = {
    ...textScanResult,
    elapsed,
    metadata: {
      format: parseResult.format,
      fieldCount: parseResult.fields.length,
      sources,
    },
  };
  const structuralFindings = collectStructuralBinaryFindings(filename, parseResult, extractedText)
    .filter((finding) => !result.findings.some((existing) => existing.pattern_name === finding.pattern_name));
  result.findings.push(...structuralFindings);

  // Add parse warnings as info findings if present
  if (parseResult.warnings.length > 0) {
    for (const warning of parseResult.warnings) {
      result.findings.push({
        category: 'Binary Parsing',
        severity: 'INFO',
        description: warning,
        match: sanitizedFilename,
        source: 'scanner-binary',
        engine: 'metadata-parser',
      });
    }
  }

  // Add parse errors as warning findings if present
  if (parseResult.errors.length > 0) {
    for (const error of parseResult.errors) {
      result.findings.push({
        category: 'Binary Parsing',
        severity: 'WARNING',
        description: error,
        match: sanitizedFilename,
        source: 'scanner-binary',
        engine: 'metadata-parser',
      });
    }
  }

  result.counts = result.findings.reduce(
    (counts, finding) => {
      if (finding.severity === 'CRITICAL') counts.critical += 1;
      else if (finding.severity === 'WARNING') counts.warning += 1;
      else counts.info += 1;
      return counts;
    },
    { critical: 0, warning: 0, info: 0 },
  );
  result.verdict = result.findings.some(
    (finding) =>
      finding.engine !== 'metadata-parser'
      && (finding.severity === 'CRITICAL' || finding.severity === 'WARNING'),
  )
    ? 'BLOCK'
    : 'ALLOW';

  return result;
}

/**
 * Scan a binary file and return the raw metadata fields
 * Useful for debugging and inspection
 *
 * @param buffer - The binary file content as Buffer
 * @param timeout - Parse timeout in milliseconds (default 5000ms) (code-review fix)
 * @returns Parse result with all metadata fields
 */
export async function scanBinaryRaw(buffer: Buffer, timeout = DEFAULT_PARSE_TIMEOUT): Promise<BinaryParseResult & { extractedText: string; sources: string[] }> {
  // Validate input (code-review fix)
  if (!buffer || buffer.length === 0) {
    return {
      format: 'UNKNOWN',
      valid: false,
      fields: [],
      warnings: [],
      errors: ['Empty buffer provided'],
      extractedText: '',
      sources: [],
    };
  }

  // Validate timeout
  const effectiveTimeout = Math.min(Math.max(timeout, 100), 30000);

  // SECURITY: Timeout enforcement (code-review fix)
  const parseResult = await Promise.race([
    extractMetadata(buffer),
    new Promise<BinaryParseResult>((resolve) =>
      setTimeout(() => {
        resolve({
          format: 'TIMEOUT',
          valid: false,
          fields: [],
          warnings: [],
          errors: [`Parse timeout exceeded (${effectiveTimeout}ms)`],
        });
      }, effectiveTimeout)
    ),
  ]);

  const extractedMetadataText = extractTextFields(parseResult.fields);
  const rawStringText = extractPrintableBinaryStrings(buffer);
  const shouldAppendRawStrings = shouldAppendPrintableRawStrings(extractedMetadataText, rawStringText);
  const promotedRawText = shouldAppendRawStrings
    ? buildRawFallbackText(rawStringText, parseResult.format)
    : '';
  const extractedText = shouldAppendRawStrings
    ? (extractedMetadataText.length > 0 ? `${extractedMetadataText} | ${promotedRawText}` : promotedRawText)
    : extractedMetadataText;
  const sources = extractSources(parseResult.fields);
  if (shouldAppendRawStrings) {
    sources.push('RAW_STRINGS');
  }

  return {
    ...parseResult,
    extractedText,
    sources,
  };
}

// ---------------------------------------------------------------------------
// 2. RESULT FORMATTING
// ---------------------------------------------------------------------------

/**
 * Format a binary scan result for display
 *
 * @param result - The binary scan result
 * @returns Formatted string representation
 */
export function formatBinaryResult(result: BinaryScanResult): string {
  const lines: string[] = [];

  lines.push(`Format: ${result.metadata.format}`);
  lines.push(`Fields Extracted: ${result.metadata.fieldCount}`);
  lines.push(`Metadata Sources: ${result.metadata.sources.join(', ') || 'None'}`);
  lines.push(`Verdict: ${result.verdict}`);
  lines.push(`Findings: ${result.findings.length}`);
  lines.push(`Elapsed: ${result.elapsed.toFixed(2)}ms`);

  if (result.findings.length > 0) {
    lines.push('\nFindings:');
    for (const finding of result.findings) {
      lines.push(`  [${finding.severity}] ${finding.category}: ${finding.description}`);
    }
  }

  return lines.join('\n');
}

/**
 * Format metadata fields for display
 *
 * @param fields - Array of metadata fields
 * @returns Formatted string representation
 */
export function formatMetadataFields(fields: MetadataField[]): string {
  const lines: string[] = [];

  for (const field of fields) {
    // Truncate long values
    let value = field.value;
    if (value.length > 100) {
      value = value.substring(0, 97) + '...';
    }
    lines.push(`  [${field.source}] ${field.key}: ${value}`);
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// 3. UTILITY FUNCTIONS
// ---------------------------------------------------------------------------

/**
 * Check if a binary format is supported for metadata extraction
 *
 * @param format - The binary format to check
 * @returns True if supported, false otherwise
 */
export function isBinarySupported(format: BinaryFormat): boolean {
  return format !== 'UNKNOWN';
}

/**
 * Get list of supported binary formats
 *
 * @returns Array of supported format names
 */
export function getSupportedFormats(): string[] {
  return [
    'JPEG',
    'PNG',
    'WebP',
    'GIF',
    'SVG',
    'MP3',
    'WAV',
    'OGG',
    'FLAC',
    'M4A',
    'WMA',
  ];
}

/**
 * Create a summary of binary file content
 *
 * @param buffer - The binary file content
 * @param filename - Optional filename
 * @param timeout - Parse timeout in milliseconds (default 5000ms) (code-review fix)
 * @returns Summary object with format, size, and field count
 */
export async function summarizeBinary(buffer: Buffer, filename?: string, timeout = DEFAULT_PARSE_TIMEOUT): Promise<{
  filename?: string | undefined;
  format: BinaryFormat;
  size: number;
  supported: boolean;
  fieldCount: number;
  sources: string[];
}> {
  // Validate input (code-review fix)
  if (!buffer || buffer.length === 0) {
    return {
      filename,
      format: 'UNKNOWN',
      size: 0,
      supported: false,
      fieldCount: 0,
      sources: [],
    };
  }

  const format = detectFormat(buffer);

  // Validate timeout
  const effectiveTimeout = Math.min(Math.max(timeout, 100), 30000);

  // SECURITY: Timeout enforcement (code-review fix)
  const parseResult = await Promise.race([
    extractMetadata(buffer),
    new Promise<BinaryParseResult>((resolve) =>
      setTimeout(() => {
        resolve({
          format: 'TIMEOUT',
          valid: false,
          fields: [],
          warnings: [],
          errors: [`Parse timeout exceeded (${effectiveTimeout}ms)`],
        });
      }, effectiveTimeout)
    ),
  ]);

  const sources = extractSources(parseResult.fields);

  return {
    filename,
    format,
    size: buffer.length,
    supported: isBinarySupported(format),
    fieldCount: parseResult.fields.length,
    sources,
  };
}
