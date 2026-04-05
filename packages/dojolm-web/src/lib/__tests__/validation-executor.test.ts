/**
 * File: validation-executor.test.ts
 * Purpose: Tests for the validation run executor
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, chmodSync } from 'fs'
import { join } from 'path'
import os from 'os'

// Must use a factory function so mock hoisting works
vi.mock('@/lib/runtime-paths', () => {
  const os = require('os')
  const path = require('path')
  const dir = path.join(os.tmpdir(), 'validation-test-fixed')
  return {
    getDataPath: (...segments: string[]) => path.join(dir, ...segments),
  }
})

import { executeValidationRun, writeProgressAtomic, acquireLock, SAFE_MODULE_ID, REPORT_SCHEMA_VERSION } from '../validation-executor'

const testDataDir = join(os.tmpdir(), 'validation-test-fixed')

function setupModules(moduleIds: string[], overrides?: Record<string, Record<string, unknown>>): void {
  const modulesDir = join(testDataDir, 'validation', 'modules')
  for (const moduleId of moduleIds) {
    const moduleDir = join(modulesDir, moduleId)
    mkdirSync(moduleDir, { recursive: true })

    const meta = overrides?.[moduleId] ?? {
      moduleId,
      tier: 1,
      currentToolHash: 'abc123',
      calibratedToolHash: 'abc123',
      lastCalibrationDate: '2026-03-29T00:00:00Z',
      referenceSetVersion: `ref-v1-${moduleId}`,
      valid: true,
    }

    writeFileSync(join(moduleDir, 'meta.json'), JSON.stringify(meta))
  }
}

function readProgress(runId: string): Record<string, unknown> {
  const path = join(testDataDir, 'validation', 'runs', runId, 'progress.json')
  return JSON.parse(readFileSync(path, 'utf8'))
}

function readReport(runId: string): Record<string, unknown> | null {
  const path = join(testDataDir, 'validation', 'runs', runId, 'report.json')
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

beforeEach(() => {
  rmSync(testDataDir, { recursive: true, force: true })
  mkdirSync(join(testDataDir, 'validation', 'modules'), { recursive: true })
  mkdirSync(join(testDataDir, 'validation', 'runs'), { recursive: true })
})

afterEach(() => {
  try {
    rmSync(testDataDir, { recursive: true, force: true })
  } catch {
    // Best effort cleanup
  }
})

describe('validation-executor', () => {
  // VE-001
  it('VE-001: completes run with valid modules and writes report', async () => {
    setupModules(['core-patterns', 'bias-detector'])

    await executeValidationRun('run-001', {
      modules: null,
      fullCorpus: false,
      includeHoldout: false,
      startedAt: new Date().toISOString(),
    })

    const progress = readProgress('run-001')
    expect(progress.status).toBe('completed')
    expect(progress.progress).toBe(100)
    expect(progress.modulesCompleted).toBe(2)
    expect(progress.modulesTotal).toBe(2)
    expect(progress.eta).toBe(0)

    const report = readReport('run-001')
    expect(report).not.toBeNull()
    expect(report!.overall_verdict).toBe('PASS')
    expect(report!.run_id).toBe('run-001')
    expect(report!.schema_version).toBe(REPORT_SCHEMA_VERSION)
    expect(report!.validation_mode).toBe('metadata_check')
  })

  // VE-002
  it('VE-002: filters to requested modules when specified', async () => {
    setupModules(['core-patterns', 'bias-detector', 'pii-detector'])

    await executeValidationRun('run-002', {
      modules: ['core-patterns'],
      fullCorpus: false,
      includeHoldout: false,
      startedAt: new Date().toISOString(),
    })

    const progress = readProgress('run-002')
    expect(progress.modulesTotal).toBe(1)
    expect(progress.modulesCompleted).toBe(1)
    expect(progress.status).toBe('completed')
  })

  // VE-003
  it('VE-003: reports non-conformities for uncalibrated modules', async () => {
    setupModules(['core-patterns'], {
      'core-patterns': {
        moduleId: 'core-patterns',
        tier: 1,
        currentToolHash: 'abc123',
        calibratedToolHash: 'different-hash',
        lastCalibrationDate: '2026-03-29T00:00:00Z',
      },
    })

    await executeValidationRun('run-003', {
      modules: null,
      fullCorpus: false,
      includeHoldout: false,
      startedAt: new Date().toISOString(),
    })

    const progress = readProgress('run-003')
    expect(progress.nonConformities).toBeGreaterThan(0)

    const report = readReport('run-003')
    expect(report!.overall_verdict).toBe('FAIL')
  })

  // VE-004
  it('VE-004: handles empty modules directory', async () => {
    await executeValidationRun('run-004', {
      modules: null,
      fullCorpus: false,
      includeHoldout: false,
      startedAt: new Date().toISOString(),
    })

    const progress = readProgress('run-004')
    expect(progress.status).toBe('completed')
    expect(progress.modulesTotal).toBe(0)
    expect(progress.modulesCompleted).toBe(0)
  })

  // VE-005
  it('VE-005: transitions through running -> completed states', async () => {
    setupModules(['core-patterns'])

    await executeValidationRun('run-005', {
      modules: null,
      fullCorpus: false,
      includeHoldout: false,
      startedAt: new Date().toISOString(),
    })

    const progress = readProgress('run-005')
    expect(progress.status).toBe('completed')
  })

  // VE-006
  it('VE-006: releases lock after successful completion', async () => {
    setupModules(['core-patterns'])

    const lockPath = join(testDataDir, 'validation', 'run-lock.json')
    writeFileSync(lockPath, JSON.stringify({ runId: 'run-006', startedAt: new Date().toISOString() }))

    await executeValidationRun('run-006', {
      modules: null,
      fullCorpus: false,
      includeHoldout: false,
      startedAt: new Date().toISOString(),
    })

    expect(existsSync(lockPath)).toBe(false)
  })

  // VE-007
  it('VE-007: handles module with missing meta.json with error verdict', async () => {
    const moduleDir = join(testDataDir, 'validation', 'modules', 'broken-module')
    mkdirSync(moduleDir, { recursive: true })

    await executeValidationRun('run-007', {
      modules: null,
      fullCorpus: false,
      includeHoldout: false,
      startedAt: new Date().toISOString(),
    })

    const progress = readProgress('run-007')
    expect(progress.status).toBe('completed')
    expect(progress.modulesCompleted).toBe(1)
    // Error module contributes 0 non-conformities
    expect(progress.nonConformities).toBe(0)

    const report = readReport('run-007')
    expect(report).not.toBeNull()
    const modules = report!.modules as Array<Record<string, unknown>>
    expect(modules[0]).toHaveProperty('error')
    const decision = modules[0].decision as Record<string, unknown>
    expect(decision.verdict).toBe('error')
  })

  // VE-008
  it('VE-008: report includes module-level results with correct structure', async () => {
    setupModules(['core-patterns', 'bias-detector'])

    await executeValidationRun('run-008', {
      modules: null,
      fullCorpus: false,
      includeHoldout: false,
      startedAt: new Date().toISOString(),
    })

    const report = readReport('run-008')
    expect(report).not.toBeNull()
    const modules = report!.modules as Array<Record<string, unknown>>
    expect(modules).toHaveLength(2)
    expect(modules[0]).toHaveProperty('module_id')
    expect(modules[0]).toHaveProperty('decision')
    expect(modules[0]).toHaveProperty('metrics')
    const metrics = modules[0].metrics as Record<string, unknown>
    expect(metrics).toHaveProperty('samples_processed')
    expect(metrics).toHaveProperty('non_conformities')
    expect(metrics).toHaveProperty('duration_ms')
  })

  // VE-009
  it('VE-009: tracks elapsed time', async () => {
    setupModules(['mod-a', 'mod-b', 'mod-c'])

    await executeValidationRun('run-009', {
      modules: null,
      fullCorpus: false,
      includeHoldout: false,
      startedAt: new Date().toISOString(),
    })

    const progress = readProgress('run-009')
    expect(typeof progress.elapsed).toBe('number')
    expect(progress.elapsed).toBeGreaterThanOrEqual(0)
  })

  // VE-010
  it('VE-010: marks module without calibration as non-conformity', async () => {
    setupModules(['no-cal'], {
      'no-cal': {
        moduleId: 'no-cal',
        tier: 2,
        currentToolHash: 'abc',
      },
    })

    await executeValidationRun('run-010', {
      modules: null,
      fullCorpus: false,
      includeHoldout: false,
      startedAt: new Date().toISOString(),
    })

    const progress = readProgress('run-010')
    expect(progress.nonConformities).toBe(1)

    const report = readReport('run-010')
    expect(report!.overall_verdict).toBe('FAIL')
  })

  // VE-011: Lock release on failure path
  it('VE-011: releases lock even when executor encounters an error', async () => {
    const lockPath = join(testDataDir, 'validation', 'run-lock.json')
    writeFileSync(lockPath, JSON.stringify({ runId: 'run-011', startedAt: new Date().toISOString() }))

    // Create a module with invalid JSON in meta.json
    const moduleDir = join(testDataDir, 'validation', 'modules', 'bad-json')
    mkdirSync(moduleDir, { recursive: true })
    writeFileSync(join(moduleDir, 'meta.json'), 'not valid json{{{')

    await executeValidationRun('run-011', {
      modules: null,
      fullCorpus: false,
      includeHoldout: false,
      startedAt: new Date().toISOString(),
    })

    // Lock should be released
    expect(existsSync(lockPath)).toBe(false)
  })

  // VE-012: Lock release only deletes own lock
  it('VE-012: does not delete lock belonging to a different run', async () => {
    const lockPath = join(testDataDir, 'validation', 'run-lock.json')
    // Lock belongs to a different run
    writeFileSync(lockPath, JSON.stringify({ runId: 'other-run-id', startedAt: new Date().toISOString() }))

    await executeValidationRun('run-012', {
      modules: null,
      fullCorpus: false,
      includeHoldout: false,
      startedAt: new Date().toISOString(),
    })

    // Lock should NOT be deleted since it belongs to a different run
    expect(existsSync(lockPath)).toBe(true)
  })

  // VE-013: acquireLock prevents double acquisition
  it('VE-013: acquireLock returns false when lock already exists', () => {
    const now = new Date().toISOString()
    const first = acquireLock('run-a', now, null, false, false)
    expect(first).toBe(true)

    const second = acquireLock('run-b', now, null, false, false)
    expect(second).toBe(false)
  })

  // VE-014: writeProgressAtomic is exported and usable
  it('VE-014: writeProgressAtomic creates progress file', () => {
    writeProgressAtomic('run-014', { status: 'queued', runId: 'run-014' })

    const progress = readProgress('run-014')
    expect(progress.status).toBe('queued')
  })

  // VE-015: SAFE_MODULE_ID exported constant
  it('VE-015: SAFE_MODULE_ID rejects path traversal', () => {
    expect(SAFE_MODULE_ID.test('core-patterns')).toBe(true)
    expect(SAFE_MODULE_ID.test('../etc/passwd')).toBe(false)
    expect(SAFE_MODULE_ID.test('')).toBe(false)
  })

  // VE-016: validationMode field present in progress
  it('VE-016: includes validationMode in progress and report', async () => {
    setupModules(['core-patterns'])

    await executeValidationRun('run-016', {
      modules: null,
      fullCorpus: false,
      includeHoldout: false,
      startedAt: new Date().toISOString(),
    })

    const progress = readProgress('run-016')
    expect(progress.validationMode).toBe('metadata_check')

    const report = readReport('run-016')
    expect(report!.validation_mode).toBe('metadata_check')
  })
})
