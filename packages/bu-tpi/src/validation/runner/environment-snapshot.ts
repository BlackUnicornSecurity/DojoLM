/**
 * KATANA Environment Snapshot (K3.2)
 *
 * Captures complete execution environment for reproducibility evidence.
 * ISO 17025 Clause 6.4: Equipment (including software) must be documented.
 */

import { execFileSync } from 'node:child_process';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { SCHEMA_VERSION, type EnvironmentSnapshot, EnvironmentSnapshotSchema } from '../types.js';

/**
 * Capture a complete snapshot of the current execution environment.
 * All external calls are wrapped in try-catch to ensure the snapshot
 * always completes even in restricted environments.
 */
export function captureEnvironmentSnapshot(): EnvironmentSnapshot {
  const snapshot: EnvironmentSnapshot = {
    schema_version: SCHEMA_VERSION,
    os: {
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
    },
    node: {
      version: process.version,
      v8: process.versions.v8 ?? 'unknown',
    },
    cpu: {
      model: getCpuModel(),
      cores: os.cpus().length || 1,
    },
    memory: {
      total_mb: Math.round(os.totalmem() / (1024 * 1024)),
    },
    locale: getLocale(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    git: getGitInfo(),
    package_version: getPackageVersion(),
    timestamp: new Date().toISOString(),
  };

  // Validate at system boundary
  return EnvironmentSnapshotSchema.parse(snapshot);
}

/**
 * Compute a deterministic hash of the environment snapshot
 * for use in traceability chains.
 */
export function hashEnvironment(snapshot: EnvironmentSnapshot): string {
  const normalized = JSON.stringify({
    os: snapshot.os,
    node: snapshot.node,
    cpu: snapshot.cpu,
    memory: snapshot.memory,
    git: snapshot.git,
    package_version: snapshot.package_version,
  });
  return createHash('sha256').update(normalized).digest('hex');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCpuModel(): string {
  const cpus = os.cpus();
  return cpus.length > 0 ? cpus[0].model : 'unknown';
}

function getLocale(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale;
  } catch {
    return process.env.LANG ?? 'unknown';
  }
}

function getGitInfo(): EnvironmentSnapshot['git'] {
  try {
    const hash = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf-8', timeout: 5000 }).trim();
    const dirtyOutput = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf-8', timeout: 5000 }).trim();
    const branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf-8', timeout: 5000 }).trim();
    return {
      hash,
      dirty: dirtyOutput.length > 0,
      branch,
    };
  } catch {
    return {
      hash: 'unknown',
      dirty: false,
      branch: 'unknown',
    };
  }
}

function getPackageVersion(): string {
  return process.env.npm_package_version ?? '1.0.0';
}
