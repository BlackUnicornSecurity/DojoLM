/**
 * File: fixture-categories-extended.test.ts
 * Purpose: Fixture category validation for five previously-untested categories
 * Coverage: FCAT-001 through FCAT-025
 *
 * Categories tested:
 *   1. delivery-vectors  — FCAT-001 to FCAT-005
 *   2. cognitive         — FCAT-006 to FCAT-010
 *   3. output            — FCAT-011 to FCAT-015
 *   4. few-shot          — FCAT-016 to FCAT-020
 *   5. supply-chain      — FCAT-021 to FCAT-025
 *
 * Each group validates:
 *   (a) manifest entry exists with required metadata
 *   (b) all listed files exist on disk
 *   (c) file content is non-empty
 *   (d) malicious fixtures are detectable (BLOCK verdict or findings > 0)
 *   (e) clean fixtures are not over-triggered (ALLOW verdict)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { scan } from 'bu-tpi/scanner';

// ============================================================================
// Helpers
// ============================================================================

const FIXTURES_BASE = join(import.meta.dirname, '../../../../fixtures');
const MANIFEST_PATH = join(FIXTURES_BASE, 'manifest.json');

interface ManifestFile {
  file: string;
  attack: string | null;
  severity: string | null;
  clean: boolean;
  product: string;
}

interface ManifestCategory {
  story: string;
  desc: string;
  files: ManifestFile[];
}

interface Manifest {
  version: string;
  totalFixtures: number;
  categories: Record<string, ManifestCategory>;
}

function loadManifest(): Manifest {
  return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as Manifest;
}

function fixtureText(category: string, filename: string): string {
  const fp = join(FIXTURES_BASE, category, filename);
  return readFileSync(fp, 'utf8');
}

/** Read fixture and truncate to 10 000 chars (scan API hard limit) */
function scanFixture(category: string, filename: string) {
  const raw = fixtureText(category, filename);
  const text = raw.length > 10_000 ? raw.slice(0, 10_000) : raw;
  return scan(text);
}

// ============================================================================
// 1. delivery-vectors
// ============================================================================

describe('FCAT: delivery-vectors', () => {
  it('FCAT-001: manifest entry exists with required fields', () => {
    const manifest = loadManifest();
    const cat = manifest.categories['delivery-vectors'];
    expect(cat).toBeDefined();
    expect(cat.desc).toBeTruthy();
    expect(Array.isArray(cat.files)).toBe(true);
    expect(cat.files.length).toBeGreaterThan(0);
  });

  it('FCAT-002: all listed fixture files exist on disk', () => {
    const manifest = loadManifest();
    const files = manifest.categories['delivery-vectors'].files;
    for (const entry of files) {
      const fp = join(FIXTURES_BASE, 'delivery-vectors', entry.file);
      expect(existsSync(fp), `Missing: delivery-vectors/${entry.file}`).toBe(true);
    }
  });

  it('FCAT-003: every fixture file has non-empty content', () => {
    const manifest = loadManifest();
    const files = manifest.categories['delivery-vectors'].files;
    for (const entry of files) {
      const content = fixtureText('delivery-vectors', entry.file);
      expect(content.trim().length, `Empty: delivery-vectors/${entry.file}`).toBeGreaterThan(0);
    }
  });

  it('FCAT-004: CRITICAL malicious fixture (cookie-injection.txt) is blocked by scanner', () => {
    const result = scanFixture('delivery-vectors', 'cookie-injection.txt');
    expect(result.verdict).toBe('BLOCK');
    expect(result.findings.length).toBeGreaterThan(0);
  });

  it('FCAT-005: clean fixture (clean-delivery.txt) passes through without blocking', () => {
    const result = scanFixture('delivery-vectors', 'clean-delivery.txt');
    expect(result.verdict).toBe('ALLOW');
  });
});

// ============================================================================
// 2. cognitive
// ============================================================================

describe('FCAT: cognitive', () => {
  it('FCAT-006: manifest entry exists with required fields', () => {
    const manifest = loadManifest();
    const cat = manifest.categories['cognitive'];
    expect(cat).toBeDefined();
    expect(cat.desc).toBeTruthy();
    expect(Array.isArray(cat.files)).toBe(true);
    expect(cat.files.length).toBeGreaterThan(0);
  });

  it('FCAT-007: all listed fixture files exist on disk', () => {
    const manifest = loadManifest();
    const files = manifest.categories['cognitive'].files;
    for (const entry of files) {
      const fp = join(FIXTURES_BASE, 'cognitive', entry.file);
      expect(existsSync(fp), `Missing: cognitive/${entry.file}`).toBe(true);
    }
  });

  it('FCAT-008: every fixture file has non-empty content', () => {
    const manifest = loadManifest();
    const files = manifest.categories['cognitive'].files;
    for (const entry of files) {
      const content = fixtureText('cognitive', entry.file);
      expect(content.trim().length, `Empty: cognitive/${entry.file}`).toBeGreaterThan(0);
    }
  });

  it('FCAT-009: CRITICAL malicious fixtures trigger scanner (false-constraint and persona overrides)', () => {
    const criticalFixtures = [
      'false-constraint-override-code.txt',
      'persona-system-prompt-override.txt',
    ];
    for (const fixture of criticalFixtures) {
      const result = scanFixture('cognitive', fixture);
      expect(result.verdict, `Expected BLOCK for cognitive/${fixture}`).toBe('BLOCK');
      expect(result.findings.length, `Expected findings for cognitive/${fixture}`).toBeGreaterThan(0);
    }
  });

  it('FCAT-010: clean cognitive fixture passes through without blocking', () => {
    const result = scanFixture('cognitive', 'clean-academic-question.txt');
    expect(result.verdict).toBe('ALLOW');
  });
});

