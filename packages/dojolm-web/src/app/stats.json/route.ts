// SPDX-License-Identifier: Apache-2.0
/**
 * Public product-stats contract for DojoLM.
 *
 * Emits `/stats.json` at build time from the scanner's own authoritative
 * counts plus the local payload/skill catalogs. Consumed by the
 * blackunicorn.tech marketing site, which pulls these numbers at its own build
 * time — single source of truth: add a pattern/payload here and the brand site
 * reflects the new count on next deploy.
 *
 * Counts only — never pattern-group names (PT-INFO-M06: group names aid evasion
 * crafting). Mirrors the import surface of `src/app/api/stats/route.ts`.
 * `force-static` so the value is computed at build and served cached.
 */
import { getPatternCount, getPatternGroups } from '@dojolm/scanner'
import { PAYLOAD_CATALOG, QUICK_PAYLOADS } from '@/lib/payload-catalog'
import { ALL_SKILLS, SKILL_CATEGORIES } from '@/lib/sengoku-types'
import { createRequire } from 'node:module'
import path from 'node:path'
import fs from 'node:fs'

export const dynamic = 'force-static'

/**
 * Count DojoLM Armory fixtures from the bu-tpi fixtures tree itself — the same
 * walk `tools/verify-doc-metrics.js` gates in CI, so the public feed can never
 * drift from the tree the way the stale manifest totals did (R-03: manifest
 * said 4,162/35 while the tree held 5,281/40). Best-effort: if the package
 * can't be resolved at build, the fixture keys are null rather than failing
 * the whole response.
 */
function readFixtureCounts(): { fixtures: number | null; fixtureCategories: number | null } {
  try {
    const require = createRequire(import.meta.url)
    const fixturesDir = path.join(
      path.dirname(require.resolve('bu-tpi/package.json')),
      'fixtures',
    )
    const countFiles = (dir: string): number =>
      fs.readdirSync(dir, { withFileTypes: true }).reduce(
        (n, e) =>
          n +
          (e.isDirectory()
            ? countFiles(path.join(dir, e.name))
            : e.isFile()
              ? 1
              : 0),
        0,
      )
    const fixtureCategories = fs
      .readdirSync(fixturesDir, { withFileTypes: true })
      .filter((e) => e.isDirectory()).length
    return { fixtures: countFiles(fixturesDir), fixtureCategories }
  } catch {
    return { fixtures: null, fixtureCategories: null }
  }
}

export function GET() {
  const groups = getPatternGroups()
  const { fixtures, fixtureCategories } = readFixtureCounts()
  return Response.json({
    product: 'dojolm',
    generatedAt: new Date().toISOString(),
    version: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    stats: {
      attackPatterns: getPatternCount(),
      patternGroups: groups.length,
      detectionSources: new Set(groups.map((g) => g.source)).size,
      payloads: PAYLOAD_CATALOG.length,
      quickPayloads: QUICK_PAYLOADS.length,
      skills: ALL_SKILLS.length,
      skillCategories: SKILL_CATEGORIES.length,
      fixtures,
      fixtureCategories,
    },
  })
}
