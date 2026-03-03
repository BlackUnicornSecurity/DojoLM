/**
 * S65: Compliance Engine Tests
 */

import { describe, it, expect } from 'vitest';
import {
  OWASP_LLM_TOP10,
  NIST_AI_600_1,
  MITRE_ATLAS,
  ISO_42001,
  EU_AI_ACT,
  ALL_FRAMEWORKS,
  mapModuleToControls,
  mapFixturesToControls,
  calculateCoverage,
  getAllMappings,
  createSnapshot,
  compareSnapshots,
  generateDeltaReport,
  detectCoverageChanges,
  generateFullReport,
  formatReportAsMarkdown,
  formatReportAsJSON,
} from './index.js';

describe('Framework Definitions', () => {
  it('should have 5 frameworks', () => {
    expect(ALL_FRAMEWORKS.length).toBe(5);
  });

  it('OWASP LLM Top 10 should have 10 controls', () => {
    expect(OWASP_LLM_TOP10.controls.length).toBe(10);
  });

  it('all frameworks should have unique IDs', () => {
    const ids = ALL_FRAMEWORKS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('Mapper', () => {
  const moduleNames = [
    'enhanced-pi', 'encoding-engine', 'dos-detector',
    'supply-chain-detector', 'bias-detector', 'model-theft-detector',
    'pii-detector', 'rag-analyzer',
  ];

  it('should map modules to OWASP controls', () => {
    const mappings = mapModuleToControls('enhanced-pi', OWASP_LLM_TOP10);
    expect(mappings.length).toBeGreaterThan(0);
    expect(mappings[0].controlId).toBe('LLM01');
  });

  it('should map fixtures to controls', () => {
    const mappings = mapFixturesToControls('prompt-injection', 50, OWASP_LLM_TOP10);
    expect(mappings.length).toBeGreaterThan(0);
  });

  it('should calculate coverage', () => {
    const mappings = getAllMappings(OWASP_LLM_TOP10, moduleNames, { 'prompt-injection': 50, 'dos': 25 });
    const coverage = calculateCoverage(OWASP_LLM_TOP10, mappings);
    expect(coverage).toBeGreaterThan(0);
    expect(coverage).toBeLessThanOrEqual(100);
  });

  it('should deduplicate mappings', () => {
    const mappings = getAllMappings(OWASP_LLM_TOP10, ['enhanced-pi', 'encoding-engine'], { 'prompt-injection': 50 });
    const controlIds = mappings.map((m) => m.controlId);
    const uniqueIds = new Set(controlIds);
    expect(uniqueIds.size).toBe(controlIds.length);
  });
});

describe('Delta Reporter', () => {
  const modules1 = ['enhanced-pi', 'encoding-engine'];
  const modules2 = ['enhanced-pi', 'encoding-engine', 'dos-detector'];
  const fixtures = { 'prompt-injection': 50 };

  it('should create snapshots', () => {
    const snapshot = createSnapshot(OWASP_LLM_TOP10, modules1, fixtures);
    expect(snapshot.overallCoverage).toBeGreaterThan(0);
    expect(snapshot.mappings.length).toBeGreaterThan(0);
  });

  it('should detect changes between snapshots', () => {
    const before = createSnapshot(OWASP_LLM_TOP10, modules1, fixtures);
    const after = createSnapshot(OWASP_LLM_TOP10, modules2, fixtures);
    const delta = compareSnapshots(before, after);
    expect(delta.after.overallCoverage).toBeGreaterThanOrEqual(delta.before.overallCoverage);
  });

  it('should generate delta report', () => {
    const before = createSnapshot(OWASP_LLM_TOP10, modules1, fixtures);
    const after = createSnapshot(OWASP_LLM_TOP10, modules2, fixtures);
    const delta = compareSnapshots(before, after);
    const report = generateDeltaReport(delta);
    expect(report).toContain('Compliance Coverage Delta Report');
  });

  it('should detect module changes', () => {
    const { added, removed } = detectCoverageChanges(modules1, modules2);
    expect(added).toContain('dos-detector');
    expect(removed.length).toBe(0);
  });
});

describe('Report Generator', () => {
  const moduleNames = ['enhanced-pi', 'dos-detector', 'bias-detector', 'model-theft-detector'];
  const fixtures = { 'prompt-injection': 50, 'dos': 25, 'bias': 30 };

  it('should generate full report', () => {
    const report = generateFullReport(moduleNames, fixtures);
    expect(report.frameworks.length).toBe(5);
    expect(report.overallScore).toBeGreaterThan(0);
  });

  it('should format as markdown', () => {
    const report = generateFullReport(moduleNames, fixtures);
    const md = formatReportAsMarkdown(report);
    expect(md).toContain('# Compliance Report');
    expect(md).toContain('OWASP');
  });

  it('should format as JSON', () => {
    const report = generateFullReport(moduleNames, fixtures);
    const json = formatReportAsJSON(report);
    const parsed = JSON.parse(json);
    expect(parsed.frameworks.length).toBe(5);
  });
});
