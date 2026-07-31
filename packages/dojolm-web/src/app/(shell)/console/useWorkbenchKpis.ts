// SPDX-License-Identifier: Apache-2.0
/**
 * useWorkbenchKpis — honest live values for the `/console` KPI strip
 * (audit D2). The four "signed security measures" are wired to real
 * signals, NEVER invented:
 *   - Guard blocks · 48h / Scan runs · 48h → `/api/stats` audit aggregates
 *     (the same endpoint the Command Center KPIs use).
 *   - Threats · session → the live count of `threat_detected` events in
 *     `ActivityContext` (same source as the KillCount widget).
 *   - Coverage → the pattern-library coverage % derived from `/api/stats`.
 *
 * Any signal that has not resolved renders the honest "—" dash rather
 * than a reconstructed number (the corpus zero-state).
 *
 * Extracted as a hook so `<ConsoleClient>` stays free of data plumbing and
 * the workbench regression suite can mock the values without an
 * ActivityProvider / fetch stub.
 */

'use client';

import {
  useScannerStats,
  aggregateDisplay,
  blockedCardSubtitle,
  runsCardDelta,
  type RunsCardDelta,
} from '@/components/command/command-dashboard-data';
import { deriveReadiness } from '@/lib/readiness/derive';
import { useActivityState } from '@/lib/contexts/ActivityContext';

export interface WorkbenchKpiValues {
  readonly guardBlocks: string;
  /** Design wave-a Workbench KPI sub ("all enforced" when blocks > 0). */
  readonly guardBlocksSub: string;
  readonly scanRuns: string;
  /** Honest "▲ N vs prior" delta — same helper as the Command Center. */
  readonly scanRunsDelta: RunsCardDelta;
  readonly threats: string;
  readonly threatsSub: string;
  readonly coverage: string;
  readonly coverageSub: string;
}

const DASH = '—';

export function useWorkbenchKpis(): WorkbenchKpiValues {
  const stats = useScannerStats();
  const { events } = useActivityState();

  const threatCount = events.reduce(
    (n, e) => n + (e.type === 'threat_detected' ? 1 : 0),
    0,
  );

  let coverage = DASH;
  let coverageSub = 'coverage resolving…';
  if (stats.status === 'ok') {
    const bar = deriveReadiness(
      {
        patternCount: stats.data.patternCount,
        groupCount: stats.data.groupCount,
        sourceCount: stats.data.sourceCount,
        budgetExceededLast48h: stats.data.budgetExceededLast48h,
        budgetConfigured: stats.data.budgetConfigured,
      },
      null,
    ).bars.find((b) => b.k === 'Coverage');
    if (bar) {
      coverage = `${bar.v}%`;
      coverageSub = `${stats.data.groupCount} groups`;
    }
  } else if (stats.status === 'error') {
    coverageSub = 'coverage unavailable';
  }

  return {
    guardBlocks: aggregateDisplay(stats, (s) => s.blockedLast48h),
    guardBlocksSub: blockedCardSubtitle(stats),
    scanRuns: aggregateDisplay(stats, (s) => s.runsLast48h),
    scanRunsDelta: runsCardDelta(stats),
    threats: String(threatCount),
    threatsSub: threatCount === 0 ? 'quiet session' : 'threats this session',
    coverage,
    coverageSub,
  };
}
