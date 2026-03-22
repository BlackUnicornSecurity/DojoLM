/**
 * Tests for KATANA Checkpoint Manager (K3.6)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import {
  saveCheckpoint,
  loadCheckpoint,
  deleteCheckpoint,
  shouldCheckpoint,
  type CheckpointData,
} from '../runner/checkpoint-manager.js';
import { SCHEMA_VERSION } from '../types.js';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const CHECKPOINT_DIR = join(process.cwd(), '.test-checkpoints');
const TEST_RUN_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const OTHER_RUN_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

beforeEach(() => {
  if (existsSync(CHECKPOINT_DIR)) rmSync(CHECKPOINT_DIR, { recursive: true });
});

afterEach(() => {
  if (existsSync(CHECKPOINT_DIR)) rmSync(CHECKPOINT_DIR, { recursive: true });
});

function makeCheckpoint(overrides: Partial<CheckpointData> = {}): CheckpointData {
  return {
    run_id: TEST_RUN_ID,
    timestamp: '2026-03-21T00:00:00.000Z',
    samples_processed: 1000,
    total_samples: 5000,
    current_module: 'enhanced-pi',
    results: [{
      schema_version: SCHEMA_VERSION,
      sample_id: 'sample-1',
      module_id: 'enhanced-pi',
      expected_verdict: 'malicious',
      actual_verdict: 'malicious',
      correct: true,
      actual_severity: 'CRITICAL',
      actual_categories: ['PROMPT_INJECTION'],
      actual_findings_count: 1,
      elapsed_ms: 5.2,
    }],
    completed_modules: ['core-patterns'],
    elapsed_ms: 30000,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('saveCheckpoint', () => {
  it('saves checkpoint to disk', () => {
    const data = makeCheckpoint();
    saveCheckpoint(CHECKPOINT_DIR, data);

    const loaded = loadCheckpoint(CHECKPOINT_DIR, TEST_RUN_ID);
    expect(loaded).not.toBeNull();
    expect(loaded!.run_id).toBe(TEST_RUN_ID);
    expect(loaded!.samples_processed).toBe(1000);
    expect(loaded!.results).toHaveLength(1);
  });

  it('creates directory if needed', () => {
    const nested = join(CHECKPOINT_DIR, 'nested', 'dir');
    saveCheckpoint(nested, makeCheckpoint());
    expect(existsSync(nested)).toBe(true);
  });

  it('overwrites existing checkpoint', () => {
    saveCheckpoint(CHECKPOINT_DIR, makeCheckpoint({ samples_processed: 1000 }));
    saveCheckpoint(CHECKPOINT_DIR, makeCheckpoint({ samples_processed: 2000 }));

    const loaded = loadCheckpoint(CHECKPOINT_DIR, TEST_RUN_ID);
    expect(loaded!.samples_processed).toBe(2000);
  });

  it('rejects invalid run_id', () => {
    const data = makeCheckpoint({ run_id: 'not-a-uuid' });
    expect(() => saveCheckpoint(CHECKPOINT_DIR, data)).toThrow('Invalid run_id');
  });
});

describe('loadCheckpoint', () => {
  it('returns null for non-existent checkpoint', () => {
    mkdirSync(CHECKPOINT_DIR, { recursive: true });
    const loaded = loadCheckpoint(CHECKPOINT_DIR, OTHER_RUN_ID);
    expect(loaded).toBeNull();
  });

  it('returns null for non-existent directory', () => {
    const loaded = loadCheckpoint('/nonexistent/dir', TEST_RUN_ID);
    expect(loaded).toBeNull();
  });

  it('loads saved checkpoint data', () => {
    const data = makeCheckpoint({
      completed_modules: ['core-patterns', 'enhanced-pi'],
    });
    saveCheckpoint(CHECKPOINT_DIR, data);

    const loaded = loadCheckpoint(CHECKPOINT_DIR, TEST_RUN_ID);
    expect(loaded!.completed_modules).toEqual(['core-patterns', 'enhanced-pi']);
  });

  it('returns null when file run_id does not match requested runId', () => {
    // Save checkpoint with TEST_RUN_ID, then manually rename file to OTHER_RUN_ID
    const data = makeCheckpoint();
    saveCheckpoint(CHECKPOINT_DIR, data);

    // Load with the correct run_id works
    expect(loadCheckpoint(CHECKPOINT_DIR, TEST_RUN_ID)).not.toBeNull();

    // Rename file to simulate corruption/swap
    const { renameSync } = require('node:fs');
    const { join } = require('node:path');
    renameSync(
      join(CHECKPOINT_DIR, `checkpoint-${TEST_RUN_ID}.json`),
      join(CHECKPOINT_DIR, `checkpoint-${OTHER_RUN_ID}.json`),
    );

    // Load with OTHER_RUN_ID should return null (run_id inside file is TEST_RUN_ID)
    const loaded = loadCheckpoint(CHECKPOINT_DIR, OTHER_RUN_ID);
    expect(loaded).toBeNull();
  });
});

describe('deleteCheckpoint', () => {
  it('deletes existing checkpoint', () => {
    saveCheckpoint(CHECKPOINT_DIR, makeCheckpoint());
    deleteCheckpoint(CHECKPOINT_DIR, TEST_RUN_ID);
    expect(loadCheckpoint(CHECKPOINT_DIR, TEST_RUN_ID)).toBeNull();
  });

  it('does nothing for non-existent checkpoint', () => {
    mkdirSync(CHECKPOINT_DIR, { recursive: true });
    expect(() => deleteCheckpoint(CHECKPOINT_DIR, OTHER_RUN_ID)).not.toThrow();
  });
});

describe('shouldCheckpoint', () => {
  it('returns true at checkpoint intervals', () => {
    expect(shouldCheckpoint(1000)).toBe(true);
    expect(shouldCheckpoint(2000)).toBe(true);
    expect(shouldCheckpoint(3000)).toBe(true);
  });

  it('returns false between intervals', () => {
    expect(shouldCheckpoint(0)).toBe(false);
    expect(shouldCheckpoint(500)).toBe(false);
    expect(shouldCheckpoint(999)).toBe(false);
    expect(shouldCheckpoint(1001)).toBe(false);
  });
});
