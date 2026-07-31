// SPDX-License-Identifier: Apache-2.0
'use client';

/* Hallmark · component: capture-affordance · genre: modern-minimal
 * states: default · hover · focus · active · disabled · loading · error · success
 * positive = house `jade` chip (never .chip.green) · contrast: pass (46–50)
 */

/**
 * ScannerProofCapture — Epic 2 "Capture proof (operator action)".
 *
 * The v0 thesis loop made operable in the UI: an operator-triggered WRITE path
 * that persists the run the Rail is viewing as a `TatamiProof`
 * (POST /api/tatami/proofs { runId }) and surfaces the customer-safe receipt, then
 * lets the operator optionally file the new proof under a case
 * (POST /api/tatami/cases/[id]/proofs { proofId }). Until this, capture was
 * API-only — the read-only Rail derived a proof PREVIEW but never persisted one.
 *
 * Read-only-on-mount: nothing is fetched until the operator clicks. The capture
 * POST fires on the button; the case list loads lazily only when the operator
 * opens the attach sub-flow. This keeps the Rail's "mounting triggers no fetch"
 * contract intact (a collapsed/just-opened Rail still ships ≈0 network).
 *
 * OSS / Apache-2.0. A `'use client'` Tatami file: it never imports the
 * `@/lib/tatami` barrel (which re-exports the fs-backed, Node-crypto stores —
 * server-only) and no EE `tatami-vault` surface. The wire shapes below are local
 * re-statements of the POST/GET contracts (field names match 1:1) — the same
 * posture `admin/tatami/_lib` takes so the client never pulls the server store.
 *
 * Honest copy + house tones only: the positive state is a `jade` chip (never the
 * phantom `.chip.green`); errors name what broke and what to do; no hash is ever
 * invented — the B7 content-hash anchor renders only when the receipt carried one.
 */

import { useCallback, useRef, useState } from 'react';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

/** Max cases offered in the attach picker (mirrors the route's MAX_LIMIT posture). */
const CASE_PICKER_LIMIT = 50;
const ID_TAIL = 8;
const HASH_HEAD = 8;
const HASH_TAIL = 8;
/** Defensive bound on a server-supplied error string before we render it. */
const MAX_SERVER_ERROR = 160;

/** POST /api/tatami/proofs response — only the fields the panel reads. */
interface CaptureResponse {
  readonly proofId?: string;
  readonly receipt?: { readonly chain?: readonly { readonly contentHash?: string }[] };
  readonly error?: string;
}
/** A bounded case row from GET /api/tatami/cases (server `toCaseSummary` projection). */
interface CaseRow {
  readonly id: string;
  readonly title: string;
  readonly status: string;
}
interface CasesListResponse {
  readonly cases?: readonly Partial<CaseRow>[];
  readonly error?: string;
}

type CaptureState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'capturing' }
  | { readonly kind: 'captured'; readonly proofId: string; readonly contentHash: string | null }
  | { readonly kind: 'error'; readonly message: string };

type AttachState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'empty' }
  | { readonly kind: 'loadError'; readonly message: string }
  | {
      readonly kind: 'ready';
      readonly cases: readonly CaseRow[];
      readonly selectedId: string;
      readonly busy: boolean;
      readonly error: string | null;
    }
  | { readonly kind: 'attached'; readonly title: string };

/** Short, copy-on-hover id (full value lives in the `title`). */
function shortId(id: string): string {
  return id.length > ID_TAIL ? id.slice(-ID_TAIL) : id;
}
function truncateHash(hash: string): string {
  return hash.length > HASH_HEAD + HASH_TAIL ? `${hash.slice(0, HASH_HEAD)}…${hash.slice(-HASH_TAIL)}` : hash;
}

/** Map a capture failure to honest, action-oriented copy (what broke → what to do). */
function captureErrorCopy(status: number, serverError?: string): string {
  if (status === 403) return 'Permission denied — capturing a proof needs operator or admin.';
  if (status === 404) return 'Scan run not found — it may have expired or belong to another operator.';
  if (status === 429) return 'Too many captures — wait a moment, then try again.';
  if (typeof serverError === 'string' && serverError.length > 0 && serverError.length <= MAX_SERVER_ERROR) {
    return serverError;
  }
  return 'Capture failed — try again.';
}
function attachErrorCopy(status: number, serverError?: string): string {
  if (status === 403) return 'Permission denied — attaching needs operator or admin.';
  if (status === 404) return 'That case is no longer available.';
  if (status === 422) return 'That case is full — detach a proof or pick another.';
  if (typeof serverError === 'string' && serverError.length > 0 && serverError.length <= MAX_SERVER_ERROR) {
    return serverError;
  }
  return 'Attach failed — try again.';
}

