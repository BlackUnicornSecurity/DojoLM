// SPDX-License-Identifier: Apache-2.0
/**
 * File: plan-annotations.ts
 * Purpose: BU-branded annotations layered on top of `DEFAULT_TEMPORAL_PLANS`.
 *
 * Story: WAVE7B.1 / ADR-0069. The plan corpus retains its legacy
 *  `plan-1`..`plan-68` ids for API + test compatibility (112+
 *  references in the codebase). BU branding is attached as a sibling
 *  annotation map keyed by the legacy id.
 *
 * Each annotation supplies:
 *   - `buId`     : the QA-MASTER-PLAN §737-754 id convention
 *                  `<target>-<attack-shortname>-<severity>-<nnn>`.
 *   - `target`   : the fictional LLM the plan exercises.
 *   - `severity` : CRITICAL / HIGH / MEDIUM / LOW / INFO (Wave 7B mix).
 *   - `tagline`  : one-line BU-style description rendered next to the
 *                  plan name in operator surfaces.
 */

import { DEFAULT_TEMPORAL_PLANS, type PlanRecord } from './fixtures'
import type { AttackType } from './temporal-types'

export const PLAN_ANNOTATION_TARGETS = ['DojoLM', 'SampleBravo', 'SampleAlpha', 'SampleDelta', 'SampleCharlie'] as const
export type PlanAnnotationTarget = (typeof PLAN_ANNOTATION_TARGETS)[number]

export const PLAN_ANNOTATION_SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as const
export type PlanAnnotationSeverity = (typeof PLAN_ANNOTATION_SEVERITIES)[number]

export interface PlanAnnotation {
  readonly buId: string
  readonly target: PlanAnnotationTarget
  readonly severity: PlanAnnotationSeverity
  readonly tagline: string
}

/**
 * AttackType → 4-letter shortname for the BU id slot.
 */
const ATTACK_TYPE_SHORT: Record<AttackType, string> = {
  'accumulation': 'accm',
  'delayed-activation': 'dela',
  'session-persistence': 'sess',
  'context-overflow': 'ctxo',
  'persona-drift': 'drft',
  'tool-poisoning': 'toot',
  'context-smuggling': 'smug',
  'memory-poisoning': 'memp',
}

/**
 * AttackType → default severity. The new attack types
 * (tool-poisoning / context-smuggling / memory-poisoning) carry a
 * higher blast radius and default to HIGH; the Wave 2 baseline
 * attack types default to MEDIUM. Specific plan ids may override.
 */
const ATTACK_TYPE_DEFAULT_SEVERITY: Record<AttackType, PlanAnnotationSeverity> = {
  'accumulation': 'MEDIUM',
  'delayed-activation': 'MEDIUM',
  'session-persistence': 'MEDIUM',
  'context-overflow': 'MEDIUM',
  'persona-drift': 'MEDIUM',
  'tool-poisoning': 'HIGH',
  'context-smuggling': 'HIGH',
  'memory-poisoning': 'HIGH',
}

/**
 * Per-plan severity overrides where the default doesn't fit the
 * actual blast radius of the plan.
 */
const SEVERITY_OVERRIDES: Record<string, PlanAnnotationSeverity> = {
  // Wave 2 baseline: keep at MEDIUM (default).
  // Wave 7 ADR-0058 seed plans (5-10): tool-poisoning / context-smuggling / memory-poisoning - HIGH default fits.
  // Wave 7 ADR-0060 cut plans (11-24): mostly MEDIUM/HIGH, no overrides needed.
  // Wave 7B opening (25-68): assign criticity floor with operator-visible variety.

  // CRITICAL (7) — true-ceiling impact, includes one tool-poisoning HIGH-promotion.
  'plan-22': 'CRITICAL',
  'plan-25': 'CRITICAL',
  'plan-32': 'CRITICAL',
  'plan-39': 'CRITICAL',
  'plan-46': 'CRITICAL',
  'plan-53': 'CRITICAL',
  'plan-60': 'CRITICAL',
  // LOW (20) — informational-coverage demotions; spread across all 5 baseline attackTypes.
  'plan-26': 'LOW',
  'plan-28': 'LOW',
  'plan-29': 'LOW',
  'plan-30': 'LOW',
  'plan-33': 'LOW',
  'plan-35': 'LOW',
  'plan-36': 'LOW',
  'plan-37': 'LOW',
  'plan-40': 'LOW',
  'plan-42': 'LOW',
  'plan-43': 'LOW',
  'plan-47': 'LOW',
  'plan-49': 'LOW',
  'plan-50': 'LOW',
  'plan-51': 'LOW',
  'plan-54': 'LOW',
  'plan-56': 'LOW',
  'plan-57': 'LOW',
  'plan-58': 'LOW',
  'plan-61': 'LOW',
  // INFO (7) — advisory-only.
  'plan-27': 'INFO',
  'plan-34': 'INFO',
  'plan-41': 'INFO',
  'plan-44': 'INFO',
  'plan-48': 'INFO',
  'plan-55': 'INFO',
  'plan-62': 'INFO',
}

