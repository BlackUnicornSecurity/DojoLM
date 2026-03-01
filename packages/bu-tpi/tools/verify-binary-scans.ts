import { scan } from '../src/scanner.js';
import { scanBinary } from '../src/scanner-binary.js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Test files that should be detected as malicious
const maliciousFiles = [
  'fixtures/images/exif-injection.jpg',
  'fixtures/images/exif-subtle.jpg',
  'fixtures/images/text-chunk-injection.png',
  'fixtures/images/text-chunk-synonym.png',
  'fixtures/audio/id3-injection.mp3',
  'fixtures/audio/id3-subtle.mp3',
  'fixtures/audio/riff-injection.wav',
  'fixtures/audio/ogg-vorbis-injection.ogg',
];

async function main() {
  console.log('Testing malicious file detection:\n');

  for (const filePath of maliciousFiles) {
    try {
      const buffer = readFileSync(filePath);
      const result = await scanBinary(buffer, filePath);

      const status = result.verdict === 'BLOCK' ? '✓ DETECTED' : '✗ MISSED';
      console.log(`${status} ${filePath.split('/').pop()}`);
      console.log(`  Verdict: ${result.verdict}, Findings: ${result.findings.length}`);
      if (result.findings.length > 0) {
        console.log(`  First finding: ${result.findings[0].category} - ${result.findings[0].pattern_name || result.findings[0].description}`);
      }
      console.log('');
    } catch (e) {
      console.log(`✗ ERROR ${filePath}: ${(e as Error).message}\n`);
    }
  }
}

main().catch(console.error);
