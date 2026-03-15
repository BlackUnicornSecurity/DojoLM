#!/usr/bin/env tsx
/**
 * H17.6: Sengoku CLI Interface
 * Usage:
 *   npx tsx tools/sengoku-cli.ts init
 *   npx tsx tools/sengoku-cli.ts run --campaign <id>
 *   npx tsx tools/sengoku-cli.ts start --campaign <id>
 *   npx tsx tools/sengoku-cli.ts status
 *   npx tsx tools/sengoku-cli.ts report --campaign <id> --format md|json
 */

import {
  CampaignScheduler,
  validateTargetUrl,
  generateReport,
  formatReportMarkdown,
  formatReportJSON,
  compareRuns,
  VALID_FREQUENCIES,
  VALID_AUTH_TYPES,
} from '../src/sengoku/index.js';
import type { Campaign, CampaignRun } from '../src/sengoku/index.js';

const args = process.argv.slice(2);
const command = args[0];

function getFlag(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined;
}

function printUsage(): void {
  console.log(`
Sengoku — Continuous Red Teaming CLI

Commands:
  init                          Create a campaign configuration template
  run --campaign <id>           Execute a single campaign run
  start --campaign <id>         Start scheduled campaign
  status                        List active campaigns
  report --campaign <id>        Generate campaign report
    --format md|json            Report format (default: md)

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
    case 'init': {
      const template = {
        id: 'campaign-' + Date.now(),
        name: 'My Red Team Campaign',
        targetUrl: 'https://api.example.com/v1/chat',
        targetAuth: { type: 'api_key', credentials: { apiKey: 'YOUR_KEY_HERE' } },
        attackCategories: ['prompt-injection', 'jailbreak', 'encoding'],
        schedule: { frequency: 'daily', customIntervalMs: null, maxRuns: 10 },
        maxConcurrentRequests: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      console.log('Campaign template:');
      console.log(JSON.stringify(template, null, 2));
      console.log('\nSave this to a JSON file and use: sengoku-cli run --campaign <path>');
      break;
    }
    case 'status': {
      const scheduler = new CampaignScheduler();
      const active = scheduler.getActiveCampaigns();
      console.log(`Active campaigns: ${active.length}`);
      for (const c of active) {
        console.log(`  - ${c.campaignId}: ${c.state}`);
      }
      if (active.length === 0) {
        console.log('  (none)');
      }
      break;
    }
    case 'run':
    case 'start':
    case 'report': {
      const campaignId = getFlag('campaign');
      if (!campaignId) {
        console.error('Error: --campaign flag is required');
        process.exit(1);
      }
      console.log(`[${command}] Campaign: ${campaignId}`);
      console.log('Note: Full execution requires campaign file and target configuration.');
      console.log('Supported frequencies:', VALID_FREQUENCIES.join(', '));
      console.log('Supported auth types:', VALID_AUTH_TYPES.join(', '));
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
