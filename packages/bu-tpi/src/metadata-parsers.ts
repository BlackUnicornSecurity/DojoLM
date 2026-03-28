/**
 * TPI Security Test Lab — Binary Metadata Parsers
 *
 * Extracts text content from binary file metadata for prompt injection scanning.
 * Supports image formats (JPEG, PNG, WebP, GIF, SVG) and audio formats (MP3, WAV, OGG, FLAC, M4A).
 *
 * @module metadata-parsers
 */

// exifr v7.1.3: KEPT after S05 evaluation (2026-03-02)
// Decision: Keep with monitoring. Zero CVEs, zero deps, pinned version.
// sharp rejected: native deps, breaks pure-JS arch. exifreader: pre-approved fallback.
// @ts-ignore - exifr uses default export
import { inflateRawSync } from 'node:zlib';
import exifr from 'exifr';
import { parseBuffer } from 'music-metadata';
// Inline PNG chunk extraction (replaces png-chunks-extract dependency)
// PNG spec: https://www.w3.org/TR/PNG/#5DataRep
interface PNGChunk { name: string; data: Uint8Array; }
const PNG_SIGNATURE = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
const MAX_PNG_CHUNKS = 10_000; // Defensive limit against crafted PNGs
function extractChunks(data: Buffer | Uint8Array): PNGChunk[] {
  for (let i = 0; i < 8; i++) {
    if (data[i] !== PNG_SIGNATURE[i]) throw new Error('Invalid PNG signature');
  }
  const chunks: PNGChunk[] = [];
  let offset = 8;
  while (offset + 8 <= data.length && chunks.length < MAX_PNG_CHUNKS) {
    const length = ((data[offset]! << 24) | (data[offset + 1]! << 16) | (data[offset + 2]! << 8) | data[offset + 3]!) >>> 0;
    offset += 4;
    const name = String.fromCharCode(data[offset]!, data[offset + 1]!, data[offset + 2]!, data[offset + 3]!);
    offset += 4;
    if (offset + length + 4 > data.length) break; // Prevent reading past buffer
    const chunkData = data.slice(offset, offset + length);
    offset += length + 4; // Skip data + CRC (CRC not validated; parse errors handled by caller)
    chunks.push({ name, data: new Uint8Array(chunkData) });
    if (name === 'IEND') break;
  }
  return chunks;
}
import type {
  MetadataField,
  BinaryParseResult,
} from './types.js';

/**
 * Type for magic byte signature arrays
 */
type MagicBytes = readonly number[] | number[];

/**
 * Magic byte signatures for format detection
 */
const MAGIC_SIGNATURES: Record<string, MagicBytes> = {
  JPEG: [0xFF, 0xD8, 0xFF],
  PNG: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
  GIF: [0x47, 0x49, 0x46, 0x38], // GIF87a or GIF89a
  WebP: [0x52, 0x49, 0x46, 0x46], // RIFF (need further check)
  MP3: [0x49, 0x44, 0x33], // ID3v2
  WAV: [0x52, 0x49, 0x46, 0x46], // RIFF (need further check)
  OGG: [0x4F, 0x67, 0x67, 0x53], // OggS
  FLAC: [0x66, 0x4C, 0x61, 0x43], // fLaC
  M4A: [0x00, 0x00, 0x00], // FTYP box (need further check)
  WMA: [0x30, 0x26, 0xB2, 0x75], // ASF GUID
};

/**
 * Security limits to prevent DoS attacks
 * These limits protect against decompression bombs, regex DoS, and memory exhaustion
 */
const LIMITS = {
  /** Maximum decompressed size for PNG chunks (10MB) */
  MAX_DECOMPRESSED_SIZE: 10 * 1024 * 1024,
  /** Maximum SVG file size to process (10MB) */
  MAX_SVG_SIZE: 10 * 1024 * 1024,
  /** Maximum number of data URIs to extract from SVG */
  MAX_DATA_URIS: 100,
  /** Maximum total extracted text length (1MB) */
  MAX_EXTRACTED_TEXT: 1_000_000,
  /** Maximum number of metadata fields to process */
  MAX_METADATA_FIELDS: 1_000,
  /** Maximum GIF parsing iterations */
  MAX_GIF_ITERATIONS: 100_000,
  /** Maximum size for individual metadata values (10KB) */
  MAX_METADATA_VALUE_SIZE: 10_000,
} as const;

