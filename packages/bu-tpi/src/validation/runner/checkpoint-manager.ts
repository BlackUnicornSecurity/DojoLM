/**
 * KATANA Checkpoint Manager (K3.6)
 *
 * Provides checkpoint/resume capability for long-running validation runs.
 * Saves progress every N samples so runs can be resumed after failure.
 *
 * ISO 17025 Clause 7.2.2
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, unlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { VALIDATION_CONFIG } from '../config.js';
import type { ValidationResult } from '../types.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CheckpointData {
  run_id: string;
  timestamp: string;
  samples_processed: number;
  total_samples: number;
  current_module: string;
  results: ValidationResult[];
  completed_modules: string[];
  elapsed_ms: number;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const RUN_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validate run_id is a UUID to prevent path traversal.
 */
function validateRunId(runId: string): void {
  if (!RUN_ID_RE.test(runId)) {
    throw new Error(`Invalid run_id for checkpoint: must be a UUID, got '${String(runId).slice(0, 64)}'`);
  }
}

/**
 * Build a safe checkpoint file path.
 * Validates run_id and ensures path stays within checkpointDir.
 */
function safeCheckpointPath(checkpointDir: string, runId: string): string {
  validateRunId(runId);
  const filePath = join(checkpointDir, `checkpoint-${runId}.json`);
  const resolved = resolve(filePath);
  const resolvedDir = resolve(checkpointDir);
  if (!resolved.startsWith(resolvedDir + '/') && resolved !== resolvedDir) {
    throw new Error('Path traversal detected in checkpoint path');
  }
  return filePath;
}

/**
 * Validate checkpoint data shape after loading from disk.
 */
function validateCheckpointData(data: unknown): data is CheckpointData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.run_id === 'string' &&
    typeof d.timestamp === 'string' &&
    typeof d.samples_processed === 'number' &&
    typeof d.total_samples === 'number' &&
    typeof d.current_module === 'string' &&
    Array.isArray(d.results) &&
    Array.isArray(d.completed_modules) &&
    typeof d.elapsed_ms === 'number'
  );
}

// ---------------------------------------------------------------------------
// Checkpoint Manager
// ---------------------------------------------------------------------------

/**
 * Save a checkpoint to disk.
 *
 * @param checkpointDir - Directory to save checkpoints
 * @param data - Checkpoint data to save
 */
export function saveCheckpoint(
  checkpointDir: string,
  data: CheckpointData,
): void {
  if (!existsSync(checkpointDir)) {
    mkdirSync(checkpointDir, { recursive: true });
  }

  const filePath = safeCheckpointPath(checkpointDir, data.run_id);
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;

  writeFileSync(tempPath, JSON.stringify(data), 'utf-8');

  // Atomic rename for crash safety
  renameSync(tempPath, filePath);
}

/**
 * Load a checkpoint from disk.
 *
 * @param checkpointDir - Directory containing checkpoints
 * @param runId - Run ID to load
 * @returns Checkpoint data, or null if not found or invalid
 */
export function loadCheckpoint(
  checkpointDir: string,
  runId: string,
): CheckpointData | null {
  const filePath = safeCheckpointPath(checkpointDir, runId);
  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const raw = readFileSync(filePath, 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    if (!validateCheckpointData(parsed)) {
      return null;
    }
    // Verify run_id matches to prevent cross-run contamination
    if (parsed.run_id !== runId) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Delete a checkpoint after successful completion.
 *
 * @param checkpointDir - Directory containing checkpoints
 * @param runId - Run ID to delete
 */
export function deleteCheckpoint(
  checkpointDir: string,
  runId: string,
): void {
  const filePath = safeCheckpointPath(checkpointDir, runId);
  if (existsSync(filePath)) {
    unlinkSync(filePath);
  }
}

/**
 * Determine if a checkpoint should be saved based on sample count.
 */
export function shouldCheckpoint(samplesProcessed: number): boolean {
  return samplesProcessed > 0 &&
    samplesProcessed % VALIDATION_CONFIG.CHECKPOINT_INTERVAL === 0;
}
