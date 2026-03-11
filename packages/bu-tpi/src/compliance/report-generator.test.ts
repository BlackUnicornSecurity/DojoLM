/**
 * Tests for S65: Compliance Engine Report Generator
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ComplianceFramework, ComplianceReport, FrameworkReport } from './types.js';
import {
  generateFullReport,
  generateFrameworkReport,
  formatReportAsMarkdown,
  formatReportAsJSON,
} from './report-generator.js';

// --- Helpers ---

function makeFramework(
  id: string,
  controls: { id: string; name: string }[]
): ComplianceFramework {
  return {
    id,
    name: `Framework ${id}`,
    version: '1.0',
    controls: controls.map((c) => ({
      ...c,
      description: `${c.name} desc`,
      category: 'General',
      requirement: `${c.name} req`,
    })),
  };
}

const FW_A = makeFramework('fw-a', [
  { id: 'LLM01', name: 'Prompt Injection' },
  { id: 'LLM02', name: 'Insecure Output' },
]);

const FW_B = makeFramework('fw-b', [
  { id: 'NIST-SEC', name: 'Security' },
  { id: 'NIST-BIAS', name: 'Bias Management' },
]);

describe('report-generator', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // --- T-RG-01: generateFrameworkReport returns coverage and gaps ---
  it('T-RG-01: generateFrameworkReport returns coverage, gaps, and covered controls', () => {
    const report = generateFrameworkReport(FW_A, ['enhanced-pi'], {});
    expect(report.framework).toBe(FW_A);
    expect(report.coverage).toBeGreaterThanOrEqual(0);
    expect(report.coverage).toBeLessThanOrEqual(100);
    expect(Array.isArray(report.gaps)).toBe(true);
    expect(Array.isArray(report.covered)).toBe(true);
  });

  // --- T-RG-02: generateFrameworkReport identifies gaps ---
  it('T-RG-02: generateFrameworkReport identifies uncovered controls as gaps', () => {
    const fw = makeFramework('fw-gaps', [
      { id: 'LLM01', name: 'Prompt Injection' },
      { id: 'UNKNOWN-CTRL', name: 'Unknown Control' },
    ]);
    const report = generateFrameworkReport(fw, ['enhanced-pi'], {});
    const gapIds = report.gaps.map((g) => g.id);
    expect(gapIds).toContain('UNKNOWN-CTRL');
  });

  // --- T-RG-03: generateFrameworkReport returns 0 gaps when fully covered ---
  it('T-RG-03: generateFrameworkReport returns 0 gaps when all controls are covered', () => {
    const fw = makeFramework('fw-full', [{ id: 'LLM01', name: 'Prompt Injection' }]);
    const report = generateFrameworkReport(fw, ['enhanced-pi'], { 'prompt-injection': 20 });
    expect(report.coverage).toBe(100);
    expect(report.gaps.length).toBe(0);
  });

  // --- T-RG-04: generateFullReport processes multiple frameworks ---
  it('T-RG-04: generateFullReport processes multiple frameworks', () => {
    const report = generateFullReport(['enhanced-pi'], {}, [FW_A, FW_B]);
    expect(report.frameworks.length).toBe(2);
    expect(report.frameworks[0].framework.id).toBe('fw-a');
    expect(report.frameworks[1].framework.id).toBe('fw-b');
  });

  // --- T-RG-05: generateFullReport calculates overallScore as average ---
  it('T-RG-05: generateFullReport calculates overallScore as average of framework coverages', () => {
    const report = generateFullReport(['enhanced-pi'], {}, [FW_A, FW_B]);
    const expectedAvg = Math.round(
      (report.frameworks[0].coverage + report.frameworks[1].coverage) / 2
    );
    expect(report.overallScore).toBe(expectedAvg);
  });

  // --- T-RG-06: generateFullReport returns 0 for empty frameworks array ---
  it('T-RG-06: generateFullReport returns overallScore 0 for empty frameworks', () => {
    const report = generateFullReport(['enhanced-pi'], {}, []);
    expect(report.overallScore).toBe(0);
    expect(report.frameworks).toEqual([]);
  });

  // --- T-RG-07: formatReportAsMarkdown includes header and overall score ---
  it('T-RG-07: formatReportAsMarkdown includes header and overall score', () => {
    const report = generateFullReport(['enhanced-pi'], {}, [FW_A]);
    const md = formatReportAsMarkdown(report);
    expect(md).toContain('# Compliance Report');
    expect(md).toContain('**Overall Score**');
    expect(md).toContain('## Framework Summary');
  });

  // --- T-RG-08: formatReportAsMarkdown includes framework table ---
  it('T-RG-08: formatReportAsMarkdown includes framework summary table', () => {
    const report = generateFullReport(['enhanced-pi'], {}, [FW_A]);
    const md = formatReportAsMarkdown(report);
    expect(md).toContain('| Framework');
    expect(md).toContain('Framework fw-a');
  });

  // --- T-RG-09: formatReportAsMarkdown lists gaps ---
  it('T-RG-09: formatReportAsMarkdown lists gap controls', () => {
    const fw = makeFramework('fw-gappy', [
      { id: 'LLM01', name: 'Prompt Injection' },
      { id: 'MISSING', name: 'Missing Control' },
    ]);
    const report = generateFullReport(['enhanced-pi'], {}, [fw]);
    const md = formatReportAsMarkdown(report);
    expect(md).toContain('### Gaps');
    expect(md).toContain('MISSING');
  });

  // --- T-RG-10: formatReportAsJSON returns valid JSON ---
  it('T-RG-10: formatReportAsJSON returns parseable JSON', () => {
    const report = generateFullReport(['enhanced-pi'], {}, [FW_A]);
    const json = formatReportAsJSON(report);
    const parsed = JSON.parse(json);
    expect(parsed.overallScore).toBe(report.overallScore);
    expect(parsed.frameworks.length).toBe(1);
  });

  // --- T-RG-11: formatReportAsMarkdown lists covered controls ---
  it('T-RG-11: formatReportAsMarkdown lists covered controls section', () => {
    const fw = makeFramework('fw-covered', [{ id: 'LLM01', name: 'Prompt Injection' }]);
    const report = generateFullReport(['enhanced-pi'], {}, [fw]);
    const md = formatReportAsMarkdown(report);
    expect(md).toContain('### Covered Controls');
    expect(md).toContain('LLM01');
  });

  // --- T-RG-12: generateFullReport includes generated timestamp ---
  it('T-RG-12: generateFullReport includes generated timestamp', () => {
    const report = generateFullReport([], {}, [FW_A]);
    expect(report.generated).toBeTruthy();
    expect(new Date(report.generated).getTime()).not.toBeNaN();
  });

  // --- T-RG-13: generateFrameworkReport with only fixtures ---
  it('T-RG-13: generateFrameworkReport works with only fixture categories', () => {
    const report = generateFrameworkReport(FW_A, [], { 'prompt-injection': 20 });
    expect(report.covered.length).toBeGreaterThan(0);
    expect(report.covered[0].fixtureCategories).toContain('prompt-injection');
  });

  // --- T-RG-14: formatReportAsJSON round-trips framework data ---
  it('T-RG-14: formatReportAsJSON preserves framework structure', () => {
    const report = generateFullReport(['enhanced-pi'], {}, [FW_A]);
    const parsed = JSON.parse(formatReportAsJSON(report)) as ComplianceReport;
    expect(parsed.frameworks[0].framework.id).toBe('fw-a');
    expect(parsed.frameworks[0].framework.controls.length).toBe(2);
  });
});
