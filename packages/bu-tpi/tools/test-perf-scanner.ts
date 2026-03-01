#!/usr/bin/env tsx
/**
 * BU-TPI Scanner Performance Benchmark
 *
 * Measures scanner performance for text and binary scanning.
 * Establishes baseline metrics for optimization and regression detection.
 *
 * Usage:
 *   tsx tools/test-perf-scanner.ts                    # All tests
 *   tsx tools/test-perf-scanner.ts --type=text        # Text only
 *   tsx tools/test-perf-scanner.ts --type=binary      # Binary only
 *   tsx tools/test-perf-scanner.ts --samples=5000     # Custom sample count
 *   tsx tools/test-perf-scanner.ts --save-baseline    # Save as baseline
 */

import { scan } from '../src/scanner.js';
import { scanBinary } from '../src/scanner-binary.js';
import { readFileSync, readdirSync, statSync, promises as fsPromises } from 'fs';
import { join } from 'path';

interface PerfResult {
  name: string;
  samples: number;
  timings: {
    min: number;
    max: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  };
  throughput: number;
  memory: {
    before: number;
    after: number;
    delta: number;
  };
}

// Text extensions that use the text scanner
const TEXT_EXTS = new Set([
  '.html', '.svg', '.md', '.yaml', '.yml', '.txt', '.xml', '.json',
  '.js', '.ts', '.py', '.sh', '.css', '.sql', '.srt', '.php',
]);

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  type: 'all' as 'text' | 'binary' | 'all',
  samples: 1000,
  saveBaseline: false,
  outputDir: '../../team/QA-Log',
};

for (const arg of args) {
  if (arg.startsWith('--type=')) {
    options.type = arg.split('=')[1] as any;
  } else if (arg.startsWith('--samples=')) {
    options.samples = parseInt(arg.split('=')[1], 10);
  } else if (arg === '--save-baseline') {
    options.saveBaseline = true;
  }
}

// Get memory usage in MB
function getMemoryMB(): number {
  return process.memoryUsage().heapUsed / 1024 / 1024;
}

// Calculate percentiles
function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

// Generate test text samples
function generateText(length: number): string {
  const words = [
    'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'I',
    'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
    'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
    'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their',
  ];
  let result = '';
  while (result.length < length) {
    result += words[Math.floor(Math.random() * words.length)] + ' ';
  }
  return result.substring(0, length);
}

// Test text scanning performance
function testTextScanning(samples: number): PerfResult {
  console.log(`\n  Testing Text Scanning (${samples} samples)`);
  console.log('  ' + '='.repeat(50));

  const timings: number[] = [];
  const memBefore = getMemoryMB();

  // Test different text sizes
  const testCases = [
    { name: 'small', length: 50, count: Math.floor(samples * 0.3) },
    { name: 'medium', length: 500, count: Math.floor(samples * 0.5) },
    { name: 'large', length: 5000, count: Math.floor(samples * 0.2) },
  ];

  for (const testCase of testCases) {
    console.log(`  Running ${testCase.name} tests (${testCase.count} x ${testCase.length} chars)...`);

    for (let i = 0; i < testCase.count; i++) {
      const text = generateText(testCase.length);
      const start = performance.now();
      scan(text);
      const elapsed = performance.now() - start;
      timings.push(elapsed);
    }
  }

  const memAfter = getMemoryMB();

  const result: PerfResult = {
    name: 'text-scanning',
    samples: timings.length,
    timings: {
      min: Math.min(...timings),
      max: Math.max(...timings),
      avg: timings.reduce((a, b) => a + b, 0) / timings.length,
      p50: percentile(timings, 50),
      p95: percentile(timings, 95),
      p99: percentile(timings, 99),
    },
    throughput: timings.length / (timings.reduce((a, b) => a + b, 0) / 1000),
    memory: {
      before: memBefore,
      after: memAfter,
      delta: memAfter - memBefore,
    },
  };

  return result;
}

// Test binary scanning performance
function testBinaryScanning(samples: number): PerfResult {
  console.log(`\n  Testing Binary Scanning (max ${samples} files)`);

  const fixturesDir = join(process.cwd(), 'fixtures');
  const timings: number[] = [];
  const memBefore = getMemoryMB();
  const resultsByFormat = new Map<string, number[]>();

  // Collect binary files
  const binaryFiles: Array<{ path: string; format: string; size: number }> = [];

  for (const category of readdirSync(fixturesDir)) {
    const catPath = join(fixturesDir, category);
    try {
      for (const file of readdirSync(catPath)) {
        const filePath = join(catPath, file);
        const stats = statSync(filePath);
        if (stats.isFile() && stats.size < 5 * 1024 * 1024) { // < 5MB
          const ext = '.' + file.split('.').pop();
          if (!TEXT_EXTS.has(ext)) {
            binaryFiles.push({
              path: filePath,
              format: ext,
              size: stats.size,
            });
          }
        }
      }
    } catch {
      // Skip non-directory entries
    }
  }

  // Limit samples
  const testFiles = binaryFiles.slice(0, Math.min(samples, binaryFiles.length));
  console.log(`  Found ${binaryFiles.length} binary files, testing ${testFiles.length}`);

  for (const file of testFiles) {
    try {
      const buffer = readFileSync(file.path);
      const start = performance.now();
      scanBinary(buffer, file.path);
      const elapsed = performance.now() - start;
      timings.push(elapsed);

      if (!resultsByFormat.has(file.format)) {
        resultsByFormat.set(file.format, []);
      }
      resultsByFormat.get(file.format)!.push(elapsed);
    } catch {
      // Skip files that fail to read/scan
    }
  }

  const memAfter = getMemoryMB();

  const result: PerfResult = {
    name: 'binary-scanning',
    samples: timings.length,
    timings: {
      min: Math.min(...timings),
      max: Math.max(...timings),
      avg: timings.reduce((a, b) => a + b, 0) / timings.length,
      p50: percentile(timings, 50),
      p95: percentile(timings, 95),
      p99: percentile(timings, 99),
    },
    throughput: timings.length / (timings.reduce((a, b) => a + b, 0) / 1000),
    memory: {
      before: memBefore,
      after: memAfter,
      delta: memAfter - memBefore,
    },
  };

  // Print breakdown by format
  console.log('\n  By File Format:');
  for (const [format, times] of resultsByFormat.entries()) {
    console.log(`    ${format || '(unknown)'}: n=${times.length}, avg=${(times.reduce((a, b) => a + b, 0) / times.length).toFixed(2)}ms`);
  }

  return result;
}

