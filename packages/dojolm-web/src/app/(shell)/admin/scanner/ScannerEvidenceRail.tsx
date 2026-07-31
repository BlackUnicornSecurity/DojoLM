// SPDX-License-Identifier: Apache-2.0
'use client';

/**
 * ScannerEvidenceRail — mounts the OSS Tatami Rail in the Scanner surface
 * (Epic 3: the Rail's first real *Rail* mount; handover #14/#15 §5).
 *
 * READ-ONLY. Maps the `ScanRunRecord` the operator is viewing → a Tatami proof
 * via the OSS `scannerAdapter` + the `toRailView` consumption seam, then renders
 * that run's evidence in the Rail: the proof badges in the header `badges` slot
 * (+ compact on the collapsed `spineBadges`), a summary-level Proof panel, and
 * the single synthetic read-view Trace event.
 *
 * The header badges render eagerly, but the Proof / Trace panel BODIES are
 * `next/dynamic` (ssr:false) chunks — so a collapsed Rail (and an unselected
 * tab) never even fetches them, and the initial Scanner bundle carries ~0 JS
 * for them. The loading fallback is a single honest `wb-hint` line: the chunks
 * are local + tiny, so a skeleton or spinner would dramatize a wait that isn't
 * real.
 *
 * The proof PREVIEW is derived (no fetch, no clock) from a record that already
 * exists: the scanner adapter reads `ScanRunRecord` SUMMARIES only and never the
 * WORM `EvidenceRecord` (EE / `tatami-vault`). The badge aggregate renders only
 * the axes the adapter populated and never invents one; for a scan run the adapter
 * produces all five badge axes → four visible badges.
 *
 * Epic 2 — the Proof tab additionally mounts `ScannerProofCapture`, the ONE
 * operator-triggered write path (POST the viewed run → a persisted `TatamiProof` +
 * receipt, then optionally attach to a case). It fetches on CLICK only — mounting
 * the Rail still triggers no network, so the read-only-on-mount contract holds.
 *
 * Imports the OSS `@/design/tatami` sub-path (never the bare `@/design` barrel
 * — the darwin-vitest rule) and the adapter / seam from their `@/lib/tatami/*`
 * sub-paths (NOT the `@/lib/tatami` barrel, which re-exports the fs-backed
 * stores — server-only). Fully controlled: `mode` / `activeTab` are props
 * (the Rail contract); it holds no app state and triggers no global fetch.
 */

import { useMemo, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import {
  TatamiRail,
  TatamiProofBadges,
  type TatamiRailMode,
  type TatamiRailTabId,
} from '@/design/tatami';
import { scannerAdapter } from '@/lib/tatami/adapters/scanner';
import { toRailView } from '@/lib/tatami/adapters/rail-view';
import type { ScanRunRecord } from '@/lib/scan-runs/types';

/** Honest, non-dramatic loading slot for a panel chunk. The bodies are local +
 *  tiny, so this resolves in the same paint after first load — a skeleton or
 *  spinner here would imply a network wait that isn't happening. */
function RailPanelLoading() {
  return (
    <p className="wb-hint" data-testid="scanner-tatami-panel-loading" style={{ margin: 0 }}>
      Loading…
    </p>
  );
}

// The Proof / Trace bodies are code-split: not in the initial Scanner chunk,
// fetched only when their tab is actually rendered. `ssr: false` — these are
// derived, client-only views behind an operator interaction, never SSR'd.
const ScannerProofPanel = dynamic(
  () => import('./ScannerProofPanel').then((m) => m.ScannerProofPanel),
  { ssr: false, loading: RailPanelLoading },
);
const ScannerTracePanel = dynamic(
  () => import('./ScannerTracePanel').then((m) => m.ScannerTracePanel),
  { ssr: false, loading: RailPanelLoading },
);
// Epic 2 — the operator-triggered capture affordance is its own chunk too: a
// collapsed Rail (and the Trace tab) never fetch it, so it adds ~0 JS until the
// Proof tab is actually rendered. It owns the only write path in this surface.
const ScannerProofCapture = dynamic(
  () => import('./ScannerProofCapture').then((m) => m.ScannerProofCapture),
  { ssr: false, loading: RailPanelLoading },
);

export interface ScannerEvidenceRailProps {
  /** The persisted run the operator is viewing (History tab). `null` → the
   *  Rail's honest empty state ("No proof selected"). */
  readonly run: ScanRunRecord | null;
  /** Layout state (controlled — defaults to `collapsed` at the call site). */
  readonly mode: TatamiRailMode;
  readonly onModeChange: (mode: TatamiRailMode) => void;
  /** Active panel tab (controlled; default `proof`). */
  readonly activeTab: TatamiRailTabId;
  readonly onTabChange: (tab: TatamiRailTabId) => void;
}

export function ScannerEvidenceRail({
  run,
  mode,
  onModeChange,
  activeTab,
  onTabChange,
}: ScannerEvidenceRailProps) {
  // Pure derivation — no fetch, no clock. `null` when no run is in view.
  // Memoised on the record identity so it is not recomputed on every parent
  // re-render (ScannerClient ticks an elapsed counter while a scan is in flight).
  const view = useMemo(() => (run ? toRailView(scannerAdapter, run) : null), [run]);

  const badges = view ? <TatamiProofBadges proof={view.proof} /> : undefined;
  const spineBadges = view ? <TatamiProofBadges proof={view.proof} compact /> : undefined;

  // The active panel body is a dynamic chunk. Gate on `mode` as well as `view`
  // so a collapsed Rail never even mounts the loadable → its chunk is never
  // fetched (the Rail also withholds `children` while collapsed; this makes the
  // ~0-JS-when-collapsed guarantee explicit rather than incidental). When there
  // is no run (or the disabled Chat tab is somehow active) we render nothing and
  // let the Rail show its honest empty state.
  // `view` is truthy iff `run` is — name `run` in the guard so the capture
  // affordance (which needs the run id) type-narrows without a non-null assertion.
  let panel: ReactNode = null;
  if (view && run && mode !== 'collapsed') {
    if (activeTab === 'proof') {
      panel = (
        <>
          <ScannerProofPanel proof={view.proof} />
          {/* key={run.id} — switching the viewed run REMOUNTS the affordance, so a
              prior run's "Proof captured / Attach" state can never be carried over
              and mis-attributed to a different run (and any in-flight capture for the
              old run is discarded). The capture subject is the run, not the panel. */}
          <ScannerProofCapture key={run.id} runId={run.id} />
        </>
      );
    } else if (activeTab === 'trace') {
      panel = <ScannerTracePanel events={view.trace} />;
    }
  }

  return (
    <TatamiRail
      mode={mode}
      onModeChange={onModeChange}
      activeTab={activeTab}
      onTabChange={onTabChange}
      title="Evidence"
      badges={badges}
      spineBadges={spineBadges}
      idBase="scanner-tatami-rail"
    >
      {panel}
    </TatamiRail>
  );
}
