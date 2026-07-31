// SPDX-License-Identifier: Apache-2.0
/**
 * CoverageTab — T6.3 / G-055.
 *
 * Jutsu sub-tab consuming `GET /api/llm/coverage`. Renders an OWASP
 * coverage map and a TPI coverage map side-by-side, plus a summary
 * KV strip (per-framework total / tested / passed / percentage).
 *
 * Lazy-load: defers the fetch until the tab is activated for the
 * first time (`active` prop), mirroring CompareTab's pattern. Once
 * loaded, results are cached for the session — a manual refresh
 * button forces a re-fetch.
 *
 * R-T1 discriminant-redaction:
 *   - LOAD_ERROR_COPY closed map per ErrorCode
 *   - SUMMARY_LABEL closed map per framework id
 *   - aria-label on summary chips uses the closed copy
 *
 * Sanitization:
 *   - Drops malformed coverage entries (non-numeric tested / passed)
 *   - Clamps percentage to 0..100
 *   - Caps category labels at LABEL_CAP (re-cap inside CoverageMap too)
 *
 * No CSRF — endpoint is GET-only, gated server-side by withAuth admin.
 */

'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
} from 'react';
import { Panel, KV, EmptyState, cap } from '@/design';
import { CoverageMap, type CoverageMapRow } from '@/design';

type LoadErrorCode = 'forbidden' | 'rate-limited' | 'network' | 'server';

const LOAD_ERROR_COPY: Record<LoadErrorCode, string> = {
  forbidden: 'Coverage refused. Confirm admin access.',
  'rate-limited': 'Too many requests. Wait a moment and retry.',
  network: 'Network error. Check your connection.',
  server: 'Coverage service unavailable. Retry shortly.',
};

type FrameworkId = 'owasp' | 'tpi';
const SUMMARY_LABEL: Record<FrameworkId, string> = {
  owasp: 'OWASP LLM Top-10',
  tpi: 'TPI Bushido stories',
};

interface FrameworkSummary {
  readonly total: number;
  readonly tested: number;
  readonly passed: number;
  readonly percentage: number;
}

interface CoverageResponseShape {
  readonly owaspRows: readonly CoverageMapRow[];
  readonly tpiRows: readonly CoverageMapRow[];
  readonly owaspSummary: FrameworkSummary;
  readonly tpiSummary: FrameworkSummary;
}

const LABEL_CAP = 80;
const MAX_ROWS_PER_FRAMEWORK = 30;

