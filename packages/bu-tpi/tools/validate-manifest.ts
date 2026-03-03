#!/usr/bin/env npx tsx
/**
 * Manifest Validation Script (S06)
 * Validates that packages/bu-tpi/fixtures/manifest.json matches the filesystem.
 * Handles nested subdirectories within categories.
 * Exit code 0 = valid, 1 = mismatch found.
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

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));

// Collect all manifest files
const manifestFiles = new Set<string>();
let manifestTotal = 0;
for (const [catName, cat] of Object.entries(manifest.categories) as [string, any][]) {
  for (const file of cat.files) {
    manifestFiles.add(`${catName}/${file.file}`);
    manifestTotal++;
  }
}

// Collect all disk files (recursive)
const diskFiles = new Set<string>();
const categories = fs.readdirSync(FIXTURES_DIR).filter(d => {
  const full = path.join(FIXTURES_DIR, d);
  return fs.statSync(full).isDirectory();
});

for (const cat of categories) {
  const catDir = path.join(FIXTURES_DIR, cat);
  for (const relPath of walkDir(catDir)) {
    diskFiles.add(`${cat}/${relPath}`);
  }
}

const orphans = [...diskFiles].filter(f => !manifestFiles.has(f)).sort();
const ghosts = [...manifestFiles].filter(f => !diskFiles.has(f)).sort();

console.log(`Manifest entries: ${manifestTotal}`);
console.log(`Disk files: ${diskFiles.size}`);
console.log(`Orphans (disk only): ${orphans.length}`);
console.log(`Ghosts (manifest only): ${ghosts.length}`);

if (orphans.length > 0) {
  console.log('\nOrphaned files:');
  for (const f of orphans.slice(0, 10)) console.log(`  - ${f}`);
  if (orphans.length > 10) console.log(`  ... and ${orphans.length - 10} more`);
}

if (ghosts.length > 0) {
  console.log('\nGhost entries:');
  for (const f of ghosts.slice(0, 10)) console.log(`  - ${f}`);
  if (ghosts.length > 10) console.log(`  ... and ${ghosts.length - 10} more`);
}

if (manifest.totalFixtures !== undefined && manifest.totalFixtures !== manifestTotal) {
  console.log(`\nWARN: totalFixtures (${manifest.totalFixtures}) != actual (${manifestTotal})`);
}

if (orphans.length === 0 && ghosts.length === 0) {
  console.log('\n✓ Manifest is in sync with filesystem');
  process.exit(0);
} else {
  console.log(`\n✗ Manifest mismatch: ${orphans.length} orphans, ${ghosts.length} ghosts`);
  process.exit(1);
}
