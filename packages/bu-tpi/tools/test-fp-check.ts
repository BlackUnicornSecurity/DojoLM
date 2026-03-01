import { scan } from '../src/scanner.js';
import * as fs from 'fs';
import * as path from 'path';

const manifest = JSON.parse(fs.readFileSync('fixtures/manifest.json', 'utf-8'));
let fp = 0;

for (const [catName, cat] of Object.entries(manifest.categories) as any) {
  for (const file of cat.files) {
    if (!file.clean) continue;
    const filePath = path.join('fixtures', catName, file.file);
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, 'utf-8');
    const printable = [...content.slice(0, 100)].filter(c => c.charCodeAt(0) >= 32 || c === '\n' || c === '\r' || c === '\t').length;
    if (printable < 50 && content.length > 50) continue;
    const result = scan(content);
    if (result.verdict !== 'ALLOW') {
      fp++;
      console.log(`[FP] ${catName}/${file.file}: verdict=${result.verdict} C:${result.counts.critical} W:${result.counts.warning}`);
      console.log(`  ${result.findings.map(f => f.pattern_name || f.category).join(', ')}`);
    }
  }
}

console.log(`\nFalse positives on clean fixtures: ${fp}`);
process.exit(fp > 0 ? 1 : 0);
