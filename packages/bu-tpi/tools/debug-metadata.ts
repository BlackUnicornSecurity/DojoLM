import { scanBinaryRaw } from '../src/scanner-binary.js';
import { readFileSync } from 'fs';
import { detectFormat } from '../src/metadata-parsers.js';

async function main() {
  // Check id3-subtle.mp3 - what text is extracted?
  console.log('=== id3-subtle.mp3 ===');
  const buffer1 = readFileSync('fixtures/audio/id3-subtle.mp3');
  console.log('Detected format:', detectFormat(buffer1));
  const result1 = await scanBinaryRaw(buffer1);
  console.log('Fields:', result1.fields);
  console.log('Extracted text:', result1.extractedText);
  console.log('');

  // Check png-chunk-overflow.png - magic bytes?
  console.log('=== png-chunk-overflow.png ===');
  const buffer2 = readFileSync('fixtures/images/png-chunk-overflow.png');
  console.log('First 16 bytes:', Array.from(buffer2.subarray(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' '));
  console.log('Detected format:', detectFormat(buffer2));
  console.log('');

  // Check id3-v1-injection.mp3 - check end of file for ID3v1 tag
  console.log('=== id3-v1-injection.mp3 ===');
  const buffer3 = readFileSync('fixtures/audio/id3-v1-injection.mp3');
  console.log('File size:', buffer3.length);
  console.log('Last 16 bytes:', Array.from(buffer3.subarray(-16)).map(b => b.toString(16).padStart(2, '0')).join(' '));
  console.log('Last 128 bytes (ID3v1 tag):', buffer3.subarray(-128).subarray(0, 3).toString());
  console.log('');

  // Check webp-metadata-injection.webp - what metadata?
  console.log('=== webp-metadata-injection.webp ===');
  const buffer4 = readFileSync('fixtures/images/webp-metadata-injection.webp');
  const result4 = await scanBinaryRaw(buffer4);
  console.log('Detected format:', detectFormat(buffer4));
  console.log('Fields:', result4.fields);
  console.log('Extracted text:', result4.extractedText);
}

main().catch(console.error);
