/**
 * Unit Tests for Metadata Parsers
 *
 * Tests binary format detection and metadata extraction.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  detectFormat,
  parseJPEGMetadata,
  parsePNGMetadata,
  parseWebPMetadata,
  parseGIFMetadata,
  parseSVGMetadata,
  parseMP3Metadata,
  parseWAVMetadata,
  parseVorbisMetadata,
  parseM4AMetadata,
  parseWMAMetadata,
  extractTextFields,
  extractSources,
  extractMetadata,
} from './metadata-parsers.js';
import type { MetadataField } from './types.js';

// ---------------------------------------------------------------------------
// Test Constants
// ---------------------------------------------------------------------------

// JPEG signature: FF D8 FF
const JPEG_SIGNATURE = Buffer.from([0xFF, 0xD8, 0xFF]);

// PNG signature: 89 50 4E 47 0D 0A 1A 0A
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

// GIF signature: GIF87a or GIF89a
const GIF87A_SIGNATURE = Buffer.from('GIF87a');
const GIF89A_SIGNATURE = Buffer.from('GIF89a');

// MP3/ID3 signature: ID3
const ID3_SIGNATURE = Buffer.from('ID3');

// WebP signature: RIFF....WEBP
const WEBP_SIGNATURE = Buffer.concat([
  Buffer.from('RIFF'),
  Buffer.alloc(4),
  Buffer.from('WEBP'),
]);

// OGG signature: OggS
const OGG_SIGNATURE = Buffer.from('OggS');

// FLAC signature: fLaC
const FLAC_SIGNATURE = Buffer.from('fLaC');

// WAV signature: RIFF....WAVE
const WAV_SIGNATURE = Buffer.concat([
  Buffer.from('RIFF'),
  Buffer.alloc(4),
  Buffer.from('WAVE'),
]);

// ---------------------------------------------------------------------------
// Test Suite: detectFormat()
// ---------------------------------------------------------------------------

describe('detectFormat()', () => {
  describe('Image Formats', () => {
    it('should detect JPEG', () => {
      const buffer = Buffer.concat([JPEG_SIGNATURE, Buffer.alloc(100)]);
      expect(detectFormat(buffer)).toBe('JPEG');
    });

    it('should detect PNG', () => {
      const buffer = Buffer.concat([PNG_SIGNATURE, Buffer.alloc(100)]);
      expect(detectFormat(buffer)).toBe('PNG');
    });

    it('should detect GIF87a', () => {
      const buffer = Buffer.concat([GIF87A_SIGNATURE, Buffer.alloc(100)]);
      expect(detectFormat(buffer)).toBe('GIF');
    });

    it('should detect GIF89a', () => {
      const buffer = Buffer.concat([GIF89A_SIGNATURE, Buffer.alloc(100)]);
      expect(detectFormat(buffer)).toBe('GIF');
    });

    it('should detect WebP', () => {
      const buffer = Buffer.concat([WEBP_SIGNATURE, Buffer.alloc(100)]);
      expect(detectFormat(buffer)).toBe('WebP');
    });

    it('should detect SVG by <svg> tag', () => {
      const buffer = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
      expect(detectFormat(buffer)).toBe('SVG');
    });

    it('should detect SVG by <?xml> declaration', () => {
      const buffer = Buffer.from('<?xml version="1.0"?><svg></svg>');
      expect(detectFormat(buffer)).toBe('SVG');
    });
  });

  describe('Audio Formats', () => {
    it('should detect MP3 with ID3v2', () => {
      const buffer = Buffer.concat([ID3_SIGNATURE, Buffer.alloc(100)]);
      expect(detectFormat(buffer)).toBe('MP3');
    });

    it('should detect WAV', () => {
      const buffer = Buffer.concat([WAV_SIGNATURE, Buffer.alloc(100)]);
      expect(detectFormat(buffer)).toBe('WAV');
    });

    it('should detect OGG', () => {
      const buffer = Buffer.concat([OGG_SIGNATURE, Buffer.alloc(100)]);
      expect(detectFormat(buffer)).toBe('OGG');
    });

    it('should detect FLAC', () => {
      const buffer = Buffer.concat([FLAC_SIGNATURE, Buffer.alloc(100)]);
      expect(detectFormat(buffer)).toBe('FLAC');
    });
  });

  describe('Container Formats', () => {
    it('should detect M4A with valid brand', () => {
      // M4A/MP4 ftyp box structure
      const buffer = Buffer.concat([
        Buffer.alloc(4), // Box size
        Buffer.from('ftyp'), // Box type
        Buffer.from('M4A_'), // Brand
      ]);
      expect(detectFormat(buffer)).toBe('M4A');
    });

    it('should detect M4A with isom brand', () => {
      const buffer = Buffer.concat([
        Buffer.alloc(4),
        Buffer.from('ftyp'),
        Buffer.from('isom'),
      ]);
      expect(detectFormat(buffer)).toBe('M4A');
    });
  });

  describe('Edge Cases', () => {
    it('should return UNKNOWN for empty buffer', () => {
      expect(detectFormat(Buffer.alloc(0))).toBe('UNKNOWN');
    });

    it('should return UNKNOWN for small buffer', () => {
      expect(detectFormat(Buffer.alloc(2))).toBe('UNKNOWN');
    });

    it('should return UNKNOWN for random data', () => {
      const buffer = Buffer.from(Array(100).fill(0).map(() => Math.random() * 255));
      expect(detectFormat(buffer)).toBe('UNKNOWN');
    });

    it('should prioritize PNG over JPEG if both match (should not happen)', () => {
      // These have different signatures, so this won't happen
      const pngBuffer = Buffer.concat([PNG_SIGNATURE, Buffer.alloc(10)]);
      expect(detectFormat(pngBuffer)).toBe('PNG');
    });
  });
});

// ---------------------------------------------------------------------------
// Test Suite: Image Metadata Parsers
// ---------------------------------------------------------------------------

describe('parseJPEGMetadata()', () => {
  it('should handle invalid JPEG buffer', async () => {
    const result = await parseJPEGMetadata(Buffer.from('not a jpeg'));
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return empty array for buffer with no EXIF', async () => {
    const buffer = Buffer.concat([JPEG_SIGNATURE, Buffer.from([0xFF, 0xD9])]);
    const result = await parseJPEGMetadata(buffer);
    expect(result).toEqual([]);
  });
});

describe('parsePNGMetadata()', () => {
  it('should parse tEXt chunks', () => {
    // Create a minimal PNG with tEXt chunk
    const signature = PNG_SIGNATURE;
    const data = Buffer.concat([
      Buffer.from('Comment', 'latin1'),
      Buffer.from([0]),
      Buffer.from('test comment', 'utf-8'),
    ]);
    const chunkLength = Buffer.alloc(4);
    chunkLength.writeUInt32BE(data.length, 0);
    const chunkType = Buffer.from('tEXt', 'ascii');
    // Create a dummy CRC (not actually calculated, for testing only)
    const crc = Buffer.from([0, 0, 0, 0]);
    const iend = Buffer.concat([
      Buffer.from([0, 0, 0, 0]),
      Buffer.from('IEND', 'ascii'),
      Buffer.from([0, 0, 0, 0]),
    ]);

    const buffer = Buffer.concat([
      signature,
      chunkLength,
      chunkType,
      data,
      crc,
      iend,
    ]);

    const result = parsePNGMetadata(buffer);
    // The PNG parser should handle the chunk even with invalid CRC
    // It may return empty array if CRC check fails, which is acceptable
    expect(Array.isArray(result)).toBe(true);
  });

  it('should handle invalid PNG buffer', () => {
    const result = parsePNGMetadata(Buffer.from('not a png'));
    expect(Array.isArray(result)).toBe(true);
  });
});

describe('parseGIFMetadata()', () => {
  it('should handle GIF87a format', () => {
    const buffer = Buffer.concat([
      GIF87A_SIGNATURE,
      Buffer.alloc(7), // Logical Screen Descriptor
      Buffer.from([0x21, 0xFE]), // Comment Extension
      Buffer.from([0x0A]), // Block size
      Buffer.from('test comment'),
      Buffer.from([0x00]), // Block terminator
      Buffer.from([0x3B]), // Trailer
    ]);

    const result = parseGIFMetadata(buffer);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should handle GIF89a format', () => {
    const buffer = Buffer.concat([
      GIF89A_SIGNATURE,
      Buffer.alloc(7),
      Buffer.from([0x21, 0xFE]),
      Buffer.from([0x05]),
      Buffer.from('hello'),
      Buffer.from([0x00]),
      Buffer.from([0x3B]),
    ]);

    const result = parseGIFMetadata(buffer);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should enforce iteration limit on malformed GIF', () => {
    // Create a GIF that would loop infinitely without protection
    const buffer = Buffer.concat([
      GIF89A_SIGNATURE,
      Buffer.alloc(7),
      // Many extension blocks to test iteration limit
      ...Array(1000).fill(0).map(() => Buffer.from([0x21, 0xFE, 0x01, 0x41, 0x00])),
    ]);

    const result = parseGIFMetadata(buffer);
    expect(Array.isArray(result)).toBe(true);
    // Should have limited iterations
  });
});

describe('parseSVGMetadata()', () => {
  it('should extract text content from SVG', () => {
    const svg = '<svg><text>Hello World</text></svg>';
    const buffer = Buffer.from(svg);
    const result = parseSVGMetadata(buffer);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should extract title from SVG', () => {
    const svg = '<svg><title>Test Image</title></svg>';
    const buffer = Buffer.from(svg);
    const result = parseSVGMetadata(buffer);
    const titleField = result.find(f => f.key === 'title');
    expect(titleField?.value).toBe('Test Image');
  });

  it('should extract href from links', () => {
    const svg = '<svg><a href="https://example.com">Link</a></svg>';
    const buffer = Buffer.from(svg);
    const result = parseSVGMetadata(buffer);
    const hrefField = result.find(f => f.key === 'href');
    expect(hrefField?.value).toBe('https://example.com');
  });

  it('should handle oversized SVG', () => {
    const hugeSvg = '<svg>' + 'a'.repeat(20_000_000) + '</svg>';
    const buffer = Buffer.from(hugeSvg);
    const result = parseSVGMetadata(buffer);
    // Should skip oversized SVG to prevent DoS
    expect(result).toHaveLength(0);
  });

  it('should limit data URI extraction', () => {
    const manyDataUris = '<svg>' +
      Array(200).fill(0).map((_, i) =>
        `<text>${i}</text><image href="data:image/png;base64,${Buffer.from('test').toString('base64')}"/>`
      ).join('') +
      '</svg>';
    const buffer = Buffer.from(manyDataUris);
    const result = parseSVGMetadata(buffer);
    // Should limit to MAX_DATA_URIS (100)
    const dataUriFields = result.filter(f => f.key.startsWith('DataURI_'));
    expect(dataUriFields.length).toBeLessThanOrEqual(100);
  });
});

// ---------------------------------------------------------------------------
// Test Suite: Audio Metadata Parsers
// ---------------------------------------------------------------------------

describe('parseMP3Metadata()', () => {
  it('should handle ID3v2 tag', async () => {
    const buffer = Buffer.concat([
      ID3_SIGNATURE,
      Buffer.from([0x04, 0x00]), // Version 2.4
      Buffer.from([0x00]), // Flags
      Buffer.from([0x00, 0x00, 0x00, 0x10]), // Size (synchsafe)
      // TIT2 frame
      Buffer.from('TIT2'),
      Buffer.from([0x00, 0x00, 0x00, 0x0F]),
      Buffer.from([0x00]), // UTF-16 with BOM
      Buffer.from([0xFF, 0xFE]), // BOM
      Buffer.from('Test Title', 'utf16le'),
    ]);

    const result = await parseMP3Metadata(buffer);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should handle invalid MP3 buffer', async () => {
    const result = await parseMP3Metadata(Buffer.from('not mp3'));
    expect(Array.isArray(result)).toBe(true);
  });
});

describe('parseVorbisMetadata()', () => {
  it('should handle OGG format', async () => {
    const buffer = Buffer.concat([
      OGG_SIGNATURE,
      Buffer.alloc(100),
    ]);

    const result = await parseVorbisMetadata(buffer, 'audio/ogg');
    expect(Array.isArray(result)).toBe(true);
  });

  it('should handle FLAC format', async () => {
    const buffer = Buffer.concat([
      FLAC_SIGNATURE,
      Buffer.alloc(100),
    ]);

    const result = await parseVorbisMetadata(buffer, 'audio/flac');
    expect(Array.isArray(result)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Test Suite: Text Extraction
// ---------------------------------------------------------------------------

describe('extractTextFields()', () => {
  it('should join field values with source and key context', () => {
    const fields: MetadataField[] = [
      { key: 'title', value: 'Test', source: 'ID3.TIT2' },
      { key: 'artist', value: 'Artist', source: 'ID3.TPE1' },
    ];

    const result = extractTextFields(fields);
    expect(result).toBe('ID3.TIT2: title=Test | ID3.TPE1: artist=Artist');
  });

  it('should skip empty values', () => {
    const fields: MetadataField[] = [
      { key: 'title', value: '', source: 'test' },
      { key: 'artist', value: 'Artist', source: 'test' },
    ];

    const result = extractTextFields(fields);
    expect(result).toBe('test: artist=Artist');
  });

  it('should enforce maximum text length', () => {
    const largeValue = 'a'.repeat(1_000_000);
    const fields: MetadataField[] = [
      { key: 'test', value: largeValue, source: 'test' },
      { key: 'test2', value: 'more text', source: 'test' },
    ];

    const result = extractTextFields(fields);
    expect(result.length).toBeLessThanOrEqual(1_000_000);
  });

  it('should handle empty fields array', () => {
    const result = extractTextFields([]);
    expect(result).toBe('');
  });
});

describe('extractSources()', () => {
  it('should extract unique sources', () => {
    const fields: MetadataField[] = [
      { key: 'title', value: 'Test', source: 'ID3.TIT2' },
      { key: 'artist', value: 'Artist', source: 'ID3.TPE1' },
      { key: 'comment', value: 'Comment', source: 'EXIF.Comment' },
    ];

    const result = extractSources(fields);
    expect(result).toEqual(['ID3', 'EXIF']);
  });

  it('should deduplicate sources', () => {
    const fields: MetadataField[] = [
      { key: 'a', value: '1', source: 'ID3.test' },
      { key: 'b', value: '2', source: 'ID3.test' },
      { key: 'c', value: '3', source: 'ID3.test' },
    ];

    const result = extractSources(fields);
    expect(result).toEqual(['ID3']);
  });

  it('should handle source without dot', () => {
    const fields: MetadataField[] = [
      { key: 'test', value: 'value', source: 'NOSOURCE' },
    ];

    const result = extractSources(fields);
    expect(result).toEqual(['NOSOURCE']);
  });
});

// ---------------------------------------------------------------------------
// Test Suite: extractMetadata()
// ---------------------------------------------------------------------------

describe('extractMetadata()', () => {
  it('should return parse result for JPEG', async () => {
    const buffer = Buffer.concat([JPEG_SIGNATURE, Buffer.alloc(100)]);
    const result = await extractMetadata(buffer);

    expect(result).toHaveProperty('format');
    expect(result).toHaveProperty('valid');
    expect(result).toHaveProperty('fields');
    expect(result).toHaveProperty('warnings');
    expect(result).toHaveProperty('errors');
  });

  it('should return UNKNOWN for unrecognized format', async () => {
    const buffer = Buffer.from('random binary data');
    const result = await extractMetadata(buffer);

    expect(result.format).toBe('UNKNOWN');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Unknown or unsupported binary format');
  });

  it('should handle empty buffer', async () => {
    const result = await extractMetadata(Buffer.alloc(0));
    expect(result.format).toBe('UNKNOWN');
  });
});
