// SPDX-License-Identifier: Apache-2.0
/**
 * FixtureRouletteWidgetLive — TICKET-D-210 live consumer.
 *
 * Mounts `<FixtureRouletteWidget>` on `/console` (V2.1 Workbench, slot 4
 * of 5) and wires the three existing API routes:
 *   - `GET /api/fixtures` — manifest (categories + files).
 *   - `GET /api/read-fixture?path=<cat>/<file>` — text content for text
 *     fixtures.
 *   - `GET /api/scan-fixture?path=<cat>/<file>` — verdict (BLOCK/ALLOW
 *     + counts) for the picked fixture.
 *
 * Pure-fn pickFixture(manifest, rng) — exported + RNG-injectable so unit
 * tests can pin an explicit index. Mirrors the `pickDailyAttack` pattern
 * from D-209 / `getDailyAttackIndex`.
 *
 * Aborts in-flight fetches on unmount via `AbortController`. All errors
 * are swallowed back into the empty/idle state — the V1 widget had the
 * same silent-failure contract.
 */

'use client';

import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import {
  FixtureRouletteWidget,
  getPreviewKind,
  type FixturePick,
  type FixtureVerdict,
  type VerdictSeverity,
} from '@/design/workbench/FixtureRouletteWidget';

export interface FixturesManifest {
  readonly categories: Readonly<Record<string, { readonly files: readonly string[] }>>;
}

export type Rng = () => number;

export interface PickedSlot {
  readonly category: string;
  readonly file: string;
}

export function pickFixture(manifest: FixturesManifest, rng: Rng): PickedSlot | null {
  const categories = Object.keys(manifest.categories ?? {});
  if (categories.length === 0) return null;
  const catName = categories[Math.floor(rng() * categories.length)];
  const cat = manifest.categories[catName];
  const files = cat?.files ?? [];
  if (files.length === 0) return null;
  const file = files[Math.floor(rng() * files.length)];
  return Object.freeze({ category: catName, file });
}

interface ScanResponse {
  readonly skipped?: boolean;
  readonly result?: {
    readonly findings?: readonly unknown[];
    readonly counts?: { readonly critical?: number; readonly warning?: number };
    readonly verdict?: 'BLOCK' | 'ALLOW';
  } | null;
}

function severityFromCounts(critical: number, warning: number, findings: number): VerdictSeverity {
  if (critical > 0) return 'CRITICAL';
  if (warning > 0) return 'WARNING';
  if (findings > 0) return 'INFO';
  return 'NONE';
}

function toVerdict(json: ScanResponse): FixtureVerdict {
  if (json.skipped || !json.result) {
    return Object.freeze({ decision: 'ALLOW', findings: 0, severity: 'NONE' });
  }
  const findings = json.result.findings?.length ?? 0;
  const critical = json.result.counts?.critical ?? 0;
  const warning = json.result.counts?.warning ?? 0;
  const decision = json.result.verdict ?? (findings > 0 ? 'BLOCK' : 'ALLOW');
  return Object.freeze({ decision, findings, severity: severityFromCounts(critical, warning, findings) });
}

export interface FixtureRouletteWidgetLiveProps {
  readonly testId?: string;
  readonly rng?: Rng;
}

export function FixtureRouletteWidgetLive({ testId, rng = Math.random }: FixtureRouletteWidgetLiveProps = {}): ReactElement {
  const [picked, setPicked] = useState<FixturePick | null>(null);
  const [verdict, setVerdict] = useState<FixtureVerdict | null>(null);
  const [rolling, setRolling] = useState(false);
  const [scanning, setScanning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const handleRoll = useCallback(async () => {
    abortRef.current?.abort();
    const ctl = new AbortController();
    abortRef.current = ctl;
    setRolling(true);
    setVerdict(null);
    try {
      const res = await fetch('/api/fixtures', { signal: ctl.signal });
      if (!res.ok) return;
      const manifest = (await res.json()) as FixturesManifest;
      const slot = pickFixture(manifest, rng);
      if (!slot) return;
      const path = `${slot.category}/${slot.file}`;
      const rawUrl = `/api/read-fixture/media?path=${encodeURIComponent(path)}`;
      const kind = getPreviewKind(slot.file);
      let textContent: string | null = null;
      if (kind === 'text') {
        try {
          const r = await fetch(`/api/read-fixture?path=${encodeURIComponent(path)}`, { signal: ctl.signal });
          if (r.ok) {
            const data = (await r.json()) as { content?: string };
            textContent = data.content ?? null;
          }
        } catch {
          // Silent failure — preserves V1 contract.
        }
      }
      if (ctl.signal.aborted) return;
      setPicked(Object.freeze({ category: slot.category, file: slot.file, textContent, rawUrl }));
    } catch {
      // Silent failure.
    } finally {
      if (!ctl.signal.aborted) setRolling(false);
    }
  }, [rng]);

  const handleScan = useCallback(async () => {
    if (!picked) return;
    abortRef.current?.abort();
    const ctl = new AbortController();
    abortRef.current = ctl;
    setScanning(true);
    try {
      const path = `${picked.category}/${picked.file}`;
      const res = await fetch(`/api/scan-fixture?path=${encodeURIComponent(path)}`, { signal: ctl.signal });
      if (!res.ok) return;
      const json = (await res.json()) as ScanResponse;
      if (ctl.signal.aborted) return;
      setVerdict(toVerdict(json));
    } catch {
      // Silent failure.
    } finally {
      if (!ctl.signal.aborted) setScanning(false);
    }
  }, [picked]);

  return (
    <FixtureRouletteWidget
      picked={picked}
      verdict={verdict}
      rolling={rolling}
      scanning={scanning}
      onRoll={handleRoll}
      onScan={handleScan}
      testId={testId}
    />
  );
}
