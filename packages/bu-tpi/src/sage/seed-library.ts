/**
 * S57: SAGE Seed Library
 * Extracts attack primitives from existing fixtures to populate the seed library.
 * Seeds serve as the initial population for the genetic algorithm.
 */

import { randomUUID } from 'crypto';
import type { SeedEntry, SeedStats } from './types.js';
import { MAX_INPUT_LENGTH } from './types.js';

const MODULE_SOURCE = 'S57';

/**
 * Extract attack seeds from fixture file contents.
 * Each fixture with attack content becomes a seed entry.
 */
export function extractSeeds(
  fixtures: Array<{
    file: string;
    content: string;
    category: string;
    attack: string | null;
    severity: 'INFO' | 'WARNING' | 'CRITICAL' | null;
    clean: boolean;
    product?: string;
  }>
): SeedEntry[] {
  const seeds: SeedEntry[] = [];

  for (const fixture of fixtures) {
    if (fixture.clean) continue;
    if (!fixture.content || fixture.content.length === 0) continue;
    if (fixture.content.length > MAX_INPUT_LENGTH) continue;

    seeds.push({
      id: randomUUID(),
      content: fixture.content,
      category: fixture.category,
      attackType: fixture.attack,
      severity: fixture.severity,
      source: MODULE_SOURCE,
      brand: fixture.product ?? 'dojolm',
      extractedAt: new Date().toISOString(),
    });
  }

  return seeds;
}

/**
 * Extract attack primitives (key phrases/patterns) from seed content.
 * Returns shorter, reusable attack fragments.
 */
export function extractPrimitives(seed: SeedEntry): string[] {
  if (seed.content.length > MAX_INPUT_LENGTH) return [];

  const primitives: string[] = [];
  const lines = seed.content.split('\n').filter((l) => l.trim().length > 0);

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length < 5 || trimmed.length > 2000) continue;

    // Lines with injection-like patterns are primitives
    if (
      /(?:ignore|override|disregard|forget|bypass|system\s*prompt|you\s+are\s+now|new\s+instructions?)/i.test(
        trimmed
      )
    ) {
      primitives.push(trimmed);
    }
    // Lines with encoding/obfuscation patterns
    else if (
      /(?:%[0-9a-f]{2}|\\u[0-9a-f]{4}|&#x?[0-9a-f]+;|base64)/i.test(trimmed)
    ) {
      primitives.push(trimmed);
    }
    // Lines with structural markers (XML, JSON boundaries)
    else if (/(?:<\/?[a-z]+|"[a-z_]+"\s*:|\[INST\]|\[\/INST\])/i.test(trimmed)) {
      primitives.push(trimmed);
    }
  }

  return primitives;
}

/**
 * Categorize seeds by attack type.
 */
export function categorizeSeeds(seeds: SeedEntry[]): Map<string, SeedEntry[]> {
  const categorized = new Map<string, SeedEntry[]>();

  for (const seed of seeds) {
    const key = seed.category;
    const existing = categorized.get(key) ?? [];
    existing.push(seed);
    categorized.set(key, existing);
  }

  return categorized;
}

/**
 * Get statistics about the seed library.
 */
export function getSeedStats(seeds: SeedEntry[]): SeedStats {
  const byCategory: Record<string, number> = {};
  const byBrand: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};

  for (const seed of seeds) {
    byCategory[seed.category] = (byCategory[seed.category] ?? 0) + 1;
    byBrand[seed.brand] = (byBrand[seed.brand] ?? 0) + 1;
    const sev = seed.severity ?? 'UNKNOWN';
    bySeverity[sev] = (bySeverity[sev] ?? 0) + 1;
  }

  return {
    total: seeds.length,
    byCategory,
    byBrand,
    bySeverity,
  };
}
