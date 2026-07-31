// SPDX-License-Identifier: Apache-2.0
/**
 * AtemiSessionRecorderPanel — Atemi-PR-4 consumer wiring for the
 * `SessionRecorder` design primitive (`@/design/adversarial/SessionRecorder`).
 *
 * The primitive is pure-presentational (chrome only). This wrapper owns
 * the state machine and the storage I/O:
 *
 *   idle ── Start ──▶ recording ── Stop ──▶ stopped
 *     ▲                  │                    │
 *     │                  │                    │
 *     └─── Discard ──────┴──────────  ────────┘
 *
 *   - Start (from idle | stopped): create a fresh `AtemiSession`
 *     (status='recording') and prepend to `atemi-session-storage`.
 *   - Stop (from recording): mark the active session
 *     status='completed' + set `endedAt`, write back.
 *   - Discard: remove the active session from storage outright.
 *     Available from `recording` and `stopped` (matches primitive matrix
 *     in `SessionRecorder.tsx` lines 180-182).
 *
 * The primitive's `paused` state is intentionally unused — there is no
 * pause semantic on the storage lib, and the primitive is dispatch-
 * agnostic (it only renders whatever state we pass).
 *
 * Live duration ticks via a 1s interval that ONLY runs in the
 * `recording` state. Stopped / idle sessions render their frozen /
 * zero duration without driving re-renders.
 *
 * On mount the wrapper reconciles with storage: if any session has
 * status='recording' it adopts that as the active session and goes
 * straight into the recording state (handles full-page reload during
 * an in-flight recording). The 'stopped' state is transient — we
 * never auto-resume into it after a reload, since the post-stop
 * surface is just sugar for the user before they decide
 * Discard-or-keep.
 *
 * For PR-4 the events array stays at 0 — there is no probe-event
 * source feeding into the active recording yet. A follow-up PR can
 * wire `onConfirmProbe` (in `page.tsx`) to push an `AtemiSessionEvent`
 * onto the active recording, which would then flow through
 * `AtemiAttackLogPanel` automatically.
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SessionRecorder, type SessionRecorderState } from '@/design/adversarial/SessionRecorder';
import {
  loadConfigSnapshot,
  loadSessions,
  saveSessions,
} from '@/lib/atemi-session-storage';
import type { AtemiSession } from '@/lib/atemi-session-types';

type RecorderMode = 'idle' | 'recording' | 'stopped';

interface AtemiSessionRecorderPanelProps {
  /** Optional override — when present, the wrapper uses these sessions
   *  as the storage source on mount instead of hydrating from
   *  localStorage. Test-only.
   */
  readonly sessionsOverride?: readonly AtemiSession[];
  /** Optional override for the saver. Defaults to `saveSessions`. */
  readonly onSaveSessions?: (sessions: readonly AtemiSession[]) => void;
  /** Optional override for the id generator. Defaults to
   *  `crypto.randomUUID()`. Test-only — used to pin ids in assertions.
   */
  readonly idGenerator?: () => string;
  /** Optional override for the clock. Defaults to `() => Date.now()`. */
  readonly nowFn?: () => number;
  /** Optional override for the tick interval (ms). Default 1000. */
  readonly tickIntervalMs?: number;
  /** Test id stem forwarded to the SessionRecorder primitive. */
  readonly testId?: string;
}

const DEFAULT_TICK_MS = 1000;

function generateSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for unusual environments without crypto.randomUUID — still
  // unique enough for localStorage key dedup; not a security primitive.
  return `atemi-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function formatSessionName(startedAt: string): string {
  // ISO → "Atemi session YYYY-MM-DD HH:MM"
  const stamp = startedAt.slice(0, 16).replace('T', ' ');
  return `Atemi session ${stamp}`;
}

function estimateBytes(session: AtemiSession): number {
  try {
    return JSON.stringify(session).length;
  } catch {
    return 0;
  }
}

export function AtemiSessionRecorderPanel({
  sessionsOverride,
  onSaveSessions,
  idGenerator,
  nowFn,
  tickIntervalMs,
  testId = 'atemi-session-recorder',
}: AtemiSessionRecorderPanelProps) {
  const generateId = idGenerator ?? generateSessionId;
  const now = nowFn ?? (() => Date.now());
  const tickMs = tickIntervalMs ?? DEFAULT_TICK_MS;
  const saver = onSaveSessions ?? saveSessions;

  // Sessions array kept in component state so Start / Stop / Discard
  // re-render the recorder without re-hydrating from storage on every
  // action. Storage stays authoritative — every state mutation writes
  // back via `persist()`.
  const [sessions, setSessions] = useState<readonly AtemiSession[]>(
    sessionsOverride ?? [],
  );
  const [mode, setMode] = useState<RecorderMode>('idle');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(sessionsOverride !== undefined);
  const [tick, setTick] = useState(0);
  const tickHandleRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Mount-time reconciliation: hydrate from storage and adopt any in-
  // flight recording. localStorage access is sync; defensive try/catch
  // covers hostile JSON that slipped past `loadSessions` narrowing.
  useEffect(() => {
    if (sessionsOverride !== undefined) {
      const inflight = sessionsOverride.find((s) => s.status === 'recording');
      if (inflight) {
        setMode('recording');
        setActiveId(inflight.id);
      }
      return;
    }
    try {
      const loadedSessions = loadSessions();
      setSessions(loadedSessions);
      const inflight = loadedSessions.find((s) => s.status === 'recording');
      if (inflight) {
        setMode('recording');
        setActiveId(inflight.id);
      }
    } catch {
      setSessions([]);
    } finally {
      setLoaded(true);
    }
  }, [sessionsOverride]);

  // 1s duration tick — only runs while recording. Stopped / idle states
  // freeze the readout, so no need to drive re-renders then.
  useEffect(() => {
    if (mode !== 'recording') {
      if (tickHandleRef.current !== null) {
        clearInterval(tickHandleRef.current);
        tickHandleRef.current = null;
      }
      return;
    }
    const handle = setInterval(() => {
      setTick((t) => (t + 1) % 1_000_000);
    }, tickMs);
    tickHandleRef.current = handle;
    return () => {
      clearInterval(handle);
      tickHandleRef.current = null;
    };
  }, [mode, tickMs]);

  const persist = useCallback(
    (next: readonly AtemiSession[]) => {
      setSessions(next);
      try {
        saver(next as AtemiSession[]);
      } catch {
        // saveSessions handles QuotaExceededError internally; this catch
        // is for an injected saver that throws (test override).
      }
    },
    [saver],
  );

  const activeSession = useMemo<AtemiSession | null>(() => {
    if (activeId === null) return null;
    return sessions.find((s) => s.id === activeId) ?? null;
  }, [activeId, sessions]);

  const handleStart = useCallback(() => {
    const startedAtMs = now();
    const startedAt = new Date(startedAtMs).toISOString();
    const newSession: AtemiSession = {
      id: generateId(),
      name: formatSessionName(startedAt),
      status: 'recording',
      startedAt,
      config: loadConfigSnapshot(),
      events: [],
    };
    // Prepend so the active session is index 0 — matches `saveSessions`
    // capping (`slice(0, MAX_SESSIONS)`) so the freshest survives.
    persist([newSession, ...sessions]);
    setMode('recording');
    setActiveId(newSession.id);
    setTick(0);
  }, [generateId, now, persist, sessions]);

  const handleStop = useCallback(() => {
    if (mode !== 'recording' || activeId === null) return;
    const endedAtMs = now();
    const endedAt = new Date(endedAtMs).toISOString();
    const next = sessions.map((s) => {
      if (s.id !== activeId) return s;
      return { ...s, status: 'completed' as const, endedAt };
    });
    persist(next);
    setMode('stopped');
  }, [activeId, mode, now, persist, sessions]);

  const handleDiscard = useCallback(() => {
    if (activeId === null) return;
    const next = sessions.filter((s) => s.id !== activeId);
    persist(next);
    setMode('idle');
    setActiveId(null);
    setTick(0);
  }, [activeId, persist, sessions]);

  // Derive primitive props from the state machine.
  const recorderState: SessionRecorderState =
    mode === 'recording' ? 'recording' : mode === 'stopped' ? 'stopped' : 'idle';

  const durationMs = useMemo(() => {
    if (activeSession === null) return 0;
    const startMs = Date.parse(activeSession.startedAt);
    if (!Number.isFinite(startMs)) return 0;
    if (mode === 'recording') {
      // Reading `tick` to force recompute on each interval beat.
      void tick;
      return Math.max(0, now() - startMs);
    }
    if (mode === 'stopped' && activeSession.endedAt) {
      const endMs = Date.parse(activeSession.endedAt);
      if (!Number.isFinite(endMs)) return 0;
      return Math.max(0, endMs - startMs);
    }
    return 0;
  }, [activeSession, mode, now, tick]);

  const eventCount = activeSession?.events.length ?? 0;
  const sizeBytes = activeSession === null ? 0 : estimateBytes(activeSession);

  // Don't render the primitive on the first frame before hydration —
  // SSR / hydration mismatch protection.
  if (!loaded) {
    return (
      <div
        data-testid={`${testId}-loading`}
        className="wb-hint"
        style={{ padding: '8px 0', fontSize: 12, color: 'var(--fg-mute)' }}
      >
        Loading session recorder…
      </div>
    );
  }

  return (
    <SessionRecorder
      state={recorderState}
      durationMs={durationMs}
      eventCount={eventCount}
      sizeBytes={sizeBytes}
      {...(activeSession?.id !== undefined && { sessionId: activeSession.id })}
      onStart={handleStart}
      onStop={handleStop}
      onDiscard={handleDiscard}
      testId={testId}
    />
  );
}
