#!/usr/bin/env tsx
/**
 * H19.4: Kotoba CLI Interface
 * Usage:
 *   npx tsx tools/kotoba-cli.ts score < prompt.txt
 *   npx tsx tools/kotoba-cli.ts harden --level moderate|aggressive
 *   npx tsx tools/kotoba-cli.ts analyze --file <path>
 */

import { readFileSync } from 'fs';
import { scorePrompt, getLetterGrade } from '../src/kotoba/scorer.js';
import { generateVariants } from '../src/kotoba/generator.js';
import { getRuleCount } from '../src/kotoba/rules/index.js';
import { SCORE_CATEGORIES } from '../src/kotoba/types.js';
import type { HardeningLevel } from '../src/kotoba/types.js';

const args = process.argv.slice(2);
const command = args[0];

function getFlag(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined;
}

function readInput(): string {
  const file = getFlag('file');
  if (file) return readFileSync(file, 'utf-8');
  // Read from stdin if piped
  try {
    return readFileSync('/dev/stdin', 'utf-8');
  } catch {
    return '';
  }
}

function printUsage(): void {
  console.log(`
Kotoba — Prompt Optimization CLI

Commands:
  score                         Score a prompt's security
  harden --level moderate|aggressive  Generate hardened variants
  analyze --file <path>         Analyze a prompt file

Options:
  --file <path>                 Read prompt from file
  --level moderate|aggressive   Hardening level (default: moderate)
  --help                        Show this help

Categories: ${SCORE_CATEGORIES.join(', ')}
Rules loaded: ${getRuleCount()}
`);
}

async function main(): Promise<void> {
  if (!command || command === '--help' || command === 'help') {
    printUsage();
    return;
  }

  const input = readInput();
  if (!input.trim() && command !== 'help') {
    console.error('Error: No input prompt provided. Use --file or pipe via stdin.');
    process.exit(1);
  }

  switch (command) {
    case 'score': {
      const analysis = scorePrompt(input);
      console.log(`\nKotoba Prompt Security Score\n`);
      console.log(`Overall: ${analysis.overallScore}/100 (Grade: ${analysis.grade})`);
      console.log(`\nCategory Scores:`);
      for (const cat of SCORE_CATEGORIES) {
        const score = analysis.categoryScores[cat];
        const bar = '#'.repeat(Math.round(score / 5)) + '.'.repeat(20 - Math.round(score / 5));
        console.log(`  ${cat.padEnd(25)} ${String(score).padStart(3)}/100 [${bar}]`);
      }
      if (analysis.issues.length > 0) {
        console.log(`\nIssues (${analysis.issues.length}):`);
        for (const issue of analysis.issues) {
          console.log(`  [${issue.severity.toUpperCase()}] ${issue.description}`);
        }
      }
      break;
    }
    case 'harden': {
      const level = (getFlag('level') ?? 'moderate') as HardeningLevel;
      if (level !== 'moderate' && level !== 'aggressive') {
        console.error('Error: --level must be "moderate" or "aggressive"');
        process.exit(1);
      }
      const variants = generateVariants(input, level);
      console.log(`\nKotoba Hardening Results (${level} mode)\n`);
      console.log(`Generated ${variants.length} variant(s)\n`);
      for (let i = 0; i < variants.length; i++) {
        const v = variants[i];
        console.log(`--- Variant ${i + 1} ---`);
        console.log(`Score: ${v.scoreBefore} -> ${v.scoreAfter} (+${v.scoreAfter - v.scoreBefore})`);
        console.log(`Rules applied: ${v.appliedRules.join(', ')}`);
        console.log(`\n${v.hardened}\n`);
      }
      break;
    }
    case 'analyze': {
      const analysis = scorePrompt(input);
      console.log(`\nKotoba Full Analysis\n`);
      console.log(`Grade: ${analysis.grade} (${analysis.overallScore}/100)`);
      console.log(`Issues found: ${analysis.issues.length}`);
      console.log(`Input length: ${input.length} characters`);
      console.log(`\nDetailed Issues:`);
      for (const issue of analysis.issues) {
        console.log(`\n  [${issue.severity.toUpperCase()}] ${issue.id}`);
        console.log(`  ${issue.description}`);
        console.log(`  Fix: ${issue.suggestedFix}`);
      }
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
