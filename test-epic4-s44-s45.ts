import { scan } from './src/scanner.js';
import * as fs from 'fs';

const testFiles = [
  // Story 4.4 fixtures
  { path: 'fixtures/encoded/transposition-payload.txt', expectBlock: true, name: 'transposition' },
  { path: 'fixtures/encoded/number-substitution.txt', expectBlock: true, name: 'number-sub-l33t' },
  { path: 'fixtures/encoded/morse-code-payload.txt', expectBlock: true, name: 'morse-code' },
  // Existing 4.4 fixtures (should still pass)
  { path: 'fixtures/encoded/rot47-payload.txt', expectBlock: true, name: 'rot47-existing' },
  { path: 'fixtures/encoded/pig-latin-payload.txt', expectBlock: true, name: 'pig-latin-existing' }, // Enhanced decoder now finds injection → WARNING
  // Story 4.5 fixtures
  { path: 'fixtures/encoded/synonym-system-override.txt', expectBlock: true, name: 'syn-override' },
  { path: 'fixtures/encoded/synonym-constraint-removal.txt', expectBlock: true, name: 'syn-constraint' },
  { path: 'fixtures/encoded/synonym-mode-switching.txt', expectBlock: true, name: 'syn-mode' },
  { path: 'fixtures/encoded/synonym-role-hijacking.txt', expectBlock: true, name: 'syn-role' },
  { path: 'fixtures/encoded/synonym-prompt-reveal.txt', expectBlock: true, name: 'syn-reveal' },
  { path: 'fixtures/encoded/clean-similar-language.txt', expectBlock: false, name: 'clean-similar' },
];

let pass = 0;
let fail = 0;

for (const t of testFiles) {
  const content = fs.readFileSync(t.path, 'utf-8');
  const result = scan(content);
  const ok = t.expectBlock ? result.verdict === 'BLOCK' : result.verdict === 'ALLOW';
  const status = ok ? 'PASS' : 'FAIL';
  if (ok) pass++; else fail++;
  console.log(`[${status}] ${t.name}: verdict=${result.verdict} (C:${result.counts.critical} W:${result.counts.warning} I:${result.counts.info}) expected=${t.expectBlock ? 'BLOCK' : 'ALLOW'}`);
  if (!ok) {
    console.log(`  Findings: ${result.findings.map(f => f.pattern_name || f.category).join(', ')}`);
  }
}

console.log(`\nResults: ${pass}/${testFiles.length} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
