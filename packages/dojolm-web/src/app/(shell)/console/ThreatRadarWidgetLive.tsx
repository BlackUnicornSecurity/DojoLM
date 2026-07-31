// SPDX-License-Identifier: Apache-2.0
/**
 * ThreatRadarWidgetLive — TICKET-D-208 live consumer.
 *
 * Mounts the pure `<ThreatRadarWidget>` primitive into the V2.1
 * `/console` Workbench surface. Reads `useScanner().scanResult.findings`
 * and groups them by sector via the `ENGINE_TO_SECTOR` closed map.
 *
 * Engine-mapping decision (P5 threat-taxonomy sectors):
 *   The 13 V2 scanner engines (`SCANNER_ENGINE_IDS`) are bucketed onto
 *   the six design radar pillars (Workbench v2.html:122-137) by the
 *   threat surface each engine detects:
 *     - injection  = jailbreak + encoded + unicode  (direct injection & evasion)
 *     - prompts    = kappa + role-gate + fiction     (prompt-layer manipulation)
 *     - tools      = tooluse                         (tool-call abuse)
 *     - agents     = leakprobe                       (agent / system-prompt probing)
 *     - governance = policy + pii                    (policy / compliance)
 *     - memory     = lineage + mitsuke + kagami      (attack-DNA / signature memory)
 *   Findings whose engine id is not a canonical `ScannerEngineId` are
 *   ignored (categorization is closed-enum on both sides).
 *
 * Sector-filter dispatches `useScanner().toggleFilter` for every engine
 * id that maps to the clicked legend row — multi-toggle within a sector.
 *
 * Per ADR-0096 §3 amendment 2026-05-07 (D-206 closeout) the widget
 * mounts on `/console` via `WorkbenchWidgetId = 'threat-radar'` (slot 2
 * of 5).
 */

'use client';

import { useCallback, useMemo, type ReactElement } from 'react';
import { useScanner } from '@/lib/ScannerContext';
import {
  SCANNER_ENGINE_IDS,
  isScannerEngineId,
  type ScannerEngineId,
} from '@/lib/scanner/engines';
import {
  ThreatRadarWidget,
  THREAT_RADAR_SECTORS,
  type ThreatRadarSector,
  type ThreatRadarSectorCounts,
} from '@/design/workbench/ThreatRadarWidget';

/**
 * Closed `Record<ScannerEngineId, ThreatRadarSector>` covering all 13
 * canonical engines explicitly (R-T1). Each engine is bucketed onto the
 * design radar pillar that names the threat surface it detects.
 */
export const ENGINE_TO_SECTOR: Readonly<Record<ScannerEngineId, ThreatRadarSector>> =
  Object.freeze({
    kappa: 'prompts',
    'role-gate': 'prompts',
    fiction: 'prompts',
    encoded: 'injection',
    unicode: 'injection',
    jailbreak: 'injection',
    tooluse: 'tools',
    leakprobe: 'agents',
    pii: 'governance',
    policy: 'governance',
    lineage: 'memory',
    mitsuke: 'memory',
    kagami: 'memory',
  });

const ZERO_COUNTS: ThreatRadarSectorCounts = Object.freeze(
  Object.fromEntries(
    THREAT_RADAR_SECTORS.map((s) => [s, 0]),
  ) as Record<ThreatRadarSector, number>,
);

/**
 * Pure aggregator — counts findings per sector via the closed
 * `ENGINE_TO_SECTOR` map. Findings with a non-canonical engine id are
 * dropped (safer than bucketing them to a default).
 *
 * Built via `Object.fromEntries` rather than reduce-with-mutation per
 * project R-T1 immutability rule: never mutate, always create.
 */
export function aggregateBySector(
  findings: ReadonlyArray<{ readonly engine?: string }>,
): ThreatRadarSectorCounts {
  const next: Record<ThreatRadarSector, number> = Object.fromEntries(
    THREAT_RADAR_SECTORS.map((s) => [s, 0]),
  ) as Record<ThreatRadarSector, number>;
  for (const f of findings) {
    const id = f.engine;
    if (typeof id !== 'string' || !isScannerEngineId(id)) continue;
    const sector = ENGINE_TO_SECTOR[id];
    next[sector] = next[sector] + 1;
  }
  return Object.freeze(next);
}

/**
 * Pure inverse map — returns the engine ids that belong to a given
 * sector. Built once at module load; consumers receive frozen arrays.
 */
export const SECTOR_TO_ENGINES: Readonly<Record<ThreatRadarSector, ReadonlyArray<ScannerEngineId>>> =
  Object.freeze(
    Object.fromEntries(
      THREAT_RADAR_SECTORS.map((sector) => [
        sector,
        Object.freeze(
          SCANNER_ENGINE_IDS.filter((id) => ENGINE_TO_SECTOR[id] === sector),
        ),
      ]),
    ) as Record<ThreatRadarSector, ReadonlyArray<ScannerEngineId>>,
  );

export interface ThreatRadarWidgetLiveProps {
  readonly testId?: string;
}

export function ThreatRadarWidgetLive({
  testId,
}: ThreatRadarWidgetLiveProps = {}): ReactElement {
  const { scanResult, toggleFilter } = useScanner();

  const counts = useMemo<ThreatRadarSectorCounts>(() => {
    if (!scanResult || !Array.isArray(scanResult.findings)) {
      return ZERO_COUNTS;
    }
    return aggregateBySector(scanResult.findings);
  }, [scanResult]);

  const handleSectorClick = useCallback(
    (sector: ThreatRadarSector) => {
      const engineIds = SECTOR_TO_ENGINES[sector];
      for (const id of engineIds) toggleFilter(id);
    },
    [toggleFilter],
  );

  return (
    <ThreatRadarWidget
      counts={counts}
      onSectorClick={handleSectorClick}
      testId={testId}
    />
  );
}
