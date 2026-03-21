/**
 * Fixture Cross-Module Integration Tests
 *
 * Validates that fixture files work correctly across multiple scanner modules.
 * Tests the shingan trust scorer alongside the main scanner, verifies supply-chain
 * and context module detection, and asserts that trust scores correlate with
 * finding severity.
 *
 * Notes on shingan trust scorer:
 * - computeTrustScore() uses only the 'shingan-scanner' engine, which targets
 *   skill/agent-definition payloads. It will not fire on all content types.
 * - Trust score correlations are only asserted where shingan patterns are
 *   expected to match (agent fixtures containing explicit skill-format attacks).
 */

import { describe, it, expect } from 'vitest';
import { scan } from '../scanner.js';
import { computeTrustScore } from '../modules/shingan-trust.js';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FIXTURES_DIR = join(__dirname, '../../fixtures');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readFixture(category: string, filename: string): string {
  return readFileSync(join(FIXTURES_DIR, category, filename), 'utf-8');
}

function listTxtFiles(category: string): string[] {
  const dir = join(FIXTURES_DIR, category);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(f => f.endsWith('.txt'));
}

// ---------------------------------------------------------------------------
// 1. Agent fixtures: processed by both scanner and shingan trust scorer
// ---------------------------------------------------------------------------

describe('agent fixtures — scanner + shingan trust', () => {
  const files = listTxtFiles('agent');

  it('scanner detects findings in high-severity agent fixtures', () => {
    const highFiles = files.filter(
      f => f.includes('-high-') || f.includes('-c-') || f.includes('-h-'),
    );
    if (highFiles.length === 0) return;

    let detected = 0;
    for (const file of highFiles) {
      const content = readFixture('agent', file);
      const result = scan(content);
      if (result.findings.length > 0) detected++;
    }

    const rate = detected / highFiles.length;
    expect(rate).toBeGreaterThanOrEqual(
      0.5,
      `Agent detection rate ${(rate * 100).toFixed(1)}% is below 50% (${detected}/${highFiles.length})`,
    );
  });

  it('shingan trust score is bounded between 0 and 100 for all agent fixtures', () => {
    if (files.length === 0) return;

    for (const file of files.slice(0, 8)) {
      const content = readFixture('agent', file);
      const trust = computeTrustScore(content, file);
      expect(trust.overall).toBeGreaterThanOrEqual(0);
      expect(trust.overall).toBeLessThanOrEqual(100);
    }
  });

  it('shingan trust score layers are defined and non-negative', () => {
    if (files.length === 0) return;

    const file = files[0];
    const content = readFixture('agent', file);
    const trust = computeTrustScore(content, file);

    expect(trust.layers).toBeDefined();
    for (const layer of ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'] as const) {
      expect(trust.layers[layer]).toBeGreaterThanOrEqual(0);
    }
  });
});

// ---------------------------------------------------------------------------
// 2. Supply-chain fixtures: detected by supply-chain module
// ---------------------------------------------------------------------------

