/**
 * File: validation-executor.ts
 * Purpose: Background executor for validation runs.
 * Reads module metadata, validates calibration state, updates progress.
 * Called fire-and-forget from the POST /api/admin/validation/run endpoint.
 *
 * DEPLOYMENT NOTE: This executor requires a long-lived Node.js process.
 * It will NOT complete on serverless/edge runtimes (Vercel, Lambda) where
 * the function context terminates after the HTTP response is sent.
 */

import { readFileSync, writeFileSync, renameSync, readdirSync, mkdirSync, unlinkSync, openSync, closeSync } from 'fs'
import { join } from 'path'
import crypto from 'node:crypto'
import { getDataPath } from './runtime-paths'

const DATA_DIR = getDataPath('validation')
const MODULES_DIR = join(DATA_DIR, 'modules')
const LOCK_PATH = join(DATA_DIR, 'run-lock.json')

/** Safe module ID pattern — prevents path traversal. Shared with route.ts. */
export const SAFE_MODULE_ID = /^[a-zA-Z0-9_-]{1,128}$/

/** Report schema version — bump when report structure changes */
export const REPORT_SCHEMA_VERSION = '1.0.0'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface ValidationProgress {
  readonly runId: string
  readonly status: 'queued' | 'running' | 'completed' | 'failed'
  readonly progress: number
  readonly currentModule: string | null
  readonly modulesCompleted: number
  readonly modulesTotal: number
  readonly samplesProcessed: number
  readonly samplesTotal: number
  readonly nonConformities: number
  readonly elapsed: number
  readonly eta: number | null
  readonly startedAt: string
  readonly completedAt?: string
  readonly fullCorpus: boolean
  readonly includeHoldout: boolean
  readonly modules: string[] | null
  readonly validationMode: 'metadata_check'
  readonly error?: string
}

interface ModuleResult {
  readonly moduleId: string
  readonly tier: number
  readonly verdict: 'pass' | 'fail' | 'error'
  readonly samplesProcessed: number
  readonly nonConformities: number
  readonly duration: number
  readonly errorReason?: string
}

export function writeProgressAtomic(runId: string, progress: Readonly<Record<string, unknown>>): void {
  const runDir = join(DATA_DIR, 'runs', runId)
  mkdirSync(runDir, { recursive: true })

  const progressPath = join(runDir, 'progress.json')
  const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
  const tmpPath = `${progressPath}.${uniqueSuffix}.tmp`

  const data = JSON.stringify(progress, null, 2)
  writeFileSync(tmpPath, data, 'utf8')
  renameSync(tmpPath, progressPath)
}

function writeReportAtomic(runId: string, report: Record<string, unknown>): void {
  const runDir = join(DATA_DIR, 'runs', runId)
  mkdirSync(runDir, { recursive: true })

  const reportPath = join(runDir, 'report.json')
  const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
  const tmpPath = `${reportPath}.${uniqueSuffix}.tmp`

  const data = JSON.stringify(report, null, 2)
  writeFileSync(tmpPath, data, 'utf8')
  renameSync(tmpPath, reportPath)
}

/**
 * Acquire the validation lock atomically using O_EXCL.
 * Returns true if lock was acquired, false if already held.
 */
export function acquireLock(runId: string, startedAt: string, modules: string[] | null, fullCorpus: boolean, includeHoldout: boolean): boolean {
  const dir = join(DATA_DIR)
  mkdirSync(dir, { recursive: true })

  try {
    // O_EXCL fails if file already exists — atomic lock acquire
    const fd = openSync(LOCK_PATH, 'wx')
    const lock = { runId, startedAt, modules, fullCorpus, includeHoldout }
    writeFileSync(fd, JSON.stringify(lock, null, 2), 'utf8')
    closeSync(fd)
    return true
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'EEXIST') {
      return false
    }
    throw err
  }
}

/**
 * Release the lock only if it belongs to the given runId.
 * Prevents accidentally deleting another run's lock.
 */
function releaseLock(runId: string): void {
  try {
    const raw = readFileSync(LOCK_PATH, 'utf8')
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && parsed.runId === runId) {
      unlinkSync(LOCK_PATH)
    }
  } catch {
    // Lock already gone or unreadable — no action needed
  }
}

function discoverModules(requestedModules: string[] | null): { modules: string[]; error?: string } {
  try {
    mkdirSync(MODULES_DIR, { recursive: true })
    const allModules = readdirSync(MODULES_DIR).filter(d => SAFE_MODULE_ID.test(d))

    if (requestedModules && requestedModules.length > 0) {
      return { modules: allModules.filter(m => requestedModules.includes(m)) }
    }

    return { modules: allModules }
  } catch (err) {
    return {
      modules: [],
      error: `Failed to read modules directory: ${err instanceof Error ? err.message : 'unknown error'}`,
    }
  }
}

function readModuleMeta(moduleId: string): { meta: Record<string, unknown> | null; error?: string } {
  try {
    const metaPath = join(MODULES_DIR, moduleId, 'meta.json')
    const raw = readFileSync(metaPath, 'utf8')
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return { meta: parsed as Record<string, unknown> }
    }
    return { meta: null, error: 'meta.json contains non-object value' }
  } catch (err) {
    return { meta: null, error: err instanceof Error ? err.message : 'unknown error' }
  }
}

