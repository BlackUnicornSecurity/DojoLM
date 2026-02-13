import { scan } from './src/scanner.js';
import * as fs from 'fs';

const testFiles = [
  // Story 4.1 fixtures
  { path: 'fixtures/encoded/surrogate-json-instructions.json', expectBlock: true, name: 'surrogate-json' },
  { path: 'fixtures/encoded/surrogate-xml-instructions.xml', expectBlock: true, name: 'surrogate-xml' },
  { path: 'fixtures/encoded/surrogate-yaml-instructions.yaml', expectBlock: true, name: 'surrogate-yaml' },
  { path: 'fixtures/encoded/surrogate-csv-instructions.txt', expectBlock: true, name: 'surrogate-csv' },
  { path: 'fixtures/encoded/surrogate-sql-instructions.sql', expectBlock: true, name: 'surrogate-sql' },
  { path: 'fixtures/encoded/clean-structured-data.json', expectBlock: false, name: 'clean-structured' },
  // Story 4.2 fixtures
  { path: 'fixtures/session/slow-drip-10-turns.json', expectBlock: true, name: 'slow-drip-10' },
  { path: 'fixtures/session/slow-drip-vocabulary-build.json', expectBlock: true, name: 'slow-drip-vocab' },
  { path: 'fixtures/session/slow-drip-context-poisoning.json', expectBlock: true, name: 'slow-drip-poison' },
  { path: 'fixtures/session/clean-multi-turn.json', expectBlock: false, name: 'clean-multi-turn' },
  // Story 4.3 fixtures
  { path: 'fixtures/encoded/recursive-model-chain.txt', expectBlock: true, name: 'recursive-model' },
  { path: 'fixtures/encoded/recursive-tool-chain.txt', expectBlock: true, name: 'recursive-tool' },
  { path: 'fixtures/encoded/recursive-rag-poisoning.txt', expectBlock: true, name: 'recursive-rag' },
  { path: 'fixtures/encoded/clean-chained-output.txt', expectBlock: false, name: 'clean-chained' },
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
