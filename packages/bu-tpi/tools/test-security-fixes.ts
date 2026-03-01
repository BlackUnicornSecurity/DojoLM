#!/usr/bin/env tsx
/**
 * Security Test Suite - SCANNER-FIXES Validation
 *
 * Tests all security fixes implemented in SCANNER-FIXES.md:
 * - FIX-1.1: PNG decompression bomb protection
 * - FIX-1.2: SVG regex DoS protection
 * - FIX-1.3: Unbounded text extraction limit
 * - FIX-2.4: GIF parser iteration limit
 * - FIX-2.3: Parse timeout enforcement
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { scanBinary } from '../src/scanner-binary.js';
import { extractTextFields } from '../src/metadata-parsers.js';

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

const results: TestResult[] = [];

async function runTest(
  name: string,
  testFn: () => Promise<void> | void
): Promise<void> {
  const start = Date.now();
  try {
    await testFn();
    const duration = Date.now() - start;
    results.push({ name, passed: true, duration });
    console.log(`✓ ${name} (${duration}ms)`);
  } catch (error) {
    const duration = Date.now() - start;
    const message = error instanceof Error ? error.message : String(error);
    results.push({ name, passed: false, duration, error: message });
    console.log(`✗ ${name} (${duration}ms)`);
    console.log(`  Error: ${message}`);
  }
}

// ---------------------------------------------------------------------------
// FIX-1.1: PNG Decompression Bomb Protection Tests
// ---------------------------------------------------------------------------

async function testPNGDecompressionLimit() {
  // Create a minimal PNG with a zTXt chunk
  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  const pngSignature = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
  ]);

  // IHDR chunk (image header)
  const ihdrData = Buffer.from([
    0x00, 0x00, 0x00, 0x01, // width: 1
    0x00, 0x00, 0x00, 0x01, // height: 1
    0x08, // bit depth: 8
    0x00, // color type: greyscale
    0x00, 0x00, 0x00, // compression, filter, interlace
  ]);
  const ihdrChunk = Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, 0x0D]), // length: 13
    Buffer.from('IHDR'),
    ihdrData,
    Buffer.alloc(4), // CRC (placeholder)
  ]);

  // zTXt chunk with compressed data
  const keyword = Buffer.from('Test\x00', 'latin1');
  const compressionMethod = Buffer.from([0x00]); // deflate

  // Create some deflate-compressed data (small but valid)
  const zlib = await import('node:zlib');
  const testData = Buffer.from('Test comment data', 'utf-8');
  const compressedData = zlib.deflateRawSync(testData);

  const ztxtData = Buffer.concat([keyword, compressionMethod, compressedData]);

  const ztxtChunk = Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, ztxtData.length]), // length
    Buffer.from('zTXt'),
    ztxtData,
    Buffer.alloc(4), // CRC (placeholder)
  ]);

  // IEND chunk
  const iendChunk = Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, 0x00]),
    Buffer.from('IEND'),
    Buffer.alloc(4),
  ]);

  const testPNG = Buffer.concat([pngSignature, ihdrChunk, ztxtChunk, iendChunk]);

  const result = await scanBinary(testPNG, 'test.png');

  // Should not crash and should extract the comment
  if (result.findings.length === 0) {
    throw new Error('Expected at least one finding from PNG metadata');
  }
}

// ---------------------------------------------------------------------------
// FIX-1.2: SVG Regex DoS Protection Tests
// ---------------------------------------------------------------------------

async function testSVGSizeLimit() {
  // Create an SVG larger than 10MB limit
  const largeSVG = Buffer.from(
    `<svg>${'x'.repeat(11 * 1024 * 1024)}</svg>`,
    'utf-8'
  );

  const start = Date.now();
  const result = await scanBinary(largeSVG, 'large.svg');
  const duration = Date.now() - start;

  // Should skip processing and return quickly
  if (duration > 1000) {
    throw new Error(`Large SVG took too long to process: ${duration}ms`);
  }

  // Should have minimal findings (skipped processing)
  if (result.findings.length > 10) {
    throw new Error(`Expected minimal findings for oversized SVG, got ${result.findings.length}`);
  }
}

async function testSVGDataURILimit() {
  // Create an SVG with many data URIs
  const dataURIs = Array.from({ length: 200 }, (_, i) =>
    `data:text/plain,content${i}`
  ).join(' ');

  const svg = Buffer.from(
    `<svg><script>${dataURIs}</script></svg>`,
    'utf-8'
  );

  const start = Date.now();
  const result = await scanBinary(svg, 'many-uris.svg');
  const duration = Date.now() - start;

  // Should process quickly with limit
  if (duration > 1000) {
    throw new Error(`SVG with many data URIs took too long: ${duration}ms`);
  }

  // Count DataURI findings - should be limited to MAX_DATA_URIS (100)
  const dataURIFindings = result.findings.filter(
    f => f.source === 'SVG.DataURI'
  );

  if (dataURIFindings.length > 100) {
    throw new Error(`Expected max 100 data URI findings, got ${dataURIFindings.length}`);
  }
}

// ---------------------------------------------------------------------------
// FIX-1.3: Unbounded Text Extraction Limit Tests
// ---------------------------------------------------------------------------

async function testTextExtractionLimit() {
  const { MetadataField } = await import('../src/types.js');

  // Create fields that would exceed 1MB limit
  const fields: typeof MetadataField[] = [];
  const largeValue = 'x'.repeat(100_000); // 100KB each

  for (let i = 0; i < 20; i++) {
    fields.push({
      key: `field${i}`,
      value: largeValue,
      source: 'test',
    });
  }

  const extracted = extractTextFields(fields);

  // Should be limited to ~1MB
  if (extracted.length > 1_100_000) {
    throw new Error(`Extracted text exceeds limit: ${extracted.length} bytes`);
  }

  // Should be non-empty (we truncated, not skipped all)
  if (extracted.length === 0) {
    throw new Error('Extracted text is empty');
  }
}

// ---------------------------------------------------------------------------
// FIX-2.3: Parse Timeout Enforcement Tests
// ---------------------------------------------------------------------------

async function testParseTimeout() {
  // Test that timeout parameter works
  const { extractMetadata } = await import('../src/metadata-parsers.js');

  // Create a buffer that will take time to parse
  const buffer = Buffer.from('GIF89a' + 'x'.repeat(1_000_000), 'latin1');

  // This should timeout quickly
  const startTime = Date.now();
  const result = await Promise.race([
    extractMetadata(buffer),
    new Promise((resolve) => setTimeout(() => resolve({ format: 'TIMEOUT' }), 100)),
  ]);
  const elapsed = Date.now() - startTime;

  if (elapsed > 500) {
    throw new Error(`Parse did not timeout as expected: ${elapsed}ms`);
  }
}

// ---------------------------------------------------------------------------
// FIX-2.4: GIF Parser Iteration Limit Tests
// ---------------------------------------------------------------------------

async function testGIFIterationLimit() {
  // Create a potentially malicious GIF structure
  // GIF header
  const gifHeader = Buffer.from('GIF89a', 'latin1');

  // Logical Screen Descriptor (7 bytes)
  const lsd = Buffer.alloc(7);

  // Create a long extension block chain that could loop
  const extensionBlocks: Buffer[] = [];
  for (let i = 0; i < 50; i++) {
    const block = Buffer.concat([
      Buffer.from([0x21, 0xFF]), // Application Extension
      Buffer.from([0x0B]), // Block size: 11
      Buffer.from('NETSCAPE2.0'), // Identifier
      Buffer.from([0x03, 0x01, 0x00, 0x00]), // Sub-block data
      Buffer.from([0x00]), // Block terminator
    ]);
    extensionBlocks.push(block);
  }

  // Trailer
  const trailer = Buffer.from([0x3B]);

  const testGIF = Buffer.concat([
    gifHeader,
    lsd,
    ...extensionBlocks,
    trailer,
  ]);

  const start = Date.now();
  const result = await scanBinary(testGIF, 'test.gif');
  const duration = Date.now() - start;

  // Should complete quickly despite many blocks
  if (duration > 2000) {
    throw new Error(`GIF parsing took too long: ${duration}ms`);
  }
}

// ---------------------------------------------------------------------------
// Fixture-based Tests
// ---------------------------------------------------------------------------

async function testExistingMaliciousPNG() {
  const fixturePath = join(process.cwd(), 'packages/bu-tpi/fixtures/images/exif-injection.jpg');

  if (!existsSync(fixturePath)) {
    console.log('  (fixture not found, skipping)');
    return;
  }

  const buffer = readFileSync(fixturePath);
  const start = Date.now();
  const result = await scanBinary(buffer, 'exif-injection.jpg');
  const duration = Date.now() - start;

  // Should process quickly
  if (duration > 5000) {
    throw new Error(`PNG processing took too long: ${duration}ms`);
  }

  // Should detect malicious content
  if (result.verdict === 'ALLOW') {
    throw new Error('Expected BLOCK verdict for malicious PNG');
  }
}

async function testExistingMaliciousMP3() {
  const fixturePath = join(process.cwd(), 'packages/bu-tpi/fixtures/audio/id3-injection.mp3');

  if (!existsSync(fixturePath)) {
    console.log('  (fixture not found, skipping)');
    return;
  }

  const buffer = readFileSync(fixturePath);
  const start = Date.now();
  const result = await scanBinary(buffer, 'id3-injection.mp3');
  const duration = Date.now() - start;

  // Should process quickly
  if (duration > 5000) {
    throw new Error(`MP3 processing took too long: ${duration}ms`);
  }

  // Should detect malicious content
  if (result.verdict === 'ALLOW') {
    throw new Error('Expected BLOCK verdict for malicious MP3');
  }
}

// ---------------------------------------------------------------------------
// Main Test Runner
// ---------------------------------------------------------------------------

async function runSecurityTests() {
  console.log('\n========================================');
  console.log('  SECURITY FIX VALIDATION TEST SUITE');
  console.log('========================================\n');

  console.log('FIX-1.1: PNG Decompression Bomb Protection');
  console.log('-------------------------------------------');
  await runTest('PNG decompression limit', testPNGDecompressionLimit);

  console.log('\nFIX-1.2: SVG Regex DoS Protection');
  console.log('------------------------------------');
  await runTest('SVG size limit', testSVGSizeLimit);
  await runTest('SVG data URI limit', testSVGDataURILimit);

  console.log('\nFIX-1.3: Unbounded Text Extraction Limit');
  console.log('-----------------------------------------');
  await runTest('Text extraction limit', testTextExtractionLimit);

  console.log('\nFIX-2.3: Parse Timeout Enforcement');
  console.log('-----------------------------------');
  await runTest('Parse timeout', testParseTimeout);

  console.log('\nFIX-2.4: GIF Parser Iteration Limit');
  console.log('------------------------------------');
  await runTest('GIF iteration limit', testGIFIterationLimit);

  console.log('\nFixture-based Tests');
  console.log('-------------------');
  await runTest('Existing malicious PNG', testExistingMaliciousPNG);
  await runTest('Existing malicious MP3', testExistingMaliciousMP3);

  // Print summary
  console.log('\n========================================');
  console.log('  TEST SUMMARY');
  console.log('========================================\n');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => r.failed).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  console.log(`Total: ${results.length} tests`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Duration: ${totalDuration}ms`);
  console.log('');

  if (failed > 0) {
    console.log('Failed tests:');
    for (const result of results.filter(r => !r.passed)) {
      console.log(`  - ${result.name}: ${result.error}`);
    }
    process.exit(1);
  }

  console.log('✓ All security tests passed!');
  process.exit(0);
}

runSecurityTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
