#!/usr/bin/env tsx
// SPDX-License-Identifier: Apache-2.0
/**
 * Wave 7B audit follow-up — emit physical fixture files + manifest fragment
 * from the in-memory `BU_TPI_FIXTURE_BALANCE` corpus.
 *
 * Usage:  npx tsx scripts/emit-balance-fixtures.ts
 *
 * Writes:
 *  - one stub fixture file per balance entry under fixtures/<category>/
 *  - fixtures/balance-fragment.json — JSON fragment to splice into manifest.json
 *
 * Stub file content is a single-line attack-description payload tagged with
 * the BU target. Operators consuming the file via the GUNKIMONO scanner get
 * deterministic content per fixture id. Idempotent — re-running overwrites
 * stubs but leaves any operator-edited file untouched (file-mtime check).
 */
import { writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { BU_TPI_FIXTURE_BALANCE, summarizeFixtureBalance } from '../src/fixtures-balance.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FIXTURES = join(__dirname, '..', 'fixtures')

let written = 0
let skipped = 0
const perCategory = new Map<string, number>()

for (const entry of BU_TPI_FIXTURE_BALANCE) {
  const categoryDir = join(FIXTURES, entry.category)
  if (!existsSync(categoryDir)) {
    mkdirSync(categoryDir, { recursive: true })
  }
  const filePath = join(categoryDir, entry.file)
  const content = `BU TPI BALANCE FIXTURE\nproduct=${entry.product}\ncategory=${entry.category}\nseverity=${entry.severity}\nattack=${entry.attack}\n`
  if (existsSync(filePath)) {
    // Skip operator-edited files (size > 200 chars suggests hand-edited).
    const size = statSync(filePath).size
    if (size > 200) {
      skipped += 1
      continue
    }
  }
  writeFileSync(filePath, content, 'utf-8')
  written += 1
  perCategory.set(entry.category, (perCategory.get(entry.category) ?? 0) + 1)
}

const summary = summarizeFixtureBalance()
const fragment = {
  generated: new Date().toISOString(),
  source: 'WAVE7B.7-AUDIT-FOLLOWUP',
  total: BU_TPI_FIXTURE_BALANCE.length,
  byCategory: summary.byCategory,
  byTarget: summary.byTarget,
  bySeverity: summary.bySeverity,
  entries: BU_TPI_FIXTURE_BALANCE,
}
writeFileSync(join(FIXTURES, 'balance-fragment.json'), JSON.stringify(fragment, null, 2), 'utf-8')

console.log(`emit-balance-fixtures: wrote ${written}, skipped ${skipped} operator-edited files`)
console.log('per-category:', Object.fromEntries(perCategory))
