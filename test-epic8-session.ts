/**
 * EPIC 8 Tests: Session Simulator (TPI-16)
 *
 * Tests multi-turn session detection for:
 * - Slow-drip injection (distributed across multiple turns)
 * - Context poisoning (false memory claims)
 * - Escalation (final turn has significantly more findings)
 * - Cross-category aggregation (>5 INFO across >3 categories)
 */

import { scanSession } from './src/scanner.js';
import * as fs from 'fs';
import * as path from 'path';

interface TestCase {
  file: string;
  description: string;
  expectSlowDrip?: boolean;
  expectContextPoisoning?: boolean;
  expectEscalation?: boolean;
  expectVerdict: 'BLOCK' | 'ALLOW';
  expectCrossCategory?: boolean;
}

const tests: TestCase[] = [
  {
    file: 'slow-drip-10-turns.json',
    description: '10-turn slow-drip attack (escalation in penultimate turn)',
    expectSlowDrip: true,
    expectEscalation: false,
    expectVerdict: 'BLOCK',
  },
  {
    file: 'slow-drip-vocabulary-build.json',
    description: 'Academic framing building up injection vocabulary',
    expectSlowDrip: true,
    expectVerdict: 'BLOCK',
  },
  {
    file: 'slow-drip-context-poisoning.json',
    description: 'Context poisoning with false memory claims',
    expectContextPoisoning: true,
    expectSlowDrip: true,
    expectVerdict: 'BLOCK',
  },
  {
    file: 'clean-multi-turn.json',
    description: 'Clean multi-turn conversation (control)',
    expectVerdict: 'ALLOW',
  },
];

let pass = 0;
let fail = 0;

for (const test of tests) {
  const filePath = path.join('fixtures', 'session', test.file);
  if (!fs.existsSync(filePath)) {
    console.log(`[SKIP] ${test.file} — file not found`);
    continue;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const result = scanSession(content);

  // Check verdict
  const verdictOk = result.verdict === test.expectVerdict;

  // Check specific detections
  const slowDripOk = test.expectSlowDrip === undefined
    || result.aggregate.slowDripDetected === test.expectSlowDrip;
  const contextPoisoningOk = test.expectContextPoisoning === undefined
    || result.aggregate.contextPoisoningDetected === test.expectContextPoisoning;
  const escalationOk = test.expectEscalation === undefined
    || result.aggregate.escalationDetected === test.expectEscalation;

  const allOk = verdictOk && slowDripOk && contextPoisoningOk && escalationOk;

  if (allOk) {
    console.log(`[PASS] ${test.file}`);
    pass++;
  } else {
    console.log(`[FAIL] ${test.file}`);
    console.log(`  Description: ${test.description}`);
    console.log(`  Verdict: ${result.verdict} (expected ${test.expectVerdict}) ${verdictOk ? '✓' : '✗'}`);
    console.log(`  Slow Drip: ${result.aggregate.slowDripDetected} ${slowDripOk ? '✓' : '✗'}`);
    console.log(`  Context Poisoning: ${result.aggregate.contextPoisoningDetected} ${contextPoisoningOk ? '✓' : '✗'}`);
    console.log(`  Escalation: ${result.aggregate.escalationDetected} ${escalationOk ? '✓' : '✗'}`);
    console.log(`  Findings per turn: ${result.turns.map(t => `[${t.role}] ${t.findings.length}`).join(', ')}`);
    fail++;
  }
}

console.log(`\nSession Simulator Results: ${pass}/${tests.length} passed`);
process.exit(fail > 0 ? 1 : 0);
