/**
 * S-IMAGE: Image Content Scanner Module (H26.1)
 * OCR extraction via text pattern detection, steganographic text detection
 * (EXIF, comment fields), magic byte validation, SVG sanitization.
 * Formats: PNG, JPEG, GIF, WebP.
 * Self-registers with scannerRegistry on import.
 *
 * SEC-10: MIME validation, magic byte verification, max 10MB (UUID filenames enforced at upload layer)
 * SEC-11: SVG handled separately — strip ALL active content (sanitizeSVG function)
 * SEC-12: Constants exported for worker thread integration (memory limit 256MB, timeout 30s)
 */

import type { ScannerModule, Finding, RegexPattern } from '../types.js';
import { SEVERITY } from '../types.js';
import { scannerRegistry } from './registry.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum image file size: 10MB */
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

/** Worker thread memory limit: 256MB */
export const WORKER_MEMORY_LIMIT = 256 * 1024 * 1024;

/** Worker thread timeout: 30 seconds */
export const WORKER_TIMEOUT_MS = 30_000;

/** Supported image MIME types */
export const SUPPORTED_IMAGE_MIMES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
] as const;

/** Magic byte signatures for image format validation */
export const MAGIC_BYTES: Record<string, { bytes: number[]; offset: number }> = {
  'image/png': { bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], offset: 0 },
  'image/jpeg': { bytes: [0xff, 0xd8, 0xff], offset: 0 },
  'image/gif': { bytes: [0x47, 0x49, 0x46, 0x38], offset: 0 }, // GIF8
  'image/webp': { bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 }, // RIFF (+ WEBP sub-check at offset 8)
};

/** File extension to MIME type mapping */
export const EXT_TO_MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

const IMAGE_CONTEXT_RE =
  /(?:\b(?:exif|xmp|iptc|icc|usercomment|imagedescription|ihdr|idat|plte|png|jpeg|jpg|gif|webp|svg|image\s+metadata|ocr)\b|\bPNG\.(?:tEXt|iTXt|zTXt)\b|<svg\b|<\/svg>|viewBox=|xlink:href)/i;
const BENIGN_HTML_DOCUMENT_RE =
  /^(?:\s|<!--[\s\S]*?-->)*<!DOCTYPE\s+html[\s\S]{0,240}<html\b[\s\S]{0,500}(?:<head\b|<body\b|<title\b|<meta\b|<form\b|<article\b)/i;
const DEFINITIVE_IMAGE_ATTACK_RE =
  /(?:<svg\b[\s\S]{0,500}(?:<script\b|<foreignObject\b|javascript\s*:|on(?:load|error|click|mouseover|focus|blur|animate|begin|end)\s*=|SYSTEM\s*OVERRIDE|ignore\s+all\s+previous\s+instructions|reveal\s+(?:your\s+)?system\s+prompt|override\s+all\s+safety)|(?:EXIF|XMP|IPTC|ICC|UserComment|ImageDescription)\s*[:=][^\n]{0,200}(?:ignore|override|system|admin|execute|eval|developer\s+mode|remove\s+all\s+restrictions)|PNG\.(?:tEXt|iTXt|zTXt)\s*:\s*(?:Comment|Description|UserComment)\s*=\s*[^\n]{0,240}(?:discard\s+all\s+prior\s+directives|enter\s+developer\s+mode|remove\s+all\s+restrictions|ignore\s+all\s+previous\s+instructions)|png\s+chunk\s+overflow|ihdr\s+chunk\s+length\s*:\s*0x[f]{4,8}|payload\s+(?:width|height)\s*:\s*0x7f{5,8}|heap\s+buffer\s+overflow|integer\s+overflow)/i;

// ---------------------------------------------------------------------------
// 1. STEGANOGRAPHIC_TEXT — hidden text in image metadata
// ---------------------------------------------------------------------------

