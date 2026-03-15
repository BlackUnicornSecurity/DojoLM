#!/usr/bin/env tsx
/**
 * H24.4: Supply Chain CLI Interface
 * Usage:
 *   npx tsx tools/supplychain-cli.ts verify-model --file <path> --hash <sha256>
 *   npx tsx tools/supplychain-cli.ts audit-deps --file <path> --format requirements.txt|package.json|pyproject.toml
 *   npx tsx tools/supplychain-cli.ts report --file <path>
 */

import { readFileSync } from 'fs';
import { verifyModelHash, analyzeModelCard } from '../src/supplychain/verifier.js';
import { auditDependencyFile } from '../src/supplychain/dependency-auditor.js';

const args = process.argv.slice(2);
const command = args[0];

function getFlag(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined;
}

function printUsage(): void {
  console.log(`
Supply Chain Security CLI

Commands:
  verify-model --file <path> --hash <sha256>   Verify model file integrity
  audit-deps --file <path> --format <fmt>      Audit dependency file
  report --file <path>                         Generate supply chain report

Formats: requirements.txt, package.json, pyproject.toml

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
    case 'verify-model': {
      const file = getFlag('file');
      const hash = getFlag('hash');
      if (!file || !hash) {
        console.error('Error: --file and --hash flags are required');
        process.exit(1);
      }
      console.log(`\nVerifying model: ${file}`);
      console.log(`Expected hash: ${hash}`);
      const result = await verifyModelHash(file, hash);
      console.log(`Verified: ${result.verified ? 'PASS' : 'FAIL'}`);
      console.log(`SHA-256: ${result.sha256}`);
      if (!result.verified) {
        console.log('Hash mismatch detected!');
      }
      break;
    }
    case 'audit-deps': {
      const file = getFlag('file');
      const format = getFlag('format') as 'requirements.txt' | 'package.json' | 'pyproject.toml' | undefined;
      if (!file || !format) {
        console.error('Error: --file and --format flags are required');
        process.exit(1);
      }
      const content = readFileSync(file, 'utf-8');
      const result = auditDependencyFile(content, format);
      console.log(`\nDependency Audit: ${file}\n`);
      console.log(`Format: ${format}`);
      console.log(`Dependencies found: ${result.dependencies.length}`);
      console.log(`Vulnerabilities: ${result.vulnerabilities.length}`);
      if (result.vulnerabilities.length > 0) {
        console.log('\nVulnerabilities:');
        for (const v of result.vulnerabilities) {
          console.log(`  [${v.severity.toUpperCase()}] ${v.dependencyName}@${v.version}`);
          console.log(`    ${v.description}`);
          if (v.cveId) console.log(`    CVE: ${v.cveId}`);
          if (v.fixVersion) console.log(`    Fix: upgrade to ${v.fixVersion}`);
        }
      }
      break;
    }
    case 'report': {
      const file = getFlag('file');
      if (!file) {
        console.error('Error: --file flag is required');
        process.exit(1);
      }
      console.log(`\nGenerating supply chain report for: ${file}`);
      console.log('Note: Full report generation requires both model and dependency analysis.');
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
