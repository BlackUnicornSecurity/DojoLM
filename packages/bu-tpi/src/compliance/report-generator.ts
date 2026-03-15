/**
 * S65: Compliance Engine Report Generator
 * Generates full compliance reports across all frameworks.
 *
 * INDEX:
 * - generateFullReport(): Full report across all frameworks (S65)
 * - generateFrameworkReport(): Single framework report (S65)
 * - formatReportAsMarkdown(): Markdown formatter (S65)
 * - formatReportAsJSON(): JSON formatter (S65)
 * - signEvidence(): HMAC-SHA256 sign an evidence record (H9.2 / SEC-13)
 * - verifyEvidence(): Verify HMAC signature on evidence record (H9.2 / SEC-13)
 * - sanitizePayloadForReport(): Sanitize attack payloads for reports (H9.2 / SEC-G5)
 * - generateReportWithEvidence(): Compliance report from test executions (H9.2)
 */

import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import type {
  ComplianceFramework,
  ComplianceReport,
  FrameworkReport,
  TestMapping,
  EvidenceRecord,
  ComplianceReportWithEvidence,
} from './types.js';
import { ALL_FRAMEWORKS } from './frameworks.js';
import { getAllMappings, calculateCoverage } from './mapper.js';

/**
 * Generate a full compliance report across all frameworks.
 */
export function generateFullReport(
  moduleNames: string[],
  fixtureCategories: Record<string, number>,
  frameworks?: ComplianceFramework[]
): ComplianceReport {
  const targetFrameworks = frameworks ?? ALL_FRAMEWORKS;
  const frameworkReports: FrameworkReport[] = [];

  for (const framework of targetFrameworks) {
    frameworkReports.push(
      generateFrameworkReport(framework, moduleNames, fixtureCategories)
    );
  }

  const overallScore =
    frameworkReports.length > 0
      ? Math.round(
          frameworkReports.reduce((sum, r) => sum + r.coverage, 0) /
            frameworkReports.length
        )
      : 0;

  return {
    generated: new Date().toISOString(),
    frameworks: frameworkReports,
    overallScore,
  };
}

/**
 * Generate a report for a single framework.
 */
export function generateFrameworkReport(
  framework: ComplianceFramework,
  moduleNames: string[],
  fixtureCategories: Record<string, number>
): FrameworkReport {
  const mappings = getAllMappings(framework, moduleNames, fixtureCategories);
  const coverage = calculateCoverage(framework, mappings);

  const coveredControlIds = new Set(mappings.map((m) => m.controlId));
  const gaps = framework.controls.filter((c) => !coveredControlIds.has(c.id));

  return {
    framework,
    coverage,
    gaps,
    covered: mappings,
  };
}

/**
 * Format a compliance report as markdown.
 */
