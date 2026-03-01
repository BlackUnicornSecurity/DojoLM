#!/usr/bin/env tsx
/**
 * BU-TPI Regex Pattern Audit Tool
 *
 * Tests all scanner patterns for catastrophic backtracking and other
 * regex performance issues that could lead to DoS vulnerabilities.
 *
 * Usage:
 *   tsx tools/test-perf-regex.ts                    # Full audit
 *   tsx tools/test-perf-regex.ts --category=PI      # Test specific category
 *   tsx tools/test-perf-regex.ts --timeout=1000     # Custom timeout (ms)
 *   tsx tools/test-perf-regex.ts --verbose          # Detailed output
 */

import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface PatternInfo {
  name: string;
  category: string;
  severity: string;
  source: string;
  regex: string;
  flags: string;
}

interface AuditResult {
  pattern: PatternInfo;
  safe: boolean;
  duration: number;
  tests: {
    name: string;
    passed: boolean;
    duration: number;
  }[];
  issues: string[];
}

// Edge case test strings that commonly trigger backtracking
const EDGE_CASES = [
  {
    name: 'repetitive_spaces',
    description: 'Many spaces which can cause backtracking with greedy quantifiers',
    generate: () => ' '.repeat(100),
  },
  {
    name: 'nested_brackets',
    description: 'Nested brackets that can cause exponential backtracking',
    generate: () => 'a'.repeat(50) + '}' + '{'.repeat(50),
  },
  {
    name: 'alternation_many',
    description: 'Many characters that match alternation patterns',
    generate: () => 'a'.repeat(100),
  },
  {
    name: 'long_string',
    description: 'Very long input string',
    generate: () => 'x'.repeat(1000),
  },
  {
    name: 'unicode_mix',
    description: 'Mixed unicode characters and combining marks',
    generate: () => 'e\u0301'.repeat(50), // e with combining mark
  },
  {
    name: 'zero_width_mix',
    description: 'Zero-width characters mixed with normal text',
    generate: () => 'a\u200Bb\u200Cc\u200Dd'.repeat(25),
  },
  {
    name: 'repeated_tokens',
    description: 'Repeated tokens that match pattern prefix',
    generate: () => 'IGNORE IGNORE IGNORE '.repeat(50),
  },
];

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  categoryFilter: null as string | null,
  timeout: 100, // ms per test
  verbose: false,
  saveReport: false,
};

for (const arg of args) {
  if (arg.startsWith('--category=')) {
    options.categoryFilter = arg.split('=')[1];
  } else if (arg.startsWith('--timeout=')) {
    options.timeout = parseInt(arg.split('=')[1], 10);
  } else if (arg === '--verbose') {
    options.verbose = true;
  } else if (arg === '--save') {
    options.saveReport = true;
  }
}

// Extract pattern info from scanner by iterating over exported pattern arrays
async function extractPatterns(): Promise<PatternInfo[]> {
  const patterns: PatternInfo[] = [];
  const seenPatterns = new Set<string>();

  // Dynamically import scanner module and iterate over all exports
  const scannerModule = await import('../src/scanner.js');

  for (const [exportName, exportValue] of Object.entries(scannerModule)) {
    if (!Array.isArray(exportValue)) continue;
    if (exportValue.length === 0) continue;

    // Check if this looks like a pattern array (has name and re properties)
    const firstItem = exportValue[0] as unknown as Record<string, unknown>;
    if (!firstItem || typeof firstItem !== 'object' || !firstItem.name || !firstItem.re) continue;

    for (const item of exportValue) {
      const pattern = item as unknown as Record<string, unknown>;
      if (!pattern.name || !pattern.re || seenPatterns.has(String(pattern.name))) continue;
      seenPatterns.add(String(pattern.name));

      const re = pattern.re as RegExp;
      patterns.push({
        name: String(pattern.name),
        category: String(pattern.cat || 'UNKNOWN'),
        severity: String(pattern.sev ?? 'UNKNOWN'),
        source: exportName,
        regex: re.source,
        flags: re.flags,
      });
    }
  }

  return patterns;
}

