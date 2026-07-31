// SPDX-License-Identifier: Apache-2.0
/**
 * WorkbenchCustomizer — TICKET-D-211 (Phase B foundation).
 *
 * Per-user widget toggle popover for the Workbench `/console` surface.
 * Mirrors the existing `<DashboardCustomizer>` (YR.21) discipline:
 *
 *   - Closed-enum widget set sourced from `lib/workbench/widgets.ts`
 *   - Per-user `localStorage[tpi.workbench.widgets.<userId>]` persistence
 *   - API_KEY_USER_ID exclusion gate via `isSafeUserIdSegment`
 *     (synthetic / unsafe ids fall back to `default` scope key)
 *   - Closed-map labels — no inline `${id}` strings on aria-labels
 *
 * R-T1 closed-enum discipline:
 *   - Iteration is `WORKBENCH_WIDGET_IDS.map(...)` only
 *   - Reads pass every key through `isWorkbenchWidgetId` (closed-enum
 *     filter) so an attacker cannot pollute state via a crafted
 *     localStorage write
 *
 * Accessibility:
 *   - Trigger button is aria-haspopup="menu" + aria-expanded
 *   - Popover form has labeled checkboxes
 *   - Esc dismisses the popover and restores focus to the trigger
 *   - Click-outside dismisses
 *
 * Persistence:
 *   - Storage key: `tpi.workbench.widgets.<userId>` (mirrors
 *     `tpi.dashboard.widgets.<userId>`). Unsafe userIds (control chars,
 *     path traversal, length > 64) fall back to `default` scope.
 *   - Stored value: `Record<WorkbenchWidgetId, boolean>`. JSON parse is
 *     wrapped in try/catch; unknown keys silently dropped via the
 *     closed-enum guard.
 *   - Defensive try/catch around `localStorage.setItem` for Safari
 *     private mode + quota errors — in-memory state still updates.
 */

'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactElement,
} from 'react';
import {
  WORKBENCH_WIDGET_IDS,
  WORKBENCH_WIDGET_LABEL,
  WORKBENCH_WIDGET_DEFAULTS,
  isWorkbenchWidgetId,
  type WorkbenchWidgetId,
  type WorkbenchWidgetState,
} from '@/lib/workbench/widgets';

const STORAGE_KEY_PREFIX = 'tpi.workbench.widgets.';

/**
 * Defensive userId narrowing — mirrors the YR.21 DashboardCustomizer
 * discipline. Rejects:
 *   - Empty / non-string
 *   - Path traversal (../ etc) — match anything outside [A-Za-z0-9_.-]
 *   - Length > 64
 *   - The synthetic API_KEY_USER_ID sentinel (excluded per T8.1 — synth
 *     keys do not own per-user widget state)
 *
 * Anything that fails returns `false`; callers fall back to `default`
 * scope so the storage key is always under our control.
 */
const API_KEY_USER_ID = 'api-key-user' as const;

// Reserved fallback scope id. A real user whose backend `id` happened
// to be the literal string `'default'` would otherwise collide with
// the unauthenticated fallback storage key. Reject explicitly so the
// fallback scope stays exclusively reserved.
const FALLBACK_SCOPE_ID = 'default' as const;

function isSafeUserIdSegment(userId: unknown): userId is string {
  if (typeof userId !== 'string') return false;
  if (userId === API_KEY_USER_ID) return false;
  if (userId === FALLBACK_SCOPE_ID) return false;
  return /^[A-Za-z0-9_.-]{1,64}$/.test(userId);
}

function storageKey(userId: string | null | undefined): string {
  return `${STORAGE_KEY_PREFIX}${isSafeUserIdSegment(userId) ? userId : FALLBACK_SCOPE_ID}`;
}

export function readWorkbenchWidgetState(
  userId: string | null | undefined,
): WorkbenchWidgetState {
  if (typeof window === 'undefined') return WORKBENCH_WIDGET_DEFAULTS;
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (raw === null) return WORKBENCH_WIDGET_DEFAULTS;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return WORKBENCH_WIDGET_DEFAULTS;
    }
    const out: Record<string, boolean> = { ...WORKBENCH_WIDGET_DEFAULTS };
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (isWorkbenchWidgetId(k) && typeof v === 'boolean') {
        out[k] = v;
      }
    }
    return out as WorkbenchWidgetState;
  } catch {
    return WORKBENCH_WIDGET_DEFAULTS;
  }
}

