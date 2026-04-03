/**
 * MUSUBI Phase 7.2: JUnit Reporter
 * Converts scanner findings to JUnit XML format for CI systems.
 */

import type { Finding, ScanResult } from '../types.js';

// ---------------------------------------------------------------------------
// JUnit XML Generation
// ---------------------------------------------------------------------------

/** Escape XML special characters */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Generate a JUnit XML test case from a finding */
function findingToTestCase(finding: Finding): string {
  const name = escapeXml(finding.pattern_name ?? finding.category);
  const className = escapeXml(finding.category);
  const message = escapeXml(finding.description);
  const match = escapeXml(finding.match.slice(0, 200));

  if (finding.severity === 'CRITICAL') {
    return `    <testcase name="${name}" classname="${className}">\n      <failure message="${message}" type="${finding.severity}">${match}</failure>\n    </testcase>`;
  }

  if (finding.severity === 'WARNING') {
    return `    <testcase name="${name}" classname="${className}">\n      <failure message="${message}" type="${finding.severity}">${match}</failure>\n    </testcase>`;
  }

  // INFO-level findings are passing tests with system-out
  return `    <testcase name="${name}" classname="${className}">\n      <system-out>${message}: ${match}</system-out>\n    </testcase>`;
}

/** Generate JUnit XML report from scan results */
export function generateJUnitReport(
  scanResult: ScanResult,
  suiteName: string = 'DojoLM Security Scan',
): string {
  const { findings, verdict, elapsed } = scanResult;
  const failures = findings.filter((f) => f.severity === 'CRITICAL' || f.severity === 'WARNING');

  const testCases = findings.map(findingToTestCase).join('\n');

  // If no findings, generate a single passing test case
  const content = findings.length === 0
    ? '    <testcase name="no-findings" classname="security-scan" />'
    : testCases;

  return `<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
  <testsuite name="${escapeXml(suiteName)}" tests="${Math.max(1, findings.length)}" failures="${failures.length}" time="${(elapsed / 1000).toFixed(3)}">
${content}
  </testsuite>
</testsuites>`;
}
