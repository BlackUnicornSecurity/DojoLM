#!/usr/bin/env npx tsx
/**
 * Manifest Reconciliation Script (S06)
 * Scans the fixtures directory recursively and adds any files not in manifest.
 * Removes ghost entries (in manifest but not on disk).
 * Preserves existing manifest entries. Updates totalFixtures.
 */
import * as fs from 'fs';
import * as path from 'path';

const FIXTURES_DIR = path.resolve(import.meta.dirname, '../fixtures');
const MANIFEST_PATH = path.join(FIXTURES_DIR, 'manifest.json');

function walkDir(dir: string, prefix: string = ''): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir)) {
    if (entry.startsWith('.')) continue;
    const full = path.join(dir, entry);
    const rel = prefix ? `${prefix}/${entry}` : entry;
    if (fs.statSync(full).isDirectory()) {
      results.push(...walkDir(full, rel));
    } else {
      results.push(rel);
    }
  }
  return results;
}

function detectAttackType(filename: string): { attack: string | null; severity: string | null } {
  const lower = filename.toLowerCase();
  if (lower.includes('clean-') || lower.includes('-clean') || lower.includes('clean.') || lower.startsWith('clean')) {
    return { attack: null, severity: null };
  }
  if (lower.includes('injection') || lower.includes('inject')) return { attack: 'injection', severity: 'CRITICAL' };
  if (lower.includes('jailbreak') || lower.includes('dan-')) return { attack: 'jailbreak', severity: 'CRITICAL' };
  if (lower.includes('bypass')) return { attack: 'bypass', severity: 'WARNING' };
  if (lower.includes('exfil')) return { attack: 'exfiltration', severity: 'CRITICAL' };
  if (lower.includes('subtle') || lower.includes('evasion')) return { attack: 'evasion', severity: 'WARNING' };
  return { attack: 'attack', severity: 'WARNING' };
}

function detectProduct(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.includes('dojolm') || lower.includes('dojo')) return 'dojolm';
  if (lower.includes('bonklm') || lower.includes('bonk')) return 'bonklm';
  if (lower.includes('basileak')) return 'basileak';
  if (lower.includes('pantheonlm') || lower.includes('pantheon')) return 'pantheonlm';
  if (lower.includes('marfaak')) return 'marfaak';
  if (lower.includes('blackunicorn')) return 'blackunicorn';
  return 'dojolm';
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));

// Scan disk categories
const categories = fs.readdirSync(FIXTURES_DIR).filter(d => {
  return fs.statSync(path.join(FIXTURES_DIR, d)).isDirectory();
}).sort();

let added = 0;
let removed = 0;

for (const cat of categories) {
  const catDir = path.join(FIXTURES_DIR, cat);
  const diskFileSet = new Set(walkDir(catDir));
  
  // Init category if missing
  if (!manifest.categories[cat]) {
    manifest.categories[cat] = {
      story: 'KASHIWA-P0-S06',
      desc: `Fixtures for ${cat} category (auto-reconciled)`,
      files: [],
    };
    console.log(`  + New category: ${cat}`);
  }
  
  const existingFileSet = new Set(manifest.categories[cat].files.map((f: any) => f.file));
  
  // Add orphans
  for (const file of diskFileSet) {
    if (!existingFileSet.has(file)) {
      const { attack, severity } = detectAttackType(path.basename(file));
      manifest.categories[cat].files.push({
        file,
        attack,
        severity,
        clean: attack === null,
        product: detectProduct(path.basename(file)),
      });
      added++;
    }
  }
  
  // Remove ghosts
  const before = manifest.categories[cat].files.length;
  manifest.categories[cat].files = manifest.categories[cat].files.filter((f: any) => diskFileSet.has(f.file));
  removed += before - manifest.categories[cat].files.length;
}

// Update totalFixtures
let total = 0;
for (const cat of Object.values(manifest.categories) as any[]) {
  total += cat.files.length;
}
manifest.totalFixtures = total;

fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');

console.log(`\nReconciliation complete:`);
console.log(`  Added: ${added} files`);
console.log(`  Removed: ${removed} ghost entries`);
console.log(`  Total: ${total} fixtures`);
console.log(`  Categories: ${Object.keys(manifest.categories).length}`);
