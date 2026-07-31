// SPDX-License-Identifier: Apache-2.0
/**
 * ConsolidatedReportButton — YR.18 / G-056 + G-067.
 *
 * Dropdown trigger + 3 menu items (PDF / Markdown / JSON). Click →
 * loading spinner → GET `/api/reports/consolidated?format=<fmt>&scope=<s>`.
 * Success: trigger browser download via blob + anchor. Failure: fixed-
 * vocabulary toast banner. NEVER echoes server-supplied free text
 * (R-T1 / R-T4 — error code → fixed string per code).
 *
 * `scope` is a closed enum drawn from the route's VALID_SCOPES set:
 *   'all' | 'llm' | 'compliance' | 'guard' | 'shingan'
 * Callers pass the data-scope, not the URL path. The button does not
 * accept arbitrary scope strings.
 *
 * a11y:
 *   - role="menu" + role="menuitem" on the dropdown
 *   - Esc dismisses the menu and returns focus to the trigger
 *   - Click-outside dismisses the menu
 *   - aria-expanded reflects open state
 *   - aria-busy reflects in-flight state
 */

'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
} from 'react';

export type ConsolidatedReportScope =
  | 'all'
  | 'llm'
  | 'compliance'
  | 'guard'
  | 'shingan';

export type ConsolidatedReportFormat = 'json' | 'pdf' | 'markdown';

export interface ConsolidatedReportButtonProps {
  readonly scope: ConsolidatedReportScope;
  readonly label?: string;
  readonly className?: string;
  readonly testId?: string;
}

interface ErrorState {
  readonly code: 'forbidden' | 'invalid' | 'network' | 'server';
}

const FORMAT_LABEL: Record<ConsolidatedReportFormat, string> = {
  pdf: 'PDF',
  markdown: 'Markdown',
  json: 'JSON',
};

const FORMAT_EXTENSION: Record<ConsolidatedReportFormat, string> = {
  pdf: 'pdf',
  markdown: 'md',
  json: 'json',
};

const ERROR_COPY: Record<ErrorState['code'], string> = {
  forbidden: 'Access denied. Sign in as an admin operator.',
  invalid: 'Report request rejected. Reload and try again.',
  network: 'Network error. Try again in a moment.',
  server: 'Report generation failed. Try again later.',
};

const FORMATS: readonly ConsolidatedReportFormat[] = ['pdf', 'markdown', 'json'];

function statusToCode(status: number): ErrorState['code'] {
  if (status === 401 || status === 403) return 'forbidden';
  if (status === 400) return 'invalid';
  return 'server';
}

function fallbackFilename(scope: ConsolidatedReportScope, format: ConsolidatedReportFormat): string {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  return `consolidated-${scope}-${ts}.${FORMAT_EXTENSION[format]}`;
}

function parseContentDisposition(header: string | null): string | null {
  if (!header) return null;
  // RFC 6266 minimal: filename="..." or filename=...
  const m = header.match(/filename\s*=\s*"?([^";\s]+)"?/i);
  if (!m) return null;
  const name = m[1];
  if (!/^[a-zA-Z0-9._-]{1,80}$/.test(name)) return null;
  return name;
}

export function ConsolidatedReportButton({
  scope,
  label = 'Export report',
  className = '',
  testId = 'consolidated-report-button',
}: ConsolidatedReportButtonProps): ReactElement {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ErrorState | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  // Issue #349 fold-in (post-train) — track outstanding revoke timers so an
  // unmount before the 60s deadline still revokes the object URL and clears
  // the timer. Without this cleanup an unmount left the timer to fire later
  // against `URL.revokeObjectURL` on a URL that may already be GC'd, and
  // leaked the Map entry on every export. Each timer removes its own
  // record on completion.
  const pendingRevokesRef = useRef<Map<number, string>>(new Map());

  useEffect(() => {
    const pending = pendingRevokesRef.current;
    return () => {
      for (const [handle, url] of pending) {
        clearTimeout(handle);
        URL.revokeObjectURL(url);
      }
      pending.clear();
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDocumentClick = (e: globalThis.MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (menuRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDocumentClick);
    return () => document.removeEventListener('mousedown', onDocumentClick);
  }, [open]);

  const handleTriggerKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === 'Escape') {
        if (open) {
          e.preventDefault();
          setOpen(false);
        }
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setOpen(true);
      }
    },
    [open],
  );

  const handleMenuKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    },
    [],
  );

  const downloadFormat = useCallback(
    async (format: ConsolidatedReportFormat) => {
      setError(null);
      setBusy(true);
      setOpen(false);
      try {
        const url = `/api/reports/consolidated?format=${encodeURIComponent(format)}&scope=${encodeURIComponent(scope)}`;
        const res = await fetch(url, {
          method: 'GET',
          credentials: 'same-origin',
          cache: 'no-store',
        });
        if (!res.ok) {
          setError({ code: statusToCode(res.status) });
          return;
        }
        const blob = await res.blob();
        const filename =
          parseContentDisposition(res.headers.get('content-disposition')) ??
          fallbackFilename(scope, format);
        const objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = objectUrl;
        anchor.download = filename;
        anchor.style.display = 'none';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        // Defer revoke so the browser can finish the download. The handle
        // is registered in `pendingRevokesRef` so an unmount before the
        // 60s deadline still revokes + clears the timer.
        const handle = window.setTimeout(() => {
          URL.revokeObjectURL(objectUrl);
          pendingRevokesRef.current.delete(handle);
        }, 60_000);
        pendingRevokesRef.current.set(handle, objectUrl);
      } catch {
        setError({ code: 'network' });
      } finally {
        setBusy(false);
      }
    },
    [scope],
  );

  const handleItemClick = useCallback(
    (e: MouseEvent<HTMLButtonElement>, format: ConsolidatedReportFormat) => {
      e.preventDefault();
      void downloadFormat(format);
    },
    [downloadFormat],
  );

  return (
    <div className={`crb-root ${className}`.trim()} data-testid={testId}>
      <button
        ref={triggerRef}
        type="button"
        className="btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-busy={busy}
        disabled={busy}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={handleTriggerKeyDown}
        data-testid={`${testId}-trigger`}
      >
        {busy ? 'Generating…' : label}
        <span aria-hidden="true" style={{ marginLeft: 6 }}>
          {open ? '▲' : '▼'}
        </span>
      </button>
      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={`Choose ${label} format`}
          onKeyDown={handleMenuKeyDown}
          className="crb-menu"
          data-testid={`${testId}-menu`}
          style={{
            position: 'absolute',
            zIndex: 10,
            background: 'var(--bg-1, #1a1a1a)',
            border: '1px solid var(--b-1, #333)',
            borderRadius: 6,
            padding: 4,
            minWidth: 160,
            marginTop: 4,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}
        >
          {FORMATS.map((fmt) => (
            <button
              key={fmt}
              type="button"
              role="menuitem"
              className="btn btn-ghost"
              data-testid={`${testId}-item-${fmt}`}
              onClick={(e) => handleItemClick(e, fmt)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '6px 10px',
                background: 'transparent',
                border: 0,
                cursor: 'pointer',
                color: 'inherit',
              }}
            >
              {FORMAT_LABEL[fmt]}
            </button>
          ))}
        </div>
      )}
      {error !== null && (
        <div
          role="alert"
          data-testid={`${testId}-error`}
          className="yr4-banner tone-red"
          style={{ marginTop: 6, fontSize: 12 }}
        >
          {ERROR_COPY[error.code]}
        </div>
      )}
    </div>
  );
}
