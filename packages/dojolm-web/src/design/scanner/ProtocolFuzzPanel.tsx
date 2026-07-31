// SPDX-License-Identifier: Apache-2.0
/**
 * ProtocolFuzzPanel — YR.18 / G-023 + G-040.
 *
 * Coverage-guided fuzz UI driving `POST /api/buki/fuzz`. Reused by
 * both the Scanner page (as a tab) and the Buki Fuzzer tab.
 *
 * The route is SYNCHRONOUS (not streaming) per YR.18 stop condition;
 * we ship synchronous-completion UI: configure → submit → spinner →
 * result list.
 *
 * Body shape: `{ grammar: 'prompt'|'encoding'|'structural', mutationCount: 1..200 }`.
 * Response: `{ results: FuzzerResult[] }` where each result has
 * `{ id, input, anomalyType, isAnomaly, score, timestamp }`.
 *
 * Discriminant-redaction: error code → fixed-vocabulary banner copy
 * (NEVER echoes server free text).
 */

'use client';

import {
  useCallback,
  useMemo,
  useState,
  type FormEvent,
  type ReactElement,
} from 'react';
import { readCsrfToken } from '@/lib/csrf-cookie';

export type FuzzGrammar = 'prompt' | 'encoding' | 'structural';

interface FuzzerResult {
  readonly id: string;
  readonly input: string;
  readonly anomalyType: string | null;
  readonly isAnomaly: boolean;
  readonly score: number;
  readonly timestamp: number;
}

interface FuzzResponseRaw {
  readonly results?: readonly unknown[];
  readonly error?: string;
}

interface ErrorState {
  readonly code: 'rate-limit' | 'busy' | 'invalid' | 'forbidden' | 'network' | 'server';
}

const GRAMMARS: readonly { value: FuzzGrammar; label: string; lede: string }[] = [
  { value: 'prompt', label: 'Prompt', lede: 'Adversarial prompt grammar — instruction overrides + jailbreak.' },
  { value: 'encoding', label: 'Encoding', lede: 'Base64 / unicode / hex obfuscations of canonical payloads.' },
  { value: 'structural', label: 'Structural', lede: 'Tag injection / boundary tokens / role-confusion.' },
];

const ERROR_COPY: Record<ErrorState['code'], string> = {
  'rate-limit': 'Rate limit exceeded. Wait a minute and retry.',
  busy: 'Server busy. Try again in a moment.',
  invalid: 'Configuration rejected. Pick a grammar and a mutation count between 1 and 200.',
  forbidden: 'Access denied. Sign in as an admin operator.',
  network: 'Network error. Try again.',
  server: 'Fuzz session failed. Try again later.',
};

const MIN_COUNT = 1;
const MAX_COUNT = 200;
const MAX_RESULTS_DISPLAY = 50;
const INPUT_PREVIEW_CAP = 120;
const ANOMALY_LABEL_CAP = 32;

function isFuzzGrammar(v: unknown): v is FuzzGrammar {
  return v === 'prompt' || v === 'encoding' || v === 'structural';
}

function safeNum(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

function sanitizeResult(raw: unknown): FuzzerResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || typeof r.input !== 'string') return null;
  const anomalyType = typeof r.anomalyType === 'string' ? r.anomalyType : null;
  return {
    id: r.id,
    input: r.input,
    anomalyType,
    isAnomaly: r.isAnomaly === true,
    score: safeNum(r.score),
    timestamp: safeNum(r.timestamp),
  };
}

function statusToCode(status: number): ErrorState['code'] {
  if (status === 429) return 'rate-limit';
  if (status === 503) return 'busy';
  if (status === 400) return 'invalid';
  if (status === 401 || status === 403) return 'forbidden';
  return 'server';
}

function capInput(s: string): string {
  if (s.length <= INPUT_PREVIEW_CAP) return s;
  return `${s.slice(0, INPUT_PREVIEW_CAP - 1)}…`;
}

function capAnomaly(s: string | null): string {
  if (!s) return '—';
  if (s.length <= ANOMALY_LABEL_CAP) return s;
  return `${s.slice(0, ANOMALY_LABEL_CAP - 1)}…`;
}

export interface ProtocolFuzzPanelProps {
  readonly testId?: string;
  readonly defaultGrammar?: FuzzGrammar;
  readonly defaultMutationCount?: number;
}

