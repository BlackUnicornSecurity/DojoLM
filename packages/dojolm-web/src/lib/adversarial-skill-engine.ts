/**
 * File: adversarial-skill-engine.ts
 * Purpose: Sandboxed execution engine for adversarial skills
 * Story: 12.2c — Execution Engine + Remaining 20 Skills
 * Index:
 * - APPROVED_TOOL_LIST (line 14) — whitelist of allowed tools
 * - SEVERITY_MAP (line 20) — scanner severity → result severity
 * - executeSkill (line 29) — main execution function
 * - executeStep (line 88) — individual step executor
 * - validateToolAccess (line 141) — sandbox enforcement
 */

import type { AdversarialSkill, SkillExecutionResult } from './adversarial-skills-types'
import { getAnySkillById } from './adversarial-skills-extended'

/** Approved tools that skills are allowed to invoke (sandbox boundary - Cybersec) */
const APPROVED_TOOL_LIST = new Set([
  'scanner',
])

/** Maximum execution time per skill (60 seconds) */
const MAX_EXECUTION_TIME_MS = 60_000

/** Map scanner severity strings to result severity (case-insensitive, structured) */
const SEVERITY_MAP: Record<string, SkillExecutionResult['severity']> = {
  critical: 'critical',
  high: 'high',
  warning: 'high',
  medium: 'medium',
  low: 'low',
  info: 'medium',
}

/** Severity ordering for escalation comparison */
const SEVERITY_ORDER: Record<string, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
}

/**
 * Execute an adversarial skill and return structured results.
 * Sandboxed to only allow approved tool invocations (S-06 compliance).
 */
export async function executeSkill(
  skillId: string,
): Promise<SkillExecutionResult> {
  const skill = getAnySkillById(skillId)
  if (!skill) {
    return {
      skillId,
      success: false,
      severity: 'low',
      timestamp: new Date().toISOString(),
      durationMs: 0,
      stepResults: [],
      rawContent: `Error: Skill "${skillId}" not found`,
      summary: 'Skill not found in the skills library',
    }
  }

  // Validate tool access (sandbox enforcement)
  const toolAccessError = validateToolAccess(skill)
  if (toolAccessError) {
    return {
      skillId,
      success: false,
      severity: 'low',
      timestamp: new Date().toISOString(),
      durationMs: 0,
      stepResults: [],
      rawContent: `Security Error: ${toolAccessError}`,
      summary: toolAccessError,
    }
  }

  const startTime = performance.now()
  const stepResults: SkillExecutionResult['stepResults'] = []
  const outputParts: string[] = []
  let overallSeverity: SkillExecutionResult['severity'] = 'low'

  // Execute each step sequentially
  for (const step of skill.steps) {
    const elapsed = performance.now() - startTime
    if (elapsed > MAX_EXECUTION_TIME_MS) {
      stepResults.push({
        order: step.order,
        label: step.label,
        status: 'skipped',
        output: 'Execution time limit exceeded',
      })
      continue
    }

    const remaining = MAX_EXECUTION_TIME_MS - elapsed
    const stepResult = await executeStep(skill, step, remaining)
    stepResults.push(stepResult)

    if (stepResult.output) {
      outputParts.push(`[Step ${step.order}: ${step.label}]\n${stepResult.output}`)
    }

    // Escalate overall severity using structured severity from step
    if (stepResult.findingSeverity) {
      const mapped = SEVERITY_MAP[stepResult.findingSeverity.toLowerCase()] ?? 'low'
      if ((SEVERITY_ORDER[mapped] ?? 0) > (SEVERITY_ORDER[overallSeverity] ?? 0)) {
        overallSeverity = mapped
      }
    }
  }

  const durationMs = Math.round(performance.now() - startTime)
  const allPassed = stepResults.every(r => r.status === 'passed')
  const anyFailed = stepResults.some(r => r.status === 'failed')

  return {
    skillId,
    success: !anyFailed,
    severity: overallSeverity,
    timestamp: new Date().toISOString(),
    durationMs,
    stepResults,
    rawContent: outputParts.join('\n\n'),
    summary: generateSummary(skill, stepResults, allPassed),
  }
}

/** Execute a single skill step by scanning the example payload */
async function executeStep(
  skill: AdversarialSkill,
  step: AdversarialSkill['steps'][number],
  remainingMs: number,
): Promise<SkillExecutionResult['stepResults'][number]> {
  const payload = step.examplePayload || step.instruction

  // AbortController with timeout for per-step fetch (H3 fix)
  const controller = new AbortController()
  const timeoutMs = Math.max(Math.min(remainingMs, 30_000), 5_000)
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: payload }),
      signal: controller.signal,
    })

    if (!response.ok) {
      return {
        order: step.order,
        label: step.label,
        status: 'failed',
        output: `Scanner API returned ${response.status}`,
      }
    }

    const scanResult = await response.json()
    const findingCount = scanResult.findings?.length ?? 0
    const verdict = scanResult.verdict ?? 'UNKNOWN'
    const hasFindings = findingCount > 0

    // Determine step status based on whether we expect detection (H1 fix)
    const isDetectionSkill = !skill.tags.includes('clean-baseline')
    const status: 'passed' | 'failed' = isDetectionSkill
      ? (hasFindings ? 'passed' : 'failed')
      : (hasFindings ? 'failed' : 'passed')

    // Extract structured severity from first finding (H2 fix)
    const firstFindingSeverity = hasFindings
      ? String(scanResult.findings[0].severity ?? '')
      : undefined

    return {
      order: step.order,
      label: step.label,
      status,
      output: `Verdict: ${verdict} | Findings: ${findingCount} | Payload: ${payload.slice(0, 100)}`,
      finding: hasFindings
        ? `${scanResult.findings[0].severity}: ${scanResult.findings[0].description}`
        : undefined,
      findingSeverity: firstFindingSeverity,
    }
  } catch (error) {
    const isAbort = error instanceof DOMException && error.name === 'AbortError'
    return {
      order: step.order,
      label: step.label,
      status: 'failed',
      output: isAbort
        ? 'Step timed out waiting for scanner response'
        : `Execution error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  } finally {
    clearTimeout(timeoutId)
  }
}

/** Validate that a skill only requests approved tools */
function validateToolAccess(skill: AdversarialSkill): string | null {
  for (const tool of skill.approvedTools) {
    if (!APPROVED_TOOL_LIST.has(tool)) {
      return `Skill "${skill.id}" requests unapproved tool "${tool}". Only [${[...APPROVED_TOOL_LIST].join(', ')}] are allowed.`
    }
  }
  return null
}

/** Generate a human-readable summary of skill execution */
function generateSummary(
  skill: AdversarialSkill,
  stepResults: SkillExecutionResult['stepResults'],
  allPassed: boolean,
): string {
  const passed = stepResults.filter(r => r.status === 'passed').length
  const failed = stepResults.filter(r => r.status === 'failed').length
  const findings = stepResults.filter(r => r.finding).length

  if (allPassed && findings > 0) {
    return `${skill.name}: ${passed}/${skill.steps.length} steps completed. ${findings} finding(s) detected — scanner correctly identified attack patterns.`
  }
  if (allPassed && findings === 0) {
    return `${skill.name}: ${passed}/${skill.steps.length} steps completed. No findings detected — payload may bypass current detection.`
  }
  return `${skill.name}: ${passed} passed, ${failed} failed out of ${skill.steps.length} steps.`
}