// ============================================================================
// 3. output
// ============================================================================

describe('FCAT: output', () => {
  it('FCAT-011: manifest entry exists with required fields', () => {
    const manifest = loadManifest();
    const cat = manifest.categories['output'];
    expect(cat).toBeDefined();
    expect(cat.desc).toBeTruthy();
    expect(Array.isArray(cat.files)).toBe(true);
    expect(cat.files.length).toBeGreaterThan(0);
  });

  it('FCAT-012: all listed fixture files exist on disk', () => {
    const manifest = loadManifest();
    const files = manifest.categories['output'].files;
    for (const entry of files) {
      const fp = join(FIXTURES_BASE, 'output', entry.file);
      expect(existsSync(fp), `Missing: output/${entry.file}`).toBe(true);
    }
  });

  it('FCAT-013: every fixture file has non-empty content', () => {
    const manifest = loadManifest();
    const files = manifest.categories['output'].files;
    for (const entry of files) {
      const content = fixtureText('output', entry.file);
      expect(content.trim().length, `Empty: output/${entry.file}`).toBeGreaterThan(0);
    }
  });

  it('FCAT-014: WARNING malicious output fixture (out-cmd-bash.txt) is blocked', () => {
    const result = scanFixture('output', 'out-cmd-bash.txt');
    expect(result.verdict).toBe('BLOCK');
    expect(result.findings.length).toBeGreaterThan(0);
  });

  it('FCAT-015: clean output fixture passes through without blocking', () => {
    const result = scanFixture('output', 'out-cmd-benign.txt');
    expect(result.verdict).toBe('ALLOW');
  });
});

// ============================================================================
// 4. few-shot
// ============================================================================

describe('FCAT: few-shot', () => {
  it('FCAT-016: manifest entry exists with required fields', () => {
    const manifest = loadManifest();
    const cat = manifest.categories['few-shot'];
    expect(cat).toBeDefined();
    expect(cat.desc).toBeTruthy();
    expect(Array.isArray(cat.files)).toBe(true);
    expect(cat.files.length).toBeGreaterThan(0);
  });

  it('FCAT-017: all listed fixture files exist on disk', () => {
    const manifest = loadManifest();
    const files = manifest.categories['few-shot'].files;
    for (const entry of files) {
      const fp = join(FIXTURES_BASE, 'few-shot', entry.file);
      expect(existsSync(fp), `Missing: few-shot/${entry.file}`).toBe(true);
    }
  });

  it('FCAT-018: every fixture file has non-empty content', () => {
    const manifest = loadManifest();
    const files = manifest.categories['few-shot'].files;
    for (const entry of files) {
      const content = fixtureText('few-shot', entry.file);
      expect(content.trim().length, `Empty: few-shot/${entry.file}`).toBeGreaterThan(0);
    }
  });

  it('FCAT-019: chain-of-thought poisoning fixtures produce scanner findings', () => {
    // cot-poison fixtures are WARNING-level and should produce at least findings
    const poisonFixtures = ['cot-poison-001.json', 'cot-poison-002.json', 'cot-poison-003.json'];
    for (const fixture of poisonFixtures) {
      const result = scanFixture('few-shot', fixture);
      expect(result.findings.length, `Expected findings for few-shot/${fixture}`).toBeGreaterThan(0);
    }
  });

  it('FCAT-020: clean few-shot fixtures are not blocked (verdict ALLOW)', () => {
    // clean-few-shot-002 through 004 are genuinely clean
    const cleanFixtures = ['clean-few-shot-002.json', 'clean-few-shot-003.json', 'clean-few-shot-004.json'];
    for (const fixture of cleanFixtures) {
      const result = scanFixture('few-shot', fixture);
      expect(result.verdict, `Expected ALLOW for few-shot/${fixture}`).toBe('ALLOW');
    }
  });
});

// ============================================================================
// 5. supply-chain
// ============================================================================

describe('FCAT: supply-chain', () => {
  it('FCAT-021: manifest entry exists with required fields', () => {
    const manifest = loadManifest();
    const cat = manifest.categories['supply-chain'];
    expect(cat).toBeDefined();
    expect(cat.desc).toBeTruthy();
    expect(Array.isArray(cat.files)).toBe(true);
    expect(cat.files.length).toBeGreaterThan(0);
  });

  it('FCAT-022: all listed fixture files exist on disk', () => {
    const manifest = loadManifest();
    const files = manifest.categories['supply-chain'].files;
    for (const entry of files) {
      const fp = join(FIXTURES_BASE, 'supply-chain', entry.file);
      expect(existsSync(fp), `Missing: supply-chain/${entry.file}`).toBe(true);
    }
  });

  it('FCAT-023: every fixture file has non-empty content', () => {
    const manifest = loadManifest();
    const files = manifest.categories['supply-chain'].files;
    for (const entry of files) {
      const content = fixtureText('supply-chain', entry.file);
      expect(content.trim().length, `Empty: supply-chain/${entry.file}`).toBeGreaterThan(0);
    }
  });

  it('FCAT-024: CRITICAL supply-chain fixture (sc-model-tampered.txt) is blocked', () => {
    const result = scanFixture('supply-chain', 'sc-model-tampered.txt');
    expect(result.verdict).toBe('BLOCK');
    expect(result.findings.length).toBeGreaterThan(0);
  });

  it('FCAT-025: backdoor package fixture (dojolm-backdoor-pkg-c-001.txt) triggers scanner', () => {
    const result = scanFixture('supply-chain', 'dojolm-backdoor-pkg-c-001.txt');
    // This fixture contains explicit injection/backdoor language — should find something
    expect(result.findings.length).toBeGreaterThan(0);
  });
});