export function formatReportAsMarkdown(report: ComplianceReport): string {
  const lines: string[] = [
    '# Compliance Report',
    '',
    `**Generated**: ${report.generated}`,
    `**Overall Score**: ${report.overallScore}%`,
    '',
    '## Framework Summary',
    '',
    '| Framework | Coverage | Gaps | Covered Controls |',
    '|-----------|----------|------|------------------|',
  ];

  for (const fr of report.frameworks) {
    lines.push(
      `| ${fr.framework.name} (${fr.framework.version}) | ${fr.coverage}% | ${fr.gaps.length} | ${fr.covered.length} |`
    );
  }

  lines.push('');

  for (const fr of report.frameworks) {
    lines.push(`## ${fr.framework.name}`, '');
    lines.push(`Coverage: **${fr.coverage}%**`, '');

    if (fr.gaps.length > 0) {
      lines.push('### Gaps', '');
      for (const gap of fr.gaps) {
        lines.push(`- **${gap.id}**: ${gap.name} - ${gap.description}`);
      }
      lines.push('');
    }

    if (fr.covered.length > 0) {
      lines.push('### Covered Controls', '');
      for (const mapping of fr.covered) {
        lines.push(
          `- **${mapping.controlId}**: Covered by modules [${mapping.moduleNames.join(', ')}] + fixtures [${mapping.fixtureCategories.join(', ')}]`
        );
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Format a compliance report as JSON.
 */
export function formatReportAsJSON(report: ComplianceReport): string {
  return JSON.stringify(report, null, 2);
}

// ---------------------------------------------------------------------------
// H9.2: Evidence-based compliance report generation
// ---------------------------------------------------------------------------

/** Maximum length for evidence detail text */
const EVIDENCE_DETAIL_MAX_LENGTH = 2000;

/**
 * Get HMAC key at call time (not module load time) so env changes are picked up.
 * Lesson learned: reading env at module scope causes stale keys in long-running processes.
 */
function getHmacKey(): string {
  const key = process.env.EVIDENCE_HMAC_SECRET;
  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('EVIDENCE_HMAC_SECRET must be set in production');
    }
    return 'default-dev-evidence-key';
  }
  return key;
}

/**
 * Sanitize attack payload content for inclusion in reports (SEC-G5).
 * Strips HTML tags, encodes special chars, and truncates to safe length.
 */
export function sanitizePayloadForReport(text: string): string {
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/&(?!lt;|gt;|amp;)/g, '&amp;')
    .slice(0, EVIDENCE_DETAIL_MAX_LENGTH);
}

/**
 * Build the canonical HMAC payload from an evidence record.
 * Only includes fields that are integrity-relevant (excludes details & signature).
 */
function buildHmacPayload(record: Pick<EvidenceRecord, 'id' | 'controlId' | 'frameworkId' | 'testExecutionId' | 'timestamp' | 'result' | 'score'>): string {
  return JSON.stringify({
    id: record.id,
    controlId: record.controlId,
    frameworkId: record.frameworkId,
    testExecutionId: record.testExecutionId,
    timestamp: record.timestamp,
    result: record.result,
    score: record.score,
  });
}

/**
 * Sign an evidence record with HMAC-SHA256 (SEC-13).
 * @param record - Evidence record without hmacSignature
 * @returns Signed evidence record
 */
export function signEvidence(record: Omit<EvidenceRecord, 'hmacSignature'>): EvidenceRecord {
  const payload = buildHmacPayload(record);
  const hmacSignature = createHmac('sha256', getHmacKey()).update(payload).digest('hex');
  return { ...record, hmacSignature };
}

/**
 * Verify an evidence record's HMAC signature (SEC-13).
 * Uses constant-time comparison to prevent timing attacks.
 */
export function verifyEvidence(record: EvidenceRecord): boolean {
  const payload = buildHmacPayload(record);
  const expectedBuf = createHmac('sha256', getHmacKey()).update(payload).digest();
  let actualBuf: Buffer;
  try {
    actualBuf = Buffer.from(record.hmacSignature, 'hex');
  } catch {
    return false;
  }
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}

/** Input shape for test execution data fed into report generation */
export interface TestExecutionInput {
  readonly id: string;
  readonly testCaseId: string;
  readonly resilienceScore: number;
  readonly categoriesPassed: string[];
  readonly categoriesFailed: string[];
  readonly response?: string;
  readonly timestamp: string;
}

/**
 * Generate a compliance report with HMAC-signed evidence from test executions (H9.2).
 *
 * Workflow:
 * 1. Map test executions to framework controls via testMappings
 * 2. Build signed evidence records for each mapping
 * 3. Calculate per-control coverage from pass/fail results
 * 4. Identify gap controls (no passing tests)
 * 5. Return full report with evidence chain
 */
export function generateReportWithEvidence(
  executions: TestExecutionInput[],
  testMappings: TestMapping[],
  framework: ComplianceFramework,
): ComplianceReportWithEvidence {
  const now = new Date().toISOString();
  const evidenceRecords: EvidenceRecord[] = [];

  // Build lookup: testCaseId -> executions
  const execByTestCase = new Map<string, TestExecutionInput[]>();
  for (const exec of executions) {
    const list = execByTestCase.get(exec.testCaseId) || [];
    list.push(exec);
    execByTestCase.set(exec.testCaseId, list);
  }

  // Track per-control pass/fail for coverage calculation
  // controlId -> { passed: number, total: number, moduleNames: Set, fixtureCategories: Set }
  const controlStats = new Map<string, {
    passed: number;
    total: number;
    moduleNames: Set<string>;
    fixtureCategories: Set<string>;
  }>();

  // Initialize stats for all framework controls
  for (const control of framework.controls) {
    controlStats.set(control.id, {
      passed: 0,
      total: 0,
      moduleNames: new Set(),
      fixtureCategories: new Set(),
    });
  }

  // Process each test mapping
  for (const mapping of testMappings) {
    if (mapping.frameworkId !== framework.id) continue;

    // Find matching control in framework
    const control = framework.controls.find((c) => c.id === mapping.controlId);
    if (!control) continue;

    const stats = controlStats.get(mapping.controlId)!;
    stats.moduleNames.add(mapping.scannerModule);
    if (mapping.fixtureCategory) {
      stats.fixtureCategories.add(mapping.fixtureCategory);
    }

    // Find executions that match this mapping's evidenceRef (testCaseId)
    const matchingExecs = execByTestCase.get(mapping.evidenceRef) || [];

    for (const exec of matchingExecs) {
      stats.total++;
      const passed = exec.resilienceScore >= 70; // 70% threshold for pass
      if (passed) stats.passed++;

      const result: 'pass' | 'fail' | 'partial' =
        passed ? 'pass' : exec.resilienceScore >= 40 ? 'partial' : 'fail';

      // Sanitize response content before including in evidence
      const sanitizedDetails = exec.response
        ? sanitizePayloadForReport(exec.response)
        : '';

      const unsigned: Omit<EvidenceRecord, 'hmacSignature'> = {
        id: randomUUID(),
        controlId: mapping.controlId,
        frameworkId: framework.id,
        testExecutionId: exec.id,
        timestamp: exec.timestamp,
        result,
        score: exec.resilienceScore,
        details: sanitizedDetails,
      };

      evidenceRecords.push(signEvidence(unsigned));
    }
  }

  // Build framework report with coverage
  const coveredMappings = [];
  const gaps = [];

  for (const control of framework.controls) {
    const stats = controlStats.get(control.id)!;
    if (stats.total === 0) {
      gaps.push(control);
    } else {
      const coveragePercent = Math.round((stats.passed / stats.total) * 100);
      coveredMappings.push({
        controlId: control.id,
        frameworkId: framework.id,
        moduleNames: Array.from(stats.moduleNames),
        fixtureCategories: Array.from(stats.fixtureCategories),
        coveragePercent,
        evidence: evidenceRecords
          .filter((e) => e.controlId === control.id)
          .map((e) => e.id),
      });
    }
  }

  const coverage =
    framework.controls.length > 0
      ? Math.round(
          ((framework.controls.length - gaps.length) / framework.controls.length) * 100,
        )
      : 0;

  // Verify all evidence records
  const hmacVerified = evidenceRecords.every((e) => verifyEvidence(e));

  const frameworkReport: FrameworkReport = {
    framework,
    coverage,
    gaps,
    covered: coveredMappings,
  };

  return {
    generated: now,
    frameworks: [frameworkReport],
    overallScore: coverage,
    evidence: evidenceRecords,
    testMappings,
    hmacVerified,
  };
}