export function ProtocolFuzzPanel({
  testId = 'protocol-fuzz-panel',
  defaultGrammar = 'prompt',
  defaultMutationCount = 25,
}: ProtocolFuzzPanelProps): ReactElement {
  const [grammar, setGrammar] = useState<FuzzGrammar>(defaultGrammar);
  const [mutationCount, setMutationCount] = useState<number>(defaultMutationCount);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<readonly FuzzerResult[]>([]);
  const [error, setError] = useState<ErrorState | null>(null);

  const countValid = useMemo(
    () => Number.isInteger(mutationCount) && mutationCount >= MIN_COUNT && mutationCount <= MAX_COUNT,
    [mutationCount],
  );

  const onSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (busy) return;
      if (!countValid) {
        setError({ code: 'invalid' });
        return;
      }
      setBusy(true);
      setError(null);
      try {
        const csrf = readCsrfToken();
        const res = await fetch('/api/buki/fuzz', {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            ...(csrf ? { 'x-csrf-token': csrf } : {}),
          },
          body: JSON.stringify({ grammar, mutationCount }),
        });
        if (!res.ok) {
          setError({ code: statusToCode(res.status) });
          setResults([]);
          return;
        }
        const body = (await res.json().catch(() => null)) as FuzzResponseRaw | null;
        const safe: FuzzerResult[] = [];
        for (const raw of body?.results ?? []) {
          const r = sanitizeResult(raw);
          if (r) safe.push(r);
        }
        setResults(safe);
      } catch {
        setError({ code: 'network' });
        setResults([]);
      } finally {
        setBusy(false);
      }
    },
    [busy, countValid, grammar, mutationCount],
  );

  const cappedResults = useMemo(
    () => results.slice(0, MAX_RESULTS_DISPLAY),
    [results],
  );

  const grammarMeta = GRAMMARS.find((g) => g.value === grammar);

  return (
    <div data-testid={testId}>
      <form onSubmit={onSubmit} className="yr4-kv-stack" aria-label="Protocol fuzzer configuration">
        <label className="wb-field" htmlFor={`${testId}-grammar`}>
          <span>Grammar</span>
          <select
            id={`${testId}-grammar`}
            data-testid={`${testId}-grammar`}
            className="wb-input"
            value={grammar}
            onChange={(e) => {
              const v = e.target.value;
              if (isFuzzGrammar(v)) setGrammar(v);
            }}
            disabled={busy}
          >
            {GRAMMARS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
          <span className="wb-hint" data-testid={`${testId}-grammar-hint`}>
            {grammarMeta?.lede ?? ''}
          </span>
        </label>

        <label className="wb-field" htmlFor={`${testId}-count`}>
          <span>Mutation count ({MIN_COUNT}–{MAX_COUNT})</span>
          <input
            id={`${testId}-count`}
            data-testid={`${testId}-count`}
            type="number"
            className="wb-input"
            min={MIN_COUNT}
            max={MAX_COUNT}
            step={1}
            value={mutationCount}
            onChange={(e) => {
              const n = Number(e.target.value);
              setMutationCount(Number.isFinite(n) ? n : defaultMutationCount);
            }}
            disabled={busy}
            autoComplete="off"
          />
        </label>

        <div>
          <button
            type="submit"
            className="btn"
            data-testid={`${testId}-run`}
            disabled={busy || !countValid}
            aria-busy={busy}
          >
            {busy ? 'Fuzzing…' : 'Run fuzz session'}
          </button>
        </div>

        {error !== null && (
          <div role="alert" data-testid={`${testId}-error`} className="yr4-banner tone-red">
            {ERROR_COPY[error.code]}
          </div>
        )}
      </form>

      <div style={{ marginTop: 12 }}>
        {cappedResults.length === 0 && !busy && error === null && (
          <p className="wb-hint" data-testid={`${testId}-empty`}>
            No fuzz session run yet.
          </p>
        )}

        {cappedResults.length > 0 && (
          <>
            <div className="yr4-thead-attack" aria-hidden="true">
              <span>Input</span>
              <span>Anomaly</span>
              <span>Score</span>
            </div>
            <div
              className="yr4-data-list"
              role="list"
              data-testid={`${testId}-results`}
              aria-label="Fuzz results"
            >
              {cappedResults.map((r) => (
                <div
                  key={r.id}
                  role="listitem"
                  data-testid={`${testId}-result-${r.id}`}
                  data-anomaly={r.isAnomaly ? 'true' : 'false'}
                  className="yr4-attack-row"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 120px 60px',
                    gap: 8,
                    padding: '6px 8px',
                    borderTop: '1px solid var(--b-1, #222)',
                    fontSize: 12,
                  }}
                >
                  <span style={{ fontFamily: 'monospace', color: r.isAnomaly ? 'var(--torii-hi)' : 'inherit' }}>
                    {capInput(r.input)}
                  </span>
                  <span style={{ color: 'var(--fg-mute, #888)' }}>
                    {capAnomaly(r.anomalyType)}
                  </span>
                  <span style={{ color: 'var(--fg-mute, #888)' }}>
                    {r.score.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            <div
              className="wb-hint"
              data-testid={`${testId}-summary`}
              style={{ marginTop: 6 }}
            >
              {cappedResults.length} of {results.length} results · {results.filter((r) => r.isAnomaly).length} anomal{results.filter((r) => r.isAnomaly).length === 1 ? 'y' : 'ies'}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
