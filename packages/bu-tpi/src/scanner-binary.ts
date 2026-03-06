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
  const extractedText = extractTextFields(parseResult.fields);

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

  const extractedText = extractTextFields(parseResult.fields);
  const sources = extractSources(parseResult.fields);

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