function validateModule(moduleId: string, meta: Record<string, unknown>): ModuleResult {
  const start = Date.now()
  const tier = typeof meta.tier === 'number' ? meta.tier : 1

  // Metadata-level calibration check
  const hasCalibration = !!meta.lastCalibrationDate
  const toolHashMatch = meta.currentToolHash === meta.calibratedToolHash

  const samplesProcessed = 1
  let nonConformities = 0

  if (!hasCalibration) {
    nonConformities = 1
  } else if (!toolHashMatch) {
    nonConformities = 1
  }

  const verdict: 'pass' | 'fail' = nonConformities > 0 ? 'fail' : 'pass'

  return {
    moduleId,
    tier,
    verdict,
    samplesProcessed,
    nonConformities,
    duration: Date.now() - start,
  }
}

/**
 * Execute a validation run asynchronously.
 * Updates progress file incrementally as each module is processed.
 * Releases lock and writes final report on completion or failure.
 */
export async function executeValidationRun(
  runId: string,
  options: {
    modules: string[] | null
    fullCorpus: boolean
    includeHoldout: boolean
    startedAt: string
  }
): Promise<void> {
  const { modules: requestedModules, fullCorpus, includeHoldout, startedAt } = options
  const startTime = Date.now()

  try {
    // Discover available modules
    const discovery = discoverModules(requestedModules)

    if (discovery.error) {
      // Mark as failed — could not read modules directory
      writeProgressAtomic(runId, {
        runId,
        status: 'failed',
        progress: 0,
        currentModule: null,
        modulesCompleted: 0,
        modulesTotal: 0,
        samplesProcessed: 0,
        samplesTotal: 0,
        nonConformities: 0,
        elapsed: Date.now() - startTime,
        eta: null,
        startedAt,
        completedAt: new Date().toISOString(),
        fullCorpus,
        includeHoldout,
        modules: requestedModules,
        validationMode: 'metadata_check',
        error: discovery.error,
      })
      return
    }

    const moduleIds = discovery.modules
    const modulesTotal = moduleIds.length

    // Update progress to running (immutable snapshots)
    const baseProgress = {
      runId,
      status: 'running' as const,
      currentModule: null as string | null,
      modulesCompleted: 0,
      modulesTotal,
      samplesProcessed: 0,
      samplesTotal: modulesTotal,
      nonConformities: 0,
      elapsed: 0,
      eta: null as number | null,
      startedAt,
      fullCorpus,
      includeHoldout,
      modules: requestedModules,
      validationMode: 'metadata_check' as const,
      progress: 0,
    }

    writeProgressAtomic(runId, baseProgress)

    const moduleResults: ModuleResult[] = []
    let totalNonConformities = 0
    let totalSamplesProcessed = 0

    for (let i = 0; i < moduleIds.length; i++) {
      const moduleId = moduleIds[i]
      const elapsed = Date.now() - startTime

      // Compute ETA
      const eta = i > 0 ? Math.round((elapsed / i) * (modulesTotal - i)) : null

      // Write progress snapshot (immutable)
      writeProgressAtomic(runId, {
        ...baseProgress,
        currentModule: moduleId,
        modulesCompleted: i,
        samplesProcessed: totalSamplesProcessed,
        nonConformities: totalNonConformities,
        progress: modulesTotal > 0 ? Math.round((i / modulesTotal) * 100) : 0,
        elapsed,
        eta,
      })

      // Read module metadata
      const { meta, error: metaError } = readModuleMeta(moduleId)
      let result: ModuleResult

      if (!meta) {
        result = {
          moduleId,
          tier: 0,
          verdict: 'error',
          samplesProcessed: 0,
          nonConformities: 0,
          duration: 0,
          errorReason: metaError ?? 'missing meta.json',
        }
      } else {
        result = validateModule(moduleId, meta)
      }

      moduleResults.push(result)
      totalNonConformities += result.nonConformities
      totalSamplesProcessed += result.samplesProcessed
    }

    // Mark as completed (immutable snapshot)
    const completedAt = new Date().toISOString()
    writeProgressAtomic(runId, {
      ...baseProgress,
      status: 'completed',
      currentModule: null,
      modulesCompleted: modulesTotal,
      samplesProcessed: totalSamplesProcessed,
      nonConformities: totalNonConformities,
      progress: 100,
      elapsed: Date.now() - startTime,
      eta: 0,
      completedAt,
    })

    // Write final report
    const overallVerdict = totalNonConformities === 0 ? 'PASS' : 'FAIL'
    writeReportAtomic(runId, {
      schema_version: REPORT_SCHEMA_VERSION,
      report_id: crypto.randomUUID(),
      run_id: runId,
      generated_at: completedAt,
      overall_verdict: overallVerdict,
      non_conformity_count: totalNonConformities,
      corpus_version: fullCorpus ? 'full' : 'standard',
      tool_version: process.env.npm_package_version ?? '1.0.0',
      validation_mode: 'metadata_check',
      modules: moduleResults.map(r => ({
        module_id: r.moduleId,
        tier: r.tier,
        decision: { verdict: r.verdict },
        metrics: {
          samples_processed: r.samplesProcessed,
          non_conformities: r.nonConformities,
          duration_ms: r.duration,
        },
        ...(r.errorReason ? { error: r.errorReason } : {}),
      })),
    })
  } catch (error) {
    // Mark as failed
    writeProgressAtomic(runId, {
      runId,
      status: 'failed',
      progress: 0,
      currentModule: null,
      modulesCompleted: 0,
      modulesTotal: 0,
      samplesProcessed: 0,
      samplesTotal: 0,
      nonConformities: 0,
      elapsed: Date.now() - startTime,
      eta: null,
      startedAt,
      completedAt: new Date().toISOString(),
      fullCorpus,
      includeHoldout,
      modules: requestedModules,
      validationMode: 'metadata_check',
      error: error instanceof Error ? error.message : 'Unknown execution error',
    })
  } finally {
    releaseLock(runId)
  }
}
