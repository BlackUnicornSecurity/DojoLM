// SPDX-License-Identifier: Apache-2.0
'use client';

/**
 * A.3 ToastProvider — context + queue + viewport renderer for the new
 * <Toast> primitive.
 *
 * Owns:
 *   - The active-toast queue (max 3 visible, newest on top)
 *   - Per-toast auto-dismiss timers (pause on hover/focus, resume on
 *     leave/blur — handled via onMouseEnter/Leave on each <Toast>)
 *   - Dedup: identical key fired within DEDUP_WINDOW_MS keeps first
 *   - Two viewport-anchored aria-live regions (assertive for errors,
 *     polite for everything else) so AT correctly batches announcements
 *
 * This PR mounts <ToastProvider> ONLY in the canvas page at
 * src/app/(design)/canvas/18-toast-banner-showcase/page.tsx —
 * root-layout integration is Phase 2 work. When useToast() is called
 * outside a Provider, the hook returns no-op functions + logs a
 * one-shot dev warning (graceful degradation, NOT throw).
 *
 * Dedup key derivation: explicit `key` on the options wins. Otherwise
 * a stable hash of `<tone>:<title>` is used. Fired-twice-within-2s
 * drops the second occurrence so duplicate save-success announcements
 * don't stack into 3 identical chips.
 *
 * Stack overflow: when a 4th toast arrives, the oldest is dropped from
 * the visible queue. CSS `transition: transform 200ms` on .toast-stack
 * items animates the reflow smoothly.
 *
 * Position default is bottom-right (per A.3 spec brief — "Anchored
 * bottom-right (or top-right; design call)"). `position="top-right"`
 * is supported via a prop on the Provider.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';

import { Toast, type ToastData, type ToastTone } from './Toast';

export type ToastPosition = 'bottom-right' | 'top-right';

export interface ToastOptions {
  readonly title: string;
  readonly description?: string;
  readonly action?: { readonly label: string; readonly onClick: () => void };
  /** Auto-dismiss duration in ms. `undefined` = sticky. */
  readonly duration?: number;
  /** Dedup key. If omitted, computed from `<tone>:<title>`. */
  readonly key?: string;
}

export interface ToastHandle {
  readonly id: string;
  readonly dismiss: () => void;
}

export interface ToastApi {
  success: (options: ToastOptions) => ToastHandle;
  error: (options: ToastOptions) => ToastHandle;
  warning: (options: ToastOptions) => ToastHandle;
  info: (options: ToastOptions) => ToastHandle;
  dismissAll: () => void;
}

interface ToastContextValue {
  readonly api: ToastApi;
  /**
   * Marker so useToast() can detect whether a Provider is mounted.
   * Without this, a default empty context would look identical to an
   * unmounted Provider.
   */
  readonly __mounted: true;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const TOAST_MAX_VISIBLE = 3;
export const TOAST_DEDUP_WINDOW_MS = 2000;
export const TOAST_DEFAULT_DURATION_MS = 5000;

/** Default per-tone duration. Error sticks until user dismisses. */
export const TOAST_DEFAULT_DURATION_BY_TONE: Readonly<Record<ToastTone, number | undefined>> = {
  success: TOAST_DEFAULT_DURATION_MS,
  warning: TOAST_DEFAULT_DURATION_MS,
  info: TOAST_DEFAULT_DURATION_MS,
  error: undefined,
} as const;

function deriveKey(tone: ToastTone, title: string): string {
  return `${tone}:${title}`;
}

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `toast-${idCounter}-${Math.random().toString(36).slice(2, 7)}`;
}

interface InternalToast extends ToastData {
  readonly key: string;
  readonly createdAt: number;
}

export interface ToastProviderProps {
  readonly children: ReactNode;
  readonly position?: ToastPosition;
  /** Override the default max-visible (3). Useful for canvas demos. */
  readonly maxVisible?: number;
}

