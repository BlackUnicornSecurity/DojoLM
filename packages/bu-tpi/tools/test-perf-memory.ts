#!/usr/bin/env tsx
/**
 * BU-TPI Memory Profiling Tool
 *
 * Analyzes memory usage patterns for the scanner to detect leaks and
 * establish memory efficiency baselines.
 *
 * Usage:
 *   tsx tools/test-perf-memory.ts                    # Standard test (1000 scans)
 *   tsx tools/test-perf-memory.ts --iterations=10000 # Extended test
 *   tsx tools/test-perf-memory.ts --gc               # Force GC between scans
 *   tsx tools/test-perf-memory.ts --report           # Detailed report
 */

import { scan } from '../src/scanner.js';
import { scanBinary } from '../src/scanner-binary.js';
import { readFileSync, readdirSync, statSync, promises as fsPromises } from 'fs';
import { join } from 'path';

interface MemorySnapshot {
  iteration: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
}

interface MemoryReport {
  testType: 'text' | 'binary';
  iterations: number;
  snapshots: MemorySnapshot[];
  analysis: {
    startHeap: number;
    endHeap: number;
    deltaHeap: number;
    deltaPerIteration: number;
    growthRate: number; // bytes per 1000 iterations
    leakDetected: boolean;
    trend: 'stable' | 'growing' | 'leaking';
  };
}

const TEXT_EXTS = new Set([
  '.html', '.svg', '.md', '.yaml', '.yml', '.txt', '.xml', '.json',
  '.js', '.ts', '.py', '.sh', '.css', '.sql', '.srt', '.php',
]);

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  iterations: 1000,
  forceGC: false,
  detailedReport: false,
  testType: 'all' as 'text' | 'binary' | 'all',
};

for (const arg of args) {
  if (arg.startsWith('--iterations=')) {
    options.iterations = parseInt(arg.split('=')[1], 10);
  } else if (arg === '--gc') {
    options.forceGC = true;
  } else if (arg === '--report') {
    options.detailedReport = true;
  } else if (arg.startsWith('--type=')) {
    options.testType = arg.split('=')[1] as any;
  }
}

// Force garbage collection if available
function forceGC(): void {
  if (global.gc) {
    global.gc();
  }
}

// Get current memory snapshot
function getSnapshot(iteration: number): MemorySnapshot {
  const usage = process.memoryUsage();
  return {
    iteration,
    heapUsed: usage.heapUsed,
    heapTotal: usage.heapTotal,
    external: usage.external,
    arrayBuffers: usage.arrayBuffers,
  };
}

// Generate test content
function generateText(length: number): string {
  const words = ['the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have'];
  let result = '';
  while (result.length < length) {
    result += words[Math.floor(Math.random() * words.length)] + ' ';
  }
  return result.substring(0, length);
}

