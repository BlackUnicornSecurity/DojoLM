/**
 * Tests for S65: Compliance Engine Delta Reporter
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ComplianceFramework, CoverageSnapshot, ControlMapping } from './types.js';
import {
  createSnapshot,
  compareSnapshots,
  generateDeltaReport,
  detectCoverageChanges,
} from './delta-reporter.js';

// --- Helpers ---

function makeFramework(controls: { id: string; name: string }[]): ComplianceFramework {
  return {
    id: 'test-fw',
    name: 'Test Framework',
    version: '1.0',
    controls: controls.map((c) => ({
      ...c,
      description: `${c.name} desc`,
      category: 'General',
      requirement: `${c.name} req`,
    })),
  };
}

function makeMapping(controlId: string, overrides?: Partial<ControlMapping>): ControlMapping {
  return {
    controlId,
    frameworkId: 'test-fw',
    moduleNames: ['mod-a'],
    fixtureCategories: [],
    coveragePercent: 100,
    evidence: ['test evidence'],
    ...overrides,
  };
}

function makeSnapshot(overrides?: Partial<CoverageSnapshot>): CoverageSnapshot {
  return {
    id: 'snap-1',
    timestamp: '2025-01-01T00:00:00.000Z',
    frameworkId: 'test-fw',
    mappings: [],
    overallCoverage: 0,
    ...overrides,
  };
}

const FW = makeFramework([
  { id: 'LLM01', name: 'Prompt Injection' },
  { id: 'LLM02', name: 'Insecure Output' },
]);

describe('delta-reporter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // --- T-DR-01: createSnapshot returns snapshot with correct frameworkId ---
  it('T-DR-01: createSnapshot returns a snapshot with correct frameworkId', () => {
    const snapshot = createSnapshot(FW, ['enhanced-pi'], {});
    expect(snapshot.frameworkId).toBe('test-fw');
    expect(snapshot.id).toBeTruthy();
    expect(snapshot.timestamp).toBeTruthy();
  });

  // --- T-DR-02: createSnapshot includes mappings from modules ---
  it('T-DR-02: createSnapshot includes mappings from provided modules', () => {
    const snapshot = createSnapshot(FW, ['enhanced-pi'], {});
    expect(snapshot.mappings.length).toBeGreaterThan(0);
    expect(snapshot.mappings.some((m) => m.controlId === 'LLM01')).toBe(true);
  });

  // --- T-DR-03: createSnapshot includes fixture-based mappings ---
  it('T-DR-03: createSnapshot includes fixture-based mappings', () => {
    const snapshot = createSnapshot(FW, [], { 'prompt-injection': 10 });
    expect(snapshot.mappings.some((m) => m.fixtureCategories.includes('prompt-injection'))).toBe(true);
  });

  // --- T-DR-04: createSnapshot calculates overallCoverage ---
  it('T-DR-04: createSnapshot calculates overallCoverage correctly', () => {
    const snapshot = createSnapshot(FW, ['enhanced-pi'], { 'prompt-injection': 10 });
    expect(snapshot.overallCoverage).toBeGreaterThanOrEqual(0);
    expect(snapshot.overallCoverage).toBeLessThanOrEqual(100);
  });

  // --- T-DR-05: compareSnapshots detects no changes for identical snapshots ---
  it('T-DR-05: compareSnapshots returns no changes for identical snapshots', () => {
    const mappings = [makeMapping('LLM01')];
    const before = makeSnapshot({ mappings, overallCoverage: 50 });
    const after = makeSnapshot({ id: 'snap-2', mappings, overallCoverage: 50 });

    const delta = compareSnapshots(before, after);
    expect(delta.changes).toEqual([]);
  });

  // --- T-DR-06: compareSnapshots detects coverage increase ---
  it('T-DR-06: compareSnapshots detects coverage increase as module-added or fixture-added', () => {
    const before = makeSnapshot({
      mappings: [makeMapping('LLM01', { coveragePercent: 50, moduleNames: ['mod-a'] })],
      overallCoverage: 25,
    });
    const after = makeSnapshot({
      id: 'snap-2',
      mappings: [makeMapping('LLM01', { coveragePercent: 100, moduleNames: ['mod-a', 'mod-b'] })],
      overallCoverage: 50,
    });

    const delta = compareSnapshots(before, after);
    expect(delta.changes.length).toBe(1);
    expect(delta.changes[0].currentCoverage).toBe(100);
    expect(delta.changes[0].reason).toBe('module-added');
  });

  // --- T-DR-07: compareSnapshots detects removed controls ---
  it('T-DR-07: compareSnapshots detects controls removed from coverage', () => {
    const before = makeSnapshot({
      mappings: [makeMapping('LLM01'), makeMapping('LLM02')],
      overallCoverage: 100,
    });
    const after = makeSnapshot({
      id: 'snap-2',
      mappings: [makeMapping('LLM01')],
      overallCoverage: 50,
    });

    const delta = compareSnapshots(before, after);
    const removedChange = delta.changes.find((c) => c.controlId === 'LLM02');
    expect(removedChange).toBeDefined();
    expect(removedChange!.currentCoverage).toBe(0);
    expect(removedChange!.reason).toBe('module-removed');
  });

  // --- T-DR-08: generateDeltaReport returns markdown with header ---
  it('T-DR-08: generateDeltaReport returns markdown with header and framework info', () => {
    const before = makeSnapshot({ overallCoverage: 40 });
    const after = makeSnapshot({ id: 'snap-2', overallCoverage: 60 });
    const delta = { before, after, changes: [] };

    const md = generateDeltaReport(delta);
    expect(md).toContain('# Compliance Coverage Delta Report');
    expect(md).toContain('test-fw');
    expect(md).toContain('40%');
    expect(md).toContain('60%');
  });

  // --- T-DR-09: generateDeltaReport includes change table when changes exist ---
  it('T-DR-09: generateDeltaReport includes changes table', () => {
    const before = makeSnapshot({ overallCoverage: 50 });
    const after = makeSnapshot({ id: 'snap-2', overallCoverage: 75 });
    const delta = {
      before,
      after,
      changes: [{
        controlId: 'LLM01',
        frameworkId: 'test-fw',
        previousCoverage: 50,
        currentCoverage: 100,
        reason: 'module-added' as const,
      }],
    };

    const md = generateDeltaReport(delta);
    expect(md).toContain('## Changes');
    expect(md).toContain('LLM01');
    expect(md).toContain('+50%');
    expect(md).toContain('module-added');
  });

  // --- T-DR-10: generateDeltaReport says no changes when empty ---
  it('T-DR-10: generateDeltaReport says no changes when changes array is empty', () => {
    const before = makeSnapshot({ overallCoverage: 50 });
    const after = makeSnapshot({ id: 'snap-2', overallCoverage: 50 });
    const delta = { before, after, changes: [] };

    const md = generateDeltaReport(delta);
    expect(md).toContain('No changes detected.');
  });

  // --- T-DR-11: detectCoverageChanges finds added modules ---
  it('T-DR-11: detectCoverageChanges identifies added modules', () => {
    const result = detectCoverageChanges(['mod-a'], ['mod-a', 'mod-b', 'mod-c']);
    expect(result.added).toEqual(['mod-b', 'mod-c']);
    expect(result.removed).toEqual([]);
  });

  // --- T-DR-12: detectCoverageChanges finds removed modules ---
  it('T-DR-12: detectCoverageChanges identifies removed modules', () => {
    const result = detectCoverageChanges(['mod-a', 'mod-b'], ['mod-b']);
    expect(result.added).toEqual([]);
    expect(result.removed).toEqual(['mod-a']);
  });

  // --- T-DR-13: detectCoverageChanges handles no overlap ---
  it('T-DR-13: detectCoverageChanges handles disjoint module lists', () => {
    const result = detectCoverageChanges(['mod-a', 'mod-b'], ['mod-c', 'mod-d']);
    expect(result.added).toEqual(['mod-c', 'mod-d']);
    expect(result.removed).toEqual(['mod-a', 'mod-b']);
  });

  // --- T-DR-14: compareSnapshots detects coverage decrease ---
  it('T-DR-14: compareSnapshots detects coverage decrease with correct reason', () => {
    const before = makeSnapshot({
      mappings: [makeMapping('LLM01', { coveragePercent: 100, moduleNames: ['mod-a', 'mod-b'] })],
      overallCoverage: 50,
    });
    const after = makeSnapshot({
      id: 'snap-2',
      mappings: [makeMapping('LLM01', { coveragePercent: 50, moduleNames: ['mod-a'] })],
      overallCoverage: 25,
    });

    const delta = compareSnapshots(before, after);
    expect(delta.changes.length).toBe(1);
    expect(delta.changes[0].reason).toBe('module-removed');
    expect(delta.changes[0].previousCoverage).toBe(100);
    expect(delta.changes[0].currentCoverage).toBe(50);
  });
});
