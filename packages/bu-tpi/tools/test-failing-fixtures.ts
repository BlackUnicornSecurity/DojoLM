import { scanBinary } from '../src/scanner-binary.js';
import { readFileSync } from 'fs';

async function main() {
  const failingFiles = [
    'fixtures/images/png-chunk-overflow.png',
    'fixtures/images/webp-metadata-injection.webp',
    'fixtures/audio/id3-subtle.mp3',
    'fixtures/audio/id3-v1-injection.mp3',
  ];

  for (const filePath of failingFiles) {
    try {
      const buffer = readFileSync(filePath);
      const result = await scanBinary(buffer, filePath);
      console.log(`\n=== ${filePath} ===`);
      console.log('Verdict:', result.verdict);
      console.log('Findings:', result.findings.length);
      console.log('Metadata format:', result.metadata.format);
      console.log('Metadata sources:', result.metadata.sources);
      if (result.findings.length > 0) {
        console.log('First finding:', result.findings[0]);
      }
    } catch (e) {
      console.log(`\n=== ${filePath} ===`);
      console.log('Error:', (e as Error).message);
    }
  }
}

main().catch(console.error);