export function ToastProvider({
  children,
  position = 'bottom-right',
  maxVisible = TOAST_MAX_VISIBLE,
}: ToastProviderProps): ReactElement {
  const [toasts, setToasts] = useState<readonly InternalToast[]>([]);
  // Track per-id timer ids so we can pause/resume on hover.
  const timersRef = useRef<Map<string, { timeoutId: ReturnType<typeof setTimeout> | null; remaining: number; startedAt: number }>>(new Map());
  // Track dedup window keyed by toast key → last-fired timestamp.
  const dedupRef = useRef<Map<string, number>>(new Map());
  // Mirror of `toasts` for the Escape-keydown listener — the listener
  // is registered once at mount and reads this ref on each invocation
  // rather than re-binding on every state change.
  const toastsRef = useRef<readonly InternalToast[]>([]);
  useEffect(() => {
    toastsRef.current = toasts;
  }, [toasts]);

  // Clear all timers on unmount.
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((entry) => {
        if (entry.timeoutId !== null) clearTimeout(entry.timeoutId);
      });
      timers.clear();
    };
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const entry = timersRef.current.get(id);
    if (entry !== undefined && entry.timeoutId !== null) {
      clearTimeout(entry.timeoutId);
    }
    timersRef.current.delete(id);
  }, []);

  // Escape-key handler — registered once at mount, reads toastsRef
  // (kept in sync below) so the listener never needs to be re-bound on
  // toast-set change. Skips when no toasts visible so the Escape event
  // bubbles to other handlers (modal close etc.).
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key !== 'Escape') return;
      const current = toastsRef.current;
      if (current.length === 0) return;
      removeToast(current[0].id);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [removeToast]);

  const scheduleAutoDismiss = useCallback((id: string, duration: number) => {
    const timeoutId = setTimeout(() => removeToast(id), duration);
    timersRef.current.set(id, {
      timeoutId,
      remaining: duration,
      startedAt: Date.now(),
    });
  }, [removeToast]);

  const pauseToast = useCallback((id: string) => {
    const entry = timersRef.current.get(id);
    if (entry === undefined || entry.timeoutId === null) return;
    clearTimeout(entry.timeoutId);
    const elapsed = Date.now() - entry.startedAt;
    const remaining = Math.max(0, entry.remaining - elapsed);
    timersRef.current.set(id, { timeoutId: null, remaining, startedAt: Date.now() });
  }, []);

  const resumeToast = useCallback((id: string) => {
    const entry = timersRef.current.get(id);
    if (entry === undefined || entry.timeoutId !== null) return;
    if (entry.remaining <= 0) {
      removeToast(id);
      return;
    }
    const timeoutId = setTimeout(() => removeToast(id), entry.remaining);
    timersRef.current.set(id, { timeoutId, remaining: entry.remaining, startedAt: Date.now() });
  }, [removeToast]);

  const enqueue = useCallback(
    (tone: ToastTone, options: ToastOptions): ToastHandle => {
      const key = options.key ?? deriveKey(tone, options.title);
      const now = Date.now();

      // Dedup — drop if same key fired within window.
      const lastFired = dedupRef.current.get(key);
      if (lastFired !== undefined && now - lastFired < TOAST_DEDUP_WINDOW_MS) {
        return { id: '', dismiss: () => {} };
      }
      dedupRef.current.set(key, now);

      const id = nextId();
      const duration = options.duration ?? TOAST_DEFAULT_DURATION_BY_TONE[tone];

      const next: InternalToast = {
        id,
        key,
        tone,
        title: options.title,
        description: options.description,
        action: options.action,
        duration,
        createdAt: now,
      };

      setToasts((prev) => {
        // Newest first. Trim oldest when over max.
        const combined: readonly InternalToast[] = [next, ...prev];
        if (combined.length <= maxVisible) return combined;
        const trimmed = combined.slice(0, maxVisible);
        // Drop the timers for evicted toasts.
        const evicted = combined.slice(maxVisible);
        evicted.forEach((t) => {
          const entry = timersRef.current.get(t.id);
          if (entry !== undefined && entry.timeoutId !== null) clearTimeout(entry.timeoutId);
          timersRef.current.delete(t.id);
        });
        return trimmed;
      });

      if (duration !== undefined && duration > 0) {
        scheduleAutoDismiss(id, duration);
      }

      return { id, dismiss: () => removeToast(id) };
    },
    [maxVisible, scheduleAutoDismiss, removeToast],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (options) => enqueue('success', options),
      error: (options) => enqueue('error', options),
      warning: (options) => enqueue('warning', options),
      info: (options) => enqueue('info', options),
      dismissAll: () => {
        timersRef.current.forEach((entry) => {
          if (entry.timeoutId !== null) clearTimeout(entry.timeoutId);
        });
        timersRef.current.clear();
        setToasts([]);
      },
    }),
    [enqueue],
  );

  const value = useMemo<ToastContextValue>(() => ({ api, __mounted: true }), [api]);

  const assertiveToasts = toasts.filter((t) => t.tone === 'error');
  const politeToasts = toasts.filter((t) => t.tone !== 'error');

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className={`toast-viewport toast-viewport--${position}`}
        aria-label="Notifications"
        data-position={position}
      >
        {/*
          Two viewport-anchored aria-live regions, one per severity.
          role + aria-live live HERE (the container) — NOT on the chip
          elements — so AT does not double-announce when a chip is
          inserted into the subtree of an already-live region. The
          chips themselves carry aria-labelledby / aria-describedby
          for rich navigation but are NOT live regions of their own.
          aria-atomic="false" means each new chip announces
          independently rather than re-announcing the whole stack.
        */}
        <div
          className="toast-stack toast-stack--assertive"
          role="alert"
          aria-live="assertive"
          aria-atomic="false"
          aria-relevant="additions"
        >
          {assertiveToasts.map((t) => (
            <Toast
              key={t.id}
              toast={t}
              onDismiss={removeToast}
              onPause={pauseToast}
              onResume={resumeToast}
            />
          ))}
        </div>
        <div
          className="toast-stack toast-stack--polite"
          role="status"
          aria-live="polite"
          aria-atomic="false"
          aria-relevant="additions"
        >
          {politeToasts.map((t) => (
            <Toast
              key={t.id}
              toast={t}
              onDismiss={removeToast}
              onPause={pauseToast}
              onResume={resumeToast}
            />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

/**
 * Internal: read the context. Exported for the useToast hook in the
 * same package. External consumers MUST use useToast(). The leading
 * `use` in the name is required by react-hooks/rules-of-hooks since
 * the body calls useContext.
 */
export function useToastContextInternal(): ToastContextValue | null {
  return useContext(ToastContext);
}

/**
 * Test-only helper to reset the id counter so test runs produce
 * deterministic toast ids. Not part of the public API.
 */
export function __toastProviderResetIdCounterForTest(): void {
  idCounter = 0;
}