/**
 * Per-target rotation (matches PLM-005 from ADR-0061): every
 * fictional LLM appears in >= 10 plans. Plans whose name already
 * contains a target get assigned to that target; the rest are
 * rotated to fill the floor.
 */
function detectTargetFromName(name: string): PlanAnnotationTarget | null {
  for (const target of PLAN_ANNOTATION_TARGETS) {
    if (name.includes(target)) return target
  }
  return null
}

function rotationTarget(planIndex: number): PlanAnnotationTarget {
  return PLAN_ANNOTATION_TARGETS[planIndex % PLAN_ANNOTATION_TARGETS.length]
}

function buIdFromParts(target: PlanAnnotationTarget, attackType: AttackType, severity: PlanAnnotationSeverity, nnn: number): string {
  const padded = String(nnn).padStart(3, '0')
  return `${target.toLowerCase()}-${ATTACK_TYPE_SHORT[attackType]}-${severity.toLowerCase()}-${padded}`
}

function taglineFor(target: PlanAnnotationTarget, attackType: AttackType, severity: PlanAnnotationSeverity, name: string): string {
  return `${target} • ${attackType} • ${severity} — ${name}`
}

/**
 * Compute the annotation for a single plan record. Pure function over
 * the plan's existing fields plus the legacy plan index.
 */
export function annotationFor(plan: PlanRecord, planIndex: number): PlanAnnotation {
  const target = detectTargetFromName(plan.name) ?? rotationTarget(planIndex)
  const severity =
    SEVERITY_OVERRIDES[plan.id]
    ?? ATTACK_TYPE_DEFAULT_SEVERITY[plan.attackType]
  const buId = buIdFromParts(target, plan.attackType, severity, planIndex + 1)
  const tagline = taglineFor(target, plan.attackType, severity, plan.name)
  return { buId, target, severity, tagline }
}

/**
 * Annotation map: plan.id -> PlanAnnotation. Built once at module
 * load so consumers can read in O(1).
 */
export const PLAN_ANNOTATIONS: Readonly<Record<string, PlanAnnotation>> = (() => {
  const out: Record<string, PlanAnnotation> = {}
  DEFAULT_TEMPORAL_PLANS.forEach((plan, index) => {
    out[plan.id] = annotationFor(plan, index)
  })
  return out
})()

export interface PlanAnnotationsSummary {
  readonly totalAnnotations: number
  readonly byTarget: Record<PlanAnnotationTarget, number>
  readonly bySeverity: Record<PlanAnnotationSeverity, number>
}

export function summarizePlanAnnotations(): PlanAnnotationsSummary {
  const byTarget: Record<PlanAnnotationTarget, number> = {
    DojoLM: 0, SampleBravo: 0, SampleAlpha: 0, SampleDelta: 0, SampleCharlie: 0,
  }
  const bySeverity: Record<PlanAnnotationSeverity, number> = {
    CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0,
  }
  for (const annotation of Object.values(PLAN_ANNOTATIONS)) {
    byTarget[annotation.target] += 1
    bySeverity[annotation.severity] += 1
  }
  return {
    totalAnnotations: Object.keys(PLAN_ANNOTATIONS).length,
    byTarget,
    bySeverity,
  }
}