function writeWorkbenchWidgetState(
  userId: string | null | undefined,
  state: WorkbenchWidgetState,
): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(state));
  } catch {
    // Safari private mode + quota errors swallowed silently.
    // The in-memory state still updates, so the user sees the toggle
    // take effect for the rest of their session.
  }
}

export interface WorkbenchCustomizerProps {
  readonly userId: string | null | undefined;
  readonly state: WorkbenchWidgetState;
  readonly onChange: (state: WorkbenchWidgetState) => void;
  readonly testId?: string;
}

export function WorkbenchCustomizer({
  userId,
  state,
  onChange,
  testId = 'workbench-customizer',
}: WorkbenchCustomizerProps): ReactElement {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const closeMenu = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    function onDocClick(ev: globalThis.MouseEvent) {
      if (!menuRef.current || !triggerRef.current) return;
      if (
        ev.target instanceof Node &&
        !menuRef.current.contains(ev.target) &&
        !triggerRef.current.contains(ev.target)
      ) {
        setOpen(false);
      }
    }
    function onKey(ev: globalThis.KeyboardEvent) {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        closeMenu();
      }
    }
    window.addEventListener('mousedown', onDocClick);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDocClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, closeMenu]);

  const onToggle = useCallback(
    (id: WorkbenchWidgetId, next: boolean) => {
      const updated: WorkbenchWidgetState = { ...state, [id]: next };
      writeWorkbenchWidgetState(userId, updated);
      onChange(updated);
    },
    [onChange, state, userId],
  );

  const onTriggerKey = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setOpen(true);
      }
    },
    [],
  );

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        ref={triggerRef}
        type="button"
        className="btn btn-ghost"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onTriggerKey}
        data-testid={testId}
      >
        Customize ▾
      </button>
      {open ? (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Workbench widgets"
          data-testid={`${testId}-menu`}
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 4px)',
            minWidth: 240,
            background: 'var(--bg-1)',
            border: '1px solid var(--b-2)',
            borderRadius: 6,
            zIndex: 50,
            boxShadow: '0 6px 20px rgba(0,0,0,0.2)',
            padding: 12,
          }}
        >
          <p style={{ fontSize: 11, color: 'var(--fg-dim)', margin: '0 0 8px' }}>
            Toggle workbench widgets. Saved to this browser.
          </p>
          {WORKBENCH_WIDGET_IDS.map((id) => (
            <label
              key={id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 0',
                fontSize: 12,
                cursor: 'pointer',
              }}
              data-testid={`${testId}-row-${id}`}
            >
              <input
                type="checkbox"
                checked={state[id]}
                onChange={(e) => onToggle(id, e.target.checked)}
                data-testid={`${testId}-toggle-${id}`}
                aria-label={WORKBENCH_WIDGET_LABEL[id]}
              />
              <span>{WORKBENCH_WIDGET_LABEL[id]}</span>
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Hook variant — returns `[state, setState]` with the same per-user
 * persistence semantics as the popover trigger. Mirrors
 * `useDashboardWidgetState` from the YR.21 sister primitive.
 *
 * Initial server-side render returns `WORKBENCH_WIDGET_DEFAULTS` to
 * avoid SSR / hydration mismatch; the localStorage read happens in a
 * `useEffect` so the persisted state lights up after mount.
 */
export function useWorkbenchWidgetState(
  userId: string | null | undefined,
): readonly [WorkbenchWidgetState, (next: WorkbenchWidgetState) => void] {
  const [state, setState] = useState<WorkbenchWidgetState>(
    WORKBENCH_WIDGET_DEFAULTS,
  );

  useEffect(() => {
    setState(readWorkbenchWidgetState(userId));
  }, [userId]);

  const setAndPersist = useCallback(
    (next: WorkbenchWidgetState) => {
      setState(next);
      writeWorkbenchWidgetState(userId, next);
    },
    [userId],
  );

  return useMemo(() => [state, setAndPersist] as const, [state, setAndPersist]);
}
