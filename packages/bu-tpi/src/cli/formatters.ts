/**
 * TPI Scanner CLI — Output Formatters
 *
 * Pure-function formatters for scan results in multiple output formats:
 * text, JSON, SARIF 2.1.0, JUnit XML, and CSV.
 *
 * @module cli/formatters
 */

import type { ScanResult, Finding } from '../types.js';

// ---------------------------------------------------------------------------
// INDEX
// ---------------------------------------------------------------------------
// 1. Text Formatter (formatText)
// 2. JSON Formatter (formatJson)
// 3. SARIF 2.1.0 Formatter (formatSarif)
// 4. JUnit XML Formatter (formatJunit)
// 5. CSV Formatter (formatCsv)
// 6. Helpers
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScanEntry {
  readonly result: ScanResult;
  readonly filename?: string;
}

// ---------------------------------------------------------------------------
// 1. TEXT FORMATTER
// ---------------------------------------------------------------------------

/**
 * Format a scan result as a human-readable table.
 *
 * @param result - The scan result to format
 * @param filename - Optional filename for context
 * @returns Human-readable string
 */
export function formatText(result: ScanResult, filename?: string): string {
  const lines: readonly string[] = [
    ...(filename ? [`File: ${filename}`] : []),
    `Verdict: ${result.verdict}`,
    `Findings: ${result.findings.length} (${result.counts.critical} critical, ${result.counts.warning} warning, ${result.counts.info} info)`,
    `Text length: ${result.textLength} (normalized: ${result.normalizedLength})`,
    `Elapsed: ${result.elapsed.toFixed(2)}ms`,
    ...(result.findings.length > 0
      ? [
          '',
          padRight('SEVERITY', 10) + padRight('CATEGORY', 30) + padRight('ENGINE', 20) + 'DESCRIPTION',
          '-'.repeat(90),
          ...result.findings.map(
            (f: Finding) =>
              padRight(f.severity, 10) +
              padRight(truncate(f.category, 28), 30) +
              padRight(truncate(f.engine, 18), 20) +
              truncate(f.description, 60),
          ),
        ]
      : []),
  ];

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// 2. JSON FORMATTER
// ---------------------------------------------------------------------------

/**
 * Format a scan result as pretty-printed JSON.
 *
 * @param result - The scan result to format
 * @returns JSON string with 2-space indent
 */
export function formatJson(result: ScanResult): string {
  return JSON.stringify(result, null, 2);
}

// ---------------------------------------------------------------------------
// 3. SARIF 2.1.0 FORMATTER
// ---------------------------------------------------------------------------

/**
 * Format scan results as SARIF 2.1.0 JSON.
 *
 * @param results - Array of scan entries with results and optional filenames
 * @returns SARIF 2.1.0 JSON string
 */
export function formatSarif(results: readonly ScanEntry[]): string {
  // Collect unique rules from all findings
  const ruleMap = new Map<string, { readonly id: string; readonly name: string }>();
  for (const entry of results) {
    for (const finding of entry.result.findings) {
      if (!ruleMap.has(finding.category)) {
        ruleMap.set(finding.category, {
          id: slugify(finding.category),
          name: finding.category,
        });
      }
    }
  }

  const rules = [...ruleMap.values()].map((rule) => ({
    id: rule.id,
    name: rule.name,
    shortDescription: { text: rule.name },
  }));

  // Map all findings to SARIF results
  const sarifResults: readonly object[] = results.flatMap((entry) =>
    entry.result.findings.map((finding: Finding) => ({
      ruleId: slugify(finding.category),
      level: severityToSarifLevel(finding.severity),
      message: { text: finding.description },
      locations: entry.filename
        ? [
            {
              logicalLocations: [
                {
                  name: entry.filename,
                  kind: 'file',
                },
              ],
            },
          ]
        : [],
      properties: {
        engine: finding.engine,
        match: finding.match,
        ...(finding.pattern_name ? { patternName: finding.pattern_name } : {}),
      },
    })),
  );

  const sarif = {
    $schema:
      'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/main/sarif-2.1/schema/sarif-schema-2.1.0.json',
    version: '2.1.0' as const,
    runs: [
      {
        tool: {
          driver: {
            name: 'TPI Scanner',
            version: '1.0.0',
            rules,
          },
        },
        results: sarifResults,
      },
    ],
  };

  return JSON.stringify(sarif, null, 2);
}

// ---------------------------------------------------------------------------
// 4. JUNIT XML FORMATTER
// ---------------------------------------------------------------------------

/**
 * Format scan results as JUnit XML.
 *
 * @param results - Array of scan entries with results and optional filenames
 * @returns JUnit XML string
 */
export function formatJunit(results: readonly ScanEntry[]): string {
  const allFindings: readonly { readonly finding: Finding; readonly filename?: string }[] =
    results.flatMap((entry) =>
      entry.result.findings.map((finding) => ({
        finding,
        filename: entry.filename,
      })),
    );

  const totalTests = allFindings.length || 1; // At least 1 test case for empty results
  const failures = allFindings.filter((e) => e.finding.severity === 'CRITICAL').length;
  const errors = allFindings.filter((e) => e.finding.severity === 'WARNING').length;

  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<testsuites tests="${totalTests}" failures="${failures}" errors="${errors}">`,
    `  <testsuite name="TPI Scanner" tests="${totalTests}" failures="${failures}" errors="${errors}">`,
  ];

  if (allFindings.length === 0) {
    lines.push('    <testcase name="no-findings" classname="tpi-scanner" />');
  } else {
    for (const entry of allFindings) {
      const { finding, filename } = entry;
      const classname = filename ? escapeXml(filename) : 'tpi-scanner';
      const name = escapeXml(`${finding.severity}: ${finding.category}`);

      lines.push(`    <testcase name="${name}" classname="${classname}">`);

      if (finding.severity === 'CRITICAL') {
        lines.push(
          `      <failure message="${escapeXml(finding.description)}" type="${escapeXml(finding.category)}">`,
        );
        lines.push(`Engine: ${escapeXml(finding.engine)}`);
        lines.push(`Match: ${escapeXml(truncate(finding.match, 200))}`);
        lines.push('      </failure>');
      } else if (finding.severity === 'WARNING') {
        lines.push(
          `      <error message="${escapeXml(finding.description)}" type="${escapeXml(finding.category)}">`,
        );
        lines.push(`Engine: ${escapeXml(finding.engine)}`);
        lines.push(`Match: ${escapeXml(truncate(finding.match, 200))}`);
        lines.push('      </error>');
      } else {
        lines.push(
          `      <system-out>${escapeXml(finding.description)} (engine: ${escapeXml(finding.engine)})</system-out>`,
        );
      }

      lines.push('    </testcase>');
    }
  }

  lines.push('  </testsuite>');
  lines.push('</testsuites>');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// 5. CSV FORMATTER
// ---------------------------------------------------------------------------

/**
 * Format a scan result as CSV.
 *
 * @param result - The scan result to format
 * @param filename - Optional filename for the file column
 * @returns CSV string with headers
 */
export function formatCsv(result: ScanResult, filename?: string): string {
  const header = 'file,category,severity,description,match,engine';
  const rows = result.findings.map(
    (f: Finding) =>
      [
        csvEscape(filename ?? ''),
        csvEscape(f.category),
        csvEscape(f.severity),
        csvEscape(f.description),
        csvEscape(f.match),
        csvEscape(f.engine),
      ].join(','),
  );

  return [header, ...rows].join('\n');
}

// ---------------------------------------------------------------------------
// 6. HELPERS
// ---------------------------------------------------------------------------

function severityToSarifLevel(severity: string): 'error' | 'warning' | 'note' {
  switch (severity) {
    case 'CRITICAL':
      return 'error';
    case 'WARNING':
      return 'warning';
    default:
      return 'note';
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function padRight(text: string, width: number): string {
  return text.length >= width ? text.slice(0, width) : text + ' '.repeat(width - text.length);
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + '...';
}