// Analyze memory snapshots for leaks
function analyzeMemorySnapshots(snapshots: MemorySnapshot[]) {
  const start = snapshots[0];
  const end = snapshots[snapshots.length - 1];
  const deltaHeap = end.heapUsed - start.heapUsed;
  const deltaPerIteration = deltaHeap / snapshots.length;

  // Calculate growth rate per 1000 iterations
  const growthRate = (deltaHeap / snapshots.length) * 1000;

  // Detect leak using linear regression
  const n = snapshots.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (const s of snapshots) {
    sumX += s.iteration;
    sumY += s.heapUsed;
    sumXY += s.iteration * s.heapUsed;
    sumXX += s.iteration * s.iteration;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

  // Determine trend
  let trend: 'stable' | 'growing' | 'leaking';
  let leakDetected = false;

  // Slope threshold: more than 100 bytes per iteration indicates growth
  if (slope > 100) {
    // If growing consistently, it's likely a leak
    if (deltaHeap > 10 * 1024 * 1024) { // More than 10MB growth
      trend = 'leaking';
      leakDetected = true;
    } else {
      trend = 'growing';
    }
  } else if (slope < -100) {
    trend = 'stable'; // Shrinking is fine (GC working)
  } else {
    trend = 'stable';
  }

  return {
    startHeap: start.heapUsed,
    endHeap: end.heapUsed,
    deltaHeap,
    deltaPerIteration,
    growthRate,
    leakDetected,
    trend,
    slope,
  };
}

// Run memory test for text scanning
function testTextMemory(iterations: number): MemoryReport {
  console.log(`\n  Memory Test: Text Scanning (${iterations} iterations)`);
  console.log('  ' + '='.repeat(60));

  const snapshots: MemorySnapshot[] = [];

  // Warmup
  for (let i = 0; i < 10; i++) {
    scan(generateText(500));
  }

  forceGC();

  // Collect baseline
  snapshots.push(getSnapshot(0));

  for (let i = 0; i < iterations; i++) {
    // Mix of different text sizes
    const size = [50, 500, 5000][Math.floor(Math.random() * 3)];
    const text = generateText(size);
    scan(text);

    // Collect samples periodically
    if (i % 100 === 0 || i === iterations - 1) {
      if (options.forceGC) {
        forceGC();
      }
      snapshots.push(getSnapshot(i + 1));
    }
  }

  const analysis = analyzeMemorySnapshots(snapshots);

  console.log(`  Start Heap:     ${(analysis.startHeap / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  End Heap:       ${(analysis.endHeap / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Delta:          ${(analysis.deltaHeap / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Per Iteration:  ${analysis.deltaPerIteration.toFixed(0)} bytes`);
  console.log(`  Growth Rate:    ${(analysis.growthRate / 1024).toFixed(2)} KB/1000it`);
  console.log(`  Slope:          ${analysis.slope.toFixed(2)} bytes/it`);
  console.log(`  Trend:          ${analysis.trend.toUpperCase()}`);
  console.log(`  Leak Detected:  ${analysis.leakDetected ? '⚠️  YES' : '✓ NO'}`);

  return {
    testType: 'text',
    iterations,
    snapshots,
    analysis,
  };
}

// Run memory test for binary scanning
function testBinaryMemory(iterations: number): MemoryReport {
  console.log(`\n  Memory Test: Binary Scanning (${iterations} iterations)`);
  console.log('  ' + '='.repeat(60));

  const snapshots: MemorySnapshot[] = [];

  // Collect binary files
  const fixturesDir = join(process.cwd(), 'fixtures');
  const binaryFiles: Buffer[] = [];

  for (const category of readdirSync(fixturesDir)) {
    const catPath = join(fixturesDir, category);
    try {
      for (const file of readdirSync(catPath)) {
        const filePath = join(catPath, file);
        const stats = statSync(filePath);
        if (stats.isFile() && stats.size < 1024 * 1024 && binaryFiles.length < 100) {
          const ext = '.' + file.split('.').pop();
          if (!TEXT_EXTS.has(ext)) {
            try {
              binaryFiles.push(readFileSync(filePath));
            } catch {
              // Skip unreadable files
            }
          }
        }
      }
    } catch {
      // Skip
    }
  }

  if (binaryFiles.length === 0) {
    console.log('  No binary files found for testing');
    return {
      testType: 'binary',
      iterations: 0,
      snapshots: [],
      analysis: {
        startHeap: 0,
        endHeap: 0,
        deltaHeap: 0,
        deltaPerIteration: 0,
        growthRate: 0,
        leakDetected: false,
        trend: 'stable',
      },
    };
  }

  console.log(`  Found ${binaryFiles.length} binary files`);

  // Warmup
  for (let i = 0; i < 10; i++) {
    const buf = binaryFiles[i % binaryFiles.length];
    scanBinary(buf, 'test');
  }

  forceGC();

  // Collect baseline
  snapshots.push(getSnapshot(0));

  const actualIterations = Math.min(iterations, binaryFiles.length * 100);

  for (let i = 0; i < actualIterations; i++) {
    const buf = binaryFiles[i % binaryFiles.length];
    scanBinary(buf, 'test');

    if (i % 100 === 0 || i === actualIterations - 1) {
      if (options.forceGC) {
        forceGC();
      }
      snapshots.push(getSnapshot(i + 1));
    }
  }

  const analysis = analyzeMemorySnapshots(snapshots);

  console.log(`  Start Heap:     ${(analysis.startHeap / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  End Heap:       ${(analysis.endHeap / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Delta:          ${(analysis.deltaHeap / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Per Iteration:  ${analysis.deltaPerIteration.toFixed(0)} bytes`);
  console.log(`  Growth Rate:    ${(analysis.growthRate / 1024).toFixed(2)} KB/1000it`);
  console.log(`  Trend:          ${analysis.trend.toUpperCase()}`);
  console.log(`  Leak Detected:  ${analysis.leakDetected ? '⚠️  YES' : '✓ NO'}`);

  return {
    testType: 'binary',
    iterations: actualIterations,
    snapshots,
    analysis,
  };
}

// Generate detailed report
function generateDetailedReport(reports: MemoryReport[]): string {
  const lines = [
    '\n  Detailed Memory Report',
    '  ' + '='.repeat(60),
  ];

  for (const report of reports) {
    lines.push(`\n  ${report.testType.toUpperCase()} Scanning:`);
    lines.push(`    Iterations:       ${report.iterations}`);
    lines.push(`    Snapshots:        ${report.snapshots.length}`);
    lines.push(`    Analysis:`);

    const a = report.analysis;
    lines.push(`      Start Heap:     ${(a.startHeap / 1024 / 1024).toFixed(2)} MB`);
    lines.push(`      End Heap:       ${(a.endHeap / 1024 / 1024).toFixed(2)} MB`);
    lines.push(`      Delta:          ${(a.deltaHeap / 1024 / 1024).toFixed(2)} MB`);
    lines.push(`      Per Iteration:  ${a.deltaPerIteration.toFixed(0)} bytes`);
    lines.push(`      Growth Rate:    ${(a.growthRate / 1024).toFixed(2)} KB/1000it`);
    lines.push(`      Slope:          ${a.slope?.toFixed(2) ?? 'N/A'} bytes/it`);
    lines.push(`      Trend:          ${a.trend.toUpperCase()}`);
    lines.push(`      Leak Detected:  ${a.leakDetected ? '⚠️  YES' : '✓ NO'}`);

    // Show memory samples
    if (options.detailedReport) {
      lines.push(`\n    Sample Points (every 100 iterations):`);
      for (const snap of report.snapshots.slice(0, 20)) {
        lines.push(
          `      It ${snap.iteration.toString().padStart(4)}: ` +
          `${(snap.heapUsed / 1024 / 1024).toFixed(2)} MB ` +
          `(total: ${(snap.heapTotal / 1024 / 1024).toFixed(2)} MB, ` +
          `external: ${(snap.external / 1024 / 1024).toFixed(2)} MB)`
        );
      }
      if (report.snapshots.length > 20) {
        lines.push(`      ... (${report.snapshots.length - 20} more samples)`);
      }
    }
  }

  // Overall assessment
  const anyLeaks = reports.some(r => r.analysis.leakDetected);
  lines.push(`\n  Overall Assessment:`);
  lines.push(`    Memory Leaks:    ${anyLeaks ? '⚠️  DETECTED' : '✓ NONE DETECTED'}`);
  lines.push(`    Status:          ${anyLeaks ? 'ACTION REQUIRED' : 'HEALTHY'}`);

  return lines.join('\n');
}

// Run all memory tests
async function runMemoryTests() {
  console.log('\n  BU-TPI Memory Profiling');
  console.log('  ' + '='.repeat(60));
  console.log(`  Iterations:    ${options.iterations}`);
  console.log(`  Force GC:      ${options.forceGC ? 'Yes' : 'No'}`);
  console.log(`  Test Type:     ${options.testType}`);

  const reports: MemoryReport[] = [];
  const startTime = Date.now();

  if (options.testType === 'text' || options.testType === 'all') {
    reports.push(testTextMemory(options.iterations));
  }

  if (options.testType === 'binary' || options.testType === 'all') {
    reports.push(testBinaryMemory(options.iterations));
  }

  const duration = Date.now() - startTime;

  // Print summary
  console.log(`\n  Memory Test Summary`);
  console.log('  ' + '='.repeat(60));
  console.log(`  Duration:       ${duration}ms`);
  console.log(`  Tests Run:      ${reports.length}`);

  const anyLeaks = reports.some(r => r.analysis.leakDetected);
  console.log(`  Leaks Detected: ${anyLeaks ? '⚠️  YES' : '✓ NO'}`);

  if (options.detailedReport) {
    console.log(generateDetailedReport(reports));
  }

  // Save results
  const outputData = {
    version: '1.0',
    date: new Date().toISOString(),
    options,
    reports,
    summary: {
      duration,
      anyLeaks,
      status: anyLeaks ? 'ACTION_REQUIRED' : 'HEALTHY',
    },
  };

  const outputDir = '../../team/QA-Log';
  await fsPromises.mkdir(outputDir, { recursive: true });
  const outputFile = join(outputDir, `perf-memory-${Date.now()}.json`);
  await fsPromises.writeFile(outputFile, JSON.stringify(outputData, null, 2));
  console.log(`\n  Results saved to: ${outputFile}`);

  return anyLeaks ? 1 : 0;
}

// Enable --expose-gc warning
if (!global.gc && options.forceGC) {
  console.log('\n  ⚠️  Warning: --expose-gc flag not set. Force GC will not work.');
  console.log('     Run with: node --expose-gc -r tsx/tools/test-perf-memory.ts');
}

runMemoryTests().catch(err => {
  console.error('Error running memory tests:', err);
  process.exit(1);
});