function safeNumber(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function clampPercentage(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return n;
}

function sanitizeCoverageEntries(
  entries: unknown,
): readonly CoverageMapRow[] {
  // Reject arrays explicitly — `typeof [] === 'object'` and
  // `Object.entries([])` would yield numeric-string indices that would
  // get rendered as category labels (defense-in-depth against a future
  // server-shape regression).
  if (!entries || typeof entries !== 'object' || Array.isArray(entries)) {
    return [];
  }
  const out: CoverageMapRow[] = [];
  for (const [key, value] of Object.entries(entries as Record<string, unknown>)) {
    if (!value || typeof value !== 'object') continue;
    const v = value as Record<string, unknown>;
    if (typeof v.tested !== 'number' || !Number.isFinite(v.tested)) continue;
    if (typeof v.passed !== 'number' || !Number.isFinite(v.passed)) continue;
    out.push({
      // `id` is the raw API key (unique per Object.entries) so React's
      // list-key contract holds even when two long category names share
      // the first LABEL_CAP characters. `label` carries the visual cap.
      id: key,
      label: cap(key, LABEL_CAP),
      tested: Math.max(0, v.tested),
      passed: Math.max(0, v.passed),
      // Round on read so a future server change to non-integer percentage
      // never reaches the UI as a floating-point string.
      percentage: Math.round(clampPercentage(safeNumber(v.percentage))),
    });
    if (out.length >= MAX_ROWS_PER_FRAMEWORK) break;
  }
  return out;
}

function sanitizeFrameworkSummary(raw: unknown): FrameworkSummary {
  if (!raw || typeof raw !== 'object') {
    return { total: 0, tested: 0, passed: 0, percentage: 0 };
  }
  const r = raw as Record<string, unknown>;
  return {
    total: Math.max(0, safeNumber(r.total)),
    tested: Math.max(0, safeNumber(r.tested)),
    passed: Math.max(0, safeNumber(r.passed)),
    // Math.round to keep R-T1 discipline — never echo a raw float into
    // the KV summary string.
    percentage: Math.round(clampPercentage(safeNumber(r.percentage))),
  };
}

function sanitizeResponse(raw: unknown): CoverageResponseShape {
  if (!raw || typeof raw !== 'object') {
    return {
      owaspRows: [],
      tpiRows: [],
      owaspSummary: { total: 0, tested: 0, passed: 0, percentage: 0 },
      tpiSummary: { total: 0, tested: 0, passed: 0, percentage: 0 },
    };
  }
  const r = raw as Record<string, unknown>;
  const coverage = (r.coverage ?? {}) as Record<string, unknown>;
  const summary = (r.summary ?? {}) as Record<string, unknown>;
  return {
    owaspRows: sanitizeCoverageEntries(coverage.owasp),
    tpiRows: sanitizeCoverageEntries(coverage.tpi),
    owaspSummary: sanitizeFrameworkSummary(summary.owasp),
    tpiSummary: sanitizeFrameworkSummary(summary.tpi),
  };
}

export interface CoverageTabProps {
  readonly active: boolean;
}

export function CoverageTab({ active }: CoverageTabProps): ReactElement {
  const [data, setData] = useState<CoverageResponseShape | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<LoadErrorCode | null>(null);
  // Concurrent-call guard: protects against rapid double-clicks on
  // Refresh/Retry that would race two in-flight fetches and let an
  // earlier (stale) response overwrite a later (fresh) one. State
  // updates aren't synchronous, so a `loading` state read in the same
  // tick as a click would still see the prior value — a ref keeps the
  // guard tight.
  const loadingRef = useRef(false);

  const load = useCallback(async (): Promise<void> => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/llm/coverage', {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) setError('forbidden');
        else if (res.status === 429) setError('rate-limited');
        else setError('server');
        setData(null);
        return;
      }
      const raw: unknown = await res.json().catch(() => null);
      setData(sanitizeResponse(raw));
    } catch {
      setError('network');
      setData(null);
    } finally {
      setLoading(false);
      // Cache the activation regardless of success/error — mirrors
      // CompareTab's posture. The Retry button is the canonical
      // recovery path for the error case; tab re-activation does NOT
      // re-fetch (avoids accidentally hammering the rate-limit when
      // users tab back and forth).
      setLoaded(true);
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!active || loaded || loading) return;
    void load();
  }, [active, loaded, loading, load]);

  const onRefresh = useCallback(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <Panel title="Coverage" sub="Loading coverage map…">
        <p className="wb-hint" data-testid="jutsu-coverage-loading">
          Loading coverage map…
        </p>
      </Panel>
    );
  }

  if (error !== null) {
    return (
      <Panel title="Coverage" sub="Could not load coverage">
        <div
          role="alert"
          data-testid="jutsu-coverage-error"
          className="wb-banner danger"
        >
          {LOAD_ERROR_COPY[error]}
        </div>
        <button
          type="button"
          className="btn"
          onClick={onRefresh}
          data-testid="jutsu-coverage-retry"
          disabled={loading}
          style={{ marginTop: 10 }}
        >
          Retry
        </button>
      </Panel>
    );
  }

  if (!data) {
    return (
      <Panel title="Coverage" sub="No data">
        <EmptyState
          module="jutsu"
          title="Coverage not yet available"
          sub="Run an LLM evaluation suite to populate coverage data."
          testId="jutsu-coverage-empty-state"
          cta={{ label: 'Run evaluation suite', href: '/admin/jutsu/eval/run' }}
        />
      </Panel>
    );
  }

  const { owaspRows, tpiRows, owaspSummary, tpiSummary } = data;
  const isEmpty = owaspRows.length === 0 && tpiRows.length === 0;

  const summaryRows = [
    { k: SUMMARY_LABEL.owasp, v: `${owaspSummary.passed} / ${owaspSummary.tested} (${owaspSummary.percentage}%)` },
    { k: SUMMARY_LABEL.tpi, v: `${tpiSummary.passed} / ${tpiSummary.tested} (${tpiSummary.percentage}%)` },
  ];

  return (
    <div data-testid="jutsu-coverage-root">
      <Panel
        title="Coverage summary"
        sub="Per-framework pass / tested / percentage"
      >
        <KV rows={summaryRows} />
        <button
          type="button"
          className="btn"
          onClick={onRefresh}
          data-testid="jutsu-coverage-refresh"
          disabled={loading}
          style={{ marginTop: 10 }}
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </Panel>

      {isEmpty ? (
        <Panel title="Coverage map" sub="No categories yet">
          <EmptyState
            module="jutsu"
            title="No coverage entries"
            sub="Run an LLM evaluation suite to populate per-category coverage."
            testId="jutsu-coverage-empty-categories"
            cta={{ label: 'Run evaluation suite', href: '/admin/jutsu/eval/run' }}
          />
        </Panel>
      ) : (
        <div className="yr4-tri-grid">
          <Panel
            title="OWASP LLM Top-10"
            sub={`${owaspRows.length} categories · sorted worst-first`}
          >
            <CoverageMap rows={owaspRows} testId="jutsu-coverage-owasp" />
          </Panel>
          <Panel
            title="TPI Bushido stories"
            sub={`${tpiRows.length} stories · sorted worst-first`}
          >
            <CoverageMap rows={tpiRows} testId="jutsu-coverage-tpi" />
          </Panel>
        </div>
      )}
    </div>
  );
}
