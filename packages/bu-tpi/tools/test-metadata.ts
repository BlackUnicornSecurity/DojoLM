import { scanBinaryRaw } from '../src/scanner-binary.js';
import { readFileSync } from 'fs';

async function main() {
  // Test a JPEG with supposed EXIF injection
  const buffer = readFileSync('fixtures/images/exif-injection.jpg');
  console.log('=== exif-injection.jpg ===');
  const result = await scanBinaryRaw(buffer);
  console.log('Format:', result.format);
  console.log('Fields:', result.fields.length);
  console.log('Extracted text:', result.extractedText?.substring(0, 200) || '(none)');
  console.log('Sources:', result.sources);
  console.log('Warnings:', result.warnings);
  console.log('Errors:', result.errors);

  // Test an MP3 with supposed ID3 injection
  console.log('\n=== id3-injection.mp3 ===');
  const buffer2 = readFileSync('fixtures/audio/id3-injection.mp3');
  const result2 = await scanBinaryRaw(buffer2);
  console.log('Format:', result2.format);
  console.log('Fields:', result2.fields.length);
  console.log('Extracted text:', result2.extractedText?.substring(0, 200) || '(none)');
  console.log('Sources:', result2.sources);

  // Test a PNG with supposed chunk injection
  console.log('\n=== text-chunk-injection.png ===');
  const buffer3 = readFileSync('fixtures/images/text-chunk-injection.png');
  const result3 = await scanBinaryRaw(buffer3);
  console.log('Format:', result3.format);
  console.log('Fields:', result3.fields.length);
  console.log('Extracted text:', result3.extractedText?.substring(0, 200) || '(none)');
  console.log('Sources:', result3.sources);
}

main().catch(console.error);