export interface ScannerProofCaptureProps {
  /** The persisted run the Rail is viewing — the capture subject. */
  readonly runId: string;
}

/**
 * The operator-facing capture affordance, rendered under the read-only proof view
 * in the Scanner Evidence Rail's Proof tab.
 */
export function ScannerProofCapture({ runId }: ScannerProofCaptureProps) {
  const [capture, setCapture] = useState<CaptureState>({ kind: 'idle' });
  const [attach, setAttach] = useState<AttachState>({ kind: 'idle' });
  // In-flight guards. State flips a tick behind the click, so a fast double-fire
  // (e.g. the error-state Retry) could mint a SECOND proof / load cases twice —
  // a ref is the only signal that's true synchronously inside the handler.
  const capturingRef = useRef(false);
  const loadingCasesRef = useRef(false);

  const onCapture = useCallback(async () => {
    if (capturingRef.current) return;
    capturingRef.current = true;
    setCapture({ kind: 'capturing' });
    setAttach({ kind: 'idle' });
    try {
      const res = await fetchWithAuth('/api/tatami/proofs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId }),
      });
      const body = (await res.json().catch(() => ({}))) as CaptureResponse;
      if (!res.ok) {
        setCapture({ kind: 'error', message: captureErrorCopy(res.status, body.error) });
        return;
      }
      if (typeof body.proofId !== 'string' || body.proofId.length === 0) {
        setCapture({ kind: 'error', message: 'Capture failed — try again.' });
        return;
      }
      const anchor = body.receipt?.chain?.[0]?.contentHash;
      setCapture({
        kind: 'captured',
        proofId: body.proofId,
        contentHash: typeof anchor === 'string' && anchor.length > 0 ? anchor : null,
      });
    } catch {
      setCapture({ kind: 'error', message: 'Network error — check your connection and try again.' });
    } finally {
      capturingRef.current = false;
    }
  }, [runId]);

  const openAttach = useCallback(async () => {
    if (loadingCasesRef.current) return;
    loadingCasesRef.current = true;
    setAttach({ kind: 'loading' });
    try {
      const res = await fetchWithAuth(`/api/tatami/cases?limit=${CASE_PICKER_LIMIT}`, { cache: 'no-store' });
      const body = (await res.json().catch(() => ({}))) as CasesListResponse;
      if (!res.ok) {
        setAttach({ kind: 'loadError', message: attachErrorCopy(res.status, body.error) });
        return;
      }
      const cases: readonly CaseRow[] = (body.cases ?? [])
        .filter((c): c is Partial<CaseRow> & { id: string } => typeof c?.id === 'string')
        .map((c) => ({ id: c.id, title: c.title ?? c.id, status: c.status ?? '' }));
      if (cases.length === 0) {
        setAttach({ kind: 'empty' });
        return;
      }
      setAttach({ kind: 'ready', cases, selectedId: cases[0].id, busy: false, error: null });
    } catch {
      setAttach({ kind: 'loadError', message: 'Network error — try again.' });
    } finally {
      loadingCasesRef.current = false;
    }
  }, []);

  const onAttach = useCallback(async () => {
    if (capture.kind !== 'captured' || attach.kind !== 'ready' || attach.busy) return;
    const { selectedId, cases } = attach;
    const target = cases.find((c) => c.id === selectedId);
    // Functional updaters so the busy/error transitions read the LIVE `ready` state
    // (selectedId the operator may have changed), never the closure snapshot.
    setAttach((prev) => (prev.kind === 'ready' ? { ...prev, busy: true, error: null } : prev));
    try {
      const res = await fetchWithAuth(`/api/tatami/cases/${encodeURIComponent(selectedId)}/proofs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proofId: capture.proofId }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        const message = attachErrorCopy(res.status, body.error);
        setAttach((prev) => (prev.kind === 'ready' ? { ...prev, busy: false, error: message } : prev));
        return;
      }
      setAttach({ kind: 'attached', title: target?.title ?? 'case' });
    } catch {
      setAttach((prev) => (prev.kind === 'ready' ? { ...prev, busy: false, error: 'Network error — try again.' } : prev));
    }
  }, [attach, capture]);

  const capturing = capture.kind === 'capturing';

  return (
    <div
      data-testid="scanner-proof-capture"
      style={{
        marginTop: 'var(--space-3)',
        paddingTop: 'var(--space-3)',
        borderTop: '1px solid var(--b-1)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-2)',
      }}
    >
      {capture.kind !== 'captured' ? (
        <button
          type="button"
          className="btn sm"
          data-testid="scanner-capture-proof"
          onClick={() => void onCapture()}
          disabled={capturing}
          aria-busy={capturing}
          aria-label={capturing ? 'Capturing proof' : 'Capture this run as a proof'}
        >
          {capturing ? 'Capturing…' : 'Capture proof'}
        </button>
      ) : null}

      {capture.kind === 'error' ? (
        // role="alert" on a <div> (not <p>) — a <p> can't legally contain the
        // interactive Retry button; the browser would auto-close it and break the
        // alert grouping that announces the message + its retry together.
        <div
          role="alert"
          data-testid="scanner-capture-error"
          className="wb-hint"
          style={{ margin: 0, color: 'var(--torii-hi)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}
        >
          <span>{capture.message}</span>
          <button
            type="button"
            className="btn sm"
            data-testid="scanner-capture-retry"
            onClick={() => void onCapture()}
            aria-label="Retry capturing the proof"
          >
            Retry
          </button>
        </div>
      ) : null}

      {capture.kind === 'captured' ? (
        <div role="status" aria-live="polite" data-testid="scanner-capture-success">
          <span className="chip jade" aria-label="Proof captured">
            <span className="dot" aria-hidden="true" />
            Proof captured
          </span>
          <dl
            style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              gap: 'var(--space-1) var(--space-3)',
              margin: 'var(--space-2) 0 0',
            }}
          >
            <dt className="wb-hint" style={{ margin: 0 }}>
              Proof ID
            </dt>
            <dd
              className="mono"
              data-testid="scanner-capture-proof-id"
              title={capture.proofId}
              style={{ margin: 0, wordBreak: 'break-all' }}
            >
              {shortId(capture.proofId)}
            </dd>
            {capture.contentHash ? (
              <>
                <dt className="wb-hint" style={{ margin: 0 }}>
                  Content hash
                </dt>
                <dd
                  className="mono"
                  data-testid="scanner-capture-content-hash"
                  title={capture.contentHash}
                  style={{ margin: 0, wordBreak: 'break-all' }}
                >
                  {truncateHash(capture.contentHash)}
                </dd>
              </>
            ) : null}
          </dl>

          {/* Attach-to-case sub-flow — lazy: nothing loads until the operator opens it. */}
          {attach.kind === 'attached' ? (
            <p
              role="status"
              aria-live="polite"
              data-testid="scanner-attach-success"
              className="wb-hint"
              style={{ margin: 'var(--space-2) 0 0' }}
            >
              <span className="chip jade">
                <span className="dot" aria-hidden="true" />
                Attached
              </span>{' '}
              to {attach.title}.
            </p>
          ) : (
            <div style={{ marginTop: 'var(--space-2)' }}>
              {attach.kind === 'idle' ? (
                <button
                  type="button"
                  className="btn sm btn-ghost"
                  data-testid="scanner-attach-open"
                  onClick={() => void openAttach()}
                >
                  Attach to case
                </button>
              ) : null}

              {attach.kind === 'loading' ? (
                <p className="wb-hint" style={{ margin: 0 }} data-testid="scanner-attach-loading">
                  Loading cases…
                </p>
              ) : null}

              {attach.kind === 'empty' ? (
                <p className="wb-hint" style={{ margin: 0 }} data-testid="scanner-attach-empty">
                  No cases yet — create one in the Tatami workspace, then attach.
                </p>
              ) : null}

              {attach.kind === 'loadError' ? (
                <div
                  role="alert"
                  className="wb-hint"
                  style={{ margin: 0, color: 'var(--torii-hi)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}
                  data-testid="scanner-attach-load-error"
                >
                  <span>{attach.message}</span>
                  <button
                    type="button"
                    className="btn sm"
                    onClick={() => void openAttach()}
                    aria-label="Retry loading cases"
                  >
                    Retry
                  </button>
                </div>
              ) : null}

              {attach.kind === 'ready' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                  <label className="wb-hint" htmlFor="scanner-attach-case" style={{ margin: 0 }}>
                    Case
                  </label>
                  <select
                    id="scanner-attach-case"
                    data-testid="scanner-attach-select"
                    className="wb-input"
                    value={attach.selectedId}
                    disabled={attach.busy}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      setAttach((prev) => (prev.kind === 'ready' ? { ...prev, selectedId } : prev));
                    }}
                  >
                    {attach.cases.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                  {attach.error ? (
                    <span role="alert" data-testid="scanner-attach-error" className="wb-hint" style={{ color: 'var(--torii-hi)' }}>
                      {attach.error}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    className="btn sm"
                    data-testid="scanner-attach-submit"
                    onClick={() => void onAttach()}
                    disabled={attach.busy}
                    aria-busy={attach.busy}
                  >
                    {attach.busy ? 'Attaching…' : 'Attach'}
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
