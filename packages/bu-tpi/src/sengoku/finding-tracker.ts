/**
 * H17.4: Sengoku Finding Tracker & Regression Detection
 * Hash-based dedup, run comparison, regression detection.
 */

import { createHash } from 'node:crypto';
import type { SengokuFinding, CampaignRun, FindingDiff } from './types.js';

// ---------------------------------------------------------------------------
// Hash-based Deduplication
// ---------------------------------------------------------------------------

/** Generate SHA-256 hash for deduplication. */
export function hashFinding(
  payload: string,
  response: string,
  category: string,
): string {
  const normalized = `${category}::${payload.trim().toLowerCase()}::${response.trim().toLowerCase()}`;
  return createHash('sha256').update(normalized).digest('hex');
}

/** Remove duplicate findings by hash. */
export function deduplicateFindings(
  findings: SengokuFinding[],
): SengokuFinding[] {
  const seen = new Set<string>();
  const unique: SengokuFinding[] = [];
  for (const f of findings) {
    if (!seen.has(f.hash)) {
      seen.add(f.hash);
      unique.push(f);
    }
  }
  return unique;
}

// ---------------------------------------------------------------------------
// Run Comparison
// ---------------------------------------------------------------------------

/** Compare current run vs previous run, returning finding diff. */
export function compareRuns(
  current: CampaignRun,
  previous: CampaignRun,
): FindingDiff {
  const prevHashes = new Set(previous.findings.map((f) => f.hash));
  const currHashes = new Set(current.findings.map((f) => f.hash));

  const newFindings = current.findings.filter((f) => !prevHashes.has(f.hash));
  const resolvedFindings = previous.findings.filter(
    (f) => !currHashes.has(f.hash),
  );
  const persistentFindings = current.findings.filter((f) =>
    prevHashes.has(f.hash),
  );

  return {
    newFindings,
    resolvedFindings,
    regressedFindings: [],
    persistentFindings,
  };
}

// ---------------------------------------------------------------------------
// Regression Detection
// ---------------------------------------------------------------------------

/** Detect regressions: findings that were resolved but reappeared. */
export function detectRegressions(
  current: CampaignRun,
  allPreviousRuns: CampaignRun[],
): FindingDiff {
  if (allPreviousRuns.length === 0) {
    return {
      newFindings: current.findings,
      resolvedFindings: [],
      regressedFindings: [],
      persistentFindings: [],
    };
  }

  const sorted = [...allPreviousRuns].sort(
    (a, b) => b.runNumber - a.runNumber,
  );
  const lastRun = sorted[0];
  const diff = compareRuns(current, lastRun);

  // Build set of all hashes ever resolved across history
  const everResolvedHashes = new Set<string>();
  for (let i = 0; i < sorted.length - 1; i++) {
    const olderRun = sorted[i + 1];
    const newerRun = sorted[i];
    const olderHashes = new Set(olderRun.findings.map((f) => f.hash));
    const newerHashes = new Set(newerRun.findings.map((f) => f.hash));
    for (const h of olderHashes) {
      if (!newerHashes.has(h)) everResolvedHashes.add(h);
    }
  }

  // New findings (not in last run) that match previously-resolved hashes = regressions
  const regressedFindings = diff.newFindings.filter((f) =>
    everResolvedHashes.has(f.hash),
  );

  return {
    ...diff,
    regressedFindings,
  };
}
