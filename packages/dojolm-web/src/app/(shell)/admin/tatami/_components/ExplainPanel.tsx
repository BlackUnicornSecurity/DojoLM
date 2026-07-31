// SPDX-License-Identifier: Apache-2.0
/*
 * Hallmark · component: explain-panel · genre: utilitarian · theme: tatami-admin (house tokens)
 * states: default · hover · focus · active · disabled · loading · error · success
 * contrast: pass (house --fg/--fg-mute on --bg-1) · pre-emit critique: P5 H4 E4 S4 R5 V4
 */

/**
 * ExplainPanel — the "Explain" lane (Kaisetsu 解説) panel for /admin/tatami
 * (P2.4). A labelled question → POST /api/tatami/explain over THIS proof →
 * a grounded answer: plain text, the proof-ids it CITED (provenance), suggestion
 * chips (each carrying its verified route in `title`), or the distinct
 * "no evidence" state. It posts only on submit, persists nothing, and renders
 * the answer defensively (the route already enforces the grounding contract;
 * this never invents content).
 *
 * Matches the drawer/Scanner-panel voice: house `.chip`/`.btn`/`wb-hint`,
 * `--space-*`/`--fg-mute`/`--bg-1`/`--b-1`/`--torii-hi` tokens, inline styles, no
 * new tokens. a11y: labelled form, `role="status"`/`role="alert"`, an
 * `aria-live` answer region, native `:focus-visible` on the textarea/button.
 */

'use client';

import { useId, useState } from 'react';
import { readCsrfToken } from '@/lib/csrf-cookie';
import { shortId } from '../_lib';

/** Max question length — mirrors the route's MAX_CONTEXT_QUESTION_LEN. */
const MAX_QUESTION_LEN = 1000;

interface ExplainPill {
  readonly label: string;
  readonly route: string;
}
interface ExplainAnswer {
  readonly text: string;
  readonly citedProofIds: readonly string[];
  readonly pills: readonly ExplainPill[];
  readonly missingEvidence: boolean;
}

function isPill(p: unknown): p is ExplainPill {
  if (typeof p !== 'object' || p === null) return false;
  const pill = p as Record<string, unknown>;
  return typeof pill.label === 'string' && typeof pill.route === 'string';
}

/** Narrow the `{ answer }` response defensively; null on any malformed shape. */
function narrowAnswer(v: unknown): ExplainAnswer | null {
  if (typeof v !== 'object' || v === null) return null;
  const a = v as Record<string, unknown>;
  if (typeof a.text !== 'string' || typeof a.missingEvidence !== 'boolean') return null;
  return {
    text: a.text,
    citedProofIds: Array.isArray(a.citedProofIds)
      ? a.citedProofIds.filter((x): x is string => typeof x === 'string')
      : [],
    pills: Array.isArray(a.pills) ? a.pills.filter(isPill) : [],
    missingEvidence: a.missingEvidence,
  };
}

export function ExplainPanel({
  proofId,
  caseIds = [],
}: {
  readonly proofId: string;
  readonly caseIds?: readonly string[];
}) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<ExplainAnswer | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const qId = useId();

  const trimmed = question.trim();
  const canSubmit = trimmed.length > 0 && status !== 'loading';

  async function run(): Promise<void> {
    if (trimmed.length === 0) return;
    setStatus('loading');
    setAnswer(null);
    try {
      const csrf = readCsrfToken();
      const res = await fetch('/api/tatami/explain', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          ...(csrf ? { 'x-csrf-token': csrf } : {}),
        },
        body: JSON.stringify({ question: trimmed, proofIds: [proofId], caseIds }),
      });
      if (!res.ok) {
        setStatus('error');
        return;
      }
      const body = await res.json().catch(() => null);
      const next = narrowAnswer((body as { answer?: unknown } | null)?.answer);
      if (next === null) {
        setStatus('error');
        return;
      }
      setAnswer(next);
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  }

  return (
    <section data-testid="tatami-explain" style={{ marginTop: 'var(--space-4)' }}>
      <h3 style={{ fontSize: 13, margin: '0 0 var(--space-2)' }}>Explain</h3>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) void run();
        }}
      >
        <label htmlFor={qId} className="wb-hint" style={{ display: 'block', marginBottom: 'var(--space-1)' }}>
          Ask about this evidence
        </label>
        <textarea
          id={qId}
          value={question}
          maxLength={MAX_QUESTION_LEN}
          onChange={(e) => setQuestion(e.target.value)}
          rows={2}
          placeholder="e.g. why is this proof not replayable?"
          data-testid="tatami-explain-input"
          style={{
            width: '100%',
            fontSize: 12.5,
            padding: 'var(--space-2)',
            background: 'var(--bg-1)',
            border: '1px solid var(--b-1)',
            borderRadius: 4,
            color: 'var(--fg)',
            resize: 'vertical',
          }}
        />
        <div style={{ marginTop: 'var(--space-2)' }}>
          <button type="submit" className="btn sm" disabled={!canSubmit} data-testid="tatami-explain-submit">
            {status === 'loading' ? 'Explaining…' : 'Explain'}
          </button>
        </div>
      </form>

      {status === 'loading' && (
        <p role="status" className="wb-hint" data-testid="tatami-explain-loading" style={{ marginTop: 'var(--space-2)' }}>
          Explaining…
        </p>
      )}

      {status === 'error' && (
        <div role="alert" data-testid="tatami-explain-error" style={{ fontSize: 12.5, color: 'var(--torii-hi)', marginTop: 'var(--space-2)' }}>
          Couldn’t explain that.
          <button
            type="button"
            className="btn sm"
            style={{ marginLeft: 'var(--space-2)' }}
            data-testid="tatami-explain-retry"
            onClick={() => void run()}
            disabled={trimmed.length === 0}
          >
            Retry
          </button>
        </div>
      )}

      {/* aria-live so the grounded answer is announced when it arrives. */}
      <div aria-live="polite" data-testid="tatami-explain-answer-region">
        {answer && answer.missingEvidence && (
          <div data-testid="tatami-explain-missing" style={{ marginTop: 'var(--space-3)' }}>
            <span className="chip ghost"><span className="dot" />no evidence</span>
            <p style={{ fontSize: 12.5, color: 'var(--fg-mute)', margin: 'var(--space-2) 0 0' }}>{answer.text}</p>
          </div>
        )}

        {answer && !answer.missingEvidence && (
          <div data-testid="tatami-explain-result" style={{ marginTop: 'var(--space-3)' }}>
            <p style={{ fontSize: 12.5, color: 'var(--fg)', whiteSpace: 'pre-wrap', margin: 0 }}>{answer.text}</p>

            {answer.citedProofIds.length > 0 && (
              <div style={{ marginTop: 'var(--space-2)', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)', alignItems: 'center' }}>
                <span className="wb-hint">Cited:</span>
                {answer.citedProofIds.map((id) => (
                  <span key={id} className="chip steel" title={id} data-testid="tatami-explain-cite">
                    <span className="mono">{shortId(id)}</span>
                  </span>
                ))}
              </div>
            )}

            {answer.pills.length > 0 && (
              <div style={{ marginTop: 'var(--space-2)', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)', alignItems: 'center' }}>
                <span className="wb-hint">Next:</span>
                {answer.pills.map((p) => (
                  <span key={p.route} className="chip ghost" title={p.route} data-testid="tatami-explain-pill">
                    {p.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
