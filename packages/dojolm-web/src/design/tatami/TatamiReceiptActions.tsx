// SPDX-License-Identifier: Apache-2.0
/**
 * TatamiReceiptActions — Copy / Download the self-verifiable customer-safe
 * receipt for a proof (OSS, P0.2 / DoD#7 / product decision #5).
 *
 * The receipt renderers (`renderReceiptMarkdown` / `renderReceiptJson`) are
 * server-only — they pull the node:crypto hash chain — so this CLIENT component
 * never imports them. It fetches `GET /api/tatami/proofs/[id]?format=markdown|json`
 * (which renders them server-side) and either copies the text to the clipboard or
 * drops it as a download via `Blob` + `createObjectURL`.
 *
 * House pattern mirrors `design/compliance/ComplianceExportButton`: closed
 * error-copy map (R-T1 — never echo server free text), Content-Disposition
 * filename allowlist with a synthesized fallback, transient 6 s error banner.
 * Anti-slop: download success is SILENT (the browser's own chrome is the
 * feedback); copy success is a transient "Copied ✓" label + one polite live
 * region (never a toast, never double-announced).
 *
 * OSS-safe: imports only React — no `@/lib/tatami` barrel (would pull node:fs
 * into the client bundle), no `tatami-vault` (EE). House `btn` tokens only.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';

export type TatamiReceiptFormat = 'markdown' | 'json';

interface ErrorState {
  readonly code: 'forbidden' | 'invalid' | 'network' | 'server';
}

const FORMATS: readonly TatamiReceiptFormat[] = ['markdown', 'json'];
const FORMAT_LABEL: Record<TatamiReceiptFormat, string> = { markdown: 'Markdown', json: 'JSON' };
const FORMAT_EXT: Record<TatamiReceiptFormat, string> = { markdown: 'md', json: 'json' };

/** Closed copy map — never render server-supplied free text (R-T1). */
const ERROR_COPY: Record<ErrorState['code'], string> = {
  forbidden: 'Access denied. Sign in with receipt access.',
  invalid: 'Receipt request rejected. Reload and try again.',
  network: 'Network error. Try again in a moment.',
  server: 'Receipt export failed. Try again later.',
};

/** Filename allowlist — mirrors ComplianceExportButton. */
const FILENAME_RE = /^[a-zA-Z0-9._-]{1,80}$/;

function statusToCode(status: number): ErrorState['code'] {
  if (status === 401 || status === 403) return 'forbidden';
  if (status === 400 || status === 404 || status === 409) return 'invalid';
  return 'server';
}

function parseContentDisposition(header: string | null): string | null {
  if (!header) return null;
  const m = header.match(/filename\s*=\s*"?([^";\s]+)"?/i);
  if (!m) return null;
  return FILENAME_RE.test(m[1]) ? m[1] : null;
}

function fallbackFilename(proofId: string, format: TatamiReceiptFormat): string {
  const safe = FILENAME_RE.test(proofId) ? proofId : 'proof';
  return `tatami-receipt-${safe}.${FORMAT_EXT[format]}`;
}

export interface TatamiReceiptActionsProps {
  readonly proofId: string;
  readonly className?: string;
  readonly testId?: string;
}

export function TatamiReceiptActions({
  proofId,
  className = '',
  testId = 'tatami-receipt',
}: TatamiReceiptActionsProps) {
  const [format, setFormat] = useState<TatamiReceiptFormat>('markdown');
  // Which action is in flight (blocks a double-fire + drives the busy labels).
  const [busy, setBusy] = useState<null | 'copy' | 'download'>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<ErrorState | null>(null);

  // Transient error banner — auto-clears (mirrors ComplianceExportButton's 6 s).
  useEffect(() => {
    if (error === null) return;
    const t = window.setTimeout(() => setError(null), 6000);
    return () => window.clearTimeout(t);
  }, [error]);

  // Transient "Copied ✓" — reverts so the affordance never lies about a stale copy.
  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(t);
  }, [copied]);

  const fetchReceipt = useCallback(
    (): Promise<Response> =>
      fetch(`/api/tatami/proofs/${encodeURIComponent(proofId)}?format=${format}`, {
        headers: { Accept: '*/*' },
        credentials: 'same-origin',
        cache: 'no-store',
      }),
    [proofId, format],
  );

  const onCopy = useCallback(async () => {
    setBusy('copy');
    setError(null);
    setCopied(false);
    try {
      const res = await fetchReceipt();
      if (!res.ok) {
        setError({ code: statusToCode(res.status) });
        return;
      }
      await navigator.clipboard.writeText(await res.text());
      setCopied(true);
    } catch {
      setError({ code: 'network' });
    } finally {
      setBusy(null);
    }
  }, [fetchReceipt]);

  const onDownload = useCallback(async () => {
    setBusy('download');
    setError(null);
    try {
      const res = await fetchReceipt();
      if (!res.ok) {
        setError({ code: statusToCode(res.status) });
        return;
      }
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download =
        parseContentDisposition(res.headers.get('content-disposition')) ??
        fallbackFilename(proofId, format);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      setError({ code: 'network' });
    } finally {
      setBusy(null);
    }
  }, [fetchReceipt, proofId, format]);

  return (
    <section className={className} data-testid={`${testId}-actions`} style={{ marginTop: 'var(--space-4)' }}>
      <h3 style={{ fontSize: 13, margin: '0 0 2px' }}>Receipt</h3>
      <p style={{ fontSize: 11.5, color: 'var(--fg-mute)', margin: '0 0 var(--space-2)' }}>
        Self-verifiable customer-safe export. Recompute the hash chain offline to verify.
      </p>
      <div
        role="group"
        aria-label="Receipt export"
        style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', alignItems: 'center' }}
      >
        <div role="radiogroup" aria-label="Receipt format" style={{ display: 'inline-flex', gap: 4 }}>
          {FORMATS.map((f) => {
            const selected = f === format;
            return (
              <button
                key={f}
                type="button"
                role="radio"
                aria-checked={selected}
                className={`btn sm ${selected ? '' : 'btn-ghost'}`.trim()}
                data-testid={`${testId}-format-${f}`}
                onClick={() => setFormat(f)}
                disabled={busy !== null}
              >
                {FORMAT_LABEL[f]}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className="btn sm"
          data-testid={`${testId}-copy`}
          aria-busy={busy === 'copy'}
          disabled={busy !== null}
          onClick={() => void onCopy()}
        >
          {busy === 'copy' ? 'Copying…' : copied ? 'Copied ✓' : 'Copy'}
        </button>
        <button
          type="button"
          className="btn sm"
          data-testid={`${testId}-download`}
          aria-busy={busy === 'download'}
          disabled={busy !== null}
          onClick={() => void onDownload()}
        >
          {busy === 'download' ? 'Downloading…' : 'Download'}
        </button>
        {/* Single polite live region — copy success is announced here, not on the
            button (which would not re-announce), so it is never double-spoken. */}
        <span
          role="status"
          aria-live="polite"
          style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}
        >
          {copied ? 'Receipt copied to clipboard' : ''}
        </span>
      </div>
      {error !== null && (
        <div
          role="alert"
          className="wb-banner wb-banner--red"
          data-testid={`${testId}-error`}
          style={{ marginTop: 'var(--space-2)' }}
        >
          {ERROR_COPY[error.code]}
        </div>
      )}
    </section>
  );
}