// Test a single pattern against edge cases
function testPattern(pattern: PatternInfo, timeoutMs: number): AuditResult {
  const tests: AuditResult['tests'] = [];
  const issues: string[] = [];
  let safe = true;

  try {
    const re = new RegExp(pattern.regex, pattern.flags);

    for (const edgeCase of EDGE_CASES) {
      const start = performance.now();
      let passed = false;

      try {
        re.test(edgeCase.generate());
        passed = true;
      } catch {
        passed = false;
      }

      const duration = performance.now() - start;

      tests.push({
        name: edgeCase.name,
        passed,
        duration,
      });

      // Flag as unsafe if wall-clock duration exceeds threshold
      if (duration > timeoutMs * 0.8) {
        safe = false;
        issues.push(
          `Edge case '${edgeCase.name}' too slow (${duration.toFixed(2)}ms)`
        );
      }

      if (options.verbose) {
        console.log(`    ${edgeCase.name}: ${passed ? '✓' : '✗'} (${duration.toFixed(2)}ms)`);
      }
    }

    // Calculate average duration
    const avgDuration = tests.reduce((sum, t) => sum + t.duration, 0) / tests.length;

    return {
      pattern,
      safe,
      duration: avgDuration,
      tests,
      issues,
    };
  } catch (error) {
    return {
      pattern,
      safe: false,
      duration: 0,
      tests: [],
      issues: [`Invalid regex: ${(error as Error).message}`],
    };
  }
}

// Run the full audit
async function runAudit() {
  console.log('\n  BU-TPI Regex Pattern Audit');
  console.log('  ' + '='.repeat(60));
  console.log(`  Timeout per test: ${options.timeout}ms`);
  console.log(`  Category filter:  ${options.categoryFilter || 'None'}`);

  const patterns = await extractPatterns();
  console.log(`  Patterns found:   ${patterns.length}`);

  // Filter by category if specified
  const patternsToTest = options.categoryFilter
    ? patterns.filter(p => p.category.toLowerCase().includes(options.categoryFilter!.toLowerCase()))
    : patterns;

  console.log(`  Patterns to test: ${patternsToTest.length}`);

  const results: AuditResult[] = [];
  let unsafeCount = 0;
  let totalTests = 0;
  let failedTests = 0;

  for (const pattern of patternsToTest) {
    if (options.verbose) {
      console.log(`\n  Testing: ${pattern.name} (${pattern.category})`);
    }

    const result = testPattern(pattern, options.timeout);
    results.push(result);

    if (!result.safe) {
      unsafeCount++;
      console.log(`  ⚠️  ${pattern.name} (${pattern.category}) - UNSAFE`);
      for (const issue of result.issues) {
        console.log(`      - ${issue}`);
      }
    }

    totalTests += result.tests.length;
    failedTests += result.tests.filter(t => !t.passed).length;
  }

  // Print summary
  console.log('\n  Audit Summary');
  console.log('  ' + '='.repeat(60));
  console.log(`  Total Patterns:  ${patternsToTest.length}`);
  console.log(`  Safe Patterns:   ${patternsToTest.length - unsafeCount}`);
  console.log(`  Unsafe Patterns: ${unsafeCount}`);
  console.log(`  Total Tests:     ${totalTests}`);
  console.log(`  Failed Tests:    ${failedTests}`);

  if (unsafeCount === 0) {
    console.log('\n  ✓ All patterns passed safety checks');
  } else {
    console.log('\n  ⚠️  Some patterns may be vulnerable to DoS via ReDoS');
  }

  // Show unsafe patterns
  if (unsafeCount > 0) {
    console.log('\n  Unsafe Patterns:');
    for (const result of results.filter(r => !r.safe)) {
      console.log(`    - ${result.pattern.name} (${result.pattern.category})`);
      console.log(`      Regex: /${result.pattern.regex}/${result.pattern.flags}`);
      for (const issue of result.issues) {
        console.log(`        Issue: ${issue}`);
      }
    }
  }

  // Save report if requested
  if (options.saveReport) {
    const outputData = {
      version: '1.0',
      date: new Date().toISOString(),
      options,
      summary: {
        totalPatterns: patternsToTest.length,
        safePatterns: patternsToTest.length - unsafeCount,
        unsafePatterns: unsafeCount,
        totalTests,
        failedTests,
      },
      results,
    };

    const outputDir = join(__dirname, '..', '..', '..', 'team', 'QA-Log');
    mkdirSync(outputDir, { recursive: true });
    const outputFile = join(outputDir, `perf-regex-audit-${Date.now()}.json`);
    writeFileSync(outputFile, JSON.stringify(outputData, null, 2));
    console.log(`\n  Report saved to: ${outputFile}`);
  }

  return unsafeCount === 0 ? 0 : 1;
}

runAudit().catch(err => {
  console.error('Error running regex audit:', err);
  process.exit(1);
});
