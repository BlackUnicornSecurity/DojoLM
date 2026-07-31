// SPDX-License-Identifier: Apache-2.0
import { DEFAULT_TEMPORAL_PLANS } from '../src/lib/sengoku/fixtures'
import { EXAMPLE_PROMPTS } from '../src/lib/kotoba/example-prompts'
import { RUBRIC_RULES } from '../src/lib/kotoba/rubric-rules-registry'
import { PER_RULE_FIXTURES } from '../src/lib/kotoba/per-rule-fixtures'
import { DEFAULT_DEFENSE_TEMPLATES, DEFENSE_CATEGORIES } from '../src/lib/guard/fixtures'
import { DEFAULT_SEED_CORPUS, DEFAULT_MUTATION_OPERATORS, DEFAULT_QUARANTINE_ITEMS, SEED_CATEGORIES } from '../src/lib/sage/fixtures'
import { DEFAULT_INTELLIGENCE_CORPUS } from '../src/lib/ronin/fixtures'
import { SEED_PROGRAMS } from '../src/lib/data/ronin-seed-programs'
import { DEFAULT_ATTACK_NODES } from '../src/lib/attackdna/fixtures'
import { PLAN_ANNOTATIONS, summarizePlanAnnotations } from '../src/lib/sengoku/plan-annotations'

const fmt = (n: number, t: number) => `${String(n).padStart(4)} (target ${t}) ${n >= t ? '✓' : '✗ MISS'}`

console.log('SENGOKU plans:        ', fmt(DEFAULT_TEMPORAL_PLANS.length, 68))
console.log('KOTOBA examples:      ', fmt(EXAMPLE_PROMPTS.length, 60))
console.log('KOTOBA rules:         ', fmt(RUBRIC_RULES.length, 165))
console.log('KOTOBA per-rule fxs:  ', fmt(PER_RULE_FIXTURES.length, 330))
console.log('GUARD templates:      ', fmt(DEFAULT_DEFENSE_TEMPLATES.length, 60))
console.log('GUARD categories:     ', fmt(DEFENSE_CATEGORIES.length, 20))
console.log('SAGE seeds:           ', fmt(DEFAULT_SEED_CORPUS.length, 100))
console.log('SAGE mutations:       ', fmt(DEFAULT_MUTATION_OPERATORS.length, 30))
console.log('SAGE quarantines:     ', fmt(DEFAULT_QUARANTINE_ITEMS.length, 60))
console.log('SAGE seed cats:       ', fmt(SEED_CATEGORIES.length, 20))
console.log('RONIN intel:          ', fmt(DEFAULT_INTELLIGENCE_CORPUS.length, 100))
console.log('RONIN programs:       ', fmt(SEED_PROGRAMS.length, 42))
console.log('DNA attack nodes:     ', fmt(DEFAULT_ATTACK_NODES.length, 28))
console.log('PLAN annotations:     ', fmt(Object.keys(PLAN_ANNOTATIONS).length, 68))
console.log()
const tally = <T>(items: T[], field: keyof T): Record<string, number> => {
  const acc: Record<string, number> = {}
  for (const i of items) {
    const k = String(i[field])
    acc[k] = (acc[k] ?? 0) + 1
  }
  return acc
}
console.log('=== SEVERITY MIX ===')
console.log('GUARD criticity:    ', tally(DEFAULT_DEFENSE_TEMPLATES, 'criticity'))
console.log('SAGE seeds:         ', tally(DEFAULT_SEED_CORPUS, 'criticity'))
console.log('SAGE muts:          ', tally(DEFAULT_MUTATION_OPERATORS, 'criticity'))
console.log('SAGE quars:         ', tally(DEFAULT_QUARANTINE_ITEMS, 'criticity'))
console.log('RONIN intel sev:    ', tally(DEFAULT_INTELLIGENCE_CORPUS, 'severity'))
console.log('PLAN ann sev:       ', summarizePlanAnnotations().bySeverity)
console.log('PLAN ann targets:   ', summarizePlanAnnotations().byTarget)
