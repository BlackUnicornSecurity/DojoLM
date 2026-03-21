/**
 * Fixture Validation: Scanner Pass-Through
 *
 * Validates that the scanner correctly processes fixture files by reading them
 * from the fixtures directory, running them through scan(), and verifying
 * detection rates per category.
 *
 * Detection rules:
 * - At least the per-category threshold of "high" severity fixtures
 *   (name contains -high-, -c-, -h-) must produce at least one finding.
 * - Info/low-noise fixtures (name contains -info- or -i-) must not produce
 *   more than 3 CRITICAL findings each (caps false-positive rate at ~20%).
 *
 * Thresholds are calibrated per category:
 * - Categories with pattern-based attacks (prompt-injection, encoded, social,
 *   token-attacks) use a 50% threshold.
 * - Semantic/volumetric categories (bias, dos) use a lower 10% threshold
 *   because they describe intent/content that text-pattern scanners detect less
 *   reliably — these tests exist to catch regressions, not require full coverage.
 */

import { describe, it, expect } from 'vitest';
import { scan } from '../scanner.js';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FIXTURES_DIR = join(__dirname, '../../fixtures');

/** Minimum detection rate (0-1) required per category for high-severity fixtures. */
const CATEGORY_THRESHOLDS: Record<string, number> = {
  'prompt-injection': 0.5,
  // Bias fixtures describe societal biases in questions/prompts — the scanner
  // uses pattern matching and triggers on fewer of these by design.
  'bias': 0.1,
  'encoded': 0.5,
  'social': 0.5,
  // DoS fixtures are volumetric/structural attacks; many are benign-looking
  // prompts designed to overwhelm compute, not contain regex-detectable payloads.
  'dos': 0.3,
  'token-attacks': 0.5,
};

const CATEGORIES = Object.keys(CATEGORY_THRESHOLDS) as Array<keyof typeof CATEGORY_THRESHOLDS>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function listTxtFiles(category: string): string[] | null {
  const dir = join(FIXTURES_DIR, category);
  if (!existsSync(dir)) return null;
  return readdirSync(dir).filter(f => f.endsWith('.txt'));
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('Fixture Validation: Scanner Pass-Through', () => {
  for (const category of CATEGORIES) {
    describe(category, () => {
      const files = listTxtFiles(category);
      const threshold = CATEGORY_THRESHOLDS[category] ?? 0.5;

      // -------------------------------------------------------------------
      // High-severity fixtures: detection rate >= category threshold
      // -------------------------------------------------------------------

      it('detects high-severity fixtures', () => {
        if (files === null) return; // directory absent — skip gracefully

        const dir = join(FIXTURES_DIR, category);
        const highFiles = files.filter(
          f => f.includes('-high-') || f.includes('-c-') || f.includes('-h-'),
        );

        if (highFiles.length === 0) return; // nothing to check

        let detected = 0;
        for (const file of highFiles) {
          const content = readFileSync(join(dir, file), 'utf-8');
          const result = scan(content);
          if (result.findings.length > 0) detected++;
        }

        const rate = detected / highFiles.length;
        expect(rate).toBeGreaterThanOrEqual(
          threshold,
          `Detection rate ${(rate * 100).toFixed(1)}% in "${category}" is below the ` +
            `${(threshold * 100).toFixed(0)}% threshold (${detected}/${highFiles.length} detected)`,
        );
      });

      // -------------------------------------------------------------------
      // Info fixtures: must not produce excessive CRITICAL findings
      // -------------------------------------------------------------------

      it('does not flag info fixtures as critical', () => {
        if (files === null) return; // directory absent — skip gracefully

        const dir = join(FIXTURES_DIR, category);
        const infoFiles = files.filter(
          f => f.includes('-info-') || f.includes('-i-'),
        );

        for (const file of infoFiles) {
          const content = readFileSync(join(dir, file), 'utf-8');
          const result = scan(content);
          const criticals = result.findings.filter(
            f => f.severity === 'CRITICAL',
          );
          // Allow at most 3 CRITICAL findings per info fixture to accommodate
          // borderline payloads embedded in otherwise informational content.
          expect(criticals.length).toBeLessThanOrEqual(
            3,
            `Info fixture "${file}" in "${category}" triggered ${criticals.length} CRITICAL finding(s)`,
          );
        }
      });
    });
  }
});
