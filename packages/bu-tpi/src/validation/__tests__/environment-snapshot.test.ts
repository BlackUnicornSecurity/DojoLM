/**
 * K3.2 — Environment Snapshot Tests
 *
 * Validates environment capture produces valid snapshots
 * and hashing is deterministic.
 */

import { describe, it, expect } from 'vitest';
import {
  captureEnvironmentSnapshot,
  hashEnvironment,
} from '../runner/environment-snapshot.js';
import { EnvironmentSnapshotSchema, SCHEMA_VERSION } from '../types.js';

describe('K3.2 — captureEnvironmentSnapshot', () => {
  it('returns a valid snapshot', () => {
    const snapshot = captureEnvironmentSnapshot();

    // Should pass Zod validation
    expect(() => EnvironmentSnapshotSchema.parse(snapshot)).not.toThrow();
  });

  it('includes schema_version', () => {
    const snapshot = captureEnvironmentSnapshot();
    expect(snapshot.schema_version).toBe(SCHEMA_VERSION);
  });

  it('captures OS information', () => {
    const snapshot = captureEnvironmentSnapshot();
    expect(snapshot.os.platform).toBeTruthy();
    expect(snapshot.os.release).toBeTruthy();
    expect(snapshot.os.arch).toBeTruthy();
  });

  it('captures Node.js version', () => {
    const snapshot = captureEnvironmentSnapshot();
    expect(snapshot.node.version).toMatch(/^v\d+/);
    expect(snapshot.node.v8).toBeTruthy();
  });

  it('captures CPU info', () => {
    const snapshot = captureEnvironmentSnapshot();
    expect(snapshot.cpu.model).toBeTruthy();
    expect(snapshot.cpu.cores).toBeGreaterThan(0);
  });

  it('captures memory info', () => {
    const snapshot = captureEnvironmentSnapshot();
    expect(snapshot.memory.total_mb).toBeGreaterThan(0);
  });

  it('captures git info', () => {
    const snapshot = captureEnvironmentSnapshot();
    // In a git repo, hash should not be 'unknown'
    expect(snapshot.git.hash).toBeTruthy();
    expect(typeof snapshot.git.dirty).toBe('boolean');
    expect(snapshot.git.branch).toBeTruthy();
  });

  it('includes ISO timestamp', () => {
    const snapshot = captureEnvironmentSnapshot();
    expect(snapshot.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe('K3.2 — hashEnvironment', () => {
  it('produces 64-char hex hash', () => {
    const snapshot = captureEnvironmentSnapshot();
    const hash = hashEnvironment(snapshot);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('is deterministic for same snapshot', () => {
    const snapshot = captureEnvironmentSnapshot();
    const hash1 = hashEnvironment(snapshot);
    const hash2 = hashEnvironment(snapshot);
    expect(hash1).toBe(hash2);
  });

  it('changes when git hash changes', () => {
    const snapshot = captureEnvironmentSnapshot();
    const hash1 = hashEnvironment(snapshot);
    const modified = { ...snapshot, git: { ...snapshot.git, hash: 'different' } };
    const hash2 = hashEnvironment(modified);
    expect(hash1).not.toBe(hash2);
  });
});
