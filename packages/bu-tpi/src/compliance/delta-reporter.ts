/**
 * S65: Compliance Engine Delta Reporter
 * Detects coverage changes and generates delta reports.
 */

import { randomUUID } from 'crypto';
import type {
  ComplianceFramework,
  CoverageSnapshot,
  CoverageDelta,
  CoverageChange,
  ControlMapping,
} from './types.js';
import { getAllMappings, calculateCoverage } from './mapper.js';

/**
 * Create a coverage snapshot for a framework.
 */
export function createSnapshot(
  framework: ComplianceFramework,
  moduleNames: string[],
  fixtureCategories: Record<string, number>
): CoverageSnapshot {
  const mappings = getAllMappings(framework, moduleNames, fixtureCategories);
  const coverage = calculateCoverage(framework, mappings);

  return {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    frameworkId: framework.id,
    mappings,
    overallCoverage: coverage,
  };
}

/**
 * Compare two snapshots and identify changes.
 */
export function compareSnapshots(
  before: CoverageSnapshot,
  after: CoverageSnapshot
): CoverageDelta {
  const changes: CoverageChange[] = [];

  const beforeMap = new Map<string, ControlMapping>();
  for (const m of before.mappings) {
    beforeMap.set(m.controlId, m);
  }

  const afterMap = new Map<string, ControlMapping>();
  for (const m of after.mappings) {
    afterMap.set(m.controlId, m);
  }

  // Check for changes in existing controls
  for (const [controlId, afterMapping] of afterMap) {
    const beforeMapping = beforeMap.get(controlId);
    const prevCoverage = beforeMapping?.coveragePercent ?? 0;
    const currCoverage = afterMapping.coveragePercent;

    if (prevCoverage !== currCoverage) {
      let reason: CoverageChange['reason'] = 'module-added';
      if (currCoverage < prevCoverage) {
        reason = beforeMapping && afterMapping.moduleNames.length < beforeMapping.moduleNames.length
          ? 'module-removed'
          : 'fixture-removed';
      } else {
        reason = afterMapping.moduleNames.length > (beforeMapping?.moduleNames.length ?? 0)
          ? 'module-added'
          : 'fixture-added';
      }

      changes.push({
        controlId,
        frameworkId: after.frameworkId,
        previousCoverage: prevCoverage,
        currentCoverage: currCoverage,
        reason,
      });
    }
  }

  // Controls removed
  for (const [controlId, beforeMapping] of beforeMap) {
    if (!afterMap.has(controlId)) {
      changes.push({
        controlId,
        frameworkId: before.frameworkId,
        previousCoverage: beforeMapping.coveragePercent,
        currentCoverage: 0,
        reason: 'module-removed',
      });
    }
  }

  return { before, after, changes };
}

/**
 * Generate a markdown delta report.
 */
export function generateDeltaReport(delta: CoverageDelta): string {
  const lines: string[] = [
    '# Compliance Coverage Delta Report',
    '',
    `**Framework**: ${delta.before.frameworkId}`,
    `**Previous Coverage**: ${delta.before.overallCoverage}%`,
    `**Current Coverage**: ${delta.after.overallCoverage}%`,
    `**Change**: ${delta.after.overallCoverage - delta.before.overallCoverage > 0 ? '+' : ''}${delta.after.overallCoverage - delta.before.overallCoverage}%`,
    `**Generated**: ${new Date().toISOString()}`,
    '',
  ];

  if (delta.changes.length === 0) {
    lines.push('No changes detected.');
  } else {
    lines.push('## Changes', '');
    lines.push('| Control | Previous | Current | Change | Reason |');
    lines.push('|---------|----------|---------|--------|--------|');

    for (const change of delta.changes) {
      const diff = change.currentCoverage - change.previousCoverage;
      const diffStr = diff > 0 ? `+${diff}%` : `${diff}%`;
      lines.push(
        `| ${change.controlId} | ${change.previousCoverage}% | ${change.currentCoverage}% | ${diffStr} | ${change.reason} |`
      );
    }
  }

  return lines.join('\n');
}

/**
 * Detect coverage changes between two module lists.
 */
export function detectCoverageChanges(
  previousModules: string[],
  currentModules: string[]
): { added: string[]; removed: string[] } {
  const prevSet = new Set(previousModules);
  const currSet = new Set(currentModules);

  const added = currentModules.filter((m) => !prevSet.has(m));
  const removed = previousModules.filter((m) => !currSet.has(m));

  return { added, removed };
}
