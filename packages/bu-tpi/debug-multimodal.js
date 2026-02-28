import { scan } from './scanner.js';
import * as fs from 'fs';
import * as path from 'path';

// Read manifest
const manifest = JSON.parse(fs.readFileSync('fixtures/manifest.json', 'utf-8'));

// Focus on multimodal fixtures only
const multimodalFiles = manifest.categories.multimodal.files;
console.log(`Testing ${multimodalFiles.length} multimodal fixtures...\n`);

let pass = 0;
let fail = 0;
const failures = [];

for (const file of multimodalFiles) {
  const filePath = path.join('fixtures', 'multimodal', file.file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`[SKIP] multimodal/${file.file} — file not found`);
    continue;
  }

  // Read as buffer first to check for binary signatures
  const buffer = fs.readFileSync(filePath);

  // Binary file signatures to skip
  const binarySignatures = [
    [0x49, 0x44, 0x33], // ID3 (audio files)
    [0x52, 0x49, 0x46, 0x46], // RIFF (WAV)
    [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], // PNG
    [0xFF, 0xD8, 0xFF], // JPEG
    [0x47, 0x49, 0x46, 0x38], // GIF
  ];

  // Check if file starts with a binary signature
  let isBinary = false;
  for (const sig of binarySignatures) {
    if (buffer.length >= sig.length) {
      let matches = true;
      for (let i = 0; i < sig.length; i++) {
        if (buffer[i] !== sig[i]) {
          matches = false;
          break;
        }
      }
      if (matches) {
        isBinary = true;
        break;
      }
    }
  }

  // Also check for low printable ratio (heuristic for other binary files)
  if (!isBinary && buffer.length > 50) {
    const sampleSize = Math.min(100, buffer.length);
    let printableCount = 0;
    for (let i = 0; i < sampleSize; i++) {
      const c = buffer[i];
      if (c >= 32 && c <= 126 || c === 0x0A || c === 0x0D || c === 0x09) {
        printableCount++;
      }
    }
    if (printableCount < sampleSize * 0.5) {
      isBinary = true;
    }
  }

  if (isBinary) {
    console.log(`[SKIP] multimodal/${file.file} — binary`);
    continue;
  }

  const content = buffer.toString('utf-8');

  const result = scan(content);
  // Use file-level clean flag as expected verdict
  const expectAllow = file.clean;
  const ok = expectAllow ? result.verdict === 'ALLOW' : result.verdict === 'BLOCK';

  if (ok) {
    pass++;
    if (!expectAllow && result.counts.critical === 0 && result.counts.warning === 0) {
      // This might be a false negative - attack not detected
      console.log(`[WARNING] multimodal/${file.file}: verdict=${result.verdict} but no findings detected!`);
    }
  } else {
    fail++;
    failures.push({
      file: file.file,
      verdict: result.verdict,
      expected: expectAllow ? 'ALLOW' : 'BLOCK',
      findings: result.findings.map(f => f.pattern_name),
      counts: result.counts
    });
    console.log(`[FAIL] multimodal/${file.file}: verdict=${result.verdict} expected=${expectAllow ? 'ALLOW' : 'BLOCK'} (C:${result.counts.critical} W:${result.counts.warning} I:${result.counts.info})`);
    if (expectAllow) {
      console.log(`  FP findings: ${result.findings.map(f => `${f.pattern_name || f.category}(${f.severity})`).join(', ')}`);
    }
  }
}

console.log(`\nMultimodal Results: ${pass}/${multimodalFiles.length} passed, ${fail} failed`);

if (fail > 0) {
  console.log('\n=== FAILURES ===');
  failures.forEach(f => {
    console.log(`${f.file}: Expected ${f.expected}, got ${f.verdict}`);
    if (f.findings.length > 0) {
      console.log(`  Findings: ${f.findings.join(', ')}`);
    }
  });
}
