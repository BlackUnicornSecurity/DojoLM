import { scan } from './src/scanner.js';
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
    const content = fs.readFileSync(filePath, 'utf-8');

    // Skip binary files (check if content is mostly non-printable)
    const printable = [...content.slice(0, 100)].filter(c => c.charCodeAt(0) >= 32 || c === '\n' || c === '\r' || c === '\t').length;
    if (printable < 50 && content.length > 50) {
      console.log(`[SKIP] ${catName}/${file.file} — binary`);
      total--;
      continue;
    }

    const result = scan(content);
    const expectAllow = file.clean;
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
