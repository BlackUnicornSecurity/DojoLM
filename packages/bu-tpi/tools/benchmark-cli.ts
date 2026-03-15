#!/usr/bin/env tsx
/**
 * H20.4: Benchmark CLI Interface
 * Usage:
 *   npx tsx tools/benchmark-cli.ts list
 *   npx tsx tools/benchmark-cli.ts run --model <model>
 *   npx tsx tools/benchmark-cli.ts compare --results <path>
 */

import { DOJOLM_BENCH_V1, BenchmarkRunner } from '../src/benchmark/index.js';

const args = process.argv.slice(2);
const command = args[0];

function getFlag(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined;
}

function printUsage(): void {
  console.log(`
DojoLM Benchmark CLI

Commands:
  list                          List available benchmark suites
  run --model <model>           Run benchmark against a model
  compare --results <path>      Compare benchmark results

Options:
  --help                        Show this help
`);
}

async function main(): Promise<void> {
  if (!command || command === '--help' || command === 'help') {
    printUsage();
    return;
  }

  switch (command) {
    case 'list': {
      const suite = DOJOLM_BENCH_V1;
      console.log(`\nAvailable Benchmark Suites\n`);
      console.log(`  ${suite.name} (${suite.version})`);
      console.log(`  ${suite.description}`);
      console.log(`  Fixtures: ${suite.fixtureCount}`);
      console.log(`  Scoring: ${suite.scoringMethod}`);
      console.log(`\n  Categories:`);
      for (const cat of suite.categories) {
        console.log(`    ${cat.name.padEnd(25)} ${cat.fixtureIds.length} fixtures (weight: ${cat.weight})`);
      }
      break;
    }
    case 'run': {
      const model = getFlag('model');
      if (!model) {
        console.error('Error: --model flag is required');
        process.exit(1);
      }
      console.log(`\nBenchmark: ${DOJOLM_BENCH_V1.name}`);
      console.log(`Model: ${model}`);
      console.log(`Fixtures: ${DOJOLM_BENCH_V1.fixtureCount}`);
      console.log('\nNote: Full execution requires scanner integration and model configuration.');
      break;
    }
    case 'compare': {
      const resultsPath = getFlag('results');
      if (!resultsPath) {
        console.error('Error: --results flag is required');
        process.exit(1);
      }
      console.log(`\nComparing results from: ${resultsPath}`);
      console.log('Note: Full comparison requires completed benchmark results.');
      break;
    }
    default:
      console.error(`Unknown command: ${command}`);
      printUsage();
      process.exit(1);
  }
}

main().catch((err) => {
  console.error('Error:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
