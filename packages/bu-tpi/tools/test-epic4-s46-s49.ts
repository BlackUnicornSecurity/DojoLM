/**
 * Test suite for EPIC 4 Stories 4.6–4.9
 *
 * Story 4.6: Enhanced Payload Fragmentation (math, numbered steps, pseudomath)
 * Story 4.7: Enhanced Multilingual Injection (romanized patterns)
 * Story 4.8: Enhanced Whitespace & Formatting Evasion (braille, mongolian, tab)
 * Story 4.9: Boundary Token Expansion (confusable tokens)
 */

import * as fs from 'fs';
import { scan } from '../src/scanner.js';

interface TestCase {
  name: string;
  story: string;
  file: string;
  expectBlock: boolean;
}

const tests: TestCase[] = [
  // Story 4.6: Enhanced Payload Fragmentation
  {
    name: 'numbered-sequence-attack (step content combines into injection)',
    story: '4.6',
    file: 'fixtures/encoded/numbered-sequence-attack.txt',
    expectBlock: true,
  },
  {
    name: 'formal-logic-complex (set theory + predicate + lambda)',
    story: '4.6',
    file: 'fixtures/encoded/formal-logic-complex.txt',
    expectBlock: true,
  },
  {
    name: 'pseudomath-override (theorem/proof/algorithm style)',
    story: '4.6',
    file: 'fixtures/encoded/pseudomath-override.txt',
    expectBlock: true,
  },

  // Story 4.7: Enhanced Multilingual Injection
  {
    name: 'multilingual-fr-de (French + German injection)',
    story: '4.7',
    file: 'fixtures/web/multilingual-fr-de.html',
    expectBlock: true,
  },
  {
    name: 'multilingual-pt-it (Portuguese + Italian injection)',
    story: '4.7',
    file: 'fixtures/web/multilingual-pt-it.html',
    expectBlock: true,
  },
  {
    name: 'multilingual-ja-ko (Japanese + Korean injection)',
    story: '4.7',
    file: 'fixtures/web/multilingual-ja-ko.html',
    expectBlock: true,
  },
  {
    name: 'multilingual-ar (Arabic RTL injection)',
    story: '4.7',
    file: 'fixtures/web/multilingual-ar.html',
    expectBlock: true,
  },
  {
    name: 'multilingual-romanized (Pinyin, Romaji, Korean, Russian, Turkish, Swedish, Polish)',
    story: '4.7',
    file: 'fixtures/web/multilingual-romanized.txt',
    expectBlock: true,
  },
  {
    name: 'clean-multilingual (legitimate weather report)',
    story: '4.7',
    file: 'fixtures/web/clean-multilingual.html',
    expectBlock: false,
  },

  // Story 4.8: Enhanced Whitespace & Formatting Evasion
  {
    name: 'braille-obfuscation (Braille U+2800-U+28FF)',
    story: '4.8',
    file: 'fixtures/encoded/braille-obfuscation.txt',
    expectBlock: true,
  },
  {
    name: 'mongolian-fvs (Mongolian FVS U+180B-U+180D)',
    story: '4.8',
    file: 'fixtures/encoded/mongolian-fvs.txt',
    expectBlock: true,
  },

  // Story 4.9: Boundary Token Expansion
  {
    name: 'confusable-tokens (fullwidth, mathematical, CJK homoglyphs)',
    story: '4.9',
    file: 'fixtures/boundary/confusable-tokens.txt',
    expectBlock: true,
  },
];

let pass = 0;
let fail = 0;

for (const t of tests) {
  const content = fs.readFileSync(t.file, 'utf-8');
  const result = scan(content);
  const blocked = result.verdict === 'BLOCK';
  const ok = blocked === t.expectBlock;

  if (ok) {
    pass++;
    console.log(`  PASS  [${t.story}] ${t.name} → ${result.verdict} (${result.counts.critical}C/${result.counts.warning}W/${result.counts.info}I)`);
  } else {
    fail++;
    console.log(`  FAIL  [${t.story}] ${t.name} → ${result.verdict} (expected ${t.expectBlock ? 'BLOCK' : 'ALLOW'})`);
    // Show findings for debugging
    for (const f of result.findings) {
      console.log(`         ${f.severity} [${f.category}] ${f.description}`);
    }
  }
}

console.log(`\n${pass + fail} tests: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
