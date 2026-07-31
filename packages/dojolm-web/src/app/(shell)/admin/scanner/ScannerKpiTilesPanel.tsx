// SPDX-License-Identifier: Apache-2.0
"use client";

/**
 * Scanner KPI strip.
 *
 * There is no lifetime scanner aggregate endpoint today, so in a real
 * deployment the three lifetime measures render an honest em dash. In demo
 * mode (server-resolved `isDemoMode()` after auth, plumbed via `demo`) the
 * design's synthetic headline numbers are seeded so the demo surface matches
 * the reference render. The engine count is always grounded in the scanner's
 * canonical catalogue. Every tile carries the design's dim sub-caption.
 */

import type { ReactElement } from "react";

import { KpiStrip, type KpiStripItem } from "@/design";
import { DEFAULT_ENGINES } from "@/lib/scanner/engines";

export interface ScannerKpiTilesPanelProps {
  /** Test seam for the canonical catalogue count. */
  readonly activeModulesOverride?: number;
  /**
   * Server-resolved demo mode. When true, seed the design's synthetic
   * lifetime numbers (250 / 127 / 36%); otherwise these render an honest
   * em dash because no lifetime aggregate endpoint exists yet.
   */
  readonly demo?: boolean;
}

const PLACEHOLDER = "—";

export function ScannerKpiTilesPanel({
  activeModulesOverride,
  demo = false,
}: ScannerKpiTilesPanelProps = {}): ReactElement {
  const engineCount =
    typeof activeModulesOverride === "number" &&
    Number.isFinite(activeModulesOverride)
      ? Math.max(0, Math.trunc(activeModulesOverride))
      : DEFAULT_ENGINES.length;

  const items: readonly KpiStripItem[] = [
    {
      label: "Total scans",
      value: demo ? "250" : PLACEHOLDER,
      sub: "lifetime",
      tone: "steel",
      testId: "s302-tile-total-scans",
      ariaLabel: demo
        ? "Total scans — 250 lifetime (demo)"
        : "Total scans — unavailable",
    },
    {
      label: "Threats detected",
      value: demo ? "127" : PLACEHOLDER,
      sub: "lifetime",
      tone: "steel",
      testId: "s302-tile-threats-detected",
      ariaLabel: demo
        ? "Threats detected — 127 lifetime (demo)"
        : "Threats detected — unavailable",
    },
    {
      label: "Pass rate",
      value: demo ? "36%" : PLACEHOLDER,
      sub: "clean verdicts",
      tone: "steel",
      testId: "s302-tile-pass-rate",
      ariaLabel: demo
        ? "Pass rate — 36% clean verdicts (demo)"
        : "Pass rate — unavailable",
    },
    {
      label: "Engines",
      value: String(engineCount),
      sub: `of ${engineCount} live`,
      tone: "steel",
      testId: "s302-tile-active-modules",
      ariaLabel: `Engines — ${engineCount} catalogued`,
    },
  ];

  return (
    <KpiStrip
      module="scanner"
      testId="s302-kpi-tiles-root"
      items={[...items]}
    />
  );
}
