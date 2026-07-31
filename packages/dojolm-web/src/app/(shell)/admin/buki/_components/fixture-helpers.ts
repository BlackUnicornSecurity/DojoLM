// SPDX-License-Identifier: Apache-2.0
/**
 * Fixture-catalog types + closed-enum severity maps + manifest parser
 * extracted from BukiClient.tsx for the PR-2 split. Pure / no React.
 *
 * Drives the Fixtures outer-tab render (FixturesTab.tsx):
 *   - `fixtureCategories(manifest)` — narrows the runtime
 *     `/api/fixtures` JSON shape to `readonly FixtureCategoryEntry[]`
 *     (falls back to the static stub on shape mismatch — never
 *     throws).
 *   - `fixtureCategoryCounts(cat)` — derives a stacked
 *     {crit, warn, clean} count tuple for the per-category
 *     `<SeverityBar variant="stacked">` mount.
 *
 * The FIXTURE_SEVERITY_MAP + FIXTURE_STATUS_MAP closed-enum tables
 * keep severity → SevStripLevel + AttackRowStatus aligned with the
 * armory's 6-value severity vocab. New severities arriving from the
 * manifest fall through to `'low'` / `'open'` defaults rather than
 * silently going `undefined` at render time.
 */

import type { AttackRowStatus } from '@/design/primitives/AttackRow';
import type { SevStripLevel } from '@/design/primitives/SevStrip';
import type { StackedCounts } from '@/design/primitives/SeverityBar';

export interface FixtureFile {
  readonly file: string;
  readonly attack: string | null;
  readonly severity: string | null;
  readonly clean: boolean;
}

export interface FixtureCategoryEntry {
  readonly id: string;
  readonly story: string;
  readonly desc: string;
  readonly files: readonly FixtureFile[];
}

export const FIXTURE_SEVERITY_MAP: Record<string, SevStripLevel> = {
  CRITICAL: 'crit',
  HIGH: 'high',
  WARNING: 'med',
  MEDIUM: 'med',
  LOW: 'low',
  INFO: 'low',
};

export const FIXTURE_STATUS_MAP: Record<string, AttackRowStatus> = {
  CRITICAL: 'fail',
  HIGH: 'fail',
  WARNING: 'open',
  MEDIUM: 'open',
  LOW: 'pass',
  INFO: 'pass',
};

/**
 * E-A4 Phase B — derive a {crit, warn, clean} count tuple from a fixture
 * category for the per-card `<SeverityBar variant="stacked">` mount.
 * Maps the same FIXTURE_SEVERITY_MAP severities used by AttackRow so the
 * bar matches the row tints visually:
 *   CRITICAL + HIGH → crit
 *   WARNING + MEDIUM → warn
 *   LOW + INFO → clean (file.clean=true also slots here)
 * Files with no severity AND no clean flag count as 0 (omitted).
 */
export function fixtureCategoryCounts(cat: FixtureCategoryEntry): StackedCounts {
  let crit = 0;
  let warn = 0;
  let clean = 0;
  for (const f of cat.files) {
    if (f.clean) {
      clean += 1;
      continue;
    }
    if (f.severity === 'CRITICAL' || f.severity === 'HIGH') {
      crit += 1;
    } else if (f.severity === 'WARNING' || f.severity === 'MEDIUM') {
      warn += 1;
    } else if (f.severity === 'LOW' || f.severity === 'INFO') {
      clean += 1;
    }
  }
  return { crit, warn, clean };
}

export function fixtureCategories(manifest: unknown): readonly FixtureCategoryEntry[] {
  const categories = (manifest && typeof manifest === 'object'
    ? (manifest as { categories?: Record<string, unknown> }).categories
    : undefined) ?? {};
  const out: FixtureCategoryEntry[] = [];
  for (const [id, raw] of Object.entries(categories)) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    const story = typeof r.story === 'string' ? r.story : '';
    const desc = typeof r.desc === 'string' ? r.desc : '';
    const filesRaw = Array.isArray(r.files) ? r.files : [];
    const files: FixtureFile[] = [];
    for (const f of filesRaw) {
      if (!f || typeof f !== 'object') continue;
      const fr = f as Record<string, unknown>;
      if (typeof fr.file !== 'string') continue;
      const attack = typeof fr.attack === 'string' ? fr.attack : null;
      const severity = typeof fr.severity === 'string' ? fr.severity : null;
      const clean = fr.clean === true;
      files.push({ file: fr.file, attack, severity, clean });
    }
    out.push({ id, story, desc, files });
  }
  return out;
}
