#!/usr/bin/env tsx
/**
 * H18.4: Time Chamber CLI Interface
 * Usage:
 *   npx tsx tools/timechamber-cli.ts list
 *   npx tsx tools/timechamber-cli.ts run --plan <id> --model <model>
 *   npx tsx tools/timechamber-cli.ts run-all --model <model>
 */

import {
  getAllPlans,
  getPlansByType,
  getPlanCount,
  TEMPORAL_ATTACK_TYPES,
} from '../src/timechamber/index.js';

const args = process.argv.slice(2);
const command = args[0];

function getFlag(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined;
}

function printUsage(): void {
  console.log(`
Time Chamber — Temporal Attack Testing CLI

Commands:
  list                          List all available attack plans
  run --plan <id> --model <m>   Run a specific plan against a model
  run-all --model <model>       Run all plans against a model

Options:
  --type <type>                 Filter by attack type
  --help                        Show this help

Attack types: ${TEMPORAL_ATTACK_TYPES.join(', ')}
`);
}

async function main(): Promise<void> {
  if (!command || command === '--help' || command === 'help') {
    printUsage();
    return;
  }

  switch (command) {
    case 'list': {
      const typeFilter = getFlag('type');
      const plans = typeFilter
        ? getPlansByType(typeFilter as never)
        : getAllPlans();

      console.log(`\nTime Chamber Attack Plans (${plans.length} total)\n`);
      console.log('ID'.padEnd(30) + 'Type'.padEnd(25) + 'Turns'.padEnd(8) + 'Name');
      console.log('-'.repeat(90));

      for (const plan of plans) {
        console.log(
          plan.id.padEnd(30) +
          plan.type.padEnd(25) +
          String(plan.turns.length).padEnd(8) +
          plan.name,
        );
      }
      console.log(`\nTotal: ${getPlanCount()} plans across ${TEMPORAL_ATTACK_TYPES.length} categories`);
      break;
    }
    case 'run': {
      const planId = getFlag('plan');
      const model = getFlag('model');
      if (!planId || !model) {
        console.error('Error: --plan and --model flags are required');
        process.exit(1);
      }
      const plan = getAllPlans().find((p) => p.id === planId);
      if (!plan) {
        console.error(`Error: Plan not found: ${planId}`);
        process.exit(1);
      }
      console.log(`\nPlan: ${plan.name}`);
      console.log(`Type: ${plan.type}`);
      console.log(`Turns: ${plan.turns.length}`);
      console.log(`Model: ${model}`);
      console.log(`Estimated cost: $${plan.estimatedCost}`);
      console.log('\nNote: Full execution requires LLM provider configuration.');
      break;
    }
    case 'run-all': {
      const model = getFlag('model');
      if (!model) {
        console.error('Error: --model flag is required');
        process.exit(1);
      }
      console.log(`\nWould run ${getPlanCount()} plans against model: ${model}`);
      console.log('Note: Full execution requires LLM provider configuration.');
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