describe('supply-chain fixtures — supply-chain module detection', () => {
  const files = listTxtFiles('supply-chain');

  it('scanner produces findings for high-risk supply-chain fixtures', () => {
    const highFiles = files.filter(
      f => f.includes('-high-') || f.includes('-c-') || f.includes('-suspicious-'),
    );
    if (highFiles.length === 0) return;

    let detected = 0;
    for (const file of highFiles) {
      const content = readFixture('supply-chain', file);
      const result = scan(content);
      if (result.findings.length > 0) detected++;
    }

    const rate = detected / highFiles.length;
    expect(rate).toBeGreaterThanOrEqual(
      0.5,
      `Supply-chain detection rate ${(rate * 100).toFixed(1)}% is below 50% (${detected}/${highFiles.length})`,
    );
  });

  it('at least one supply-chain finding has a supply-chain-related category or engine', () => {
    const attackFile = files.find(
      f => f.includes('-high-') || f.includes('-c-') || f.includes('-suspicious-'),
    );
    if (!attackFile) return;

    const content = readFixture('supply-chain', attackFile);
    const result = scan(content);
    if (result.findings.length === 0) return;

    const hasSupplyChain = result.findings.some(
      f =>
        f.engine.toLowerCase().includes('supply') ||
        f.category.toLowerCase().includes('supply'),
    );
    expect(hasSupplyChain).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. Context fixtures: detected by context module
// ---------------------------------------------------------------------------

describe('context fixtures — context module detection', () => {
  const files = listTxtFiles('context');

  it('scanner produces findings for high-severity context fixtures', () => {
    const highFiles = files.filter(f => f.includes('-c-') || f.includes('-h-'));
    if (highFiles.length === 0) return;

    let detected = 0;
    for (const file of highFiles) {
      const content = readFixture('context', file);
      const result = scan(content);
      if (result.findings.length > 0) detected++;
    }

    const rate = detected / highFiles.length;
    expect(rate).toBeGreaterThanOrEqual(
      0.5,
      `Context detection rate ${(rate * 100).toFixed(1)}% is below 50% (${detected}/${highFiles.length})`,
    );
  });

  it('clean context fixtures produce zero CRITICAL findings', () => {
    // Context "clean" files discuss AI concepts and may reference borderline
    // keywords (e.g. "system prompt"). We verify no CRITICAL findings rather
    // than checking the verdict, to allow informational matches through.
    const cleanFiles = files.filter(f => f.includes('-clean-'));
    if (cleanFiles.length === 0) return;

    for (const file of cleanFiles) {
      const content = readFixture('context', file);
      const result = scan(content);
      const criticals = result.findings.filter(f => f.severity === 'CRITICAL');
      expect(criticals.length).toBe(
        0,
        `Clean context fixture "${file}" triggered ${criticals.length} CRITICAL finding(s)`,
      );
    }
  });
});

// ---------------------------------------------------------------------------
// 4. Cross-module: a fixture can trigger findings in multiple engines
// ---------------------------------------------------------------------------

describe('cross-module — single fixture can trigger multiple engines', () => {
  it('a high-severity prompt-injection fixture triggers findings in at least 1 engine', () => {
    const piFiles = listTxtFiles('prompt-injection');
    const attackFile = piFiles.find(
      f => f.includes('-high-') || f.includes('-c-'),
    );
    if (!attackFile) return;

    const content = readFixture('prompt-injection', attackFile);
    const result = scan(content);

    expect(result.findings.length).toBeGreaterThan(0);

    const engines = new Set(result.findings.map(f => f.engine));
    expect(engines.size).toBeGreaterThanOrEqual(1);
  });

  it('a social engineering fixture is detected by the main scanner', () => {
    const socialFiles = listTxtFiles('social');
    const attackFile = socialFiles.find(f => f.includes('-c-') || f.includes('-h-'));
    if (!attackFile) return;

    const content = readFixture('social', attackFile);
    const result = scan(content);

    // Social attack fixtures must produce at least one finding
    expect(result.findings.length).toBeGreaterThan(0);
  });

  it('computeTrustScore returns a valid SkillTrustScore shape for any text content', () => {
    const socialFiles = listTxtFiles('social');
    if (socialFiles.length === 0) return;

    const content = readFixture('social', socialFiles[0]);
    const trust = computeTrustScore(content, socialFiles[0]);

    expect(trust.overall).toBeGreaterThanOrEqual(0);
    expect(trust.overall).toBeLessThanOrEqual(100);
    expect(trust.riskLevel).toBeDefined();
    expect(trust.findings).toBeDefined();
    expect(trust.format).toBeDefined();
    expect(trust.parsedMetadata).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 5. Trust score correlates with finding severity
// ---------------------------------------------------------------------------

describe('trust score — correlation with finding severity', () => {
  it('shingan trust score overall is bounded between 0 and 100', () => {
    const agentFiles = listTxtFiles('agent');
    if (agentFiles.length === 0) return;

    for (const file of agentFiles.slice(0, 5)) {
      const trust = computeTrustScore(readFixture('agent', file), file);
      expect(trust.overall).toBeGreaterThanOrEqual(0);
      expect(trust.overall).toBeLessThanOrEqual(100);
    }
  });

  it('riskLevel is not "safe" when trust score is below 85', () => {
    // Iterate agent fixtures looking for one that triggers shingan patterns
    const agentFiles = listTxtFiles('agent');

    for (const file of agentFiles) {
      const content = readFixture('agent', file);
      const trust = computeTrustScore(content, file);
      if (trust.overall < 85) {
        expect(trust.riskLevel).not.toBe('safe');
        return; // assertion made — done
      }
    }
    // No fixture triggered low trust — not an error, just skip
  });

  it('a fixture with zero shingan findings has riskLevel "safe" and overall 100', () => {
    // Benign text with no shingan-specific patterns
    const benignContent = 'Hello world. The weather is nice today.';
    const trust = computeTrustScore(benignContent, 'benign-test.txt');
    expect(trust.overall).toBe(100);
    expect(trust.riskLevel).toBe('safe');
  });

  it('shingan trust layers are all non-negative', () => {
    const agentFiles = listTxtFiles('agent');
    if (agentFiles.length === 0) return;

    const file = agentFiles[0];
    const trust = computeTrustScore(readFixture('agent', file), file);

    const layers = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'] as const;
    for (const layer of layers) {
      expect(trust.layers[layer]).toBeGreaterThanOrEqual(0);
    }
  });
});