/**
 * Normalize tag values from music-metadata to strings (FIX-2.2)
 * Handles objects, arrays, and primitives to prevent [object Object] strings
 */
function normalizeTagValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    // SECURITY: Limit array size to prevent DoS (code-review fix)
    if (value.length > LIMITS.MAX_METADATA_FIELDS) {
      return null;
    }
    const normalized = value
      .slice(0, LIMITS.MAX_METADATA_FIELDS)
      .map(v => normalizeTagValue(v))
      .filter((v): v is string => v !== null);
    return normalized.length > 0 ? normalized.join('; ') : null;
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    // Try common text fields with safety check
    const textFields = ['text', 'value', 'description'];
    for (const field of textFields) {
      if (Object.prototype.hasOwnProperty.call(obj, field) && obj[field] !== undefined) {
        const strValue = String(obj[field]);
        if (strValue.length > 0 && strValue.length < LIMITS.MAX_METADATA_VALUE_SIZE) {
          return strValue;
        }
      }
    }
    // Fallback to JSON for complex objects with size limit
    try {
      const json = JSON.stringify(value);
      if (json && json !== '{}' && json !== 'null' && json.length < LIMITS.MAX_METADATA_VALUE_SIZE) {
        return json;
      }
    } catch {
      // JSON.stringify failed (circular references, etc.)
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// INDEX
// ---------------------------------------------------------------------------
// 1. Format Detection (detectFormat)
// 2. Image Parsers (JPEG, PNG, WebP, GIF, SVG)
// 3. Audio Parsers (MP3, WAV, OGG, FLAC, M4A, WMA)
// 4. Text Extraction (extractTextFields, extractAllText)
// 5. Orchestration (extractMetadata)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 1. FORMAT DETECTION
// ---------------------------------------------------------------------------

/** Supported binary formats for metadata extraction */
export type BinaryFormat =
  | 'JPEG'
  | 'PNG'
  | 'WebP'
  | 'GIF'
  | 'SVG'
  | 'MP3'
  | 'WAV'
  | 'OGG'
  | 'FLAC'
  | 'M4A'
  | 'WMA'
  | 'UNKNOWN';

/**
 * Detect binary file format from magic bytes
 */
export function detectFormat(buffer: Buffer): BinaryFormat {
  if (buffer.length < 4) return 'UNKNOWN';

  // Check JPEG
  if (matchMagic(buffer, MAGIC_SIGNATURES.JPEG)) {
    return 'JPEG';
  }

  // Check PNG
  if (matchMagic(buffer, MAGIC_SIGNATURES.PNG)) {
    return 'PNG';
  }

  // Check GIF
  if (matchMagic(buffer, MAGIC_SIGNATURES.GIF)) {
    return 'GIF';
  }

  // Check WebP (RIFF....WEBP)
  if (matchMagic(buffer, MAGIC_SIGNATURES.WebP)) {
    if (buffer.length >= 12 && buffer.subarray(8, 12).toString('latin1') === 'WEBP') {
      return 'WebP';
    }
  }

  // Check MP3 (ID3)
  if (matchMagic(buffer, MAGIC_SIGNATURES.MP3)) {
    return 'MP3';
  }

  // Check OGG
  if (matchMagic(buffer, MAGIC_SIGNATURES.OGG)) {
    return 'OGG';
  }

  // Check FLAC
  if (matchMagic(buffer, MAGIC_SIGNATURES.FLAC)) {
    return 'FLAC';
  }

  // Check WAV (RIFF....WAVE)
  if (matchMagic(buffer, MAGIC_SIGNATURES.WAV)) {
    if (buffer.length >= 12 && buffer.subarray(8, 12).toString('latin1') === 'WAVE') {
      return 'WAV';
    }
  }

  // Check M4A/MP4 with brand verification (FIX-3.1)
  if (buffer.length >= 12) {
    const ftyp = buffer.subarray(4, 8).toString('latin1');
    if (ftyp === 'ftyp') {
      // Verify brand identifier for M4A files
      const brand = buffer.subarray(8, 12).toString('latin1');
      // M4A brands: common ISO-BMFF brands
      const M4A_BRANDS = [
        'M4A_', 'isom', 'mp42', 'mp41', 'iso2', 'iso3', 'iso4', 'iso5', 'iso6',
        '3gp5', '3gp4', '3gp6', '3gg6',
        'avc1', 'avc3', 'hev1', 'hvc1',
        'dash', 'msf5', 'enge', 'f4v ',
      ];
      if (M4A_BRANDS.includes(brand)) {
        return 'M4A';
      }
    }
  }

  // Check WMA/ASF
  if (matchMagic(buffer, MAGIC_SIGNATURES.WMA)) {
    return 'WMA';
  }

  // Check SVG (text-based - check for <?xml or <svg)
  const preview = buffer.subarray(0, Math.min(100, buffer.length)).toString('utf-8');
  if (preview.includes('<svg') || preview.includes('<?xml') || preview.includes('<!DOCTYPE svg')) {
    return 'SVG';
  }

  return 'UNKNOWN';
}

/**
 * Check if buffer matches magic byte signature
 */
function matchMagic(buffer: Buffer, signature: MagicBytes | undefined): boolean {
  if (!signature || buffer.length < signature.length) return false;
  for (let i = 0; i < signature.length; i++) {
    if (buffer[i] !== signature[i]) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// 2. IMAGE PARSERS
// ---------------------------------------------------------------------------

/**
 * Parse EXIF metadata from JPEG buffer
 */
export async function parseJPEGMetadata(buffer: Buffer): Promise<MetadataField[]> {
  const fields: MetadataField[] = [];

  try {
    const tags = await exifr.parse(buffer, {
      translateValues: false,
      reviveValues: false,
    });

    if (!tags) return fields;

    // Convert all EXIF tags to MetadataField
    for (const [key, value] of Object.entries(tags)) {
      if (value !== null && value !== undefined) {
        const strValue = String(value);
        if (strValue.length > 0) {
          fields.push({
            key,
            value: strValue,
            source: `EXIF.${key}`,
          });
        }
      }
    }
  } catch (error) {
    // Silently fail on parse errors - file may be corrupted
  }

  return fields;
}

/**
 * Parse text chunks from PNG buffer
 */
export function parsePNGMetadata(buffer: Buffer): MetadataField[] {
  const fields: MetadataField[] = [];

  try {
    const chunks = extractChunks(buffer);

    for (const chunk of chunks) {
      // tEXt - uncompressed text data
      if (chunk.name === 'tEXt') {
        const text = decodeTextChunk(chunk.data);
        if (text) {
          fields.push({
            key: text.keyword || 'tEXt',
            value: text.text || '',
            source: 'PNG.tEXt',
          });
        }
      }

      // zTXt - compressed text data
      if (chunk.name === 'zTXt') {
        try {
          const text = decodeCompressedTextChunk(chunk.data);
          if (text) {
            fields.push({
              key: text.keyword || 'zTXt',
              value: text.text || '',
              source: 'PNG.zTXt',
            });
          }
        } catch {
          // Decompression failed, skip
        }
      }

      // iTXt - international text (UTF-8)
      if (chunk.name === 'iTXt') {
        const text = decodeInternationalTextChunk(chunk.data);
        if (text && text.text) {
          fields.push({
            key: text.keyword || 'iTXt',
            value: text.text,
            source: 'PNG.iTXt',
          });
        }
      }
    }
  } catch {
    // PNG parse failed, return empty
  }

  return fields;
}

/**
 * Decode PNG tEXt chunk data
 * Format: keyword + null separator + text
 */
function decodeTextChunk(data: Uint8Array): { keyword: string; text: string } | null {
  try {
    const nullIndex = data.indexOf(0);
    if (nullIndex === -1) return null;

    const keyword = Buffer.from(data.subarray(0, nullIndex)).toString('latin1');
    const text = Buffer.from(data.subarray(nullIndex + 1)).toString('utf-8');

    return { keyword, text };
  } catch {
    return null;
  }
}

/**
 * Decode PNG zTXt chunk data (compressed with zlib)
 * Format: keyword + null + compression method + compressed text
 * SECURITY: Protected against decompression bomb attacks (FIX-1.1)
 */
function decodeCompressedTextChunk(data: Uint8Array): { keyword: string; text: string } | null {
  try {
    const nullIndex = data.indexOf(0);
    if (nullIndex === -1) return null;

    const keyword = Buffer.from(data.subarray(0, nullIndex)).toString('latin1');
    const compressionMethod = data[nullIndex + 1];

    if (compressionMethod !== 0) {
      // Only deflate (method 0) is supported
      return { keyword, text: '[unsupported compression]' };
    }

    const compressedData = data.subarray(nullIndex + 2);
    // Node.js built-in zlib for decompression with size limit
    try {
      // PNG uses raw deflate, not gzip
      const decompressed = inflateRawSync(
        Buffer.from(compressedData),
        { maxOutputLength: LIMITS.MAX_DECOMPRESSED_SIZE }
      );
      const text = decompressed.toString('utf-8');
      return { keyword, text };
    } catch {
      return { keyword, text: '[decompression failed]' };
    }
  } catch {
    return null;
  }
}

/**
 * Decode PNG iTXt chunk data (international UTF-8 text)
 * SECURITY: Protected against decompression bomb attacks (FIX-1.1)
 */
function decodeInternationalTextChunk(data: Uint8Array): { keyword: string; text: string } | null {
  try {
    let offset = 0;

    // Read keyword (null-terminated Latin-1)
    const nullIndex = data.indexOf(0, offset);
    if (nullIndex === -1) return null;
    const keyword = Buffer.from(data.subarray(offset, nullIndex)).toString('latin1');
    offset = nullIndex + 1;

    // Compression flag
    const compressionFlag = data[offset];
    offset += 1;

    // Compression method
    const compressionMethod = data[offset];
    offset += 1;

    // Language tag (null-terminated ASCII)
    const langNullIndex = data.indexOf(0, offset);
    offset = langNullIndex + 1;

    // Translated keyword (null-terminated UTF-8)
    const transNullIndex = data.indexOf(0, offset);
    offset = transNullIndex + 1;

    // Text content
    if (compressionFlag === 0) {
      // Uncompressed
      const text = Buffer.from(data.subarray(offset)).toString('utf-8');
      return { keyword, text };
    } else if (compressionFlag === 1 && compressionMethod === 0) {
      // Compressed with deflate - protected with size limit
      try {
        const compressedData = data.subarray(offset);
        const zlib = require('node:zlib');
        // PNG uses raw deflate, not gzip
        const decompressed = zlib.inflateRawSync(
          Buffer.from(compressedData),
          { maxOutputLength: LIMITS.MAX_DECOMPRESSED_SIZE }
        );
        const text = decompressed.toString('utf-8');
        return { keyword, text };
      } catch {
        return { keyword, text: '[decompression failed]' };
      }
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Parse EXIF/XMP metadata from WebP buffer
 */
export async function parseWebPMetadata(buffer: Buffer): Promise<MetadataField[]> {
  const fields: MetadataField[] = [];

  try {
    const tags = await exifr.parse(buffer, {
      translateValues: false,
      reviveValues: false,
    });

    if (!tags) return fields;

    for (const [key, value] of Object.entries(tags)) {
      if (value !== null && value !== undefined) {
        const strValue = String(value);
        if (strValue.length > 0) {
          fields.push({
            key,
            value: strValue,
            source: `WebP.${key}`,
          });
        }
      }
    }
  } catch {
    // WebP parse failed
  }

  return fields;
}

/**
 * Parse comment extensions from GIF buffer
 * SECURITY: Protected against infinite loops with iteration limit (FIX-2.4)
 */
export function parseGIFMetadata(buffer: Buffer): MetadataField[] {
  const fields: MetadataField[] = [];

  try {
    const str = buffer.toString('latin1');
    let offset = 0;
    let iterations = 0;

    // GIF signature
    if (!str.startsWith('GIF87a') && !str.startsWith('GIF89a')) {
      return fields;
    }
    offset += 6;

    // Logical Screen Descriptor
    offset += 7; // width, height, flags, bg index, aspect ratio

    // SECURITY: Limit iterations to prevent infinite loops (FIX-2.4)
    while (offset + 1 < buffer.length && iterations < LIMITS.MAX_GIF_ITERATIONS) {
      iterations++;
      const intro = buffer[offset];
      const label = buffer[offset + 1];

      // Comment Extension: 0x21 0xFE
      if (intro === 0x21 && label === 0xFE) {
        offset += 2;
        let comment = '';

        // Read data sub-blocks
        while (offset < buffer.length) {
          const blockSize = buffer[offset];
          offset += 1;

          if (blockSize === 0 || blockSize === undefined) break; // Block terminator

          const commentData = buffer.subarray(offset, offset + blockSize);
          comment += commentData.toString('latin1');
          offset += blockSize;
        }

        if (comment.length > 0) {
          fields.push({
            key: 'Comment',
            value: comment,
            source: 'GIF.CommentExtension',
          });
        }
      } else if (intro === 0x21) {
        // Other extension, skip
        offset += 2;
        while (offset < buffer.length) {
          const blockSize = buffer[offset];
          offset += 1;
          if (blockSize === 0 || blockSize === undefined) break;
          offset += blockSize;
        }
      } else if (intro === 0x2C) {
        // Image Descriptor
        offset += 10;
        // Skip LZW data
        while (offset < buffer.length) {
          const blockSize = buffer[offset];
          offset += 1;
          if (blockSize === 0 || blockSize === undefined) break;
          offset += blockSize;
        }
      } else if (intro === 0x3B) {
        // Trailer (end of GIF)
        break;
      } else {
        offset += 1;
      }
    }
  } catch {
    // GIF parse failed
  }

  return fields;
}

/**
 * Parse SVG content as XML/text
 * SECURITY: Protected against regex DoS and large file attacks (FIX-1.2)
 */
export function parseSVGMetadata(buffer: Buffer): MetadataField[] {
  const fields: MetadataField[] = [];

  try {
    // SECURITY: Reject oversized SVG files before any processing
    if (buffer.length > LIMITS.MAX_SVG_SIZE) {
      // Silently skip oversized SVGs to prevent DoS
      return fields;
    }

    const svg = buffer.toString('utf-8');

    // Extract all text content from SVG
    // SVG is XML, so we can extract text between tags
    const textMatches = svg.match(/>([^<]+)</g);
    if (textMatches) {
      for (const match of textMatches) {
        const text = match.substring(1, match.length - 1).trim();
        if (text.length > 0) {
          fields.push({
            key: 'TextContent',
            value: text,
            source: 'SVG.TextContent',
          });
        }
      }
    }

    // Extract specific attributes that may contain text
    const attrPatterns = [
      { name: 'title', pattern: /<title[^>]*>([^<]*)<\/title>/i },
      { name: 'desc', pattern: /<desc[^>]*>([^<]*)<\/desc>/i },
      { name: 'aria-label', pattern: /aria-label=["']([^"']*)["']/i },
      { name: 'alt', pattern: /alt=["']([^"']*)["']/i },
      { name: 'href', pattern: /<a[^>]+href=["']([^"']*)["']/i },
      { name: 'onload', pattern: /onload=["']([^"']*)["']/i },
      { name: 'onclick', pattern: /onclick=["']([^"']*)["']/i },
      { name: 'onerror', pattern: /onerror=["']([^"']*)["']/i },
    ];

    for (const attr of attrPatterns) {
      const match = svg.match(attr.pattern);
      if (match && match[1]) {
        fields.push({
          key: attr.name,
          value: match[1],
          source: `SVG.${attr.name}`,
        });
      }
    }

    // SECURITY: Limit data URI extraction to prevent regex DoS
    const dataUriMatches = svg.match(/data:[^,]*,([^")\s]+)/g);
    if (dataUriMatches) {
      // Limit number of data URIs processed
      const limit = Math.min(dataUriMatches.length, LIMITS.MAX_DATA_URIS);
      for (let i = 0; i < limit; i++) {
        const uri = dataUriMatches[i];
        if (!uri) continue;
        try {
          const parts = uri.split(',', 2);
          if (parts.length < 2) continue;
          const data = parts[1];
          if (data && data.length > 10) {
            fields.push({
              key: `DataURI_${i}`,
              value: data.substring(0, 500), // Limit length
              source: 'SVG.DataURI',
            });
          }
        } catch {
          // Invalid data URI, skip
        }
      }
    }
  } catch {
    // SVG parse failed
  }

  return fields;
}

// ---------------------------------------------------------------------------
// 3. AUDIO PARSERS
// ---------------------------------------------------------------------------

/**
 * Parse ID3 tags from MP3 buffer using music-metadata
 */
export async function parseMP3Metadata(buffer: Buffer): Promise<MetadataField[]> {
  const fields: MetadataField[] = [];

  try {
    const metadata = await parseBuffer(buffer, 'audio/mpeg');

    // Common tags
    const common = metadata.common;

    const tagMapping: Record<string, string[]> = {
      title: ['TIT2', 'title'],
      artist: ['TPE1', 'artist'],
      album: ['TALB', 'album'],
      year: ['TYER', 'year'],
      comment: ['COMM', 'comment'],
      genre: ['TCON', 'genre'],
      track: ['TRCK', 'track'],
      albumartist: ['TPE2', 'albumartist'],
      composer: ['TCOM', 'composer'],
      lyricist: ['TEXT', 'lyricist'],
    };

    for (const [field, sources] of Object.entries(tagMapping)) {
      const value = common[field as keyof typeof common];
      const strValue = normalizeTagValue(value);
      if (strValue && strValue.length > 0 && strValue.length < LIMITS.MAX_METADATA_VALUE_SIZE) {
        fields.push({
          key: field,
          value: strValue,
          source: `ID3.${sources[0]}`,
        });
      }
    }

    // Native tags for additional fields (FIX-2.2)
    if (metadata.native) {
      for (const [tagType, nativeBlock] of Object.entries(metadata.native)) {
        if (tagType.startsWith('ID3') && Array.isArray(nativeBlock)) {
          for (const tag of nativeBlock) {
            const tagObj = tag as { id: string; value: unknown };
            const strValue = normalizeTagValue(tagObj.value);
            if (strValue && strValue.length > 0 && strValue.length < LIMITS.MAX_METADATA_VALUE_SIZE) {
              fields.push({
                key: tagObj.id,
                value: strValue,
                source: `ID3.${tagObj.id}`,
              });
            }
          }
        }
      }
    }
  } catch {
    // MP3 parse failed
  }

  return fields;
}

/**
 * Parse RIFF metadata from WAV buffer using music-metadata
 */
export async function parseWAVMetadata(buffer: Buffer): Promise<MetadataField[]> {
  const fields: MetadataField[] = [];

  try {
    const metadata = await parseBuffer(buffer, 'audio/wav');

    // Common tags (FIX-2.2)
    const common = metadata.common;
    const tagFields = ['title', 'artist', 'album', 'comment', 'genre', 'year'];

    for (const field of tagFields) {
      const value = common[field as keyof typeof common];
      const strValue = normalizeTagValue(value);
      if (strValue && strValue.length > 0 && strValue.length < LIMITS.MAX_METADATA_VALUE_SIZE) {
        fields.push({
          key: field,
          value: strValue,
          source: 'RIFF.INFO',
        });
      }
    }

    // Native RIFF/LIST tags (FIX-2.2)
    if (metadata.native) {
      for (const [tagType, nativeBlock] of Object.entries(metadata.native)) {
        if (tagType.includes('RIFF') && Array.isArray(nativeBlock)) {
          for (const tag of nativeBlock) {
            const tagObj = tag as { id: string; value: unknown };
            const strValue = normalizeTagValue(tagObj.value);
            if (strValue && strValue.length > 0 && strValue.length < LIMITS.MAX_METADATA_VALUE_SIZE) {
              fields.push({
                key: tagObj.id,
                value: strValue,
                source: 'RIFF.INFO',
              });
            }
          }
        }
      }
    }
  } catch {
    // WAV parse failed
  }

  return fields;
}

/**
 * Parse Vorbis comments from OGG/FLAC buffer using music-metadata
 */
export async function parseVorbisMetadata(buffer: Buffer, mimeType: string): Promise<MetadataField[]> {
  const fields: MetadataField[] = [];

  try {
    const metadata = await parseBuffer(buffer, mimeType);

    // Common tags from Vorbis comments (FIX-2.2)
    const common = metadata.common;
    const tagFields = [
      'title', 'artist', 'album', 'comment', 'genre', 'year',
      'track', 'albumartist', 'composer', 'description',
    ];

    for (const field of tagFields) {
      const value = common[field as keyof typeof common];
      const strValue = normalizeTagValue(value);
      if (strValue && strValue.length > 0 && strValue.length < LIMITS.MAX_METADATA_VALUE_SIZE) {
        fields.push({
          key: field,
          value: strValue,
          source: 'Vorbis.COMMENT',
        });
      }
    }

    // Native Vorbis comments (FIX-2.2)
    if (metadata.native) {
      for (const [tagType, nativeBlock] of Object.entries(metadata.native)) {
        if ((tagType.includes('vorbis') || tagType.includes('Vorbis')) && Array.isArray(nativeBlock)) {
          for (const tag of nativeBlock) {
            const tagObj = tag as { id: string; value: unknown };
            const strValue = normalizeTagValue(tagObj.value);
            if (strValue && strValue.length > 0 && strValue.length < LIMITS.MAX_METADATA_VALUE_SIZE) {
              fields.push({
                key: tagObj.id,
                value: strValue,
                source: 'Vorbis.COMMENT',
              });
            }
          }
        }
      }
    }
  } catch {
    // Vorbis parse failed
  }

  return fields;
}

/**
 * Parse iTunes metadata from M4A/MP4 buffer using music-metadata
 */
export async function parseM4AMetadata(buffer: Buffer): Promise<MetadataField[]> {
  const fields: MetadataField[] = [];

  try {
    const metadata = await parseBuffer(buffer, 'audio/mp4');

    // Common tags (FIX-2.2)
    const common = metadata.common;
    const tagFields = [
      'title', 'artist', 'album', 'comment', 'genre', 'year',
      'track', 'albumartist', 'composer', 'description',
      'copyright', 'encodedby',
    ];

    for (const field of tagFields) {
      const value = common[field as keyof typeof common];
      const strValue = normalizeTagValue(value);
      if (strValue && strValue.length > 0 && strValue.length < LIMITS.MAX_METADATA_VALUE_SIZE) {
        fields.push({
          key: field,
          value: strValue,
          source: 'iTunes.META',
        });
      }
    }

    // Native iTunes/MP4 atoms (FIX-2.2)
    if (metadata.native) {
      for (const [tagType, nativeBlock] of Object.entries(metadata.native)) {
        if ((tagType.includes('iTunes') || tagType.includes('mp4')) && Array.isArray(nativeBlock)) {
          for (const tag of nativeBlock) {
            const tagObj = tag as { id: string; value: unknown };
            const strValue = normalizeTagValue(tagObj.value);
            if (strValue && strValue.length > 0 && strValue.length < LIMITS.MAX_METADATA_VALUE_SIZE) {
              fields.push({
                key: tagObj.id,
                value: strValue,
                source: 'iTunes.META',
              });
            }
          }
        }
      }
    }
  } catch {
    // M4A parse failed
  }

  return fields;
}

/**
 * Parse WMA metadata from WMA buffer using music-metadata
 */
export async function parseWMAMetadata(buffer: Buffer): Promise<MetadataField[]> {
  const fields: MetadataField[] = [];

  try {
    const metadata = await parseBuffer(buffer, 'audio/x-ms-wma');

    // Common tags (FIX-2.2)
    const common = metadata.common;
    const tagFields = [
      'title', 'artist', 'album', 'comment', 'genre', 'year',
      'track', 'albumartist', 'composer', 'description',
      'copyright',
    ];

    for (const field of tagFields) {
      const value = common[field as keyof typeof common];
      const strValue = normalizeTagValue(value);
      if (strValue && strValue.length > 0 && strValue.length < LIMITS.MAX_METADATA_VALUE_SIZE) {
        fields.push({
          key: field,
          value: strValue,
          source: 'ASF.WMA',
        });
      }
    }

    // Native ASF/WMA attributes (FIX-2.2)
    if (metadata.native) {
      for (const [tagType, nativeBlock] of Object.entries(metadata.native)) {
        if (tagType.includes('ASF') && Array.isArray(nativeBlock)) {
          for (const tag of nativeBlock) {
            const tagObj = tag as { id: string; value: unknown };
            const strValue = normalizeTagValue(tagObj.value);
            if (strValue && strValue.length > 0 && strValue.length < LIMITS.MAX_METADATA_VALUE_SIZE) {
              fields.push({
                key: tagObj.id,
                value: strValue,
                source: 'ASF.WMA',
              });
            }
          }
        }
      }
    }
  } catch {
    // WMA parse failed
  }

  return fields;
}

// ---------------------------------------------------------------------------
// 4. TEXT EXTRACTION
// ---------------------------------------------------------------------------

/**
 * Extract all text values from metadata fields
 * SECURITY: Protected against unbounded text extraction (FIX-1.3)
 */
export function extractTextFields(fields: MetadataField[]): string {
  const parts: string[] = [];
  let totalSize = 0;

  for (const field of fields) {
    // Skip empty values
    if (!field.value || field.value.length === 0) continue;

    const segment = `${field.source}: ${field.key}=${field.value}`;

    // SECURITY: Stop if we've hit the size limit
    if (totalSize + segment.length > LIMITS.MAX_EXTRACTED_TEXT) {
      break;
    }

    parts.push(segment);
    totalSize += segment.length;
  }

  return parts.join(' | ');
}

/**
 * Extract unique metadata sources from fields
 */
export function extractSources(fields: MetadataField[]): string[] {
  const sources = new Set<string>();
  for (const field of fields) {
    // Extract the source prefix (e.g., "EXIF" from "EXIF.UserComment")
    const parts = field.source.split('.');
    const prefix = parts[0] ?? field.source;
    sources.add(prefix);
  }
  return Array.from(sources);
}

// ---------------------------------------------------------------------------
// 5. ORCHESTRATION
// ---------------------------------------------------------------------------

/**
 * Main entry point: Extract all metadata from binary file
 */
export async function extractMetadata(buffer: Buffer): Promise<BinaryParseResult> {
  const format = detectFormat(buffer);
  const warnings: string[] = [];
  const errors: string[] = [];
  let fields: MetadataField[] = [];

  try {
    switch (format) {
      case 'JPEG':
        fields = await parseJPEGMetadata(buffer);
        if (fields.length === 0) {
          warnings.push('No EXIF metadata found in JPEG');
        }
        break;

      case 'PNG':
        fields = parsePNGMetadata(buffer);
        if (fields.length === 0) {
          warnings.push('No text chunks found in PNG');
        }
        break;

      case 'WebP':
        fields = await parseWebPMetadata(buffer);
        if (fields.length === 0) {
          warnings.push('No metadata found in WebP');
        }
        break;

      case 'GIF':
        fields = parseGIFMetadata(buffer);
        if (fields.length === 0) {
          warnings.push('No comment extensions found in GIF');
        }
        break;

      case 'SVG':
        fields = parseSVGMetadata(buffer);
        if (fields.length === 0) {
          warnings.push('No text content found in SVG');
        }
        break;

      case 'MP3':
        fields = await parseMP3Metadata(buffer);
        if (fields.length === 0) {
          warnings.push('No ID3 tags found in MP3');
        }
        break;

      case 'WAV':
        fields = await parseWAVMetadata(buffer);
        if (fields.length === 0) {
          warnings.push('No RIFF metadata found in WAV');
        }
        break;

      case 'OGG':
        fields = await parseVorbisMetadata(buffer, 'audio/ogg');
        if (fields.length === 0) {
          warnings.push('No Vorbis comments found in OGG');
        }
        break;

      case 'FLAC':
        fields = await parseVorbisMetadata(buffer, 'audio/flac');
        if (fields.length === 0) {
          warnings.push('No Vorbis comments found in FLAC');
        }
        break;

      case 'M4A':
        fields = await parseM4AMetadata(buffer);
        if (fields.length === 0) {
          warnings.push('No iTunes metadata found in M4A');
        }
        break;

      case 'WMA':
        fields = await parseWMAMetadata(buffer);
        if (fields.length === 0) {
          warnings.push('No ASF metadata found in WMA');
        }
        break;

      case 'UNKNOWN':
        errors.push('Unknown or unsupported binary format');
        break;

      default:
        errors.push(`Unsupported format: ${format}`);
        break;
    }
  } catch (error) {
    errors.push(`Parse error: ${error instanceof Error ? error.message : String(error)}`);
  }

  return {
    format,
    valid: errors.length === 0,
    fields,
    warnings,
    errors,
  };
}
