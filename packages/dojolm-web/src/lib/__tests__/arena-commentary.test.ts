/**
 * File: arena-commentary.test.ts
 * Tests for arena-commentary.ts (Story 19.3)
 */

import { describe, it, expect } from 'vitest'
import { generateCommentary, getEventTypeLabel } from '../arena-commentary'
import type { MatchEventType, FighterRole } from '../arena-types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ALL_EVENT_TYPES: MatchEventType[] = [
  'match_start',
  'match_end',
  'round_start',
  'round_end',
  'attack_sent',
  'attack_success',
  'attack_blocked',
  'defense_hold',
  'flag_captured',
  'hill_claimed',
  'hill_held',
  'role_swap',
  'score_update',
  'sage_mutation',
  'fighter_error',
  'timeout',
]

function makeCtx(overrides: Partial<{
  fighterName: string
  opponentName: string
  role: FighterRole
  round: number
  score: number
  totalScore: number
  gameMode: string
  attackMode: string
}> = {}) {
  return {
    fighterName: overrides.fighterName ?? 'Alpha',
    opponentName: overrides.opponentName ?? 'Beta',
    role: overrides.role ?? ('attacker' as FighterRole),
    round: overrides.round ?? 1,
    score: overrides.score,
    totalScore: overrides.totalScore,
    gameMode: overrides.gameMode ?? 'duel',
    attackMode: overrides.attackMode ?? 'standard',
  }
}

// ---------------------------------------------------------------------------
// generateCommentary
// ---------------------------------------------------------------------------

describe('generateCommentary', () => {
  it.each(ALL_EVENT_TYPES)(
    'returns a non-empty string for event type "%s"',
    (eventType) => {
      const result = generateCommentary(eventType, makeCtx())
      expect(result).toBeTruthy()
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    }
  )

  it('includes fighter names in output', () => {
    const ctx = makeCtx({ fighterName: 'Ryu', opponentName: 'Ken' })
    const result = generateCommentary('attack_success', ctx)
    // At least one of the fighter names should appear in the commentary
    const includesName = result.includes('Ryu') || result.includes('Ken')
    expect(includesName).toBe(true)
  })

  it('is deterministic — same inputs produce same output', () => {
    const ctx = makeCtx({ round: 3 })
    const first = generateCommentary('attack_blocked', ctx)
    const second = generateCommentary('attack_blocked', ctx)
    const third = generateCommentary('attack_blocked', ctx)
    expect(first).toBe(second)
    expect(second).toBe(third)
  })

  it('handles unknown event types by falling back to generic template', () => {
    const ctx = makeCtx()
    const result = generateCommentary('not_a_real_event' as MatchEventType, ctx)
    expect(result).toBeTruthy()
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('different round numbers produce different templates (index cycling)', () => {
    // attack_success has 5 templates, so rounds 0-4 should cycle through them
    const results = new Set<string>()
    for (let round = 0; round < 5; round++) {
      const ctx = makeCtx({ round })
      results.add(generateCommentary('attack_success', ctx))
    }
    // With 5 distinct templates and 5 different rounds (0-4), all should differ
    expect(results.size).toBe(5)
  })
})

// ---------------------------------------------------------------------------
// getEventTypeLabel
// ---------------------------------------------------------------------------

describe('getEventTypeLabel', () => {
  const expectedLabels: Record<MatchEventType, string> = {
    match_start: 'Match Start',
    match_end: 'Match End',
    round_start: 'Round Start',
    round_end: 'Round End',
    attack_sent: 'Attack',
    attack_success: 'Hit',
    attack_blocked: 'Blocked',
    defense_hold: 'Defense',
    flag_captured: 'Flag',
    hill_claimed: 'Hill Claim',
    hill_held: 'Hill Hold',
    role_swap: 'Swap',
    score_update: 'Score',
    sage_mutation: 'SAGE',
    fighter_error: 'Error',
    timeout: 'Timeout',
  }

  it.each(Object.entries(expectedLabels))(
    'returns "%s" label as "%s"',
    (type, label) => {
      expect(getEventTypeLabel(type as MatchEventType)).toBe(label)
    }
  )

  it('returns the type string itself for unknown types', () => {
    const unknown = 'mystery_event' as MatchEventType
    expect(getEventTypeLabel(unknown)).toBe('mystery_event')
  })
})
