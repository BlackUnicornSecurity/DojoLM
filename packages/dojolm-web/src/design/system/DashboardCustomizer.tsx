// SPDX-License-Identifier: Apache-2.0
/**
 * DashboardCustomizer — YR.21 / G-014 + G-015 (Path B narrowing).
 *
 * The V1 `DashboardCustomizer` was a 33-widget drag-drop reorder panel.
 * Per the YR.21 closeout ticket the full customizer is intentionally
 * out of scope; we ship the narrowed Path B: a popover with 4 boolean
 * toggles over a closed widget enum, persisted to localStorage scoped
 * by `userId`.
 *
 * Widget enum (R-T1 closed-map discipline):
 *   - 'command-hero'   → CommandHero block on `/`
 *   - 'ticker'         → live audit-log Ticker
 *   - 'guard-modes'    → Hattori GuardModes panel
 *   - 'coverage-grid'  → Scanner CoverageGrid heatmap
 *
 * Persistence:
 *   - Key: `tpi.dashboard.widgets.<userId>` (per YR.21 prompt mandate;
 *     userId fallback is `'default'` when unauthenticated).
 *   - Stored value: `Record<DashboardWidgetId, boolean>`. JSON parse is
 *     wrapped in try/catch and unknown keys are dropped (no XSS via
 *     crafted localStorage — every read passes through the closed enum).
 *   - Defensive try/catch around `localStorage.setItem` for Safari
 *     private mode + quota errors.
 *
 * Accessibility:
 *   - Trigger button is aria-haspopup="menu" + aria-expanded.
 *   - Popover form has labeled checkboxes; toggling a checkbox emits
 *     `onChange` and persists to storage.
 *   - Esc dismisses the popover and restores focus to the trigger.
 *   - Click-outside dismisses.
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

// Stage 2 brutal-review CONVERGENCE.md (4-persona convergence: UI eng
// Bartłomiej Wójcik UI-102 + UX Klara Wiśniewska UI-003 "kill
// TrainingScroll on Dashboard" + UI eng UI-103 "kill HaikuLicenseModules
// duplicate of /admin Modules grid"): the 'training-scroll' +
// 'haiku-license-modules' widget ids RETIRED from the closed enum. The
// Dashboard no longer mounts either widget; the customizer surface no
// longer offers them. Widget enum drops 6 → 4.
//
// Forward-compat: legacy localStorage state may still carry these keys
// from before this PR; `readWidgetState` already drops unknown widget
// ids via the `isWidgetId` closed-enum filter (DC-G014-06 contract), so
// stale persisted state is silently pruned on first read.
export type DashboardWidgetId =
  | 'command-hero'
  | 'ticker'
  | 'guard-modes'
  | 'coverage-grid';

export const DASHBOARD_WIDGET_IDS: readonly DashboardWidgetId[] = [
  'command-hero',
  'ticker',
  'guard-modes',
  'coverage-grid',
];

export const DASHBOARD_WIDGET_LABEL: Record<DashboardWidgetId, string> = {
  'command-hero': 'Command hero',
  ticker: 'Activity ticker',
  'guard-modes': 'Active defenses (Hattori)',
  'coverage-grid': 'Coverage heatmap',
};

export type DashboardWidgetState = Readonly<Record<DashboardWidgetId, boolean>>;

export const DEFAULT_WIDGET_STATE: DashboardWidgetState = {
  'command-hero': true,
  ticker: true,
  'guard-modes': true,
  'coverage-grid': true,
};

const STORAGE_KEY_PREFIX = 'tpi.dashboard.widgets.';

function isWidgetId(v: unknown): v is DashboardWidgetId {
  return typeof v === 'string' && DASHBOARD_WIDGET_IDS.includes(v as DashboardWidgetId);
}

function storageKey(userId: string | null | undefined): string {
  const safe = typeof userId === 'string' && /^[A-Za-z0-9_.-]{1,64}$/.test(userId)
    ? userId
    : 'default';
  return `${STORAGE_KEY_PREFIX}${safe}`;
}

export function readWidgetState(userId: string | null | undefined): DashboardWidgetState {
  if (typeof window === 'undefined') return DEFAULT_WIDGET_STATE;
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (raw === null) return DEFAULT_WIDGET_STATE;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return DEFAULT_WIDGET_STATE;
    }
    const out: Record<string, boolean> = { ...DEFAULT_WIDGET_STATE };
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (isWidgetId(k) && typeof v === 'boolean') {
        out[k] = v;
      }
    }
    return out as DashboardWidgetState;
  } catch {
    return DEFAULT_WIDGET_STATE;
  }
}

function writeWidgetState(userId: string | null | undefined, state: DashboardWidgetState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(state));
  } catch {
    // Safari private mode + quota errors swallowed silently.
    // The in-memory state still updates, so the user sees the toggle
    // take effect for the rest of their session.
  }
}

export interface DashboardCustomizerProps {
  readonly userId: string | null | undefined;
  readonly state: DashboardWidgetState;
  readonly onChange: (state: DashboardWidgetState) => void;
  readonly testId?: string;
}

export function DashboardCustomizer({
  userId,
  state,
  onChange,
  testId = 'dashboard-customizer',
}: DashboardCustomizerProps): ReactElement {
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
    (id: DashboardWidgetId, next: boolean) => {
      const updated: DashboardWidgetState = { ...state, [id]: next };
      writeWidgetState(userId, updated);
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
          aria-label="Dashboard widgets"
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
          <p style={{ fontSize: 11, color: 'var(--fg-mute)', margin: '0 0 8px' }}>
            Toggle dashboard widgets. Saved to this browser.
          </p>
          {DASHBOARD_WIDGET_IDS.map((id) => (
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
              />
              <span>{DASHBOARD_WIDGET_LABEL[id]}</span>
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Hook variant for callers that want to drive both reads + writes from
 * a single state holder. Returns `[state, setState]` plus the same
 * persistence semantics as the popover trigger.
 */
export function useDashboardWidgetState(
  userId: string | null | undefined,
): readonly [DashboardWidgetState, (next: DashboardWidgetState) => void] {
  const [state, setState] = useState<DashboardWidgetState>(DEFAULT_WIDGET_STATE);

  useEffect(() => {
    setState(readWidgetState(userId));
  }, [userId]);

  const setAndPersist = useCallback(
    (next: DashboardWidgetState) => {
      setState(next);
      writeWidgetState(userId, next);
    },
    [userId],
  );

  return useMemo(() => [state, setAndPersist] as const, [state, setAndPersist]);
}
