import { scan } from '../src/scanner.js';
import { scanBinary } from '../src/scanner-binary.js';
import * as fs from 'fs';
import * as path from 'path';

// Read manifest
const manifest = JSON.parse(fs.readFileSync('fixtures/manifest.json', 'utf-8'));

let pass = 0;
let fail = 0;
let total = 0;

// Text file extensions that should be scanned with the text scanner
const TEXT_EXTS = new Set([
  '.html', '.svg', '.md', '.yaml', '.yml', '.txt', '.xml', '.json',
  '.js', '.ts', '.py', '.sh', '.css', '.sql', '.srt', '.php',
  '.c', '.cpp', '.h', '.hpp', '.java', '.go', '.rs', '.rb', '.pl',
]);

async function runTests() {
for (const [catName, cat] of Object.entries(manifest.categories) as any) {
  for (const file of cat.files) {
    const filePath = path.join('fixtures', catName, file.file);
    if (!fs.existsSync(filePath)) {
      console.log(`[SKIP] ${catName}/${file.file} — file not found`);
      continue;
    }
    total++;

    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(file.file).toLowerCase();

    let result: ReturnType<typeof scan> | Awaited<ReturnType<typeof scanBinary>>;

    // Use binary scanner for binary files, text scanner for text files
    if (!TEXT_EXTS.has(ext)) {
      // Binary file - use scanBinary
      result = await scanBinary(buffer, file.file);
    } else {
      // Text file - use original scanner
      const content = buffer.toString('utf-8');
      result = scan(content);
    }

    // File-level clean flag takes precedence over category-level expected_verdict
    const expectAllow = file.clean ? true : (cat.expected_verdict === 'ALLOW');
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
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
