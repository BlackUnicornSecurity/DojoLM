import { scan } from '../src/scanner.js';
import * as fs from 'fs';
import * as path from 'path';

// Read manifest
const manifest = JSON.parse(fs.readFileSync('fixtures/manifest.json', 'utf-8'));

let pass = 0;
let fail = 0;
let total = 0;

for (const [catName, cat] of Object.entries(manifest.categories) as any) {
  for (const file of cat.files) {
    const filePath = path.join('fixtures', catName, file.file);
    if (!fs.existsSync(filePath)) {
      console.log(`[SKIP] ${catName}/${file.file} — file not found`);
      continue;
    }
    total++;

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
      console.log(`[SKIP] ${catName}/${file.file} — binary`);
      total--;
      continue;
    }

    const content = buffer.toString('utf-8');

    const result = scan(content);
    // Use category-level expected_verdict if set, otherwise fall back to file-level clean flag
    const expectAllow = cat.expected_verdict === 'ALLOW' ? true : (cat.expected_verdict === 'BLOCK' ? false : file.clean);
    const ok = expectAllow ? result.verdict === 'ALLOW' : result.verdict === 'BLOCK';

    if (ok) {
      pass++;
    } else {
      fail++;
      console.log(`[FAIL] ${catName}/${file.file}: verdict=${result.verdict} expected=${expectAllow ? 'ALLOW' : 'BLOCK'} (C:${result.counts.critical} W:${result.counts.warning} I:${result.counts.info})`);
      if (expectAllow) {
        console.log(`  FP findings: ${result.findings.map(f => f.pattern_name || f.category).join(', ')}`);
      }
    }
  }
}

console.log(`\nRegression Results: ${pass}/${total} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
