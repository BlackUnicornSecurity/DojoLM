/**
 * File: llm/presets/__tests__/route-error.test.ts
 * Purpose: BUG-005 — error handling when getAllPresets throws
 * Test ID: PRESET-012
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as llmModule from 'bu-tpi/llm'

import { GET } from '../route'

describe('GET /api/llm/presets — error handling (BUG-005)', () => {
  let spy: ReturnType<typeof vi.spyOn>
  let consoleSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    spy = vi.spyOn(llmModule, 'getAllPresets').mockImplementation(() => {
      throw new Error('Preset registry not found')
    })
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    spy.mockRestore()
    consoleSpy.mockRestore()
  })

  it('PRESET-012: returns 500 with JSON error when getAllPresets throws', async () => {
    const res = await GET()
    expect(res.status).toBe(500)

    const body = await res.json()
    expect(body).toHaveProperty('error')
    expect(typeof body.error).toBe('string')
    expect(body.error).toContain('Failed to load provider presets')
  })
})