// Run tests and generate report
async function runTests() {
  console.log('\n  BU-TPI Scanner Performance Benchmark');
  console.log('  ' + '='.repeat(60));
  console.log(`  Samples: ${options.samples}`);
  console.log(`  Test Type: ${options.type}`);

  const results: PerfResult[] = [];
  const startTime = Date.now();

  if (options.type === 'text' || options.type === 'all') {
    results.push(testTextScanning(options.samples));
  }

  if (options.type === 'binary' || options.type === 'all') {
    results.push(testBinaryScanning(options.samples));
  }

  const totalDuration = Date.now() - startTime;

  // Print summary
  console.log('\n  Results Summary');
  console.log('  ' + '='.repeat(60));

  for (const result of results) {
    console.log(`\n  ${result.name}:`);
    console.log(`    Samples:      ${result.samples}`);
    console.log(`    Latency:`);
    console.log(`      Min:       ${result.timings.min.toFixed(2)}ms`);
    console.log(`      Avg:       ${result.timings.avg.toFixed(2)}ms`);
    console.log(`      p50:       ${result.timings.p50.toFixed(2)}ms`);
    console.log(`      p95:       ${result.timings.p95.toFixed(2)}ms`);
    console.log(`      p99:       ${result.timings.p99.toFixed(2)}ms`);
    console.log(`    Throughput:   ${result.throughput.toFixed(0)} ops/sec`);
    console.log(`    Memory:`);
    console.log(`      Before:    ${result.memory.before.toFixed(2)}MB`);
    console.log(`      After:     ${result.memory.after.toFixed(2)}MB`);
    console.log(`      Delta:     ${result.memory.delta.toFixed(2)}MB`);
  }

  console.log(`\n  Total Duration: ${totalDuration}ms`);

  // Check against targets
  console.log('\n  Target Checks');
  console.log('  ' + '='.repeat(60));

  const textResult = results.find(r => r.name === 'text-scanning');
  if (textResult) {
    const p50Pass = textResult.timings.p50 < 10;
    const p95Pass = textResult.timings.p95 < 25;
    console.log(`  Text Scanning:`);
    console.log(`    p50 < 10ms:     ${p50Pass ? '✓' : '✗'} (${textResult.timings.p50.toFixed(2)}ms)`);
    console.log(`    p95 < 25ms:     ${p95Pass ? '✓' : '✗'} (${textResult.timings.p95.toFixed(2)}ms)`);
  }

  const binaryResult = results.find(r => r.name === 'binary-scanning');
  if (binaryResult) {
    const p50Pass = binaryResult.timings.p50 < 50;
    const p95Pass = binaryResult.timings.p95 < 150;
    console.log(`  Binary Scanning:`);
    console.log(`    p50 < 50ms:     ${p50Pass ? '✓' : '✗'} (${binaryResult.timings.p50.toFixed(2)}ms)`);
    console.log(`    p95 < 150ms:    ${p95Pass ? '✓' : '✗'} (${binaryResult.timings.p95.toFixed(2)}ms)`);
  }

  // Save results
  const outputData = {
    version: '1.0',
    date: new Date().toISOString(),
    options,
    results,
    summary: {
      totalDuration,
      allTargetsMet: results.every(r => {
        if (r.name === 'text-scanning') return r.timings.p50 < 10 && r.timings.p95 < 25;
        if (r.name === 'binary-scanning') return r.timings.p50 < 50 && r.timings.p95 < 150;
        return true;
      }),
    },
  };

  const outputFile = join(options.outputDir, `perf-latest.json`);
  await fsPromises.mkdir(options.outputDir, { recursive: true });
  await fsPromises.writeFile(outputFile, JSON.stringify(outputData, null, 2));

  if (options.saveBaseline) {
    const baselineFile = join(options.outputDir, 'perf-baseline.json');
    await fsPromises.writeFile(baselineFile, JSON.stringify(outputData, null, 2));
    console.log(`\n  Baseline saved to: ${baselineFile}`);
  }

  console.log(`\n  Results saved to: ${outputFile}`);

  return outputData.summary.allTargetsMet ? 0 : 1;
}

// Run tests
runTests().catch(err => {
  console.error('Error running performance tests:', err);
  process.exit(1);
});
