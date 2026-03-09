/**
 * File: arena-commentary.ts
 * Purpose: Martial arts-themed commentary templates for live arena matches
 * Story: 16.2 — Live Commentary Feed
 *
 * Index:
 * - Commentary templates by event type (line 15)
 * - generateCommentary function (line 95)
 *
 * Security: All templates are static strings with variable interpolation only.
 * No user input is used in commentary rendering. Model responses are
 * truncated and rendered separately in SafeCodeBlock or plain text.
 */

import type { MatchEventType, FighterRole } from './arena-types'

// ===========================================================================
// Commentary Templates
// ===========================================================================

type CommentaryTemplate = (ctx: CommentaryContext) => string

interface CommentaryContext {
  fighterName: string
  opponentName: string
  role: FighterRole
  round: number
  score?: number
  totalScore?: number
  gameMode?: string
  attackMode?: string
}

const ATTACK_SUCCESS_TEMPLATES: CommentaryTemplate[] = [
  (ctx) => `${ctx.fighterName} strikes through ${ctx.opponentName}'s defenses! The attack lands cleanly.`,
  (ctx) => `A masterful blow! ${ctx.fighterName} penetrates the guard with precision.`,
  (ctx) => `${ctx.opponentName}'s defense crumbles as ${ctx.fighterName} finds an opening.`,
  (ctx) => `The ${ctx.fighterName} technique connects! A clean hit in round ${ctx.round}.`,
  (ctx) => `${ctx.fighterName} reads ${ctx.opponentName}'s stance and exploits the weakness.`,
]

const ATTACK_BLOCKED_TEMPLATES: CommentaryTemplate[] = [
  (ctx) => `${ctx.opponentName} holds firm! ${ctx.fighterName}'s attack is deflected.`,
  (ctx) => `Strong defense! ${ctx.opponentName} anticipates the strike and counters.`,
  (ctx) => `${ctx.fighterName}'s technique fails against ${ctx.opponentName}'s guard.`,
  (ctx) => `The attack glances off. ${ctx.opponentName}'s defense remains unbroken.`,
  (ctx) => `${ctx.opponentName} parries with composure. No ground given.`,
]

const FLAG_CAPTURED_TEMPLATES: CommentaryTemplate[] = [
  (ctx) => `Flag captured! ${ctx.fighterName} seizes the objective from ${ctx.opponentName}!`,
  (ctx) => `${ctx.fighterName} claims the flag! A critical breakthrough in the match.`,
  (ctx) => `The flag falls to ${ctx.fighterName}! ${ctx.opponentName} must regroup.`,
]

const HILL_CLAIMED_TEMPLATES: CommentaryTemplate[] = [
  (ctx) => `${ctx.fighterName} storms the hill! Control shifts in round ${ctx.round}.`,
  (ctx) => `The hill belongs to ${ctx.fighterName} now. ${ctx.opponentName} is pushed back.`,
]

const HILL_HELD_TEMPLATES: CommentaryTemplate[] = [
  (ctx) => `${ctx.fighterName} holds the high ground! Points accumulate steadily.`,
  (ctx) => `Another round of dominance. ${ctx.fighterName} remains king of the hill.`,
]

const ROLE_SWAP_TEMPLATES: CommentaryTemplate[] = [
  (ctx) => `Roles reverse! ${ctx.fighterName} switches stance. The tide may turn.`,
  (ctx) => `Position swap! Both fighters must adapt to their new roles.`,
]

const SCORE_UPDATE_TEMPLATES: CommentaryTemplate[] = [
  (ctx) => `Score update: ${ctx.fighterName} earns ${ctx.score ?? 0} points. Total: ${ctx.totalScore ?? 0}.`,
]

const MATCH_START_TEMPLATES: CommentaryTemplate[] = [
  (ctx) => `The battle begins! ${ctx.fighterName} enters the arena. ${ctx.gameMode} mode engaged.`,
  (ctx) => `Fighters ready! ${ctx.gameMode} match commences with ${ctx.attackMode} strategy.`,
]

const MATCH_END_TEMPLATES: CommentaryTemplate[] = [
  (ctx) => `The match is decided! ${ctx.fighterName} emerges victorious!`,
  (ctx) => `Final bell! ${ctx.fighterName} claims victory after ${ctx.round} rounds.`,
]

const ROUND_START_TEMPLATES: CommentaryTemplate[] = [
  (ctx) => `Round ${ctx.round} begins. ${ctx.fighterName} takes the ${ctx.role} stance.`,
]

const GENERIC_TEMPLATES: CommentaryTemplate[] = [
  (ctx) => `${ctx.fighterName} makes a move in round ${ctx.round}.`,
]

// ===========================================================================
// Template Registry
// ===========================================================================

const TEMPLATES: Partial<Record<MatchEventType, CommentaryTemplate[]>> = {
  attack_success: ATTACK_SUCCESS_TEMPLATES,
  attack_blocked: ATTACK_BLOCKED_TEMPLATES,
  flag_captured: FLAG_CAPTURED_TEMPLATES,
  hill_claimed: HILL_CLAIMED_TEMPLATES,
  hill_held: HILL_HELD_TEMPLATES,
  role_swap: ROLE_SWAP_TEMPLATES,
  score_update: SCORE_UPDATE_TEMPLATES,
  match_start: MATCH_START_TEMPLATES,
  match_end: MATCH_END_TEMPLATES,
  round_start: ROUND_START_TEMPLATES,
}

// ===========================================================================
// Public API
// ===========================================================================

/**
 * Generate commentary text for a match event.
 * Uses deterministic selection based on round number to avoid Math.random() in render.
 */
export function generateCommentary(
  eventType: MatchEventType,
  ctx: CommentaryContext
): string {
  const templates = TEMPLATES[eventType] ?? GENERIC_TEMPLATES
  const index = ctx.round % templates.length
  return templates[index](ctx)
}

/**
 * Get a display-friendly label for an event type.
 */
export function getEventTypeLabel(type: MatchEventType): string {
  const labels: Record<MatchEventType, string> = {
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
  return labels[type] ?? type
}
