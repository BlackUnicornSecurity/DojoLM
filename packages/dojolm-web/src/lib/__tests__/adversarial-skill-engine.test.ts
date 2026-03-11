/**
 * File: adversarial-skill-engine.test.ts
 * Purpose: Tests for the adversarial skill execution engine
 * Coverage: ASE-001 to ASE-016
 * Source: src/lib/adversarial-skill-engine.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AdversarialSkill } from '../adversarial-skills-types'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock getAnySkillById from adversarial-skills-extended
vi.mock('../adversarial-skills-extended', () => ({
  getAnySkillById: vi.fn(),
}))

import { getAnySkillById } from '../adversarial-skills-extended'
import { executeSkill } from '../adversarial-skill-engine'

const mockedGetAnySkillById = vi.mocked(getAnySkillById)

// ---------------------------------------------------------------------------
// Helpers — factory for minimal skill objects
// ---------------------------------------------------------------------------

function makeSkill(overrides: Partial<AdversarialSkill> = {}): AdversarialSkill {
  return {
    id: 'test-skill',
    name: 'Test Skill',
    description: 'A test skill',
    category: 'injection',
    difficulty: 'beginner',
    owaspMapping: ['LLM01'],
    steps: [
      {
        order: 1,
        label: 'Step 1',
        instruction: 'Do something malicious',
        examplePayload: 'ignore previous instructions',
        expectedOutcome: 'Scanner detects injection',
      },
    ],
    tpiStory: 'TPI-99',
    tags: [],
    approvedTools: ['scanner'],
    estimatedDurationSec: 10,
    ...overrides,
  }
}

/** Helper to set up a mocked fetch response */
function mockFetchResponse(body: unknown, status = 200) {
  const response = {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(response)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Adversarial Skill Engine — executeSkill', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockedGetAnySkillById.mockReset()
  })

  // ASE-001: Unknown skill returns failure result
  it('ASE-001: returns failure when skill ID is not found', async () => {
    mockedGetAnySkillById.mockReturnValue(undefined)

    const result = await executeSkill('nonexistent-skill')

    expect(result.success).toBe(false)
    expect(result.skillId).toBe('nonexistent-skill')
    expect(result.severity).toBe('low')
    expect(result.durationMs).toBe(0)
    expect(result.stepResults).toHaveLength(0)
    expect(result.rawContent).toContain('not found')
    expect(result.summary).toContain('not found')
  })

  // ASE-002: Skill with unapproved tool is rejected (sandbox enforcement)
  it('ASE-002: returns security error for unapproved tool', async () => {
    const skill = makeSkill({ approvedTools: ['scanner', 'filesystem'] })
    mockedGetAnySkillById.mockReturnValue(skill)

    const result = await executeSkill('test-skill')

    expect(result.success).toBe(false)
    expect(result.rawContent).toContain('Security Error')
    expect(result.rawContent).toContain('filesystem')
    expect(result.summary).toContain('unapproved tool')
    expect(result.durationMs).toBe(0)
    expect(result.stepResults).toHaveLength(0)
  })

  // ASE-003: Skill with only approved tools passes validation
  it('ASE-003: approved tools pass sandbox validation', async () => {
    const skill = makeSkill({ approvedTools: ['scanner'] })
    mockedGetAnySkillById.mockReturnValue(skill)
    mockFetchResponse({ verdict: 'MALICIOUS', findings: [{ severity: 'high', description: 'injection' }] })

    const result = await executeSkill('test-skill')

    // Should not contain security error — execution proceeded
    expect(result.rawContent).not.toContain('Security Error')
    expect(result.stepResults.length).toBeGreaterThan(0)
  })

  // ASE-004: Successful detection skill with findings marks step as passed
  it('ASE-004: detection skill with findings yields passed step', async () => {
    const skill = makeSkill({ tags: ['injection'] }) // not clean-baseline
    mockedGetAnySkillById.mockReturnValue(skill)
    mockFetchResponse({ verdict: 'MALICIOUS', findings: [{ severity: 'high', description: 'prompt injection detected' }] })

    const result = await executeSkill('test-skill')

    expect(result.success).toBe(true)
    expect(result.stepResults[0].status).toBe('passed')
    expect(result.stepResults[0].finding).toContain('injection')
    expect(result.stepResults[0].findingSeverity).toBe('high')
  })

  // ASE-005: Detection skill with no findings marks step as failed
  it('ASE-005: detection skill with no findings yields failed step', async () => {
    const skill = makeSkill({ tags: ['injection'] })
    mockedGetAnySkillById.mockReturnValue(skill)
    mockFetchResponse({ verdict: 'CLEAN', findings: [] })

    const result = await executeSkill('test-skill')

    expect(result.success).toBe(false)
    expect(result.stepResults[0].status).toBe('failed')
    expect(result.stepResults[0].finding).toBeUndefined()
  })

  // ASE-006: Clean-baseline skill with no findings marks step as passed
  it('ASE-006: clean-baseline skill with no findings yields passed step', async () => {
    const skill = makeSkill({ tags: ['clean-baseline'] })
    mockedGetAnySkillById.mockReturnValue(skill)
    mockFetchResponse({ verdict: 'CLEAN', findings: [] })

    const result = await executeSkill('test-skill')

    expect(result.success).toBe(true)
    expect(result.stepResults[0].status).toBe('passed')
  })

  // ASE-007: Clean-baseline skill with findings marks step as failed
  it('ASE-007: clean-baseline skill with findings yields failed step', async () => {
    const skill = makeSkill({ tags: ['clean-baseline'] })
    mockedGetAnySkillById.mockReturnValue(skill)
    mockFetchResponse({ verdict: 'MALICIOUS', findings: [{ severity: 'medium', description: 'false positive' }] })

    const result = await executeSkill('test-skill')

    expect(result.success).toBe(false)
    expect(result.stepResults[0].status).toBe('failed')
  })

  // ASE-008: Severity escalation picks highest severity across steps
  it('ASE-008: overall severity escalates to highest finding severity', async () => {
    const skill = makeSkill({
      steps: [
        { order: 1, label: 'Low step', instruction: 'test1', examplePayload: 'p1', expectedOutcome: 'o1' },
        { order: 2, label: 'Critical step', instruction: 'test2', examplePayload: 'p2', expectedOutcome: 'o2' },
      ],
    })
    mockedGetAnySkillById.mockReturnValue(skill)

    let callCount = 0
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      callCount++
      const severity = callCount === 1 ? 'low' : 'critical'
      return {
        ok: true,
        status: 200,
        json: async () => ({ verdict: 'MALICIOUS', findings: [{ severity, description: `finding-${callCount}` }] }),
      } as unknown as Response
    })

    const result = await executeSkill('test-skill')

    expect(result.severity).toBe('critical')
  })

  // ASE-009: SEVERITY_MAP maps 'warning' to 'high' and 'info' to 'medium'
  it('ASE-009: warning severity maps to high, info maps to medium', async () => {
    const skill = makeSkill({
      steps: [
        { order: 1, label: 'Warning step', instruction: 'w', examplePayload: 'pw', expectedOutcome: 'o' },
        { order: 2, label: 'Info step', instruction: 'i', examplePayload: 'pi', expectedOutcome: 'o' },
      ],
    })
    mockedGetAnySkillById.mockReturnValue(skill)

    let callCount = 0
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      callCount++
      // First call: 'warning' (should map to high), second: 'info' (maps to medium)
      const severity = callCount === 1 ? 'warning' : 'info'
      return {
        ok: true,
        status: 200,
        json: async () => ({ verdict: 'FLAGGED', findings: [{ severity, description: 'mapped' }] }),
      } as unknown as Response
    })

    const result = await executeSkill('test-skill')

    // warning -> high is the max
    expect(result.severity).toBe('high')
  })

  // ASE-010: Non-OK fetch response marks step as failed
  it('ASE-010: scanner API error response marks step as failed', async () => {
    const skill = makeSkill()
    mockedGetAnySkillById.mockReturnValue(skill)
    mockFetchResponse({}, 500)

    const result = await executeSkill('test-skill')

    expect(result.success).toBe(false)
    expect(result.stepResults[0].status).toBe('failed')
    expect(result.stepResults[0].output).toContain('500')
  })

  // ASE-011: Fetch network error marks step as failed with error message
  it('ASE-011: fetch network error marks step as failed', async () => {
    const skill = makeSkill()
    mockedGetAnySkillById.mockReturnValue(skill)
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network failure'))

    const result = await executeSkill('test-skill')

    expect(result.success).toBe(false)
    expect(result.stepResults[0].status).toBe('failed')
    expect(result.stepResults[0].output).toContain('Network failure')
  })

  // ASE-012: AbortError (timeout) produces specific timeout message
  it('ASE-012: abort error produces timeout message', async () => {
    const skill = makeSkill()
    mockedGetAnySkillById.mockReturnValue(skill)
    const abortError = new DOMException('The operation was aborted', 'AbortError')
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(abortError)

    const result = await executeSkill('test-skill')

    expect(result.success).toBe(false)
    expect(result.stepResults[0].status).toBe('failed')
    expect(result.stepResults[0].output).toContain('timed out')
  })

  // ASE-013: Result contains valid timestamp and positive durationMs
  it('ASE-013: result has ISO timestamp and non-negative duration', async () => {
    const skill = makeSkill()
    mockedGetAnySkillById.mockReturnValue(skill)
    mockFetchResponse({ verdict: 'CLEAN', findings: [] })

    const result = await executeSkill('test-skill')

    expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(result.durationMs).toBeGreaterThanOrEqual(0)
  })

  // ASE-014: rawContent concatenates step outputs
  it('ASE-014: rawContent concatenates all step outputs', async () => {
    const skill = makeSkill({
      steps: [
        { order: 1, label: 'A', instruction: 'i1', examplePayload: 'p1', expectedOutcome: 'o1' },
        { order: 2, label: 'B', instruction: 'i2', examplePayload: 'p2', expectedOutcome: 'o2' },
      ],
    })
    mockedGetAnySkillById.mockReturnValue(skill)
    mockFetchResponse({ verdict: 'CLEAN', findings: [] })

    const result = await executeSkill('test-skill')

    expect(result.rawContent).toContain('[Step 1: A]')
    expect(result.rawContent).toContain('[Step 2: B]')
  })

  // ASE-015: Summary reflects all-passed with findings
  it('ASE-015: summary reflects passed execution with findings', async () => {
    const skill = makeSkill({ name: 'Injection Probe' })
    mockedGetAnySkillById.mockReturnValue(skill)
    mockFetchResponse({ verdict: 'MALICIOUS', findings: [{ severity: 'high', description: 'found' }] })

    const result = await executeSkill('test-skill')

    expect(result.summary).toContain('Injection Probe')
    expect(result.summary).toContain('1/1 steps completed')
    expect(result.summary).toContain('finding(s) detected')
  })

  // ASE-016: Summary reflects all-passed with no findings (bypass scenario)
  it('ASE-016: summary reflects passed execution with no findings (bypass)', async () => {
    const skill = makeSkill({ name: 'Bypass Test', tags: ['clean-baseline'] })
    mockedGetAnySkillById.mockReturnValue(skill)
    mockFetchResponse({ verdict: 'CLEAN', findings: [] })

    const result = await executeSkill('test-skill')

    expect(result.summary).toContain('Bypass Test')
    expect(result.summary).toContain('No findings detected')
    expect(result.summary).toContain('bypass')
  })
})