export const STEGANOGRAPHIC_PATTERNS: RegexPattern[] = [
  {
    name: 'exif_hidden_instruction',
    cat: 'IMAGE_STEGANOGRAPHY',
    sev: SEVERITY.CRITICAL,
    re: /(?:EXIF|XMP|IPTC|ICC)[\s\S]{0,200}(?:system\s*(?:prompt|instruction|message)|ignore\s+(?:previous|all)\s+instructions|you\s+are\s+now)/i,
    desc: 'Hidden instruction in image metadata (EXIF/XMP/IPTC)',
    source: 'S-IMAGE',
    weight: 9,
  },
  {
    name: 'comment_field_injection',
    cat: 'IMAGE_STEGANOGRAPHY',
    sev: SEVERITY.CRITICAL,
    re: /(?:Comment|Description|UserComment|ImageDescription)\s*[:=]\s*["']?[^"'\n]{0,160}(?:ignore|override|system|admin|execute|eval|developer\s+mode|discard\s+all\s+prior\s+directives|remove\s+all\s+restrictions)\b/i,
    desc: 'Prompt injection in image comment/description field',
    source: 'S-IMAGE',
    weight: 9,
  },
  {
    name: 'base64_payload_in_metadata',
    cat: 'IMAGE_STEGANOGRAPHY',
    sev: SEVERITY.WARNING,
    re: /(?:Comment|Description|UserComment)\s*[:=]\s*["']?(?:[A-Za-z0-9+/]{50,}={0,2})/,
    desc: 'Base64-encoded payload detected in image metadata',
    source: 'S-IMAGE',
    weight: 7,
  },
];

// ---------------------------------------------------------------------------
// 2. SVG_ACTIVE_CONTENT — dangerous SVG elements
// ---------------------------------------------------------------------------

export const SVG_ACTIVE_CONTENT_PATTERNS: RegexPattern[] = [
  {
    name: 'svg_script_tag',
    cat: 'SVG_ACTIVE_CONTENT',
    sev: SEVERITY.CRITICAL,
    re: /<script\b[^>]*>[\s\S]*?<\/script>/i,
    desc: 'Script tag in SVG content',
    source: 'S-IMAGE',
    weight: 10,
  },
  {
    name: 'svg_override_payload',
    cat: 'SVG_ACTIVE_CONTENT',
    sev: SEVERITY.CRITICAL,
    re: /<svg\b[\s\S]{0,500}(?:SYSTEM\s*OVERRIDE|ignore\s+all\s+previous\s+instructions|reveal\s+(?:your\s+)?system\s+prompt|override\s+all\s+safety)/i,
    desc: 'Override payload embedded in SVG text or script content',
    source: 'S-IMAGE',
    weight: 9,
  },
  {
    name: 'svg_foreign_object',
    cat: 'SVG_ACTIVE_CONTENT',
    sev: SEVERITY.CRITICAL,
    re: /<foreignObject\b[^>]*>/i,
    desc: 'foreignObject element in SVG (can embed HTML)',
    source: 'S-IMAGE',
    weight: 9,
  },
  {
    name: 'svg_event_handler',
    cat: 'SVG_ACTIVE_CONTENT',
    sev: SEVERITY.CRITICAL,
    re: /<(?:svg|g|path|rect|circle|ellipse|line|polyline|polygon|text|image|a|use|foreignObject)\b[^>]{0,200}\bon(?:load|error|click|mouseover|focus|blur|animate|begin|end)\s*=/i,
    desc: 'Event handler attribute in SVG',
    source: 'S-IMAGE',
    weight: 9,
  },
  {
    name: 'svg_javascript_uri',
    cat: 'SVG_ACTIVE_CONTENT',
    sev: SEVERITY.CRITICAL,
    re: /(?:href|xlink:href|src)\s*=\s*["']?\s*javascript\s*:/i,
    desc: 'JavaScript URI in SVG attribute',
    source: 'S-IMAGE',
    weight: 10,
  },
  {
    name: 'svg_use_external',
    cat: 'SVG_ACTIVE_CONTENT',
    sev: SEVERITY.WARNING,
    re: /<use\b[^>]*(?:href|xlink:href)\s*=\s*["']https?:\/\//i,
    desc: 'External resource reference in SVG <use> element',
    source: 'S-IMAGE',
    weight: 6,
  },
];

// ---------------------------------------------------------------------------
// 3. OCR_TEXT_INJECTION — text extracted from images containing attacks
// ---------------------------------------------------------------------------

export const OCR_INJECTION_PATTERNS: RegexPattern[] = [
  {
    name: 'ocr_system_prompt_override',
    cat: 'OCR_TEXT_INJECTION',
    sev: SEVERITY.CRITICAL,
    re: /(?:system\s*(?:prompt|instruction|message)|SYSTEM\s*OVERRIDE)\s*[:=]/i,
    desc: 'System prompt override detected in OCR-extracted text',
    source: 'S-IMAGE',
    weight: 9,
  },
  {
    name: 'ocr_ignore_instructions',
    cat: 'OCR_TEXT_INJECTION',
    sev: SEVERITY.CRITICAL,
    re: /ignore\s+(?:all\s+)?(?:previous|prior|above)\s+(?:instructions|rules|guidelines)/i,
    desc: 'Instruction override pattern in OCR-extracted text',
    source: 'S-IMAGE',
    weight: 9,
  },
  {
    name: 'ocr_role_hijacking',
    cat: 'OCR_TEXT_INJECTION',
    sev: SEVERITY.CRITICAL,
    re: /you\s+are\s+(?:now|actually|really)\s+(?:a|an|the)\s+/i,
    desc: 'Role hijacking attempt in OCR-extracted text',
    source: 'S-IMAGE',
    weight: 8,
  },
  {
    name: 'ocr_command_execution',
    cat: 'OCR_TEXT_INJECTION',
    sev: SEVERITY.CRITICAL,
    re: /(?:execute|run|eval|exec)\s*\(\s*["'`]/i,
    desc: 'Command execution attempt in OCR-extracted text',
    source: 'S-IMAGE',
    weight: 9,
  },
];

// ---------------------------------------------------------------------------
// 4. FORMAT_VALIDATION — polyglot / mismatch detection
// ---------------------------------------------------------------------------

export const FORMAT_VALIDATION_PATTERNS: RegexPattern[] = [
  {
    name: 'png_chunk_overflow',
    cat: 'FORMAT_MISMATCH',
    sev: SEVERITY.CRITICAL,
    re: /(?:png\s+chunk\s+overflow|ihdr\s+chunk\s+length\s*:\s*0x[f]{4,8}|payload\s+(?:width|height)\s*:\s*0x7f{5,8}|integer\s+overflow|heap\s+buffer\s+overflow)/i,
    desc: 'PNG chunk or dimension overflow exploit markers detected in image content',
    source: 'S-IMAGE',
    weight: 9,
  },
  {
    name: 'polyglot_html_in_image',
    cat: 'FORMAT_MISMATCH',
    sev: SEVERITY.CRITICAL,
    re: /<!DOCTYPE\s+html|<html\b|<body\b|<head\b/i,
    desc: 'HTML content detected in image file (polyglot)',
    source: 'S-IMAGE',
    weight: 9,
  },
  {
    name: 'polyglot_php_in_image',
    cat: 'FORMAT_MISMATCH',
    sev: SEVERITY.CRITICAL,
    re: /<\?php\b/i,
    desc: 'PHP content detected in image file (polyglot)',
    source: 'S-IMAGE',
    weight: 10,
  },
  {
    name: 'polyglot_shell_in_image',
    cat: 'FORMAT_MISMATCH',
    sev: SEVERITY.CRITICAL,
    re: /#!\s*\/(?:bin|usr\/bin)\//,
    desc: 'Shell shebang detected in image file (polyglot)',
    source: 'S-IMAGE',
    weight: 10,
  },
];

// ---------------------------------------------------------------------------
// Security: MIME & magic byte validation
// ---------------------------------------------------------------------------

/**
 * Validate that MIME type, magic bytes, and file extension all agree.
 * Returns findings for any mismatches (polyglot rejection).
 */
export function validateImageFormat(
  data: Uint8Array,
  declaredMime: string,
  filename: string,
): Finding[] {
  const findings: Finding[] = [];

  // Check file size (SEC-10)
  if (data.byteLength > MAX_IMAGE_SIZE) {
    findings.push({
      category: 'IMAGE_UPLOAD_REJECTED',
      severity: SEVERITY.WARNING,
      description: `Image exceeds maximum size: ${(data.byteLength / 1024 / 1024).toFixed(1)}MB > 10MB limit`,
      match: filename,
      source: 'S-IMAGE',
      engine: 'image-scanner',
      pattern_name: 'file_size_exceeded',
      weight: 0,
    });
    return findings;
  }

  // SVG is text-based — handled separately (SEC-11)
  if (declaredMime === 'image/svg+xml' || filename.endsWith('.svg')) {
    return findings; // SVG validation via pattern scanning, not magic bytes
  }

  // Validate magic bytes match declared MIME
  const expectedMagic = MAGIC_BYTES[declaredMime];
  if (expectedMagic) {
    let match = expectedMagic.bytes.every(
      (b, i) => data[expectedMagic.offset + i] === b,
    );
    // WebP requires additional sub-type check: bytes 8-11 must be "WEBP"
    if (match && declaredMime === 'image/webp') {
      const webpSig = [0x57, 0x45, 0x42, 0x50]; // "WEBP"
      match = data.length >= 12 && webpSig.every((b, i) => data[8 + i] === b);
    }
    if (!match) {
      findings.push({
        category: 'FORMAT_MISMATCH',
        severity: SEVERITY.CRITICAL,
        description: `Magic bytes do not match declared MIME type: ${declaredMime}`,
        match: filename,
        source: 'S-IMAGE',
        engine: 'image-scanner',
        pattern_name: 'magic_byte_mismatch',
        weight: 10,
      });
    }
  }

  // Validate extension matches MIME
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
  const expectedMimeForExt = EXT_TO_MIME[ext];
  if (expectedMimeForExt && expectedMimeForExt !== declaredMime) {
    findings.push({
      category: 'FORMAT_MISMATCH',
      severity: SEVERITY.CRITICAL,
      description: `File extension '${ext}' does not match declared MIME '${declaredMime}'`,
      match: filename,
      source: 'S-IMAGE',
      engine: 'image-scanner',
      pattern_name: 'extension_mime_mismatch',
      weight: 10,
    });
  }

  return findings;
}

/**
 * Sanitize SVG content by stripping all active content (SEC-11).
 * Returns the sanitized SVG text and any findings about stripped content.
 */
export function sanitizeSVG(svgText: string): { sanitized: string; findings: Finding[] } {
  const findings: Finding[] = [];
  let sanitized = svgText;

  // Strip script tags
  let prev = sanitized;
  sanitized = sanitized.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  if (sanitized !== prev) {
    findings.push({
      category: 'SVG_SANITIZED',
      severity: SEVERITY.CRITICAL,
      description: 'Stripped <script> tags from SVG',
      match: 'script tags removed',
      source: 'S-IMAGE',
      engine: 'image-scanner',
      pattern_name: 'svg_script_stripped',
      weight: 10,
    });
  }

  // Strip foreignObject
  prev = sanitized;
  sanitized = sanitized.replace(/<foreignObject\b[^>]*>[\s\S]*?<\/foreignObject>/gi, '');
  if (sanitized !== prev) {
    findings.push({
      category: 'SVG_SANITIZED',
      severity: SEVERITY.CRITICAL,
      description: 'Stripped <foreignObject> elements from SVG',
      match: 'foreignObject elements removed',
      source: 'S-IMAGE',
      engine: 'image-scanner',
      pattern_name: 'svg_foreign_object_stripped',
      weight: 9,
    });
  }

  // Strip iframe, embed, object elements (can load arbitrary content)
  prev = sanitized;
  sanitized = sanitized.replace(/<(?:iframe|embed|object)\b[^>]*(?:\/>|>[\s\S]*?<\/(?:iframe|embed|object)>)/gi, '');
  if (sanitized !== prev) {
    findings.push({
      category: 'SVG_SANITIZED',
      severity: SEVERITY.CRITICAL,
      description: 'Stripped <iframe>/<embed>/<object> elements from SVG',
      match: 'embedding elements removed',
      source: 'S-IMAGE',
      engine: 'image-scanner',
      pattern_name: 'svg_embed_stripped',
      weight: 10,
    });
  }

  // Strip event handlers (matches quoted, unquoted, and edge cases)
  prev = sanitized;
  sanitized = sanitized.replace(/\bon(?:load|error|click|mouseover|focus|blur|animate|begin|end)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '');
  if (sanitized !== prev) {
    findings.push({
      category: 'SVG_SANITIZED',
      severity: SEVERITY.CRITICAL,
      description: 'Stripped event handler attributes from SVG',
      match: 'event handlers removed',
      source: 'S-IMAGE',
      engine: 'image-scanner',
      pattern_name: 'svg_event_handler_stripped',
      weight: 9,
    });
  }

  // Strip javascript: and data: URIs
  prev = sanitized;
  sanitized = sanitized.replace(/((?:href|xlink:href|src)\s*=\s*["']?\s*)(?:javascript|data)\s*:[^"'\s]*/gi, '$1about:blank');
  if (sanitized !== prev) {
    findings.push({
      category: 'SVG_SANITIZED',
      severity: SEVERITY.CRITICAL,
      description: 'Stripped javascript:/data: URIs from SVG',
      match: 'dangerous URIs removed',
      source: 'S-IMAGE',
      engine: 'image-scanner',
      pattern_name: 'svg_dangerous_uri_stripped',
      weight: 10,
    });
  }

  return { sanitized, findings };
}

// ---------------------------------------------------------------------------
// Module wiring
// ---------------------------------------------------------------------------

const IMAGE_PATTERN_GROUPS: { patterns: RegexPattern[]; name: string }[] = [
  { patterns: STEGANOGRAPHIC_PATTERNS, name: 'IMAGE_STEGANOGRAPHY' },
  { patterns: SVG_ACTIVE_CONTENT_PATTERNS, name: 'SVG_ACTIVE_CONTENT' },
  { patterns: OCR_INJECTION_PATTERNS, name: 'OCR_TEXT_INJECTION' },
  { patterns: FORMAT_VALIDATION_PATTERNS, name: 'FORMAT_MISMATCH' },
];

export const imageScannerModule: ScannerModule = {
  name: 'image-scanner',
  version: '1.0.0',
  description: 'Detects image-based attacks: steganographic injections, SVG active content, OCR text attacks, polyglot files',
  supportedContentTypes: [...SUPPORTED_IMAGE_MIMES, 'text/plain'],

  scan(text: string, normalized: string): Finding[] {
    // Input size guard
    if (text.length > 500_000) {
      return [{
        category: 'IMAGE_INPUT_TOO_LARGE',
        severity: SEVERITY.WARNING,
        description: `ImageScanner: Input too large (${text.length} chars), skipping scan`,
        match: '',
        source: 'S-IMAGE',
        engine: 'image-scanner',
        pattern_name: 'input_size_guard',
        weight: 0,
      }];
    }

    const hasImageContext = IMAGE_CONTEXT_RE.test(text) || IMAGE_CONTEXT_RE.test(normalized);
    if (BENIGN_HTML_DOCUMENT_RE.test(text) && !DEFINITIVE_IMAGE_ATTACK_RE.test(text)) {
      return [];
    }

    const findings: Finding[] = [];
    for (const group of IMAGE_PATTERN_GROUPS) {
      for (const p of group.patterns) {
        if (
          !hasImageContext
          && (p.name === 'comment_field_injection'
            || p.name === 'base64_payload_in_metadata'
            || p.name === 'polyglot_html_in_image')
        ) {
          continue;
        }
        const m = normalized.match(p.re) || text.match(p.re);
        if (m) {
          findings.push({
            category: p.cat,
            severity: p.sev,
            description: p.desc,
            match: m[0].slice(0, 100),
            pattern_name: p.name,
            source: p.source || 'S-IMAGE',
            engine: 'image-scanner',
            ...(p.weight !== undefined && { weight: p.weight }),
          });
        }
      }
    }
    return findings;
  },

  getPatternCount() {
    return IMAGE_PATTERN_GROUPS.reduce((c, g) => c + g.patterns.length, 0);
  },

  getPatternGroups() {
    return IMAGE_PATTERN_GROUPS.map(g => ({
      name: g.name,
      count: g.patterns.length,
      source: 'S-IMAGE',
    }));
  },
};

if (!scannerRegistry.hasModule('image-scanner')) {
  scannerRegistry.register(imageScannerModule);
}
